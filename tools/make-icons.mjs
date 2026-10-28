/* ============================================================
   make-icons.mjs — 홈화면 아이콘(PNG) 생성기
   ------------------------------------------------------------
   외부 패키지 없이 PNG 를 직접 인코딩한다. (npm install 불필요)
   실행:  node tools/make-icons.mjs
   결과:  assets/icon-180.png, icon-192.png, icon-512.png
   ============================================================ */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ── 최소 PNG 인코더 ─────────────────────────────────────── */
const TBL = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = TBL[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;                       // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ── 아이콘 그림: 크림색 바탕 + 팔레트 + 물감 방울 ───────── */
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BG = hex('#ffcf7a');
const PALETTE = hex('#fffaf0');
const DOTS = ['#ff4d4d', '#ff9f2e', '#ffe14d', '#4fd06b', '#4a90ff', '#a06bff'].map(hex);

/* W×H 화면 가운데에 한 변 S 짜리 아이콘을 그린다.
   정사각 아이콘은 W=H=S, 넓은 og 이미지는 S 를 따로 준다 —
   그림 비율(rPal·rDot 따위)은 전부 S 기준이라 한 벌로 양쪽을 만든다. */
function render(W, H = W, S = Math.min(W, H)) {
  const buf = Buffer.alloc(W * H * 4);
  const cx = W / 2, cy = H / 2;
  const rPal = S * 0.355;                 // 팔레트 반지름
  const rHole = S * 0.085;                // 엄지 구멍
  const holeX = cx + S * 0.155, holeY = cy + S * 0.155;
  const rDot = S * 0.062;
  // 엄지 구멍(오른쪽 아래 45°)을 피해 왼쪽 아래 → 위 → 오른쪽으로 호를 그린다
  const dots = DOTS.map((c, i) => {
    const a = -Math.PI * 1.06 + i * (Math.PI * 1.12 / (DOTS.length - 1));
    return { x: cx + Math.cos(a) * S * 0.208, y: cy + Math.sin(a) * S * 0.208, c };
  });

  // 안티에일리어싱: 픽셀당 3×3 슈퍼샘플
  const SS = 3, inv = 1 / (SS * SS);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
        let col = BG;
        const dPal = Math.hypot(px - cx, py - cy);
        if (dPal <= rPal && Math.hypot(px - holeX, py - holeY) > rHole) {
          col = PALETTE;
          for (const d of dots) {
            if (Math.hypot(px - d.x, py - d.y) <= rDot) { col = d.c; break; }
          }
        }
        r += col[0]; g += col[1]; b += col[2];
      }
      const o = (y * W + x) * 4;
      buf[o] = Math.round(r * inv); buf[o + 1] = Math.round(g * inv);
      buf[o + 2] = Math.round(b * inv); buf[o + 3] = 255;
    }
  }
  return encodePNG(W, H, buf);
}

mkdirSync(join(ROOT, 'assets'), { recursive: true });

/* 정사각 아이콘.
   180 은 아이폰·아이패드 홈 화면, 192·512 는 매니페스트(안드로이드·네이버 앱),
   120·152·167 은 구형 iOS 와 아이콘을 크기별로 고르는 수집기, 32 는 브라우저 탭.
   전부 알파 255 (불투명) 다 — 투명 아이콘은 네이버 앱·사파리가 "첫 글자 아이콘"
   으로 떨어뜨린다. */
for (const size of [32, 120, 152, 167, 180, 192, 512]) {
  const file = join(ROOT, 'assets', `icon-${size}.png`);
  writeFileSync(file, render(size));
  console.log('wrote', file);
}

/* 링크 미리보기용 og 이미지 (카카오톡·네이버 공유).
   정사각 아이콘을 og:image 로 주면 수집기가 양옆을 잘라 내므로 1200×630 을 따로 만든다. */
{
  const file = join(ROOT, 'assets', 'og.png');
  writeFileSync(file, render(1200, 630, Math.round(630 * 0.78)));
  console.log('wrote', file);
}

/* ── 관례 파일명 폴백 (저장소 루트) ──────────────────────────
   HTML 을 파싱해 <link> 를 읽는 대신 정해진 이름을 그냥 찍어 보는 수집기가 있다
   (네이버 앱 바로가기처럼). 그래서 같은 그림을 관례 이름으로도 둔다.
   ★ 이건 배포 경로(/baby/) 기준이다 — origin 루트(stepersjmj-hash.github.io/)
     를 찍어 보는 수집기에는 소용이 없다. 프로젝트 페이지는 origin 루트에
     파일을 둘 수 없기 때문이고, 그걸 고치려면 커스텀 도메인이 필요하다. */
for (const name of ['apple-touch-icon.png', 'apple-touch-icon-precomposed.png']) {
  const file = join(ROOT, name);
  writeFileSync(file, render(180));
  console.log('wrote', file);
}

/* favicon.ico — ICO 는 PNG 를 그대로 품을 수 있다 (Vista 이후 표준).
   ICONDIR 6바이트 + ICONDIRENTRY 16바이트 + PNG 본문. */
{
  const png = render(32);
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0);            // reserved
  dir.writeUInt16LE(1, 2);            // type: 1 = icon
  dir.writeUInt16LE(1, 4);            // 이미지 1장
  const ent = Buffer.alloc(16);
  ent[0] = 32; ent[1] = 32;           // 가로·세로 (0 이면 256)
  ent[2] = 0; ent[3] = 0;             // 팔레트 색 수 · reserved
  ent.writeUInt16LE(1, 4);            // planes
  ent.writeUInt16LE(32, 6);           // bit depth
  ent.writeUInt32LE(png.length, 8);   // 본문 길이
  ent.writeUInt32LE(6 + 16, 12);      // 본문 오프셋
  const file = join(ROOT, 'favicon.ico');
  writeFileSync(file, Buffer.concat([dir, ent, png]));
  console.log('wrote', file);
}
