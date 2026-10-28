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

/* 아이콘 기하 — 전부 팔레트 반지름(rPal) 기준 비율이다.
   그래야 파비콘(팔레트가 캔버스를 꽉 채움)과 홈 화면 타일(72%)이 같은 그림이 된다. */
const G = { hole: 0.239, holeOff: 0.437, dot: 0.175, ring: 0.586 };

/* 한 변 size 의 정사각 아이콘.
     frac — 팔레트 지름 / 캔버스 변. 1 이면 꽉 차고, 0.71 이면 여백이 남는다
            (안드로이드 마스커블 안전영역 80% 안).
     bg   — 배경색. null 이면 투명 (파비콘용).
   ★ 홈 화면 타일은 bg 가 있어야 한다 — 투명하면 iOS 가 검게 채운다. */
function render(size, frac = 0.71, bg = BG) {
  const W = size, H = size;
  const buf = Buffer.alloc(W * H * 4);
  const cx = W / 2, cy = H / 2;
  const rPal = size * frac / 2;           // 팔레트 반지름
  const rHole = rPal * G.hole;            // 엄지 구멍
  const holeX = cx + rPal * G.holeOff, holeY = cy + rPal * G.holeOff;
  const rDot = rPal * G.dot;
  // 엄지 구멍(오른쪽 아래 45°)을 피해 왼쪽 아래 → 위 → 오른쪽으로 호를 그린다
  const dots = DOTS.map((c, i) => {
    const a = -Math.PI * 1.06 + i * (Math.PI * 1.12 / (DOTS.length - 1));
    return { x: cx + Math.cos(a) * rPal * G.ring, y: cy + Math.sin(a) * rPal * G.ring, c };
  });

  // 안티에일리어싱: 픽셀당 3×3 슈퍼샘플
  const SS = 3, inv = 1 / (SS * SS);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
        let col = bg, op = bg ? 255 : 0;   // 배경이 null 이면 그 자리는 투명
        const dPal = Math.hypot(px - cx, py - cy);
        if (dPal <= rPal && Math.hypot(px - holeX, py - holeY) > rHole) {
          col = PALETTE; op = 255;
          for (const d of dots) {
            if (Math.hypot(px - d.x, py - d.y) <= rDot) { col = d.c; break; }
          }
        }
        if (col) { r += col[0]; g += col[1]; b += col[2]; }
        a += op;
      }
      const o = (y * W + x) * 4;
      buf[o] = Math.round(r * inv); buf[o + 1] = Math.round(g * inv);
      buf[o + 2] = Math.round(b * inv); buf[o + 3] = Math.round(a * inv);
    }
  }
  return encodePNG(W, H, buf);
}

/* ── 내보내기 ──────────────────────────────────────────────
   파일 이름·자리는 checkspeed 저장소에서 실제로 네이버 바로가기가 먹힌
   구성을 그대로 따랐다. 두 가지가 핵심이다:

   ① **전부 저장소 루트에 실제 파일로** 둔다. 수집기는 data URI 를 못 가져가고,
      경로는 `<link>` 의 상대 주소로만 찾는다.
   ② **경로를 절대/루트 기준으로 쓰지 말 것.** 이 사이트는 도메인 루트가 아니라
      `/baby/` 아래에 있어서 `/favicon.ico` 는 stepersjmj-hash.github.io/favicon.ico
      를 가리켜 깨진다. 같은 이유로 "루트 favicon.ico 폴백" 은 쓸 수 없다.

   파비콘은 배경 투명 + 팔레트가 캔버스를 꽉 채우고(frac 1),
   홈 화면 타일은 불투명 크림 배경 + 팔레트 71%(마스커블 안전영역 80% 안)다. */

/* 파비콘 — 투명, 꽉 차게 */
writeFileSync(join(ROOT, 'favicon-96.png'), render(96, 1, null));
console.log('wrote favicon-96.png');

/* favicon.ico — 16·32·48 을 한 파일에. ICO 는 PNG 를 그대로 품을 수 있다.
   ICONDIR 6바이트 + ICONDIRENTRY 16바이트 × n + PNG 본문들. */
{
  const pngs = [16, 32, 48].map((n) => ({ n, png: render(n, 1, null) }));
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0);                    // reserved
  dir.writeUInt16LE(1, 2);                    // type: 1 = icon
  dir.writeUInt16LE(pngs.length, 4);
  let off = 6 + 16 * pngs.length;             // 첫 본문 오프셋
  const ents = [], bodies = [];
  for (const { n, png } of pngs) {
    const e = Buffer.alloc(16);
    e[0] = n; e[1] = n;                       // 가로·세로 (0 이면 256)
    e[2] = 0; e[3] = 0;                       // 팔레트 색 수 · reserved
    e.writeUInt16LE(1, 4);                    // planes
    e.writeUInt16LE(32, 6);                   // bit depth
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(off, 12);
    off += png.length;
    ents.push(e); bodies.push(png);
  }
  writeFileSync(join(ROOT, 'favicon.ico'), Buffer.concat([dir, ...ents, ...bodies]));
  console.log('wrote favicon.ico (16·32·48)');
}

/* 홈 화면·바로가기 타일 — 불투명 크림 배경 */
writeFileSync(join(ROOT, 'apple-touch-icon.png'), render(180));
writeFileSync(join(ROOT, 'icon-192.png'), render(192));
writeFileSync(join(ROOT, 'icon-512.png'), render(512));
console.log('wrote apple-touch-icon.png · icon-192.png · icon-512.png');

/* SVG — 탭에서 어느 배율에도 선명하게. 파비콘과 같은 그림(투명·꽉 참)이다.
   엄지 구멍은 evenodd 로 진짜 구멍을 뚫는다 (배경색으로 덮으면 투명 위에서 티가 난다). */
{
  const R = 16, cx = 16, cy = 16;             // viewBox 32
  const n = (v) => Number(v.toFixed(2));
  const ring = R * G.ring, rDot = R * G.dot;
  const hx = n(cx + R * G.holeOff), hy = n(cy + R * G.holeOff), hr = n(R * G.hole);
  const circle = (x, y, r) => `M${n(x - r)} ${n(y)}a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0`;
  const dots = ['#ff4d4d', '#ff9f2e', '#ffe14d', '#4fd06b', '#4a90ff', '#a06bff'].map((c, i) => {
    const a = -Math.PI * 1.06 + i * (Math.PI * 1.12 / 5);
    return `<circle cx='${n(cx + Math.cos(a) * ring)}' cy='${n(cy + Math.sin(a) * ring)}' r='${n(rDot)}' fill='${c}'/>`;
  }).join('');
  writeFileSync(join(ROOT, 'icon.svg'),
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>"
    + `<path d='${circle(cx, cy, R)}${circle(hx, hy, hr)}' fill='#fffaf0' fill-rule='evenodd'/>`
    + dots
    + '</svg>\n', 'utf-8');
  console.log('wrote icon.svg');
}
