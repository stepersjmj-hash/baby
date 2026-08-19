/* ============================================================
   puzzle/cut.js — 그림을 퍼즐 조각으로 자른다
   ------------------------------------------------------------
   화면과 자가 점검이 같이 쓴다 (조각 위치를 모르면 점검이
   실제 드래그를 흉내낼 수 없다 — match/board.js 와 같은 이유).

   조각은 직사각형에 반원 혹(knob)을 붙이거나 판 것이다.
   맞닿은 두 조각은 같은 자리에 한쪽은 혹, 한쪽은 홈을 가진다 —
   진짜 퍼즐처럼 서로 물린다. 혹의 방향은 씨앗 난수로 정하므로
   같은 문제는 언제나 같은 모양으로 잘린다.

   좌표계는 VIEW 1000×700. 그림판(PIC)은 왼쪽, 조각은 오른쪽에 흩어 둔다.

   자르기는 난이도가 조각 수만 정하고(하 3 · 중 5 · 상 8), 모양은
   씨앗 난수로 매번 다르게 쪼갠다 — 가장 큰 조각을 반복해서 세로/가로로
   가르는 방식(BSP)이라 같은 3조각이라도 열 때마다 다르게 잘린다.
   ============================================================ */

import { rng } from '../core/pen.js';

export const VIEW = { w: 1000, h: 700 };
export const PIC  = { x: 46, y: 148, w: 560, h: 420 };   // 맞추는 판
export const SCAT = { x: 648, y: 140, w: 320, h: 500 };  // 조각 흩는 곳
export const SNAP = 48;                                   // 이 안에 놓으면 착 붙는다

export const PIECES = { 1: 3, 2: 5, 3: 8 };

/**
 * 그림을 n 조각의 직사각형으로 무작위 분할한다.
 * 가장 큰 조각을 골라 긴 쪽으로 가른다. 모든 변이 min 이상이어야
 * 조각을 집기 쉽고, 이웃 조각의 제자리끼리 SNAP 보다 멀어진다.
 * min 을 지키다 조각 수를 못 채우면 min 을 줄여 다시 시도한다
 * (min 92 면 8조각은 항상 나온다 — 넓이 계산상 92²×7 < 전체).
 */
function cutRects(n, w, h, rnd, min = 112) {
  const rects = [{ x: 0, y: 0, w, h }];
  let guard = 0;
  while (rects.length < n && guard++ < 80) {
    rects.sort((a, b) => b.w * b.h - a.w * a.h);
    const r = rects.shift();
    const canV = r.w >= min * 2, canH = r.h >= min * 2;
    if (!canV && !canH) { rects.push(r); break; }
    const vert = canV && (!canH || rnd() < (r.w >= r.h ? 0.72 : 0.28));
    const size = vert ? r.w : r.h;
    const cut = Math.max(min, Math.min(size - min, Math.round(size * (0.36 + rnd() * 0.28))));
    if (vert) rects.push({ x: r.x, y: r.y, w: cut, h: r.h },
                         { x: r.x + cut, y: r.y, w: r.w - cut, h: r.h });
    else rects.push({ x: r.x, y: r.y, w: r.w, h: cut },
                    { x: r.x, y: r.y + cut, w: r.w, h: r.h - cut });
  }
  if (rects.length < n && min > 92) return cutRects(n, w, h, rnd, min - 10);
  return rects;
}

const keyOf = (x1, y1, x2, y2) =>
  [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)]
    .map(v => Math.round(v * 10)).join(',');

/**
 * 한 변을 이웃 조각과 맞닿는 구간들로 쪼갠다.
 * 우리 배치는 빈틈없이 덮으므로, 이웃이 없으면 그 변 전체가 그림 테두리다.
 */
function edgeSegs(rects, i, edge) {
  const r = rects[i];
  const horiz = edge === 'top' || edge === 'bottom';
  const line = edge === 'top' ? r.y : edge === 'bottom' ? r.y + r.h
             : edge === 'left' ? r.x : r.x + r.w;
  const lo0 = horiz ? r.x : r.y, hi0 = horiz ? r.x + r.w : r.y + r.h;

  const nb = [];
  rects.forEach((o, j) => {
    if (j === i) return;
    const oline = edge === 'top' ? o.y + o.h : edge === 'bottom' ? o.y
                : edge === 'left' ? o.x + o.w : o.x;
    if (Math.abs(oline - line) > 0.5) return;
    const lo = Math.max(lo0, horiz ? o.x : o.y);
    const hi = Math.min(hi0, horiz ? o.x + o.w : o.y + o.h);
    if (hi - lo > 1) nb.push({ lo, hi });
  });

  let segs = nb.length
    ? nb.sort((a, b) => a.lo - b.lo)
        .map(s => horiz ? { x1: s.lo, y1: line, x2: s.hi, y2: line, inner: true }
                        : { x1: line, y1: s.lo, x2: line, y2: s.hi, inner: true })
    : [horiz ? { x1: lo0, y1: line, x2: hi0, y2: line, inner: false }
             : { x1: line, y1: lo0, x2: line, y2: hi0, inner: false }];

  // 시계 방향으로 돌므로 아래변은 오른→왼, 왼변은 아래→위로 걷는다
  if (edge === 'bottom' || edge === 'left')
    segs = segs.reverse().map(s => ({ ...s, x1: s.x2, y1: s.y2, x2: s.x1, y2: s.y1 }));
  return segs;
}

/** 변이 조각 바깥을 보는 방향 (시계 방향 걷기 기준) */
const OUT = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };

/**
 * @returns pieces[]
 *   rect    : 그림 안에서의 자리 (그림-로컬)
 *   home    : 제자리 중심 (VIEW 좌표)
 *   pos     : 지금 놓인 중심 (VIEW 좌표) — 처음엔 흩어 둔 곳
 *   segs    : 테두리 [{x1,y1,x2,y2,knob,r}] (그림-로컬, 시계 방향)
 *   margin  : 혹이 튀어나오는 만큼의 여백
 */
export function buildPuzzle(level, seed = 1) {
  // 자르기·혹 방향·흩는 자리 전부 이 난수 하나에서 나온다.
  // 같은 (level, seed) 면 언제나 같은 퍼즐 — 자가 점검이 이걸 쓴다.
  const rnd = rng(((level.seed || 1) * 31 + seed) >>> 0);
  const rects = cutRects(PIECES[level.hard], PIC.w, PIC.h, rnd);
  const bump = new Map();          // 변 → 혹이 어느 쪽(+/-축)으로 솟는가

  const pieces = rects.map((rect, i) => {
    const segs = [];
    for (const edge of ['top', 'right', 'bottom', 'left']) {
      const [ox, oy] = OUT[edge];
      for (const s of edgeSegs(rects, i, edge)) {
        if (!s.inner) { segs.push({ ...s, knob: 0, r: 0 }); continue; }
        const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
        if (len < 72) { segs.push({ ...s, knob: 0, r: 0 }); continue; }   // 짧은 맞닿음엔 혹 생략
        const k = keyOf(s.x1, s.y1, s.x2, s.y2);
        if (!bump.has(k)) bump.set(k, rnd() < 0.5 ? 1 : -1);
        const side = bump.get(k);                      // 가로변: +1=아래, 세로변: +1=오른쪽
        const outSign = (s.y1 === s.y2) ? oy : ox;
        segs.push({ ...s, knob: side === outSign ? 1 : -1, r: Math.min(len * 0.30, 30) });
      }
    }
    const margin = Math.max(0, ...segs.map(s => s.knob === 1 ? s.r : 0)) + 4;
    return {
      id: i, rect, segs, margin,
      home: { x: PIC.x + rect.x + rect.w / 2, y: PIC.y + rect.y + rect.h / 2 },
      pos: { x: 0, y: 0 }
    };
  });

  // 오른쪽에 흩어 둔다
  const srnd = rnd;
  for (const p of pieces) {
    const hw = p.rect.w / 2 + p.margin, hh = p.rect.h / 2 + p.margin;
    const x0 = Math.max(SCAT.x + hw, SCAT.x), x1 = Math.min(SCAT.x + SCAT.w, VIEW.w - hw - 6);
    const y0 = Math.max(SCAT.y + hh, SCAT.y), y1 = Math.min(SCAT.y + SCAT.h, VIEW.h - hh - 6);
    p.pos = { x: x0 + srnd() * Math.max(1, x1 - x0), y: y0 + srnd() * Math.max(1, y1 - y0) };
  }
  return pieces;
}

/** 조각 테두리를 경로로 그린다. s = 배율, (ox,oy) = 그림-로컬 원점의 화면 위치 */
export function tracePiece(ctx, piece, s, ox, oy) {
  const g0 = piece.segs[0];
  ctx.moveTo(g0.x1 * s + ox, g0.y1 * s + oy);
  for (const g of piece.segs) {
    if (!g.knob) { ctx.lineTo(g.x2 * s + ox, g.y2 * s + oy); continue; }
    const mx = (g.x1 + g.x2) / 2, my = (g.y1 + g.y2) / 2;
    const len = Math.hypot(g.x2 - g.x1, g.y2 - g.y1);
    const dx = (g.x2 - g.x1) / len, dy = (g.y2 - g.y1) / len;
    const ax = mx - dx * g.r, ay = my - dy * g.r;
    const bx = mx + dx * g.r, by = my + dy * g.r;
    ctx.lineTo(ax * s + ox, ay * s + oy);
    // 시계 방향 걷기에서는 반시계 호가 바깥쪽(혹), 시계 호가 안쪽(홈)이 된다
    ctx.arc(mx * s + ox, my * s + oy, g.r * s,
            Math.atan2(ay - my, ax - mx), Math.atan2(by - my, bx - mx), g.knob < 0);
    ctx.lineTo(g.x2 * s + ox, g.y2 * s + oy);
  }
  ctx.closePath();
}
