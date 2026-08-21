/* ============================================================
   tools/check-strokeorder.mjs — 획순이 규칙과 맞는지 대조한다
   ------------------------------------------------------------
     node tools/check-strokeorder.mjs

   `docs/stroke_order.json`(옵시디언 [[하이츄 획순 규칙]] 의 기계용 원본)에
   적힌 **획수와 방향**을, 실제로 앱이 그리는 경로에서 되읽어 비교한다.
   좌표는 규칙에 없으므로 경로 모양에서 방향 코드를 추론한다:

     R 가로→ · D 세로↓ · DL ↙ · DR ↘ · R_D ㄱ꼴 · D_R ㄴ꼴
     CCW 반시계 원 · CW 시계 원 · CURVE 그 밖의 굽은 획

   ★ y 가 아래로 커지는 화면 좌표라, **넓이 부호가 양이면 화면상 시계**다.

   규칙이 `variants` 를 단 글자(교본마다 갈리는 글자)는 다르게 그려도
   틀린 게 아니다 — 그런 글자는 `참고` 로만 찍는다. docs/획순.md 의
   "우리가 고른 것" 표가 그 목록이고, 여기 찍히는 참고와 같아야 한다.
   ============================================================ */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC = JSON.parse(readFileSync(join(ROOT, 'docs/stroke_order.json'), 'utf8'));

const { buildLevel } = await import('../js/core/trace.js');
const { HANGUL } = await import('../js/trace/hangul.js');
const { NUMBERS } = await import('../js/trace/numbers.js');
const { ENGLISH, UPPER_STROKES, LOWER_STROKES } = await import('../js/trace/english.js');

/* ── 경로 → 방향 코드 ─────────────────────────────────────── */
function classify(pts) {
  const a = pts[0], z = pts[pts.length - 1];
  const span = Math.hypot(z.x - a.x, z.y - a.y);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);

  // 얼마나 감겼나 — 진행 방향이 돈 총각도. y 아래로 커지므로 양수가 시계다.
  let turn = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const ux = pts[i].x - pts[i - 1].x, uy = pts[i].y - pts[i - 1].y;
    const vx = pts[i + 1].x - pts[i].x, vy = pts[i + 1].y - pts[i].y;
    const cr = ux * vy - uy * vx, dt = ux * vx + uy * vy;
    if (cr || dt) turn += Math.atan2(cr, dt);
  }
  // 반 바퀴(180°) 넘게 한쪽으로 감기면 원/반원으로 본다 — 닫혀 있지 않아도(C·D의 배)
  if (Math.abs(turn) > Math.PI * 0.95) return turn > 0 ? 'CW' : 'CCW';

  // 곧은 획인가 — 직선에서 벗어난 최대 거리로 본다
  const off = Math.max(...pts.map(q =>
    Math.abs((z.x - a.x) * (a.y - q.y) - (a.x - q.x) * (z.y - a.y)) / span));
  const dx = z.x - a.x, dy = z.y - a.y;
  if (off < span * 0.16) {
    const ang = Math.abs(Math.atan2(dy, dx));          // 0=오른쪽, π/2=아래
    const V = Math.PI / 2;
    if (ang < 0.35 || ang > Math.PI - 0.35) return dx > 0 ? 'R' : 'R←';   // ±20° 안
    if (Math.abs(ang - V) < 0.35) return dy > 0 ? 'D' : 'D↑';
    return dy > 0 ? (dx > 0 ? 'DR' : 'DL') : (dx > 0 ? 'UR' : 'UL');
  }

  // 꺾인 획 — 처음 20% 와 마지막 20% 의 진행 방향으로 ㄱ꼴/ㄴ꼴을 가른다
  const k = Math.max(1, Math.round(pts.length * 0.2));
  const head = { x: pts[k].x - a.x, y: pts[k].y - a.y };
  const tail = { x: z.x - pts[pts.length - 1 - k].x, y: z.y - pts[pts.length - 1 - k].y };
  const dirOf = (v) => (Math.abs(v.y) < Math.abs(v.x) * 0.6 ? (v.x > 0 ? 'R' : 'L')
                     : Math.abs(v.x) < Math.abs(v.y) * 0.6 ? (v.y > 0 ? 'D' : 'U')
                     : (v.y > 0 ? (v.x > 0 ? 'dr' : 'dl') : (v.x > 0 ? 'ur' : 'ul')));
  const h = dirOf(head), t = dirOf(tail);
  if (h === 'R' && t === 'D') return 'R_D';
  if (h === 'D' && t === 'R') return 'D_R';
  if (h === 'R' && t === 'dl') return 'R_D';       // ㅈ 처럼 꺾어 왼아래로 삐치는 획
  return 'CURVE';
}

/* ── 규칙에서 글자 찾기 ───────────────────────────────────── */
const spec = new Map();
for (const c of SPEC.hangul.consonants) spec.set(c.char, c);
for (const v of SPEC.hangul.vowels) spec.set(v.char, v);
for (const u of SPEC.alphabet.uppercase) spec.set('대' + u.char, u);
for (const l of SPEC.alphabet.lowercase) spec.set('소' + l.char, l);
for (const d of SPEC.digits) spec.set(d.char, d);

/* CURVE 는 "복합 곡선" 이라 모양을 특정하지 않는다 — 규칙이 CURVE 면
   우리 쪽이 CW/CCW/R_D/D_R 어느 쪽이든 어긋난 게 아니다. */
const ok = (want, got) => want === got ||
  (want === 'CURVE' && got !== 'R' && got !== 'D' && got !== 'DL' && got !== 'DR');

let bad = 0, note = 0, checked = 0;
function check(label, key, strokes) {
  const s = spec.get(key);
  if (!s) return;
  checked++;
  const got = strokes.map(fn => classify(buildLevel({ strokes: [fn] }).paths[0]));
  const want = s.strokes.map(x => x.dir);
  const lenient = !!s.variants;
  if (got.length !== want.length) {
    (lenient ? note++ : bad++);
    console.log(`${lenient ? '참고' : 'FAIL'}  ${label}  획수 ${got.length} ≠ 규칙 ${want.length}` +
                `   (${got.join('·')} / 규칙 ${want.join('·')})`);
    return;
  }
  const wrong = got.map((g, i) => ok(want[i], g) ? null : `${i + 1}획 ${g}≠${want[i]}`).filter(Boolean);
  if (wrong.length) {
    (lenient ? note++ : bad++);
    console.log(`${lenient ? '참고' : 'FAIL'}  ${label}  ${wrong.join(', ')}` +
                `   (전체 ${got.join('·')} / 규칙 ${want.join('·')})`);
  }
}

console.log('── 한글 자모 ──');
for (const L of HANGUL) check(L.name, L.name, L.strokes);

console.log('── 숫자 1~9 ──');
for (const L of NUMBERS) if (/^[1-9]$/.test(L.name)) check(L.name, L.name, L.strokes);

console.log('── 영어 대문자 ──');
for (const ch of Object.keys(UPPER_STROKES)) check(ch, '대' + ch, UPPER_STROKES[ch]);

console.log('── 영어 소문자 ──');
for (const ch of Object.keys(LOWER_STROKES)) check(ch, '소' + ch, LOWER_STROKES[ch]);

console.log(`\n${checked}자 검사 → 어긋남 ${bad}개 · 관행 차이(variants) ${note}개`);
process.exit(bad ? 1 : 0);
