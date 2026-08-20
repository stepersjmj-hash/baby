/* ============================================================
   trace/names.js — 이름 쓰기 (미리 등록된 가족 이름 따라 쓰기)
   ------------------------------------------------------------
   한글 쓰기(hangul.js)의 자모 획 데이터를 재사용한다. 음절 하나는
   자모들을 블록 안 상자에 끼워 넣은 것이다:

     주 = ㅈ(위) + ㅜ(아래)      하 = ㅎ(왼쪽) + ㅏ(오른쪽)
     진 = ㅈ + ㅣ + ㄴ(받침)     최 = ㅊ + ㅗ + ㅣ (ㅚ)

   상자 좌표는 블록(정사각형) 안 비율 [x0, y0, x1, y1] 이고,
   자모의 원래 획을 상자에 맞춰 눌러 넣는다(비균등 스케일 —
   실제 한글 조판도 자모를 눌러 쓴다). ㅣ·ㅡ 처럼 두께가 없는
   자모는 상자 가운데 정렬한다.

   이름 하나 = 블록 세 개(왼→오)의 획을 이은 것. 획순은 글자순이
   되고, 글자의 마지막 획 번호(sylSay)에서 그 글자를 읽어 준다.
   ============================================================ */

import { HANGUL } from './hangul.js';

const JAMO = Object.fromEntries(HANGUL.map(L => [L.id, { strokes: L.strokes, say: L.say }]));

/* 자모의 원래 획 범위(1000×700 좌표)를 실측한다 */
const bboxCache = new Map();
function bboxOf(id) {
  if (bboxCache.has(id)) return bboxCache.get(id);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const fn of JAMO[id].strokes)
    for (let i = 0; i <= 48; i++) {
      const p = fn(i / 48);
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
      y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
  const b = { x0, y0, x1, y1 };
  bboxCache.set(id, b);
  return b;
}

/** 자모 획들을 블록 안 상자에 맞춰 옮긴 새 획 함수들을 만든다 */
function place(id, box, blk) {
  const b = bboxOf(id);
  const tx0 = blk.x + box[0] * blk.s, ty0 = blk.y + box[1] * blk.s;
  const tw = (box[2] - box[0]) * blk.s, th = (box[3] - box[1]) * blk.s;
  const sw = b.x1 - b.x0, sh = b.y1 - b.y0;
  // 두께 없는 자모(ㅣ·ㅡ)는 그 축에서 가운데 정렬
  const kx = sw < 40 ? 0 : tw / sw;
  const ky = sh < 40 ? 0 : th / sh;
  const ox = sw < 40 ? tx0 + tw / 2 : tx0;
  const oy = sh < 40 ? ty0 + th / 2 : ty0;
  return JAMO[id].strokes.map(fn => t => {
    const p = fn(t);
    return { x: ox + (p.x - b.x0) * kx, y: oy + (p.y - b.y0) * ky };
  });
}

/* 자모 상자 배치 (블록 안 비율) */
const CV_L = [0.04, 0.20, 0.50, 0.80];   // 자음 — 세로 모음 왼쪽 (정사각형에 가깝게)
const CV_R = [0.66, 0.04, 0.92, 0.96];   // ㅏㅓㅣ류 (팔 짧게)
const CH_T = [0.17, 0.05, 0.83, 0.45];   // 자음 — 가로 모음 위
const CH_B = [0.03, 0.52, 0.97, 0.94];   // ㅗㅜㅡ류
const FV_C = [0.05, 0.05, 0.46, 0.52];   // 받침 있는 글자의 자음(세로 모음)
const FV_V = [0.56, 0.02, 0.92, 0.58];
const FH_C = [0.19, 0.02, 0.81, 0.31];   // 받침 있는 글자의 자음(가로 모음)
const FH_V = [0.04, 0.35, 0.96, 0.60];
const FIN  = [0.15, 0.65, 0.85, 0.98];   // 받침

/* 필요한 음절만 손으로 정의한다 (자모 획순 = 배열 순서) */
const SYL = {
  '주': [['j', CH_T], ['u', CH_B]],
  '하': [['h', CV_L], ['a', CV_R]],
  '이': [['ng', [0.06, 0.25, 0.48, 0.75]], ['i', CV_R]],
  '명': [['m', FV_C], ['yeo', FV_V], ['ng', FIN]],
  '진': [['j', FV_C], ['i', FV_V], ['n', FIN]],
  '최': [['ch', [0.05, 0.04, 0.50, 0.42]], ['o', [0.02, 0.46, 0.60, 0.82]], ['i', [0.66, 0.03, 0.94, 0.97]]],
  '해': [['h', [0.01, 0.22, 0.40, 0.78]], ['a', [0.52, 0.03, 0.88, 0.97]], ['i', [0.80, 0.03, 0.96, 0.97]]],   // ㅐ 의 팔은 둘째 세로선(0.88)에 닿는다
  '은': [['ng', [0.27, 0.03, 0.73, 0.38]], ['eu', [0.04, 0.44, 0.96, 0.60]], ['n', FIN]],
  '영': [['ng', FV_C], ['yeo', FV_V], ['ng', FIN]],
  '손': [['s', FH_C], ['o', FH_V], ['n', FIN]],
  '지': [['j', CV_L], ['i', CV_R]],
  '성': [['s', FV_C], ['eo', FV_V], ['ng', FIN]],
  '나': [['n', CV_L], ['a', CV_R]],
  '희': [['h', [0.06, 0.04, 0.52, 0.48]], ['eu', [0.02, 0.56, 0.60, 0.76]], ['i', [0.66, 0.03, 0.94, 0.97]]],
  '루': [['r', CH_T], ['u', CH_B]],
  '춘': [['ch', FH_C], ['u', FH_V], ['n', FIN]],
  '문': [['m', FH_C], ['u', FH_V], ['n', FIN]],
  '송': [['s', FH_C], ['o', FH_V], ['ng', FIN]],
  '자': [['j', CV_L], ['a', CV_R]],
  '원': [['ng', [0.08, 0.03, 0.42, 0.34]], ['u', [0.02, 0.37, 0.56, 0.62]],
         ['eo', [0.64, 0.02, 0.92, 0.60]], ['n', FIN]],
  '신': [['s', FV_C], ['i', FV_V], ['n', FIN]],
  '정': [['j', FV_C], ['eo', FV_V], ['ng', FIN]]
};

/* 가족 그룹. hard 는 칩 아래 색 띠로만 쓰인다 (가족 구분) */
const FAMILIES = [
  ['우리 가족',   '💛', 1, ['주하이', '주명진', '최해진']],
  ['이모네',     '💜', 2, ['최은영', '손지성', '손나희', '손하루']],
  ['할머니네',   '💚', 3, ['주영춘', '문송자']],
  ['외할머니네', '💙', 4, ['최원신', '이정은']]
];

/* 블록 세 개: 1000×700 안에 300 정사각형이 나란히 */
const BLOCKS = [25, 350, 675].map(x => ({ x, y: 200, s: 300 }));

export const NAMES = [];
for (const [family, ico, hard, list] of FAMILIES) {
  for (const name of list) {
    const strokes = [];
    const sylSay = {};
    [...name].forEach((ch, si) => {
      const parts = SYL[ch];
      if (!parts) throw new Error('음절 정의 없음: ' + ch);
      for (const [jamo, box] of parts) strokes.push(...place(jamo, box, BLOCKS[si]));
      sylSay[strokes.length - 1] = ch;         // 이 획을 끝내면 이 글자를 읽는다
    });
    NAMES.push({ id: 'nm-' + name, name, say: name, ico, hard, family, strokes, sylSay });
  }
}
