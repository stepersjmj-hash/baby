/* ============================================================
   match/board.js — 카드 배치
   ------------------------------------------------------------
   화면(index.js)과 자가 점검이 같은 함수를 써야 한다. 점검이 실제로
   카드를 집어 끌어 보려면 카드가 어디 있는지 정확히 알아야 하기 때문이다.

   좌표계 1000×700. 왼쪽 줄과 오른쪽 줄, 오른쪽만 섞는다.
   ============================================================ */

import { rng } from '../core/pen.js';

const LX = 215, RX = 785;      // 두 줄의 x
const TOP = 108, BOT = 598;    // 카드 중심이 놓이는 세로 범위

/**
 * @param level MATCHES 의 한 단계
 * @param seed  섞기 씨앗. 같은 씨앗이면 같은 배치가 나온다
 */
export function layout(level, seed = 1) {
  const n = level.pairs.length;
  const gap = n > 1 ? (BOT - TOP) / (n - 1) : 0;
  const r = Math.min(58, n > 1 ? gap * 0.44 : 58);

  const left = level.pairs.map(([l], i) => ({
    id: 'L' + i, k: i, x: LX, y: TOP + gap * i, r, data: l
  }));

  // 오른쪽 순서를 섞는다. 그대로면 문제가 아니니 최소 한 번은 다시 섞는다.
  const rnd = rng(seed);
  let order = [...Array(n).keys()];
  for (let pass = 0; pass < 8; pass++) {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (n < 2 || order.some((k, i) => k !== i)) break;
  }

  const right = order.map((k, i) => ({
    id: 'R' + k, k, x: RX, y: TOP + gap * i, r, data: level.pairs[k][1]
  }));

  return { left, right, r };
}

/** 두 카드가 짝인가 — 배열에서의 순서(k)가 같으면 짝이다 */
export const accepts = (a, b) => a.k === b.k;
