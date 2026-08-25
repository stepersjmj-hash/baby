/* ============================================================
   sort/levels.js — 모양 분류 문제
   ------------------------------------------------------------
   물건을 끌어다 맞는 바구니에 담는다. 무엇으로 나누는지(`by`)는
   문제마다 다르다 — 색 · 모양 · 크기 · 무엇인지.

   **바구니에 글자를 쓰지 않는다.** 글자를 못 읽는 나이라, 바구니마다
   그 갈래의 **견본**을 하나 얹어 "이런 걸 여기에" 를 그림으로 알린다.

   좌표계 1000×700. 화면과 자가 점검이 같이 쓴다.
   ============================================================ */

import { rng } from '../core/pen.js';

export const VIEW = { w: 1000, h: 700 };
export const AREA = { x: 60, y: 90, w: 880, h: 340 };      // 물건 흩는 곳
export const R = 44;                                       // 물건 기본 반지름
export const BIN = { y: 560, w: 250, h: 200 };             // 바구니 (아래 줄)

/* 물건 두 가지 — 도형은 직접 그리고, 사물은 picIcon 그림을 쓴다 */
const shape = (sh, color, size = 1) => ({ kind: 'shape', sh, color, size });
const pic = (key, group) => ({ kind: 'pic', key, group });

const RED = '#ff5a5a', BLUE = '#4a90ff', YELLOW = '#ffd24d', GREEN = '#4fbf7a';

/* 무엇으로 나누는가 — 물건에서 갈래를 뽑아내는 함수 */
const CAT = {
  color: (it) => it.color,
  sh:    (it) => it.sh,
  size:  (it) => (it.size >= 1 ? 'big' : 'small'),
  group: (it) => it.group
};

/**
 * @param id·name 단계
 * @param hard  1 쉬움 · 2 보통 · 3 어려움
 * @param by    나누는 기준 (CAT 의 키)
 * @param bins  바구니에 얹을 견본 물건들 — 순서가 곧 바구니 순서
 * @param items 담을 물건들
 */
/* 안내말은 기준마다 하나씩 — 이름을 그대로 이어 붙이면
   "무엇일까대로 담아 보자" 같은 말이 나오고 음성 클립까지 그대로 녹음된다
   (세어보기의 조사 문제와 같은 함정이다). */
const ASK = {
  color: '색깔대로 담아 보자!',
  sh:    '모양대로 담아 보자!',
  size:  '크기대로 담아 보자!',
  group: '같은 것끼리 담아 보자!'
};

const L = (id, name, ico, hard, seed, by, bins, items) =>
  ({ id, name, ico, hard, seed, by, bins, items, ask: ASK[by] });

export const LEVELS = [
  /* ── 하: 두 갈래 · 물건 6개 ── */
  L('s1', '색깔', 'ball', 1, 11, 'color',
    [shape('circle', RED), shape('circle', BLUE)],
    [shape('circle', RED), shape('square', BLUE), shape('triangle', RED),
     shape('square', RED), shape('circle', BLUE), shape('triangle', BLUE)]),

  L('s2', '모양', 'crown', 1, 23, 'sh',
    [shape('circle', YELLOW), shape('square', YELLOW)],
    [shape('circle', RED), shape('square', BLUE), shape('circle', YELLOW),
     shape('square', GREEN), shape('circle', BLUE), shape('square', RED)]),

  /* ── 중: 세 갈래 · 물건 9개 ── */
  L('s3', '모양 셋', 'star', 2, 37, 'sh',
    [shape('circle', GREEN), shape('square', GREEN), shape('triangle', GREEN)],
    [shape('circle', RED), shape('square', BLUE), shape('triangle', YELLOW),
     shape('triangle', RED), shape('circle', BLUE), shape('square', YELLOW),
     shape('square', RED), shape('triangle', BLUE), shape('circle', YELLOW)]),

  L('s4', '색깔 셋', 'balloon', 2, 49, 'color',
    [shape('square', RED), shape('square', YELLOW), shape('square', BLUE)],
    [shape('circle', RED), shape('square', YELLOW), shape('triangle', BLUE),
     shape('square', RED), shape('triangle', YELLOW), shape('circle', BLUE),
     shape('triangle', RED), shape('circle', YELLOW), shape('square', BLUE)]),

  /* ── 상: 헷갈리게 섞는다 ── */
  // 크기: 색도 모양도 제각각이라 크기만 봐야 한다
  L('s5', '크기', 'moon', 3, 58, 'size',
    [shape('circle', GREEN, 1), shape('circle', GREEN, 0.55)],
    [shape('circle', RED, 1), shape('square', BLUE, .55), shape('triangle', YELLOW, 1),
     shape('circle', BLUE, .55), shape('square', RED, 1), shape('triangle', GREEN, .55),
     shape('circle', YELLOW, 1), shape('square', GREEN, .55), shape('triangle', RED, 1),
     shape('circle', GREEN, .55)]),

  // 무엇인지: 과일 · 동물 · 탈것
  L('s6', '무엇일까', 'apple', 3, 67, 'group',
    [pic('apple', 'fruit'), pic('duck', 'animal'), pic('car', 'car')],
    [pic('apple', 'fruit'), pic('strawberry', 'fruit'), pic('pear', 'fruit'),
     pic('duck', 'animal'), pic('fish', 'animal'), pic('crab', 'animal'),
     pic('car', 'car'), pic('rocket', 'car'), pic('boat', 'car')])
];

/** 물건이 어느 바구니로 가야 하는가 (바구니 번호) */
export const binOf = (level, item) => {
  const f = CAT[level.by];
  return level.bins.findIndex(b => f(b) === f(item));
};

/**
 * 문제를 편다 — 바구니 자리와 물건 자리를 정한다. 같은 씨앗이면 같은 판이다.
 * 물건은 격자 칸 하나씩 차지하고 칸 안에서만 흔들려서 서로 겹치지 않는다.
 */
export function buildSort(level) {
  const rnd = rng(level.seed);
  const n = level.items.length;
  const cols = Math.min(5, Math.ceil(Math.sqrt(n * 1.6)));
  const rows = Math.ceil(n / cols);
  const cw = AREA.w / cols, ch = AREA.h / rows;

  const order = level.items.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {          // 자리를 섞는다
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const jit = (cell, r, cap) => Math.max(0, Math.min(cell / 2 - r - 6, cap));

  const items = level.items.map((it, i) => {
    const c = order[i];
    const r = R * (it.size ?? 1);
    return {
      id: 'i' + i, ...it,
      r,
      // 흔드는 폭은 **칸 안에 물건이 들어가는 만큼**이다. 칸 크기의 비율로
      // 흔들면 물건이 칸보다 클 때 이웃과 겹치고 영역 밖으로 나간다.
      x: AREA.x + (c % cols + 0.5) * cw + (rnd() - 0.5) * 2 * jit(cw, r, 34),
      y: AREA.y + (Math.floor(c / cols) + 0.5) * ch + (rnd() - 0.5) * 2 * jit(ch, r, 18),
      bin: binOf(level, it)
    };
  });

  const m = level.bins.length;
  const gap = (VIEW.w - m * BIN.w) / (m + 1);
  const bins = level.bins.map((b, i) => ({
    id: 'b' + i, ...b, at: i,
    x: gap + i * (BIN.w + gap) + BIN.w / 2,
    y: BIN.y, r: BIN.w / 2
  }));

  return { items, bins };
}
