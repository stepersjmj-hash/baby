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

function render(S) {
  const buf = Buffer.alloc(S * S * 4);
  const cx = S / 2, cy = S / 2;
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
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
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
      const o = (y * S + x) * 4;
      buf[o] = Math.round(r * inv); buf[o + 1] = Math.round(g * inv);
      buf[o + 2] = Math.round(b * inv); buf[o + 3] = 255;
    }
  }
  return encodePNG(S, S, buf);
}

mkdirSync(join(ROOT, 'assets'), { recursive: true });
for (const size of [180, 192, 512]) {
  const file = join(ROOT, 'assets', `icon-${size}.png`);
  writeFileSync(file, render(size));
  console.log('wrote', file);
}
