/* ============================================================
   trace/maze.js — 미로 찾기
   ------------------------------------------------------------
   미로도 결국 "정해진 길을 따라가기" 라서 같은 판정 엔진을 쓴다.
   다른 점은 길을 그려 주지 않고 벽을 그린다는 것뿐이다
   (runner 의 guide:false + level.walls).

   막다른 길로 새면 진행이 멈출 뿐 벌점은 없다. 되돌아 나오면 이어진다.

   미로는 씨앗 난수로 만든다 — 같은 씨앗이면 언제 켜도 같은 미로다.
   벽을 뚫고 질러가지 못하는 이유: 허용 오차(tol)를 칸 크기의 0.42 로
   두어 옆 통로(한 칸 = 벽 하나 너머)까지 닿지 않기 때문이다.
   ============================================================ */

import { poly } from '../core/trace.js';
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

/* 방 수(cols×rows)가 커질수록 어렵다. 쉬운 것부터 늘어놓는다.
   여정마다 주인공과 목적지가 달라 "무엇을 어디로" 를 그림으로 알린다.
   기존 z1~z4 는 id 를 지켜 아이가 모은 별이 그대로 남는다. */
export const MAZES = [
  { id: 'z1',  name: '치즈',    ico: '🧀', cols: 3, rows: 2, seed: 11, from: '🐭', to: '🧀' },
  { id: 'z5',  name: '뼈다귀',  ico: '🦴', cols: 4, rows: 2, seed: 71, from: '🐶', to: '🦴' },
  { id: 'z2',  name: '당근',    ico: '🥕', cols: 4, rows: 3, seed: 27, from: '🐰', to: '🥕' },
  { id: 'z6',  name: '꽃길',    ico: '🌸', cols: 5, rows: 3, seed: 83, from: '🐝', to: '🌸' },
  { id: 'z7',  name: '사탕',    ico: '🍭', cols: 6, rows: 3, seed: 95, from: '🐜', to: '🍭' },
  { id: 'z3',  name: '도토리',  ico: '🌰', cols: 5, rows: 4, seed: 42, from: '🐿️', to: '🌰' },
  { id: 'z8',  name: '물고기',  ico: '🐟', cols: 7, rows: 3, seed: 19, from: '🐧', to: '🐟' },
  { id: 'z4',  name: '털실',    ico: '🧶', cols: 6, rows: 4, seed: 58, from: '🐱', to: '🧶' },
  { id: 'z9',  name: '집 찾기', ico: '🏠', cols: 7, rows: 4, seed: 33, from: '🚗', to: '🏠' },
  { id: 'z10', name: '연못',    ico: '🌺', cols: 5, rows: 5, seed: 47, from: '🐸', to: '🌺' },
  { id: 'z11', name: '공룡 알', ico: '🥚', cols: 8, rows: 4, seed: 66, from: '🦖', to: '🥚' },
  { id: 'z12', name: '달나라',  ico: '🌕', cols: 6, rows: 5, seed: 29, from: '🚀', to: '🌕' },
  { id: 'z13', name: '보물',    ico: '💎', cols: 7, rows: 5, seed: 52, from: '⛵', to: '💎' },
  { id: 'z14', name: '선물',    ico: '🎁', cols: 8, rows: 5, seed: 88, from: '🎅', to: '🎁' }
].map(makeMaze);
