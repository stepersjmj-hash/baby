/* ============================================================
   make-sketch.mjs — NAS 색칠 도안 생성기 (맥 전용)
   ------------------------------------------------------------
   NAS 의 sketch 폴더(/Volumes/mjuploads/sketch)에 올려 둔 색칠 도안
   (흰 바탕 + 검은 선 그림)을 색칠하기 밑그림으로 가공한다:

     node tools/make-sketch.mjs          # 새로 올렸거나 바뀐 것만
     node tools/make-sketch.mjs --force  # 전부 다시

   한 장마다 두 가지를 만들어 **NAS 같은 폴더에** 둔다:
     <이름>.js   투명 선화 PNG 를 데이터 URI 로 감싼 JS
     list.js     목록 — window.HAICHU_SKETCH = [{id, name, v}]

   왜 이미지를 JS 로 감싸나 — NAS 는 CORS 헤더를 못 준다(정적 nginx,
   PHP 없음). 색칠하기는 밑그림 픽셀을 읽어야 해서(물감통 벽 계산,
   완성작 저장) 남의 origin 이미지를 <img> 로 가져오면 캔버스가 오염돼
   둘 다 죽는다. <script> 태그만은 CORS 제약이 없으므로, 영상 보기의
   list.js 요령을 이미지 본문까지 확장한 것이다. 앱(coloring/naspages.js)
   이 이 파일들을 script 로 읽는다.

   가공: sips 로 2000×1400 상자에 맞춰 줄인 BMP 를 뽑아 픽셀을 읽고,
   밝기를 잉크 알파로 바꾼다 (어두운 선 → 진한 잉크, 흰 바탕 → 투명).
   출력은 2000×1400(=밑그림 좌표계 1000×700 의 두 배) 투명 PNG 라
   앱은 내 사진 밑그림과 똑같이 drawImage 한 줄로 그린다.

   ★ 이 폴더는 **선 그림(도안) 전용**이다. 일반 사진을 색칠하고 싶으면
     앱 안 그림 고르기의 📷 (외곽선 따기)를 쓸 것.
   ============================================================ */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, statSync, rmSync, existsSync, mkdtempSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { deflateSync } from 'node:zlib';

const SRC = '/Volumes/mjuploads/sketch';
const FORCE = process.argv.includes('--force');
const OUT_W = 2000, OUT_H = 1400;          // 밑그림 좌표계(1000×700)의 두 배
const INK = [0x24, 0x1f, 0x1a];            // drawPage 의 선 색과 같다

if (!existsSync(SRC)) {
  console.error(`NAS 가 안 붙어 있다: ${SRC}\n파인더에서 smb://mjj 로 mjuploads 를 연결한 뒤 다시 돌릴 것.`);
  process.exit(1);
}

/* ── PNG 인코더 (make-icons.mjs 와 같은 방식 — 외부 패키지 없음) ── */
const CRC_T = new Uint32Array(256).map((_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_T[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++)
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;                              // 8bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ── BMP 읽기 — sips 가 뽑아 준 무압축 24/32bpp 만 다룬다 ── */
function readBMP(path) {
  const b = readFileSync(path);
  if (b[0] !== 0x42 || b[1] !== 0x4d) throw new Error('BMP 가 아니다');
  const off = b.readUInt32LE(10);
  const w = b.readInt32LE(18);
  let h = b.readInt32LE(22);
  const bpp = b.readUInt16LE(28);
  const comp = b.readUInt32LE(30);
  if (bpp !== 24 && bpp !== 32) throw new Error(`bpp ${bpp} 는 못 읽는다`);
  if (comp !== 0 && comp !== 3) throw new Error(`압축 ${comp} 는 못 읽는다`);
  const flip = h > 0; h = Math.abs(h);                   // 양수면 아래→위 저장
  const stride = Math.ceil(w * bpp / 8 / 4) * 4;
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const row = off + (flip ? h - 1 - y : y) * stride;
    for (let x = 0; x < w; x++) {
      const s = row + x * (bpp / 8), d = (y * w + x) * 4;
      px[d] = b[s + 2]; px[d + 1] = b[s + 1]; px[d + 2] = b[s];   // BGR(A) → RGB(A)
      px[d + 3] = bpp === 32 ? b[s + 3] : 255;
    }
  }
  return { w, h, px };
}

/* ── 한 장 가공: 밝기 → 잉크 알파 ── */
function convert(srcPath, tmp) {
  const dim = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', srcPath]).toString();
  const iw = +dim.match(/pixelWidth: (\d+)/)[1];
  const ih = +dim.match(/pixelHeight: (\d+)/)[1];
  const k = Math.min(OUT_W / iw, OUT_H / ih);
  const tw = Math.max(1, Math.round(iw * k)), th = Math.max(1, Math.round(ih * k));

  const bmp = join(tmp, 'a.bmp');
  execFileSync('sips', ['-s', 'format', 'bmp', '-z', String(th), String(tw), srcPath, '--out', bmp],
               { stdio: 'ignore' });
  const { w, h, px } = readBMP(bmp);

  // 그림을 2000×1400 종이 가운데에 앉힌다 (남는 자리는 투명)
  const out = Buffer.alloc(OUT_W * OUT_H * 4);
  const ox = (OUT_W - w) >> 1, oy = (OUT_H - h) >> 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4;
      const a0 = px[s + 3] / 255;                        // 투명 원본은 흰 바탕에 얹은 셈으로
      const r = px[s] * a0 + 255 * (1 - a0);
      const g = px[s + 1] * a0 + 255 * (1 - a0);
      const bl = px[s + 2] * a0 + 255 * (1 - a0);
      const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
      // 어두울수록 진한 잉크. 120 아래는 꽉 찬 선(물감통 벽 알파 150 을
      // 넉넉히 넘는다), 200 위는 종이. 사이는 안티에일리어싱 살리는 경사.
      const a = lum >= 200 ? 0 : lum <= 120 ? 255 : Math.round((200 - lum) / 80 * 255);
      if (!a) continue;
      const d = ((oy + y) * OUT_W + ox + x) * 4;
      out[d] = INK[0]; out[d + 1] = INK[1]; out[d + 2] = INK[2]; out[d + 3] = a;
    }
  return encodePNG(OUT_W, OUT_H, out);
}

/* ── 폴더 훑기 ── */
const files = readdirSync(SRC)
  .filter(f => /\.(png|jpe?g)$/i.test(f) && !f.startsWith('.') && !f.startsWith('_'))
  .map(f => f.normalize('NFC'))                          // 맥 NFD 파일명 대비
  .sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));

const tmp = mkdtempSync(join(tmpdir(), 'sketch-'));
const list = [];
let made = 0;

for (const f of files) {
  const src = join(SRC, f);
  const id = basename(f).replace(/\.[^.]+$/, '');
  const js = join(SRC, id + '.js');
  const v = Math.floor(statSync(src).mtimeMs / 1000);
  list.push({ id, name: /^\d+$/.test(id) ? `도안 ${id}` : id, v });

  if (!FORCE && existsSync(js) && statSync(js).mtimeMs > statSync(src).mtimeMs) {
    console.log(`  = ${id} (그대로)`);
    continue;
  }
  try {
    const png = convert(src, tmp);
    const uri = 'data:image/png;base64,' + png.toString('base64');
    writeFileSync(js,
      `(window.HAICHU_SKETCH_IMG=window.HAICHU_SKETCH_IMG||{})[${JSON.stringify(id)}]=${JSON.stringify(uri)};\n`);
    made++;
    console.log(`  + ${id} (${(png.length / 1024).toFixed(0)}KB)`);
  } catch (e) {
    list.pop();                                          // 못 만든 건 목록에서도 뺀다
    console.error(`  ! ${f}: ${e.message}`);
  }
}

/* 목록 + 고아 정리 (비교는 NFC 로 — 음성 팩에서 배운 함정) */
writeFileSync(join(SRC, 'list.js'),
  `window.HAICHU_SKETCH=${JSON.stringify(list)};\n`);
const keep = new Set(list.map(e => e.id + '.js'));
for (const f of readdirSync(SRC)) {
  const n = f.normalize('NFC');
  if (n.endsWith('.js') && n !== 'list.js' && !keep.has(n)) {
    rmSync(join(SRC, f));
    console.log(`  - ${n} (원본이 없어져 지움)`);
  }
}
rmSync(tmp, { recursive: true, force: true });
console.log(`도안 ${list.length}장 (새로 만든 것 ${made}장) → ${SRC}`);
