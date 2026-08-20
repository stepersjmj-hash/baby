/* ============================================================
   coloring/photopage.js — 사진 → 색칠용 외곽선(밑그림) 만들기
   ------------------------------------------------------------
   외부 라이브러리 없이 캔버스만으로 한다:

     ① 사진을 10:7 로 가운데 잘라 작은 작업판(500×350)에 넣는다
        — 축소 자체가 1차 잡음 제거다
     ② 흑백 → 박스 블러 2번 (자잘한 질감 제거)
     ③ 소벨(Sobel) 기울기 크기 → 문턱값으로 선 뽑기
        문턱은 사진마다 다르니 평균+표준편차로 적응시킨다
     ④ 한 번 굵히고(dilate) 1000×700 으로 부드럽게 확대
        — 앱 밑그림 잉크색(#241f1a)의 반투명 경계가 있는 선이 된다

   결과는 투명 배경 + 진한 선 캔버스. drawPage() 좌표계(1000×700)에
   그대로 drawImage 하면 되고, 물감통 벽(alphaMask)도 그대로 잡힌다.
   사진 특성상 영역이 완전히 닫히지 않을 수 있다 — 물감통이 옆으로
   번질 수 있지만 사진 페이지에서는 그러려니 한다.
   ============================================================ */

const W = 500, H = 350;                    // 작업판 (10:7)

/** 사진(Image)을 외곽선 캔버스(1000×700, 투명 배경)로 바꾼다 */
export function traceEdges(img) {
  // ① 가운데를 10:7 로 꽉 차게 잘라 넣는다
  const src = document.createElement('canvas');
  src.width = W; src.height = H;
  const sc = src.getContext('2d', { willReadFrequently: true });
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const k = Math.max(W / iw, H / ih);
  sc.drawImage(img, (iw - W / k) / 2, (ih - H / k) / 2, W / k, H / k, 0, 0, W, H);

  // ② 흑백 + 박스 블러 2번
  const d = sc.getImageData(0, 0, W, H).data;
  let g = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++)
    g[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
  for (let pass = 0; pass < 2; pass++) {
    const b = new Float32Array(W * H);
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        b[i] = (g[i - W - 1] + g[i - W] + g[i - W + 1] +
                g[i - 1]     + g[i]     + g[i + 1] +
                g[i + W - 1] + g[i + W] + g[i + W + 1]) / 9;
      }
    g = b;
  }

  // ③ 소벨 + 적응 문턱
  const mag = new Float32Array(W * H);
  let sum = 0, sum2 = 0, n = 0;
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx = (g[i - W + 1] + 2 * g[i + 1] + g[i + W + 1]) -
                 (g[i - W - 1] + 2 * g[i - 1] + g[i + W - 1]);
      const gy = (g[i + W - 1] + 2 * g[i + W] + g[i + W + 1]) -
                 (g[i - W - 1] + 2 * g[i - W] + g[i - W + 1]);
      const m = Math.hypot(gx, gy);
      mag[i] = m; sum += m; sum2 += m * m; n++;
    }
  const mean = sum / n;
  const sd = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  const T = Math.max(42, mean + sd * 0.9);

  // ④ 이진화 + 굵히기
  const bin = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (mag[i] >= T) bin[i] = 1;
  const fat = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (bin[i] || bin[i - 1] || bin[i + 1] || bin[i - W] || bin[i + W]) fat[i] = 1;
    }

  // 작은 이진맵 → 잉크색 픽셀 → 부드럽게 2배 확대
  const small = document.createElement('canvas');
  small.width = W; small.height = H;
  const smc = small.getContext('2d');
  const out = smc.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
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

/** 파일 → (긴 변 1400 으로 줄여) → 외곽선 PNG Blob */
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
