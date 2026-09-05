/* ============================================================
   trace/maze.js — 미로 찾기
   ------------------------------------------------------------
   미로도 결국 "정해진 길을 따라가기" 라서 같은 판정 엔진을 쓴다.
   다른 점은 길을 그려 주지 않고 벽을 그린다는 것뿐이다
   (runner 의 guide:false + level.walls).

   막다른 길로 새면 진행이 멈출 뿐 벌점은 없다. 되돌아 나오면 이어진다.

   **미로는 코스에 들어갈 때마다 새로 판다** (trace/index.js 의 course.fresh).
   같은 미로가 계속 나오면 금방 지루해지기 때문이다. 칸 수(난이도 순서)와
   id·주인공은 그대로라 아이가 모은 별은 남는다.
   벽을 뚫고 질러가지 못하는 이유: 허용 오차(tol)를 칸 크기의 0.42 로
   두어 옆 통로(한 칸 = 벽 하나 너머)까지 닿지 않기 때문이다.
   ============================================================ */

import { poly, buildLevel, createTracer } from '../core/trace.js';
import { rng } from '../core/pen.js';

/** 재귀 백트래킹으로 방 cols×rows 짜리 미로를 판다 → (2c+1)×(2r+1) 격자 */
function carve(cols, rows, seed) {
  const W = cols * 2 + 1, H = rows * 2 + 1;
  const g = Array.from({ length: H }, () => new Array(W).fill('#'));
  const seen = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const rnd = rng(seed);
  const stack = [[0, 0]];
  seen[0][0] = true;
  g[1][1] = '.';
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => [cx + dx, cy + dy])
      .filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !seen[y][x]);
    if (!nb.length) { stack.pop(); continue; }
    const [nx, ny] = nb[Math.floor(rnd() * nb.length)];
    seen[ny][nx] = true;
    g[ny * 2 + 1][nx * 2 + 1] = '.';
    g[cy + ny + 1][cx + nx + 1] = '.';          // 두 방 사이의 벽을 튼다
    stack.push([nx, ny]);
  }
  return g;
}

/** 너비 우선 탐색으로 최단 경로를 찾는다 */
function solve(g, from, to) {
  const H = g.length, W = g[0].length;
  const prev = new Map();
  const key = ([x, y]) => y * W + x;
  const q = [from];
  prev.set(key(from), null);
  while (q.length) {
    const cur = q.shift();
    if (cur[0] === to[0] && cur[1] === to[1]) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = [cur[0] + dx, cur[1] + dy];
      if (n[0] < 0 || n[1] < 0 || n[0] >= W || n[1] >= H) continue;
      if (g[n[1]][n[0]] === '#' || prev.has(key(n))) continue;
      prev.set(key(n), cur);
      q.push(n);
    }
  }
  const path = [];
  for (let c = to; c; c = prev.get(key(c))) path.push(c);
  return path.reverse();
}

function makeMaze({ id, name, ico, cols, rows, seed, from, to }) {
  const g = carve(cols, rows, seed);
  const W = g[0].length, H = g.length;
  const cell = Math.min(920 / W, 620 / H);
  const ox = (1000 - W * cell) / 2, oy = (700 - H * cell) / 2;
  const at = ([x, y]) => [ox + (x + 0.5) * cell, oy + (y + 0.5) * cell];

  const route = solve(g, [1, 1], [W - 2, H - 2]).map(at);
  const walls = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (g[y][x] === '#') walls.push([ox + x * cell, oy + y * cell, cell, cell]);

  return { id, name, ico, from, to,
           strokes: [poly(route)], walls, tol: cell * 0.42 };
}

/* ── 원형 미로 ────────────────────────────────────────────
   네모 미로와 같은 판정 엔진을 쓰지만 격자가 극좌표다.
   가운데 방(hub) 하나 + 고리(ring) × 부채꼴(sector).
     · 같은 고리의 옆 방과는 **호**로, 안팎 고리와는 **반지름 방향**으로 통한다
     · 가운데 방으로 들어가는 문은 하나뿐이다 (도안 그림과 같은 모양)
     · 출발은 바깥 테두리에 뚫은 입구, 도착은 가운데 방
   벽은 네모 미로처럼 칸을 채우지 않고 **선**으로 긋는다(wallPaths) —
   원에서 칸을 채우면 통로가 부채꼴로 일그러져 오히려 읽기 어렵다.
   대신 통로 폭이 벽 두께에 안 먹히므로 같은 크기에 더 촘촘히 들어간다. */

const CX = 500, CY = 350, RMAX = 300;      // 1000×700 안에 앉는 가장 큰 원
const pol = (r, a) => [CX + Math.cos(a) * r, CY + Math.sin(a) * r];

/** 극좌표 격자를 판다. cw[i][j] = (i,j)와 (i,j+1)이 트였나, out[i][j] = (i,j)와 (i+1,j) */
function carveRadial(rings, sectors, seed) {
  const rnd = rng(seed);
  const grid = (v) => Array.from({ length: rings }, () => new Array(sectors).fill(v));
  const cw = grid(false), out = grid(false), seen = grid(false);
  const door = Math.floor(rnd() * sectors);           // 가운데 방으로 드나드는 자리
  const stack = [[0, door]];
  seen[0][door] = true;
  while (stack.length) {
    const [i, j] = stack[stack.length - 1];
    const jl = (j + sectors - 1) % sectors, jr = (j + 1) % sectors;
    const nb = [];
    if (!seen[i][jl]) nb.push([i, jl, () => { cw[i][jl] = true; }]);
    if (!seen[i][jr]) nb.push([i, jr, () => { cw[i][j] = true; }]);
    if (i > 0 && !seen[i - 1][j]) nb.push([i - 1, j, () => { out[i - 1][j] = true; }]);
    if (i < rings - 1 && !seen[i + 1][j]) nb.push([i + 1, j, () => { out[i][j] = true; }]);
    if (!nb.length) { stack.pop(); continue; }
    const [ni, nj, open] = nb[Math.floor(rnd() * nb.length)];
    open();
    seen[ni][nj] = true;
    stack.push([ni, nj]);
  }
  return { cw, out, door };
}

/** 입구 방 → 가운데 방까지의 최단 경로 (칸 목록) */
function solveRadial({ cw, out }, rings, sectors, from, to) {
  const key = ([i, j]) => i * sectors + j;
  const prev = new Map([[key(from), null]]);
  const q = [from];
  while (q.length) {
    const [i, j] = q.shift();
    if (i === to[0] && j === to[1]) break;
    const jl = (j + sectors - 1) % sectors, jr = (j + 1) % sectors;
    const nb = [];
    if (cw[i][jl]) nb.push([i, jl]);
    if (cw[i][j]) nb.push([i, jr]);
    if (i > 0 && out[i - 1][j]) nb.push([i - 1, j]);
    if (i < rings - 1 && out[i][j]) nb.push([i + 1, j]);
    for (const n of nb) if (!prev.has(key(n))) { prev.set(key(n), [i, j]); q.push(n); }
  }
  const path = [];
  for (let c = to; c; c = prev.get(key(c))) path.push(c);
  return path.reverse();
}

function makeRadialMaze({ id, name, ico, rings, sectors, hub, seed, from, to }) {
  const A = 2 * Math.PI / sectors;                    // 부채꼴 하나의 각
  const dr = (RMAX - hub) / rings;                    // 고리 하나의 폭
  const rc = (i) => hub + (i + 0.5) * dr;             // 고리 i 의 한가운데 반지름
  const ac = (j) => (j + 0.5) * A;                    // 부채꼴 j 의 한가운데 각
  const { cw, out, door } = carveRadial(rings, sectors, seed);
  const rnd = rng(seed ^ 0x5f3a);
  const ent = Math.floor(rnd() * sectors);            // 바깥 테두리에 뚫는 입구

  /* 길: 입구 밖 → 입구 방 → … → 가운데 방.
     같은 고리 안에서 움직일 때는 호를 따라 점을 찍어야 한다
     (곧게 이으면 벽을 뚫고 지나간다). */
  const cells = solveRadial({ cw, out }, rings, sectors, [rings - 1, ent], [0, door]);
  const route = [pol(RMAX + 20, ac(ent))];            // 주인공은 문 밖에서 기다린다
  route.push(pol(rc(rings - 1), ac(ent)));
  for (let k = 1; k < cells.length; k++) {
    const [pi, pj] = cells[k - 1], [i, j] = cells[k];
    if (i === pi) {                                   // 같은 고리 = 호를 따라
      const step = (j - pj === 1 || j - pj === -(sectors - 1)) ? 1 : -1;
      const a0 = ac(pj), a1 = a0 + step * A;
      for (let t = 1; t <= 8; t++) route.push(pol(rc(i), a0 + (a1 - a0) * t / 8));
    } else {                                          // 안팎 고리 = 곧게
      route.push(pol(rc(i), ac(j)));
    }
  }
  route.push([CX, CY]);                               // 가운데 방

  /* 벽. 호는 점을 찍어 꺾은선으로 만든다 (길이에 따라 촘촘하게) */
  const walls = [];
  const arcAt = (r, a0, a1) => {
    const n = Math.max(3, Math.ceil(Math.abs(a1 - a0) * r / 10));
    const pts = [];
    for (let t = 0; t <= n; t++) pts.push(pol(r, a0 + (a1 - a0) * t / n));
    walls.push(pts);
  };
  arcAt(RMAX, (ent + 1) * A, ent * A + 2 * Math.PI);   // 바깥 테두리 (입구만 뚫고)
  arcAt(hub, (door + 1) * A, door * A + 2 * Math.PI);  // 가운데 방 (문만 뚫고)
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < sectors; j++) {
      if (!cw[i][j])                                   // 옆 방과의 칸막이 (반지름 방향)
        walls.push([pol(hub + i * dr, (j + 1) * A), pol(hub + (i + 1) * dr, (j + 1) * A)]);
      if (i < rings - 1 && !out[i][j])                 // 바깥 고리와의 칸막이 (호)
        arcAt(hub + (i + 1) * dr, j * A, (j + 1) * A);
    }

  /* 허용 오차는 통로 간격의 절반보다 작아야 옆 통로로 건너뛰지 않는다.
     원에서는 두 방향의 간격이 다르다 — 반지름 쪽은 dr, 호 쪽은 가장
     안쪽 고리에서 제일 좁다(반지름이 작아서). 좁은 쪽에 맞춘다. */
  const tol = 0.4 * Math.min(dr, rc(0) * A);
  return { id, name, ico, from, to,
           strokes: [poly(route.map(([x, y]) => [x, y]))],
           wallPaths: walls, wallW: 8, tol };
}

/* 방 수(cols×rows)가 커질수록 어렵다. 쉬운 것부터 늘어놓는다.
   여정마다 주인공과 목적지가 달라 "무엇을 어디로" 를 그림으로 알린다.
   기존 z1~z4 는 id 를 지켜 아이가 모은 별이 그대로 남는다.
   씨앗은 여기 없다 — 열 때마다 새로 뽑는다(newMazes). */
const PLAN = [
  { id: 'z1',  name: '치즈',    ico: '🧀', cols: 3, rows: 2, from: '🐭', to: '🧀' },
  { id: 'z5',  name: '뼈다귀',  ico: '🦴', cols: 4, rows: 2, from: '🐶', to: '🦴' },
  { id: 'z2',  name: '당근',    ico: '🥕', cols: 4, rows: 3, from: '🐰', to: '🥕' },
  { id: 'z6',  name: '꽃길',    ico: '🌸', cols: 5, rows: 3, from: '🐝', to: '🌸' },
  { id: 'z7',  name: '사탕',    ico: '🍭', cols: 6, rows: 3, from: '🐜', to: '🍭' },
  { id: 'z3',  name: '도토리',  ico: '🌰', cols: 5, rows: 4, from: '🐿️', to: '🌰' },
  { id: 'z8',  name: '물고기',  ico: '🐟', cols: 7, rows: 3, from: '🐧', to: '🐟' },
  { id: 'z4',  name: '털실',    ico: '🧶', cols: 6, rows: 4, from: '🐱', to: '🧶' },
  { id: 'z9',  name: '집 찾기', ico: '🏠', cols: 7, rows: 4, from: '🚗', to: '🏠' },
  { id: 'z10', name: '연못',    ico: '🌺', cols: 5, rows: 5, from: '🐸', to: '🌺' },
  { id: 'z11', name: '공룡 알', ico: '🥚', cols: 8, rows: 4, from: '🦖', to: '🥚' },
  { id: 'z12', name: '달나라',  ico: '🌕', cols: 6, rows: 5, from: '🚀', to: '🌕' },
  { id: 'z13', name: '보물',    ico: '💎', cols: 7, rows: 5, from: '⛵', to: '💎' },
  { id: 'z14', name: '선물',    ico: '🎁', cols: 8, rows: 5, from: '🎅', to: '🎁' },

  /* 원형 미로 — 도는 길이라 네모 미로보다 헷갈린다. 그래서 맨 뒤다.
     rings×sectors 가 커질수록 통로가 좁아진다(tol 이 저절로 줄어든다). */
  { id: 'z15', name: '꿀단지',  ico: '🍯', rings: 3, sectors: 8,  hub: 90,
    from: '🐻', to: '🍯', radial: true },
  { id: 'z16', name: '왕관',    ico: '👑', rings: 4, sectors: 10, hub: 76,
    from: '🐯', to: '👑', radial: true },
  { id: 'z17', name: '성',      ico: '🏰', rings: 5, sectors: 12, hub: 75,
    from: '🐴', to: '🏰', radial: true }
];

/* 가끔 해답이 시작에서 도착까지 곧게 이어진 시시한 미로가 나온다.
   (해답이 직선을 자주 넘나들면 자로 긋듯 쭉 그어도 완주가 된다 —
   굽은 정도만 재서는 안 잡히고, 판정 엔진에 직접 그어 봐야 안다.)
   그런 판은 버리고 다시 판다. 560판에 한 판꼴로 나온다. */
function cheatable(level) {
  const p = buildLevel(level).paths[0];
  const a = p[0], z = p[p.length - 1];
  const tr = createTracer([p], { tol: level.tol });
  for (let k = 0; k <= 400; k++)
    tr.feed(a.x + (z.x - a.x) * k / 400, a.y + (z.y - a.y) * k / 400);
  return tr.finished;
}

/** 코스에 들어갈 때마다 부른다 — 같은 칸 수, 새 미로 */
export const newMazes = () => PLAN.map(p => {
  const make = p.radial ? makeRadialMaze : makeMaze;
  let m;
  for (let i = 0; i < 12; i++) {
    m = make({ ...p, seed: (Math.random() * 1e9) | 0 });
    if (!cheatable(m)) break;
  }
  return m;
});

export const MAZES = newMazes();
