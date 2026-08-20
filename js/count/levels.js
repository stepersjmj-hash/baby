/* ============================================================
   count/levels.js — 세어보기 문제
   ------------------------------------------------------------
   물건들을 흩어 놓고 "몇 개?" 를 묻는다. 씨앗 난수라 같은 문제는
   언제나 같다. 화면과 자가 점검이 같이 쓴다.

   난이도:
     하  1~5개, 한 종류, 큼        — 손가락으로 짚으며 세기 입문
     중  6~10개, 한 종류
     상  4~9개 + 방해꾼 2~4개 섞임 — "사과만" 골라 세어야 한다
   ============================================================ */

import { rng } from '../core/pen.js';

export const VIEW = { w: 1000, h: 700 };
export const AREA = { x: 50, y: 70, w: 900, h: 430 };            // 물건 흩는 곳
export const CARDS = [{ x: 260, y: 615 }, { x: 500, y: 615 }, { x: 740, y: 615 }];
export const CARD_W = 180, CARD_H = 130;

/* 세는 소리(고유어)와 "N 개" — 화면과 음성 팩 생성기가 같이 쓴다 */
export const COUNT_SAY = ['하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열하나', '열둘'];
export const GAE = ['한 개', '두 개', '세 개', '네 개', '다섯 개', '여섯 개',
                    '일곱 개', '여덟 개', '아홉 개', '열 개', '열한 개', '열두 개'];

const PARAM = {
  1: { min: 1, max: 5, size: 104 },
  2: { min: 6, max: 10, size: 76 },
  3: { min: 4, max: 9, size: 74 }
};

const L = (id, name, ico, hard, seed, decoys = []) =>
  ({ id, name, ico, hard, seed, decoys,
     ask: hard === 3 ? `${name} 세어 보자!` : `${name}가 몇 개일까?` });

export const LEVELS = [
  /* 하 */
  L('c1', '사과',   '🍎', 1, 11),
  L('c2', '오리',   '🦆', 1, 23),
  L('c3', '별',     '⭐', 1, 37),
  L('c4', '꽃',     '🌷', 1, 49),
  L('c5', '공',     '⚽', 1, 58),
  /* 중 */
  L('c6', '딸기',   '🍓', 2, 67),
  L('c7', '물고기', '🐠', 2, 79),
  L('c8', '풍선',   '🎈', 2, 83),
  L('c9', '나비',   '🦋', 2, 91),
  L('c10', '자동차', '🚗', 2, 97),
  /* 상 — 방해꾼을 섞는다. ico 만 세어야 한다 */
  L('c11', '사과만',   '🍎', 3, 103, ['🍐', '🍋']),
  L('c12', '오리만',   '🦆', 3, 113, ['🐤', '🐦']),
  L('c13', '별만',     '⭐', 3, 127, ['🌙', '☁️']),
  L('c14', '물고기만', '🐟', 3, 131, ['🐙', '🦀']),
  L('c15', '쿠키만',   '🍪', 3, 139, ['🍩', '🧁'])
];

/**
 * @returns {{ items, answer, choices, size }}
 *   items   : [{x, y, e, target}] — target 이 셀 대상
 *   answer  : 정답 개수
 *   choices : 숫자 카드 3개 (정답 포함, 섞여 있음)
 */
export function buildCount(level) {
  const P = PARAM[level.hard];
  const rnd = rng(level.seed);
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const answer = P.min + Math.floor(rnd() * (P.max - P.min + 1));
  const decoyN = level.decoys.length ? 2 + Math.floor(rnd() * 3) : 0;

  // 격자(5×3)를 섞어 뽑고 칸 안에서 살짝 흔든다 — 겹치지 않는다
  const COLS = 5, ROWS = 3;
  const cw = AREA.w / COLS, ch = AREA.h / ROWS;
  const cells = shuffle([...Array(COLS * ROWS).keys()]).slice(0, answer + decoyN);
  const items = cells.map((c, i) => ({
    x: AREA.x + (c % COLS + 0.5) * cw + (rnd() - 0.5) * cw * 0.34,
    y: AREA.y + (Math.floor(c / COLS) + 0.5) * ch + (rnd() - 0.5) * ch * 0.34,
    e: i < answer ? level.ico : level.decoys[Math.floor(rnd() * level.decoys.length)],
    target: i < answer
  }));

  // 숫자 카드: 정답 + 가까운 오답 둘 (1 미만이 되지 않게)
  const set = new Set([answer]);
  while (set.size < 3) {
    const d = (1 + Math.floor(rnd() * 2)) * (rnd() < 0.5 ? -1 : 1);
    const cand = answer + d;
    if (cand >= 1 && cand <= 12) set.add(cand);
  }
  return { items, answer, choices: shuffle([...set]), size: P.size };
}
