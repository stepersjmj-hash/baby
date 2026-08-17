/* ============================================================
   fill.js — 물감통(플러드 필)
   ------------------------------------------------------------
   · 색은 paint 레이어에 칠하고, 막는 벽은 lines 레이어(밑그림 선)다.
     두 레이어가 분리돼 있어 "선 안쪽만 칠하기"가 가능하다.
   · lines 의 알파값은 밑그림을 그릴 때 한 번만 Uint8Array 로 뽑아
     캐시한다 (매번 getImageData 하면 아이패드에서 눈에 띄게 버벅인다).
   · 밑그림 선은 안티에일리어싱 때문에 가장자리가 반투명이다.
     그대로 두면 색과 선 사이에 흰 테두리가 남으므로,
     칠한 뒤 반투명 구간으로 2px 번지게 해 틈을 메운다.
   · 2000×1400 급 캔버스를 다루므로 중간 버퍼는 전부 TypedArray.
   ============================================================ */

const WALL = 150;      // lines 알파가 이 이상이면 벽
const TOL  = 48;       // 시작 색과의 채널 합 차이 허용치

/** lines 캔버스의 알파 채널만 뽑아 캐시 */
export function alphaMask(lineCtx, W, H) {
  const d = lineCtx.getImageData(0, 0, W, H).data;
  const m = new Uint8Array(W * H);
  for (let i = 0, j = 3; i < m.length; i++, j += 4) m[i] = d[j];
  return m;
}

export function hexToRgba(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

/** @returns {boolean} 실제로 칠했으면 true */
export function floodFill(paintCtx, mask, W, H, sx, sy, rgba) {
  sx = Math.round(sx); sy = Math.round(sy);
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return false;
  if (mask[sy * W + sx] > WALL) return false;              // 선 위를 눌렀다

  const img = paintCtx.getImageData(0, 0, W, H);
  const p = img.data;
  const [R, G, B, A] = rgba;

  const s4 = (sy * W + sx) * 4;
  const t0 = p[s4], t1 = p[s4 + 1], t2 = p[s4 + 2], t3 = p[s4 + 3];
  if (Math.abs(t0 - R) + Math.abs(t1 - G) + Math.abs(t2 - B) + Math.abs(t3 - A) < 12)
    return false;                                          // 이미 같은 색

  const N = W * H;
  const seen = new Uint8Array(N);
  const filled = new Uint32Array(N);
  let nFilled = 0;

  let stack = new Int32Array(4096);
  let sp = 0;
  const push = (x, y) => {
    if (sp + 2 > stack.length) {
      const bigger = new Int32Array(stack.length * 2);
      bigger.set(stack); stack = bigger;
    }
    stack[sp++] = x; stack[sp++] = y;
  };

  const match = (i) => {
    if (seen[i] || mask[i] > WALL) return false;
    const k = i * 4;
    return Math.abs(p[k] - t0) + Math.abs(p[k + 1] - t1)
         + Math.abs(p[k + 2] - t2) + Math.abs(p[k + 3] - t3) <= TOL;
  };

  push(sx, sy);
  while (sp > 0) {
    const y = stack[--sp], x = stack[--sp];
    let i = y * W + x;
    if (!match(i)) continue;

    let xl = x;
    while (xl > 0 && match(i - 1)) { xl--; i--; }
    let xr = x, j = y * W + x;
    while (xr < W - 1 && match(j + 1)) { xr++; j++; }

    for (let k = xl; k <= xr; k++) {
      const m = y * W + k;
      seen[m] = 1;
      filled[nFilled++] = m;
      if (y > 0     && match(m - W)) push(k, y - 1);
      if (y < H - 1 && match(m + W)) push(k, y + 1);
    }
  }

  if (!nFilled) return false;

  for (let n = 0; n < nFilled; n++) {
    const k = filled[n] * 4;
    p[k] = R; p[k + 1] = G; p[k + 2] = B; p[k + 3] = A;
  }

  // 안티에일리어싱 틈 메우기: 칠한 영역에 붙어 있고 선이 완전히 진하지는 않은
  // 픽셀까지 2px 확장. 확장분은 어차피 검은 선 아래에 가려진다.
  let edge = filled.subarray(0, nFilled);
  const buf = new Uint32Array(N);
  for (let pass = 0; pass < 2; pass++) {
    let nNext = 0;
    for (let n = 0; n < edge.length; n++) {
      const m = edge[n];
      const x = m % W, y = (m / W) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = x + (d === 0 ? -1 : d === 1 ? 1 : 0);
        const ny = y + (d === 2 ? -1 : d === 3 ? 1 : 0);
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (seen[q] || mask[q] >= 252) continue;
        seen[q] = 1;
        const k = q * 4;
        p[k] = R; p[k + 1] = G; p[k + 2] = B; p[k + 3] = A;
        buf[nNext++] = q;
      }
    }
    if (!nNext) break;
    edge = buf.slice(0, nNext);
  }

  paintCtx.putImageData(img, 0, 0);
  return true;
}
