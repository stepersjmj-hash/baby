/* ============================================================
   spot/scenes.js — 다른 그림 찾기 문제 생성
   ------------------------------------------------------------
   그림 자산이 없으므로 장면을 이모지로 만든다. 왼쪽 그림을 격자에
   배치하고, 오른쪽 그림은 그중 몇 개만 바꾸거나 지운다.

   씨앗 난수(rng)로 만들어서 같은 문제는 언제 켜도 똑같다.
   주제 10개 × 난이도 3 = 30문제, 씨앗이 달라 전부 다르게 나온다.

   난이도가 올리는 것 세 가지:
     · 물건 수      6 → 9 → 12  (많을수록 훑을 곳이 많다)
     · 다른 곳 수   2 → 3 → 4
     · 바꾸는 방식  전혀 다른 그림 → 섞어서 → 비슷한 그림·없어진 것
       (🐓→🐔 처럼 비슷하게 바꾸면 어른도 한참 본다)
   ============================================================ */

import { rng } from '../core/pen.js';

export const VIEW = { w: 1000, h: 700 };
/** 두 그림판. 좌표는 판 안에서의 로컬(0~w, 0~h)로 다룬다 */
export const PANEL = { w: 452, h: 548, lx: 24, rx: 524, ty: 108 };

const T = (name, ico, pool, subtle) => ({ name, ico, pool, subtle });

const THEMES = {
  farm:    T('농장', '🐄', ['🐄','🐖','🐓','🐑','🦆','🐕','🐈','🌻','🌾','🚜','🏠','🌳','🐝','🥕'],
                          [['🐓','🐔'],['🐑','🐐'],['🐄','🐃'],['🦆','🐣']]),
  sea:     T('바다', '🐠', ['🐠','🐟','🐬','🐙','🦀','🐚','🐢','🦈','⛵','🌊','☀️','🐡','🦑','🏖️'],
                          [['🐠','🐟'],['🐬','🦈'],['🦀','🦞'],['🐙','🦑']]),
  space:   T('우주', '🚀', ['🚀','🛸','⭐','🌙','🌍','☄️','🌟','👽','🤖','🔭','💫','🌠','🌞','🪐'],
                          [['⭐','🌟'],['🌍','🌎'],['🌙','🌛'],['💫','🌠']]),
  forest:  T('숲',   '🦊', ['🦊','🐿️','🦉','🐻','🦌','🍄','🌲','🌰','🦔','🐇','🍂','🏕️','🐛','🌿'],
                          [['🦊','🐺'],['🦉','🦅'],['🌲','🌳'],['🐇','🐁']]),
  picnic:  T('소풍', '🧺', ['🧺','🥪','🍙','🍪','🧃','🍌','🍇','⚽','🎈','🐜','🌼','☁️','🥤','🍉'],
                          [['🍪','🍩'],['🥪','🍞'],['🍌','🍋'],['☁️','🌥️']]),
  toys:    T('장난감', '🧸', ['🧸','🚂','🎲','🪁','🎨','🎺','🥁','⚽','🏀','🎯','🎪','🃏','♟️','🎳'],
                          [['🧸','🐻'],['🚂','🚃'],['⚽','🏐'],['🎺','🎷']]),
  fruit:   T('과일', '🍎', ['🍎','🍌','🍇','🍓','🍊','🍉','🍍','🥝','🍑','🍒','🥭','🍈','🍋','🍐'],
                          [['🍎','🍏'],['🍓','🍒'],['🍈','🍉'],['🥭','🍑']]),
  party:   T('생일', '🎂', ['🎂','🎁','🎈','🎉','🍰','🕯️','🎀','🥤','🍭','🎵','😀','🧁','🍬','🎊'],
                          [['🎉','🎊'],['🍬','🍭'],['😀','😃'],['🧁','🍰']]),
  vehicle: T('탈것', '🚗', ['🚗','🚌','🚑','🚒','🚜','🏍️','🚲','✈️','🚁','🚤','🚂','🚕','🛴','⛵'],
                          [['🚗','🚙'],['🚌','🚎'],['🚕','🚖'],['🚲','🛵']]),
  winter:  T('겨울', '⛄', ['⛄','❄️','🧤','🧣','🎿','🛷','🏔️','🌨️','🐧','🦌','☕','🧦','🌟','🏂'],
                          [['⛄','☃️'],['🌨️','☁️'],['☕','🍵'],['🧤','🧦']])
};

/* 난이도별: 물건 수 · 다른 곳 수 · 그림 크기 · 격자 */
const PARAMS = {
  1: { n: 6,  d: 2, size: 96, cols: 3, rows: 2 },
  2: { n: 9,  d: 3, size: 78, cols: 3, rows: 3 },
  3: { n: 12, d: 4, size: 62, cols: 3, rows: 4 }
};

/* 바꾸는 방식 계획. subtle 은 비슷한 그림으로, swap 은 전혀 다른 그림으로,
   remove 는 오른쪽에서 사라진다 */
const PLAN = {
  1: ['swap', 'swap'],
  2: ['swap', 'subtle', 'remove'],
  3: ['subtle', 'subtle', 'subtle', 'remove']
};

/** 30문제: 주제 10 × 난이도 3. 씨앗이 달라 배치도 다른 곳도 전부 다르다 */
export const SPOTS = [];
{
  const keys = Object.keys(THEMES);
  for (const hard of [1, 2, 3])
    keys.forEach((tk, ti) => SPOTS.push({
      id: tk + hard, theme: tk, hard,
      name: THEMES[tk].name, ico: THEMES[tk].ico,
      seed: hard * 7919 + ti * 373 + 11
    }));
}

/**
 * 문제를 굽는다.
 * @returns {{ objs, alt, diffs, size }}
 *   objs  : 왼쪽 그림 [{x, y, e}]  (판 로컬 좌표)
 *   alt   : Map(물건번호 → 바뀐 이모지 | null(없어짐))  — 오른쪽 그림
 *   diffs : 다른 곳 [{x, y, r}]
 */
export function buildSpot(level) {
  const t = THEMES[level.theme];
  const P = PARAMS[level.hard];
  const rnd = rng(level.seed);
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // 격자 칸을 섞어 뽑고 칸 안에서 살짝 흔든다 (겹치지 않으면서 자연스럽게)
  const m = P.size * 0.62;                               // 가장자리 여백
  const cw = (PANEL.w - m * 2) / P.cols, ch = (PANEL.h - m * 2) / P.rows;
  const cells = shuffle([...Array(P.cols * P.rows).keys()]).slice(0, P.n);
  const emojis = shuffle([...t.pool]).slice(0, P.n);
  const objs = cells.map((c, i) => ({
    x: m + (c % P.cols + 0.5) * cw + (rnd() - 0.5) * cw * 0.30,
    y: m + (Math.floor(c / P.cols) + 0.5) * ch + (rnd() - 0.5) * ch * 0.30,
    e: emojis[i]
  }));

  // 다른 곳 고르기
  const subtle = new Map(t.subtle);
  const used = new Set(objs.map(o => o.e));
  const spare = shuffle(t.pool.filter(e => !used.has(e)));
  const rest = shuffle([...objs.keys()]);
  const alt = new Map();

  for (const type of PLAN[level.hard]) {
    let at = 0;
    if (type === 'subtle') {                             // 비슷한 짝이 있는 물건 우선
      const k = rest.findIndex(i => subtle.has(objs[i].e));
      if (k >= 0) at = k;
    }
    const oi = rest.splice(at, 1)[0];
    if (oi === undefined) break;
    if (type === 'remove') alt.set(oi, null);
    else if (type === 'subtle' && subtle.has(objs[oi].e)) alt.set(oi, subtle.get(objs[oi].e));
    else alt.set(oi, spare.pop() ?? '❓');   // 풀 14 > 물건 12 라 항상 남는다
  }

  return {
    objs, alt,
    diffs: [...alt.keys()].map(i => ({ x: objs[i].x, y: objs[i].y, r: P.size * 0.55 })),
    size: P.size
  };
}
