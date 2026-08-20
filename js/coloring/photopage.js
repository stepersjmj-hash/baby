/* ============================================================
   coloring/photopage.js — 사진 → 색칠용 외곽선(밑그림) 만들기
   ------------------------------------------------------------
   외부 라이브러리 없이 캔버스만으로, 캐니(Canny) 방식을 쓴다.
   단순 소벨+문턱은 실제 사진에서 선이 두껍게 뭉치고 잡티가 많았다.

     ① 사진을 10:7 로 가운데 잘라 작업판(560×392)에 넣는다
     ② 흑백 + 대비 자동 보정 (어둡거나 뿌연 사진도 살린다)
     ③ 가우시안 근사 블러 (박스 블러 3번)
     ④ 소벨 기울기 → 크기·방향
     ⑤ 비최대 억제 — 기울기 방향으로 최대인 픽셀만 남긴다 (선이 얇아진다)
     ⑥ 이력(hysteresis) 문턱 — 강한 선에서 시작해 이어진 약한 선까지 살린다
        (문턱은 백분위로 사진마다 적응). 끊긴 윤곽이 이어진다
     ⑦ 작은 조각 제거 — 잔디·머리카락 같은 자잘한 질감 잡티를 지운다
     ⑧ 한 번 굵혀서 1000×700 으로 부드럽게 확대

   결과는 투명 배경 + 진한 선 캔버스. drawPage() 좌표계(1000×700)에
   그대로 drawImage 하면 되고, 물감통 벽(alphaMask)도 그대로 잡힌다.
   ============================================================ */

const W = 560, H = 392;                    // 작업판 (10:7)

/** 사진(Image)을 외곽선 캔버스(1000×700, 투명 배경)로 바꾼다 */
export function traceEdges(img) {
  const N = W * H;

  // ① 가운데를 10:7 로 꽉 차게 잘라 넣는다
  const src = document.createElement('canvas');
  src.width = W; src.height = H;
  const sc = src.getContext('2d', { willReadFrequently: true });
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const k = Math.max(W / iw, H / ih);
  sc.drawImage(img, (iw - W / k) / 2, (ih - H / k) / 2, W / k, H / k, 0, 0, W, H);

  // ② 채널별 대비 자동 보정 (2%~98% 백분위를 0~255 로).
  //    흑백으로 뭉치지 않는 이유: 살구색 얼굴 vs 하늘색처럼 "밝기는 같고
  //    색만 다른" 경계가 사진에 흔하다 — 채널별로 봐야 잡힌다.
  const d = sc.getImageData(0, 0, W, H).data;
  const CH = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
  for (let ch = 0; ch < 3; ch++) {
    const a = CH[ch];
    const hist = new Uint32Array(256);
    for (let i = 0; i < N; i++) { a[i] = d[i * 4 + ch]; hist[a[i] | 0]++; }
    let lo = 0, hi = 255, acc = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= N * 0.02) { lo = v; break; } }
    acc = 0;
    for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= N * 0.02) { hi = v; break; } }
    const stretch = hi > lo + 8 ? 255 / (hi - lo) : 1;
    for (let i = 0; i < N; i++) a[i] = Math.max(0, Math.min(255, (a[i] - lo) * stretch));
  }

  // ②b 미디언 필터 + ③ 블러 4번 — 채널별로 (점 잡음·질감 제거)
  const w9 = new Float32Array(9);
  for (let ch = 0; ch < 3; ch++) {
    let a = CH[ch];
    const m = new Float32Array(N);
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        w9[0] = a[i - W - 1]; w9[1] = a[i - W]; w9[2] = a[i - W + 1];
        w9[3] = a[i - 1];     w9[4] = a[i];     w9[5] = a[i + 1];
        w9[6] = a[i + W - 1]; w9[7] = a[i + W]; w9[8] = a[i + W + 1];
        for (let q = 0; q < 5; q++) {
          let mi = q;
          for (let b = q + 1; b < 9; b++) if (w9[b] < w9[mi]) mi = b;
          const t = w9[q]; w9[q] = w9[mi]; w9[mi] = t;
        }
        m[i] = w9[4];
      }
    a = m;
    for (let pass = 0; pass < 4; pass++) {
      const b = new Float32Array(N);
      for (let y = 1; y < H - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          b[i] = (a[i - W - 1] + a[i - W] + a[i - W + 1] +
                  a[i - 1]     + a[i]     + a[i + 1] +
                  a[i + W - 1] + a[i + W] + a[i + W + 1]) / 9;
        }
      a = b;
    }
    CH[ch] = a;
  }

  // ④ 소벨: 크기 + 방향(4구간)
  const mag = new Float32Array(N);
  const dir = new Uint8Array(N);           // 0=가로 1=↗ 2=세로 3=↘
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      let bm = 0, bgx = 0, bgy = 0;
      for (let ch = 0; ch < 3; ch++) {
        const a = CH[ch];
        const gx = (a[i - W + 1] + 2 * a[i + 1] + a[i + W + 1]) -
                   (a[i - W - 1] + 2 * a[i - 1] + a[i + W - 1]);
        const gy = (a[i + W - 1] + 2 * a[i + W] + a[i + W + 1]) -
                   (a[i - W - 1] + 2 * a[i - W] + a[i - W + 1]);
        const m = Math.hypot(gx, gy);
        if (m > bm) { bm = m; bgx = gx; bgy = gy; }
      }
      mag[i] = bm;
      dir[i] = Math.round(Math.atan2(bgy, bgx) / (Math.PI / 4)) & 3;
    }

  // ⑤ 비최대 억제 — 기울기 방향의 양옆보다 크지 않으면 지운다
  const OFF = [
    [1, 0],            // 기울기 가로 → 이웃 좌우
    [1, 1],            // ↗ → 대각
    [0, 1],            // 세로 → 상하
    [1, -1]            // ↘ → 반대 대각
  ];
  const thin = new Float32Array(N);
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!mag[i]) continue;
      const [dx, dy] = OFF[dir[i]];
      if (mag[i] >= mag[i + dy * W + dx] && mag[i] >= mag[i - dy * W - dx]) thin[i] = mag[i];
    }

  // ⑥ 이력 문턱 — 강한 선(상위 백분위)에서 시작해 이어진 약한 선까지
  const nz = [];
  for (let i = 0; i < N; i++) if (thin[i] > 0) nz.push(thin[i]);
  nz.sort((a, b) => a - b);
  const highT = Math.max(30, nz[Math.floor(nz.length * 0.82)] ?? 40);
  const lowT = highT * 0.5;
  const edge = new Uint8Array(N);          // 0 없음 · 1 약함 · 2 확정
  const stack = [];
  for (let i = 0; i < N; i++) {
    if (thin[i] >= highT) { edge[i] = 2; stack.push(i); }
    else if (thin[i] >= lowT) edge[i] = 1;
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % W, y = (i / W) | 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (edge[j] === 1) { edge[j] = 2; stack.push(j); }
      }
  }

  // ⑥b 질감 억제 — 엣지가 빽빽한 칸(잔디·나뭇잎·머리카락)은 질감이다.
  //    그 칸에서는 아주 강한 선만 남긴다. 인물·물체의 경계는 질감 잡음보다
  //    훨씬 강해서 살아남고, 질감 내부의 자잘한 선만 사라진다.
  {
    const CELL = 16;
    const cw = Math.ceil(W / CELL), chh = Math.ceil(H / CELL);
    const density = new Uint16Array(cw * chh);
    for (let i = 0; i < N; i++)
      if (edge[i] === 2) density[((i / W | 0) / CELL | 0) * cw + ((i % W) / CELL | 0)]++;
    const dense = CELL * CELL * 0.18;
    const strongT = highT * 1.6;
    for (let i = 0; i < N; i++) {
      if (edge[i] !== 2) continue;
      const cell = ((i / W | 0) / CELL | 0) * cw + ((i % W) / CELL | 0);
      if (density[cell] > dense && thin[i] < strongT) edge[i] = 0;
    }
  }

  // ⑦ 조각 걸러내기 — 잡티(질감 부스러기)의 특징은 "작으면서 약하다".
  //    진짜 윤곽은 길게 이어지거나(크기), 대비가 세다(평균 세기).
  //    그래서 작아도 강한 조각(눈·입 같은 디테일)은 살아남는다.
  const MIN_CC = 24;                       // 이보다 작으면 무조건 잡티
  const BIG_CC = 140;                      // 이보다 크면 무조건 윤곽
  const seen = new Uint8Array(N);
  const keep = new Uint8Array(N);
  const comp = [];
  for (let i = 0; i < N; i++) {
    if (edge[i] !== 2 || seen[i]) continue;
    comp.length = 0;
    comp.push(i); seen[i] = 1;
    let power = 0;
    for (let head = 0; head < comp.length; head++) {
      const c = comp[head];
      power += thin[c];
      const x = c % W, y = (c / W) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx;
          if (edge[j] === 2 && !seen[j]) { seen[j] = 1; comp.push(j); }
        }
    }
    const ok = comp.length >= MIN_CC &&
               (comp.length >= BIG_CC || power / comp.length >= highT * 1.3);
    if (ok) for (const c of comp) keep[c] = 1;
  }

  // ⑧ 8방향으로 두 번 굵힌다 — 선이 도톰해지고, 비최대 억제가 남긴
  //    1~2px 틈이 메워져 물감통이 덜 샌다
  let fat = keep;
  for (let pass = 0; pass < 2; pass++) {
    const f2 = new Uint8Array(N);
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (fat[i] || fat[i - 1] || fat[i + 1] || fat[i - W] || fat[i + W] ||
            fat[i - W - 1] || fat[i - W + 1] || fat[i + W - 1] || fat[i + W + 1]) f2[i] = 1;
      }
    fat = f2;
  }

  const small = document.createElement('canvas');
  small.width = W; small.height = H;
  const smc = small.getContext('2d');
  const out = smc.createImageData(W, H);
  for (let i = 0; i < N; i++) {
    if (!fat[i]) continue;
    out.data[i * 4] = 0x24; out.data[i * 4 + 1] = 0x1f; out.data[i * 4 + 2] = 0x1a;
    out.data[i * 4 + 3] = 255;
  }
  smc.putImageData(out, 0, 0);

  const art = document.createElement('canvas');
  art.width = 1000; art.height = 700;
  const ac = art.getContext('2d');
  ac.imageSmoothingEnabled = true;
  ac.drawImage(small, 0, 0, 1000, 700);
  return art;
}

/** 파일 → 외곽선 PNG Blob */
export async function photoToLineArt(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i); i.onerror = rej;
      i.src = url;
    });
    const art = traceEdges(img);
    return await new Promise(res => art.toBlob(res, 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}
