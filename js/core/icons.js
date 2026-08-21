/* ============================================================
   core/icons.js — 화면에 쓰는 그림을 전부 SVG 로 모아 둔 곳
   ------------------------------------------------------------
   이 앱은 **이모지를 쓰지 않는다.** 기기마다 그림이 다르고, 색을
   그룹·도구에 맞출 수 없기 때문이다. 대신 두 갈래 SVG 를 쓴다.

     · 선 아이콘 line()  — 트레이·헤더 버튼. 색은 잉크 한 가지,
                           굵기 3.5, 48×48 좌표계.
     · 채움 아이콘 TOOL  — 색칠 도구 10종("말랑 채움"). 도구마다
                           제 색을 가진 면으로 그린다. 크레용은
                           빨갛고 물감통은 하늘색이라, 글자를 못 읽어도
                           무엇인지 알아본다.

   좌표계는 전부 48×48 로 통일한다. 크기는 쓰는 쪽에서 정한다.
   ============================================================ */

export const INK = '#3a2f22';
export const TRAY_INK = '#5a4b34';

/** 선 아이콘 한 장 */
export const line = (inner, { color = INK, size = 32, sw = 3.5 } = {}) =>
  `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" stroke="${color}"` +
  ` stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

/** 채움 아이콘 한 장 (도구용 — 색이 path 안에 박혀 있다) */
export const solid = (inner, size = 32) =>
  `<svg viewBox="0 0 48 48" width="${size}" height="${size}">${inner}</svg>`;

/* ── 트레이·헤더 버튼 (선 아이콘) ────────────────────────────
   버튼 하나가 여러 화면에 있으므로(홈 버튼만 5개) 여기 한 줄이
   전부에 반영된다. index.html 의 data-icon 이 이 표의 키다. */
const PATHS = {
  film:   '<rect x="6" y="12" width="36" height="24" rx="4"/>' +
          '<path d="M14 12v24M34 12v24"/>' +
          '<path d="M6 20h8M6 28h8M34 20h8M34 28h8"/>',
  home:   '<path d="M8 22L24 8l16 14v16a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z"/>' +
          '<path d="M19 41V29h10v12"/>',
  undo:   '<path d="M14 19h16a9 9 0 1 1 0 18h-7"/><path d="M20 11l-8 8 8 8"/>',
  redo:   '<path d="M34 19H18a9 9 0 1 0 0 18h7"/><path d="M28 11l8 8-8 8"/>',
  clear:  '<path d="M33 6L23 24"/>' +
          '<path d="M23 24c-7-2-13 3-14 10l17 6c4-4 4-11-3-16z"/>' +
          '<path d="M17 32l-2 6m8-4l-2 6"/>',
  save:   '<rect x="8" y="8" width="32" height="32" rx="6"/>' +
          '<path d="M24 16v14m-6-5l6 6 6-6"/>',
  say:    '<path d="M38 8v26l-20-6h-6a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4h6z"/>' +
          '<path d="M18 30l4 11"/>',
  prev:   '<path d="M30 10L16 24l14 14"/>',
  next:   '<path d="M18 10l14 14-14 14"/>',
  sound:  '<path d="M8 19v10h7l9 8V11l-9 8H8z"/><path d="M30 18c3 3 3 9 0 12"/>' +
          '<path d="M35 14c5 5 5 15 0 20"/>',
  mute:   '<path d="M8 19v10h7l9 8V11l-9 8H8z"/><path d="M31 19l11 11M42 19L31 30"/>',
  gallery:'<rect x="5" y="9" width="38" height="30" rx="6"/><circle cx="16" cy="19" r="3.5"/>' +
          '<path d="M9 35l9-9 8 8 7-8 10 11"/>',
  gear:   '<circle cx="24" cy="24" r="6.5"/>' +
          '<path d="M24 4l2.6 5.4 5.9-1 2.1 5.6 5.9 1-1 5.9L44 24l-4.5 3.1 1 5.9-5.9 1' +
          '-2.1 5.6-5.9-1L24 44l-2.6-5.4-5.9 1-2.1-5.6-5.9-1 1-5.9L4 24l4.5-3.1-1-5.9' +
          ' 5.9-1 2.1-5.6 5.9 1z"/>',
  hand:   '<path d="M17 22V10a3 3 0 0 1 6 0v10m0-8a3 3 0 0 1 6 0v10m0-7a3 3 0 0 1 6 0v11' +
          'c0 9-5 15-13 15-6 0-9-3-12-9l-4-8c-1-2 0-4 2-5s4 0 5 2l4 6"/>'
};

/** 이름으로 선 아이콘 하나. 없는 이름이면 빈 문자열 (버튼이 비어 보이면 표 오타다) */
export const icon = (name, opts) => (PATHS[name] ? line(PATHS[name], opts) : '');

/* 이전/다음 화살표는 더 굵어야 눈에 띈다 (핸드오프: w4.5) */
export const arrow = (dir, opts = {}) => icon(dir, { sw: 4.5, ...opts });

/* ── 완료 별 배지 ───────────────────────────────────────── */
export const STAR =
  '<svg viewBox="0 0 48 48" width="18" height="18">' +
  '<path d="M24 4l6.2 12.5L44 18.5l-10 9.7 2.4 13.7L24 35.4 11.6 41.9 14 28.2 4 18.5l13.8-2z"' +
  ' fill="#ffd166" stroke="#e0a93e" stroke-width="2" stroke-linejoin="round"/></svg>';

/* ── 색칠 도구 10종 — "말랑 채움" ────────────────────────────
   선이 아니라 면이고, 도구마다 실제 그 도구의 색을 쓴다.
   크기는 32(트레이)가 기본. 색은 path 에 박혀 있어 인자를 안 받는다. */
const TOOL_PATHS = {
  crayon:  '<path d="M19 17h10v21a5 5 0 0 1-10 0z" fill="#ff5a5a"/>' +
           '<path d="M19 17l5-9 5 9z" fill="#e03131"/>' +
           '<rect x="19" y="26" width="10" height="6" fill="#ffd3d3"/>',
  pencil:  '<path d="M30 8l10 10-18 18-14 4 4-14z" fill="#ffc94d"/>' +
           '<path d="M12 26l10 10-14 4z" fill="#f2d9b0"/>' +
           '<path d="M9 39l3-1-2-2z" fill="#5a4b34"/>' +
           '<path d="M30 8l10 10 3-3c2-2 2-5 0-7s-5-2-7 0z" fill="#ff8fc4"/>',
  brush:   '<path d="M36 7c3 2 4 6 1 9L24 29l-7-7L30 9c2-2 4-3 6-2z" fill="#4a90ff"/>' +
           '<path d="M17 22c-4 1-6 4-7 8-1 3-1 4-4 6 5 2 10 1 13-2 3-3 3-8-2-12z" fill="#f7a45c"/>',
  marker:  '<rect x="18" y="14" width="12" height="22" rx="3" fill="#6b6b6b"/>' +
           '<path d="M20 14l2-8h4l2 8z" fill="#3f3f3f"/>' +
           '<path d="M20 36l4 6 4-6z" fill="#3f3f3f"/>' +
           '<rect x="18" y="22" width="12" height="6" fill="#9a9a9a"/>',
  rainbow: '<g fill="none" stroke-linecap="round">' +
           '<path d="M9 37a15 15 0 0 1 30 0" stroke="#ff5a5a" stroke-width="5"/>' +
           '<path d="M15 37a9 9 0 0 1 18 0" stroke="#ffc94d" stroke-width="5"/>' +
           '<path d="M21 37a3 3 0 0 1 6 0" stroke="#4fd06b" stroke-width="5"/></g>',
  glitter: '<path d="M21 6l3.5 9.5L34 19l-9.5 3.5L21 32l-3.5-9.5L8 19l9.5-3.5z" fill="#ffd166"/>' +
           '<path d="M36 26l2 5.5 5.5 1.5L38 35l-2 5.5L34 35l-5.5-2 5.5-1.5z" fill="#ffe6a3"/>',
  flower:  '<g fill="#ff8fc4"><circle cx="24" cy="12" r="7"/><circle cx="35.5" cy="20.5" r="7"/>' +
           '<circle cx="31" cy="34" r="7"/><circle cx="17" cy="34" r="7"/>' +
           '<circle cx="12.5" cy="20.5" r="7"/></g><circle cx="24" cy="24" r="6" fill="#ffd166"/>',
  fill:    '<path d="M10 16h28l-3 24a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4z" fill="#46cfe0"/>' +
           '<ellipse cx="24" cy="16" rx="14" ry="5" fill="#2fb3c4"/>' +
           '<path d="M13 12a11 9 0 0 1 22 0" stroke="#2fb3c4" stroke-width="4" fill="none"' +
           ' stroke-linecap="round"/>',
  sticker: '<path d="M24 6l5.5 11.2L42 19l-9 8.8 2 12.2L24 34.2 13 40l2-12.2L6 19l12.5-1.8z"' +
           ' fill="#ffd166" stroke="#f0b429" stroke-width="2" stroke-linejoin="round"/>',
  eraser:  '<rect x="8" y="17" width="32" height="17" rx="8.5" fill="#e8e14d"/>' +
           '<g fill="#cfc93a"><circle cx="16" cy="24" r="2"/><circle cx="26" cy="29" r="2"/>' +
           '<circle cx="33" cy="23" r="2"/><circle cx="21" cy="21" r="1.5"/></g>'
};

/** 도구 아이콘. 없는 도구면 빈 문자열 */
export const toolIcon = (id, size = 32) =>
  (TOOL_PATHS[id] ? solid(TOOL_PATHS[id], size) : '');

/* ── 홈 카드용 활동 아이콘 ──────────────────────────────────
   트레이 아이콘과 달리 **그룹 색을 인자로 받는다** — 같은 아이콘이
   그룹을 옮기면 색도 따라간다. 굵기는 3 (트레이보다 얇다). */
const glyph = (txt) => (c) => line(
  `<text x="18" y="30" font-size="24" font-weight="800" text-anchor="middle"` +
  ` fill="${c}" stroke="none" font-family="sans-serif">${txt}</text>` +
  '<path d="M30 38l9-9 4 4-9 9-5 1z"/><path d="M8 41h14" stroke-dasharray="4 4"/>',
  { color: c, size: 46, sw: 3 });

const act = (inner) => (c) => line(inner, { color: c, size: 46, sw: 3 });

export const ACT_ICON = {
  coloring: act('<path d="M37 9c2 2 3 5 1 7L23 31l-6-6L32 10c2-2 3-3 5-1z"/>' +
                '<path d="M17 26c-3 1-5 3-6 6-1 3-2 4-4 5 4 2 9 1 12-2 2-2 2-5 1-7z"/>'),
  photo:    act('<rect x="6" y="15" width="36" height="25" rx="5"/>' +
                '<circle cx="24" cy="27" r="7"/><path d="M17 15l3-5h8l3 5"/>'),
  trace:    act('<path d="M6 32c6-12 12 10 18-2s6-8 18-8" stroke-dasharray="6 5"/>'),
  hangul:   glyph('가'),
  names:    act('<rect x="6" y="13" width="36" height="23" rx="6"/>' +
                '<circle cx="16" cy="24" r="4"/><path d="M25 20h11M25 28h7"/>'),
  number:   glyph('12'),
  english:  glyph('Ab'),
  maze:     act('<path d="M24 25c0-3 5-3 5 0 0 4-10 4-10 0 0-8 15-8 15 0' +
                ' 0 10-20 10-20 0 0-13 25-13 25 0"/>'),
  dots:     act('<circle cx="10" cy="36" r="3.5"/><circle cx="24" cy="12" r="3.5"/>' +
                '<circle cx="38" cy="32" r="3.5"/>' +
                '<path d="M12 32l10-16m4 1l10 12" stroke-dasharray="4 4"/>'),
  puzzle:   act('<path d="M10 15h9a5 5 0 1 1 10 0h9v8a5 5 0 1 0 0 10v8h-9' +
                'a5 5 0 1 0-10 0h-9v-8a5 5 0 1 1 0-10z"/>'),
  count:    act('<circle cx="14" cy="31" r="7"/><circle cx="32" cy="31" r="7"/>' +
                '<path d="M14 24v-7m18 7v-7m-18 0c2-2 4-2 6 0m10 0c2-2 4-2 6 0"/>'),
  spot:     act('<circle cx="20" cy="20" r="11"/><path d="M29 29l11 11"/>'),
  video:    act('<rect x="5" y="11" width="38" height="26" rx="6"/>' +
                '<path d="M20 19l10 5-10 5z"/>'),
  sort:     act('<rect x="8" y="8" width="13" height="13" rx="3"/>' +
                '<circle cx="35" cy="14" r="7"/><path d="M17 40l7-11 7 11z"/>')
};

/* ── 단계 칩 아이콘 (선 긋기 22 · 미로 14) ───────────────────
   칩에도 이모지를 쓰지 않는다. 선 긋기는 **그 단계가 실제로 그릴 선**을
   제 색 선으로 보여 주고(⚡ 같은 대충 비슷한 그림이 아니라), 미로는
   목적지를 말랑 채움으로 보여 준다.

   한글·숫자·영어 칩은 글자 자체가 아이콘이라 여기 없다. 세어보기·다른
   그림 찾기 칩의 이모지는 UI 가 아니라 **문제의 내용**이라 그대로 둔다.

   키는 `<코스>:<단계 id>`. 없으면 러너가 level.ico 로 되돌아간다.
   원본은 design_handoff_home_redesign/서브화면 v2.dc.html 의
   traceDefs · mazeDefs. */
const LVL_PATHS = {
  'trace:h': '<path d="M8 24h32" stroke="#4a90ff"/><path d="M32 16l8 8-8 8" stroke="#4a90ff"/>',
  'trace:v': '<path d="M24 8v32" stroke="#4fd06b"/><path d="M16 32l8 8 8-8" stroke="#4fd06b"/>',
  'trace:d': '<path d="M10 38L38 10" stroke="#9b7bff"/><path d="M38 22V10H26" stroke="#9b7bff"/>',
  'trace:arch': ['<path d="M9 36a15 15 0 0 1 30 0" stroke="#ff5a5a"/>' +
                '<path d="M16 36a8 8 0 0 1 16 0" stroke="#ffc94d"/>' +
                '<path d="M22 36a2 2 0 0 1 4 0" stroke="#4fd06b"/>',
                4.5],
  'trace:wave': '<path d="M6 24c4-9 8-9 12 0s8 9 12 0 8-9 12 0" stroke="#46cfe0"/>',
  'trace:zig': '<path d="M8 33l8-16 8 16 8-16 8 16" stroke="#ff8a3d"/>',
  'trace:steps': '<path d="M8 38V28h11V18h11V8h10" stroke="#b07a4a"/>',
  'trace:cross': '<path d="M24 9v30M9 24h30" stroke="#8d6be8"/>',
  'trace:circle': '<circle cx="24" cy="24" r="14" stroke="#ff5f9e"/>',
  'trace:square': '<rect x="10" y="10" width="28" height="28" rx="5" stroke="#b39ddb"/>',
  'trace:tri': '<path d="M24 9L40 38H8z" stroke="#ff6b5a"/>',
  'trace:spiral': '<path d="M24 25c0-3 5-3 5 0 0 4-10 4-10 0 0-8 15-8 15 0 0 10-20 10-20 0 0-13 25-13 25 0" stroke="#9b7bff" stroke-width="2.6"/>',
  'trace:wave2': '<path d="M5 26c6-16 12-16 19 0s13 16 19 0" stroke="#4a90ff"/>',
  'trace:snake': '<path d="M10 8h20a8 8 0 0 1 0 16H18a8 8 0 0 0 0 16h20" stroke="#4fbf7a"/>',
  'trace:bolt': '<path d="M27 6L14 27h9l-4 15 15-22h-9l6-14z" stroke="#ffb02e" stroke-width="4"/>',
  'trace:cloud': '<path d="M14 34a7 7 0 0 1 1-14 9 9 0 0 1 17-2 7 7 0 0 1 2 16z" stroke="#9db4c9"/>',
  'trace:star2': '<path d="M24 7l4.8 9.8L40 18.3l-8 7.8 1.9 11L24 32l-9.9 5.1 1.9-11-8-7.8 11.2-1.5z" stroke="#f2b23c" stroke-width="4"/>',
  'trace:heart': '<path d="M24 40S7 29 7 17a8.5 8.5 0 0 1 17-1 8.5 8.5 0 0 1 17 1c0 12-17 23-17 23z" stroke="#ff5a7a" stroke-width="4.5"/>',
  'trace:fig8': '<path d="M24 24c-7-3-7-15 0-15s7 12 0 15-7 15 0 15 7-12 0-15z" stroke="#46cfe0" stroke-width="4.5"/>',
  'trace:flower2': '<circle cx="24" cy="13" r="6" stroke="#ff8fc4" stroke-width="4"/>' +
                   '<circle cx="34.5" cy="21" r="6" stroke="#ff8fc4" stroke-width="4"/>' +
                   '<circle cx="30.5" cy="33" r="6" stroke="#ff8fc4" stroke-width="4"/>' +
                   '<circle cx="17.5" cy="33" r="6" stroke="#ff8fc4" stroke-width="4"/>' +
                   '<circle cx="13.5" cy="21" r="6" stroke="#ff8fc4" stroke-width="4"/>',
  'trace:snail': '<path d="M26 26c0-2 4-2 4 0 0 3-8 3-8 0 0-6 12-6 12 0 0 8-16 8-16 0 0-10 20-10 20 0" stroke="#b07a4a" stroke-width="2.6"/>' +
                 '<path d="M10 38c3-3 6-4 10-4" stroke="#8a5f3a" stroke-width="2.6"/>',
  'trace:spiral2': '<path d="M24 26c0-2.5 4.5-2.5 4.5 0 0 3.5-9 3.5-9 0 0-7 13.5-7 13.5 0 0 9-18 9-18 0 0-11.5 22.5-11.5 22.5 0 0 13-27 13-27 0" stroke="#4a90ff" stroke-width="2.6"/>',
  'maze:z1': '<path d="M6 32L42 18v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" fill="#ffd24d"/>' +
             '<path d="M6 32L42 18l-4-6L6 26z" fill="#ffe28a"/>' +
             '<circle cx="16" cy="30" r="2.6" fill="#e8b32e"/><circle cx="27" cy="31" r="2" fill="#e8b32e"/>' +
             '<circle cx="35" cy="27" r="1.8" fill="#e8b32e"/>',
  'maze:z5': '<path d="M14 18a5 5 0 1 1 6-6l8 0a5 5 0 1 1 6 6 5 5 0 1 1-6 6h-8a5 5 0 1 1-6-6z" fill="#f2ead8" stroke="#d8ccb0" stroke-width="2" transform="rotate(35 24 24) translate(0 6)"/>',
  'maze:z2': '<path d="M20 16L10 40l24-10z" fill="#ff8a3d" transform="rotate(-8 24 24)"/>' +
             '<path d="M26 14l6-8m-2 9l8-5m-9-1l1-8" stroke="#4fbf5a" stroke-width="4" stroke-linecap="round"/>' +
             '<path d="M17 26l6 3m-8 4l6 3" stroke="#e06a1f" stroke-width="2.5" stroke-linecap="round"/>',
  'maze:z6': '<g fill="#ff8fc4"><circle cx="24" cy="12" r="6.5"/><circle cx="35" cy="20" r="6.5"/>' +
             '<circle cx="31" cy="33" r="6.5"/><circle cx="17" cy="33" r="6.5"/>' +
             '<circle cx="13" cy="20" r="6.5"/></g><circle cx="24" cy="23.5" r="5.5" fill="#ffd166"/>',
  'maze:z7': '<circle cx="24" cy="20" r="13" fill="#ffe6f2"/>' +
             '<path d="M24 20c0-2.5 4-2.5 4 0 0 3.5-8 3.5-8 0 0-6.5 12-6.5 12 0 0 8-16 8-16 0" fill="none" stroke="#ff5f9e" stroke-width="4" stroke-linecap="round"/>' +
             '<path d="M24 33v9" stroke="#d8ccb0" stroke-width="4" stroke-linecap="round"/>',
  'maze:z3': '<path d="M13 22c0 10 5 18 11 18s11-8 11-18z" fill="#b07a4a"/>' +
             '<path d="M11 22a13 8 0 0 1 26 0z" fill="#7a5230"/>' +
             '<path d="M24 14v-6" stroke="#7a5230" stroke-width="4" stroke-linecap="round"/>',
  'maze:z8': '<path d="M8 24c6-9 14-12 22-8l10-8-3 12 3 12-10-8c-8 4-16 1-22-8z" fill="#4aa8e8" transform="scale(-1 1) translate(-48 0)"/>' +
             '<circle cx="15" cy="22" r="2.5" fill="#fff"/><circle cx="15" cy="22" r="1.2" fill="#2a5a8a"/>',
  'maze:z4': '<circle cx="22" cy="26" r="14" fill="#5a7ae0"/>' +
             '<path d="M10 20c8-4 16-4 24 2M9 28c9-4 18-3 26 3M13 36c7-3 13-3 19 1" stroke="#8ba2f0" stroke-width="3" fill="none" stroke-linecap="round"/>' +
             '<path d="M35 33c4 2 6 5 7 9" stroke="#5a7ae0" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
  'maze:z9': '<path d="M9 22L24 9l15 13v14a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3z" fill="#ffb47a"/>' +
             '<path d="M6 23L24 7l18 16" fill="none" stroke="#e06a1f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
             '<rect x="19" y="26" width="10" height="13" rx="2" fill="#8a5f3a"/>',
  'maze:z10': '<ellipse cx="24" cy="30" rx="18" ry="10" fill="#7fd0e8"/>' +
              '<ellipse cx="18" cy="28" rx="6" ry="3" fill="#4fbf7a"/>' +
              '<circle cx="30" cy="26" r="3" fill="#ff8fc4"/>' +
              '<path d="M30 26l1.5-4" stroke="#4fbf7a" stroke-width="2" stroke-linecap="round"/>',
  'maze:z11': '<path d="M24 6c8 0 14 10 14 20a14 14 0 0 1-28 0C10 16 16 6 24 6z" fill="#f2ead8" stroke="#d8ccb0" stroke-width="2"/>' +
              '<circle cx="19" cy="20" r="2.5" fill="#bfe0c4"/><circle cx="29" cy="27" r="3" fill="#bfe0c4"/>' +
              '<circle cx="22" cy="33" r="2" fill="#bfe0c4"/>',
  'maze:z12': '<path d="M30 6a17 17 0 1 0 12 29A17 17 0 0 1 30 6z" fill="#ffd166"/>' +
              '<circle cx="38" cy="12" r="2" fill="#ffe6a3"/><circle cx="43" cy="20" r="1.4" fill="#ffe6a3"/>',
  'maze:z13': '<path d="M14 10h20l8 10-18 20L6 20z" fill="#5ad0e0"/>' +
              '<path d="M14 10l10 10 10-10M6 20h36M24 20l0 18" fill="none" stroke="#2fa8b8" stroke-width="2.5" stroke-linejoin="round"/>',
  'maze:z14': '<rect x="8" y="20" width="32" height="20" rx="3" fill="#ff6b6b"/>' +
              '<rect x="6" y="13" width="36" height="8" rx="2" fill="#ff8a8a"/>' +
              '<rect x="21" y="13" width="6" height="27" fill="#ffd166"/>' +
              '<path d="M24 13c-6 0-9-6-5-8s6 3 5 8c1-5 3-10 7-8s1 8-7 8z" fill="#ffd166"/>',
};

/** 단계 칩 아이콘. 선 긋기는 선, 미로는 면 — 굵기는 아이콘마다 다르다 */
export function lvlIcon(course, id, size = 32) {
  // 점 잇기는 단계 id 가 곧 그림 이름이다 (house · crown · fish · car · star)
  if (course === 'dots') return picIcon(id, size);
  const v = LVL_PATHS[course + ':' + id];
  if (!v) return '';
  if (course === 'maze') return solid(v, size);
  const [inner, sw = 5] = Array.isArray(v) ? v : [v];
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="none"` +
         ` stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

/* ── 스테이지 위 그림 ────────────────────────────────────────
   따라 그리기·미로 스테이지에 이모지 대신 찍는 그림. 캔버스에 SVG 를
   바로 못 그리므로 러너가 이미지로 구워(Image + data URI) 찍는다 —
   그래서 여기 값은 **width/height 가 박힌 완성된 svg 문자열**이다
   (사파리는 크기 없는 SVG 이미지를 그리지 않는다).

   선 긋기·점 잇기의 캐릭터 쌍(🐝→🌻)은 여기 없다. 그건 UI 가 아니라
   그 단계의 이야기라 이모지로 둔다 — 세어보기 칩과 같은 이유. */
export const STAGE_ART = {
  // 지금 여기서 시작 (한글·숫자·영어·이름)
  pen:  solid('<g transform="translate(24,24)">' +
              '<path d="M-12 14L14 -12l6 6L-6 20l-8 2z" fill="#f2b23c" stroke="#8b6a2a"' +
              ' stroke-width="3" stroke-linejoin="round"/></g>', 128),
  // 도착점에서 기다리는 별
  star: solid('<path d="M24 4l6.2 12.5L44 18.5l-10 9.7 2.4 13.7L24 35.4 11.6 41.9' +
              ' 14 28.2 4 18.5l13.8-2z" fill="#ffd166" stroke="#e0a93e"' +
              ' stroke-width="3" stroke-linejoin="round"/>', 128),
  // 미로를 달리는 주인공 (외눈 + 웃는 입 — 프로토타입 그대로)
  runner: solid('<circle cx="24" cy="24" r="23" fill="#ff8a3d"/>' +
                '<circle cx="24" cy="16.6" r="6.5" fill="#fff"/>' +
                '<path d="M13 33.2c3.7 7.4 18.5 7.4 22 0" stroke="#fff" stroke-width="3.7"' +
                ' fill="none" stroke-linecap="round"/>', 128)
};

/* ── 콘텐츠 그림 아이콘 (점 잇기 · 세어보기) ──────────────────
   칩과 스테이지에 **같은 그림**을 쓴다. 아이는 칩의 그림을 보고
   무슨 문제인지 알고, 스테이지에서 그 물건을 센다 — 둘이 다르면
   안 된다. 그래서 세어보기는 방해꾼까지 전부 여기 있다.

   말랑 채움(면) 48×48. 핸드오프에 있는 것은 그대로 가져오고,
   앱에만 있는 물건은 같은 결로 새로 그렸다.
   원본: design_handoff_home_redesign/서브화면 v2.dc.html */
const PIC_PATHS = {
  star:     '<path d="M24 6l5 10.5 11.5 1.5-8.4 8 2.2 11.4L24 32l-10.3 5.4 2.2-11.4-8.4-8L19 16.5z" fill="#ffd166"/>',   // 핸드오프 별
  balloon:  '<ellipse cx="24" cy="18" rx="11" ry="13" fill="#ff8fc4"/>' +
            '<path d="M24 31l-2 3h4z" fill="#e06aa5"/>' +
            '<path d="M24 34c-2 4 2 6 0 10" stroke="#b0a08a" stroke-width="2.5" fill="none" stroke-linecap="round"/>',   // 핸드오프 풍선
  house:    '<path d="M9 22L24 9l15 13v14a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3z" fill="#ffb47a"/>' +
            '<path d="M6 23L24 7l18 16" fill="none" stroke="#e06a1f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<rect x="19" y="26" width="10" height="13" rx="2" fill="#8a5f3a"/>',   // 핸드오프 집
  boat:     '<path d="M8 30h32l-5 8H13z" fill="#b07a4a"/>' +
            '<path d="M24 8v20m0-20l12 16H24" stroke="#4a90ff" stroke-width="3" fill="#bfe4ff" stroke-linejoin="round"/>' +
            '<path d="M4 42c4-3 8-3 12 0s8 3 12 0 8-3 12 0" stroke="#7fd0e8" stroke-width="3" fill="none" stroke-linecap="round"/>',   // 핸드오프 배
  butterfly:'<g fill="#9b7bff"><path d="M22 24c-8-14-20-10-16 0 3 8 12 6 16 0z"/>' +
            '<path d="M26 24c8-14 20-10 16 0-3 8-12 6-16 0z"/></g><g fill="#c9b3ff">' +
            '<circle cx="12" cy="30" r="4"/><circle cx="36" cy="30" r="4"/></g>' +
            '<rect x="22" y="14" width="4" height="20" rx="2" fill="#3a2f22"/>' +
            '<path d="M22 14l-3-5m8 5l3-5" stroke="#3a2f22" stroke-width="2" stroke-linecap="round"/>',   // 핸드오프 나비
  rocket:   '<path d="M24 4c7 5 9 14 6 24H18c-3-10-1-19 6-24z" fill="#e8e2f5"/>' +
            '<circle cx="24" cy="16" r="4" fill="#7fd0e8"/>' +
            '<path d="M18 24l-6 8 7-2m11-6l6 8-7-2" fill="#ff6b6b"/>' +
            '<path d="M22 30h4l-2 10z" fill="#ffb02e"/>',   // 핸드오프 로켓
  apple:    '<path d="M24 14c-8-4-16 2-14 12 2 9 8 16 14 16s12-7 14-16c2-10-6-16-14-12z" fill="#ff5a5a"/>' +
            '<path d="M24 13c0-4 2-6 5-7" stroke="#8a5f3a" stroke-width="3" fill="none" stroke-linecap="round"/>' +
            '<path d="M28 9c3-1 5 0 6 2-2 2-5 2-6-2z" fill="#4fbf5a"/>',   // 핸드오프 사과
  strawberry:'<path d="M24 12c-9 0-14 6-12 14 1 8 7 16 12 16s11-8 12-16c2-8-3-14-12-14z" fill="#ff5f7a"/>' +
             '<path d="M24 12l-5-4m5 4l5-4m-5 4V5" stroke="#4fbf5a" stroke-width="3.5" stroke-linecap="round"/>' +
             '<g fill="#ffe6a3"><circle cx="18" cy="22" r="1.4"/><circle cx="28" cy="20" r="1.4"/>' +
             '<circle cx="24" cy="28" r="1.4"/><circle cx="19" cy="33" r="1.4"/>' +
             '<circle cx="30" cy="31" r="1.4"/></g>',   // 핸드오프 딸기
  duck:     '<ellipse cx="22" cy="30" rx="14" ry="10" fill="#ffd24d"/>' +
            '<circle cx="32" cy="18" r="8" fill="#ffd24d"/><path d="M39 18l6 2-6 3z" fill="#ff8a3d"/>' +
            '<circle cx="33" cy="16" r="1.6" fill="#3a2f22"/>' +
            '<path d="M12 28c-3 2-4 5-3 8" stroke="#e8b32e" stroke-width="3" fill="none" stroke-linecap="round"/>',   // 핸드오프 오리
  fish:     '<ellipse cx="27" cy="24" rx="15" ry="10" fill="#4aa8e8"/>' +
            '<path d="M13 24L3 16v16z" fill="#2f8ccc"/>' +
            '<path d="M26 14c2.5 2 4 4.5 4.5 7-3 0-6-1-8-3z" fill="#7fd0e8"/>' +
            '<circle cx="35" cy="21" r="3" fill="#fff"/>' +
            '<circle cx="35.8" cy="21" r="1.5" fill="#2a4a6a"/>' +
            '<path d="M20 27c3 2 7 2 10 0" stroke="#2f8ccc" stroke-width="2" fill="none" stroke-linecap="round"/>',
  flower:   '<g fill="#ff8fc4"><circle cx="24" cy="12" r="6.5"/><circle cx="35" cy="20" r="6.5"/>' +
            '<circle cx="31" cy="33" r="6.5"/><circle cx="17" cy="33" r="6.5"/>' +
            '<circle cx="13" cy="20" r="6.5"/></g><circle cx="24" cy="23.5" r="5.5" fill="#ffd166"/>',   // 핸드오프 꽃길
  moon:     '<path d="M30 6a17 17 0 1 0 12 29A17 17 0 0 1 30 6z" fill="#ffd166"/>' +
            '<circle cx="38" cy="12" r="2" fill="#ffe6a3"/>' +
            '<circle cx="43" cy="20" r="1.4" fill="#ffe6a3"/>',   // 핸드오프 달나라
  car:      '<path d="M8 28l4-10c1-2 2-3 4-3h12c2 0 3 1 4 3l4 10z" fill="#ff6b6b"/>' +
            '<rect x="5" y="27" width="38" height="9" rx="4" fill="#e05252"/>' +
            '<circle cx="15" cy="37" r="5" fill="#3a3a3a"/><circle cx="33" cy="37" r="5" fill="#3a3a3a"/>' +
            '<circle cx="15" cy="37" r="2" fill="#bdbdbd"/><circle cx="33" cy="37" r="2" fill="#bdbdbd"/>' +
            '<rect x="18" y="18" width="12" height="7" rx="2" fill="#bfeaf5"/>',   // 핸드오프 자동차
  crown:    '<path d="M8 33l-2-17 10 7 8-12 8 12 10-7-2 17z" fill="#ffd166"/>' +
            '<rect x="8" y="33" width="32" height="7" rx="3.5" fill="#e8b32e"/>' +
            '<circle cx="24" cy="24" r="2.6" fill="#ff5f9e"/>' +
            '<circle cx="14" cy="26" r="2" fill="#7fd0e8"/><circle cx="34" cy="26" r="2" fill="#7fd0e8"/>',
  ball:     '<circle cx="24" cy="24" r="17" fill="#fffdf7"/>' +
            '<path d="M24 7a17 17 0 0 0 0 34c-5-4-8-10-8-17s3-13 8-17z" fill="#ff5a5a"/>' +
            '<path d="M24 7a17 17 0 0 1 0 34c5-4 8-10 8-17s-3-13-8-17z" fill="#4a90ff"/>' +
            '<circle cx="24" cy="24" r="17" fill="none" stroke="#e0d5bd" stroke-width="2"/>',
  cookie:   '<circle cx="24" cy="24" r="16" fill="#e0a95e"/><g fill="#6b4423">' +
            '<circle cx="18" cy="19" r="2.6"/><circle cx="30" cy="21" r="2.2"/>' +
            '<circle cx="22" cy="29" r="2.4"/><circle cx="31" cy="30" r="1.8"/>' +
            '<circle cx="15" cy="27" r="1.6"/></g>',
  pear:     '<path d="M24 42c-6.5 0-11-4.5-11-10 0-4.2 2.2-6.6 3.9-9.2 1.6-2.4 2.6-4.6 2.6-7 0-3.6 2-5.8 4.5-5.8s4.5 2.2 4.5 5.8c0 2.4 1 4.6 2.6 7 1.7 2.6 3.9 5 3.9 9.2 0 5.5-4.5 10-11 10z" fill="#cfe06a"/>' +
            '<path d="M24 10V6" stroke="#8a5f3a" stroke-width="2.8" stroke-linecap="round"/>' +
            '<path d="M25 8c3.2-2.6 7-1.8 7.6.8-2.2 2.2-6.2 2-7.6-.8z" fill="#4fbf5a"/>' +
            '<ellipse cx="19" cy="30" rx="2.6" ry="4" fill="#e2ee9a"/>',
  lemon:    '<path d="M5 24c3.5-4.5 10-10 19-10s15.5 5.5 19 10c-3.5 4.5-10 10-19 10S8.5 28.5 5 24z"' +
            ' fill="#ffd24d"/>' +
            '<path d="M40 24c1.5-1.4 2.6-2.6 3-3-0.4-.4-1.5-1.6-3-3z" fill="#e8b32e"/>' +
            '<path d="M8 24c-1.5-1.4-2.6-2.6-3-3 .4-.4 1.5-1.6 3-3z" fill="#e8b32e"/>' +
            '<ellipse cx="19" cy="20" rx="5" ry="2.4" fill="#ffe8a3"/>',
  chick:    '<circle cx="24" cy="28" r="13" fill="#ffd24d"/>' +
            '<circle cx="24" cy="15" r="9" fill="#ffd24d"/><path d="M24 15l-6 2 6 3z" fill="#ff8a3d"/>' +
            '<circle cx="21" cy="13" r="1.7" fill="#3a2f22"/>' +
            '<circle cx="28" cy="13" r="1.7" fill="#3a2f22"/>' +
            '<path d="M18 40l-3 3m12-3l3 3" stroke="#ff8a3d" stroke-width="3" stroke-linecap="round"/>',
  bird:     '<path d="M10 30c0-8 6-13 13-13 7 0 12 4 13 10l6 3-6 3c-2 5-7 8-13 8-7 0-13-4-13-11z" fill="#4aa8e8"/>' +
            '<path d="M16 24c4-4 10-4 13 0-4 5-9 5-13 0z" fill="#7fd0e8"/>' +
            '<circle cx="30" cy="24" r="1.8" fill="#fff"/><path d="M36 27l6-2-6-2z" fill="#ff8a3d"/>',
  cloud:    '<path d="M15 35a8 8 0 0 1 1-16 10 10 0 0 1 19-2 8 8 0 0 1 2 18z" fill="#cfdce6"/>' +
            '<path d="M18 32a5 5 0 0 1 1-10" stroke="#eef3f7" stroke-width="3" fill="none" stroke-linecap="round"/>',
  octopus:  '<path d="M12 24a12 12 0 0 1 24 0v6H12z" fill="#b06be0"/>' +
            '<path d="M13 30c-2 5-5 7-8 7 3 2 7 1 9-3m4 2c-1 6-3 8-5 10 4 0 7-3 8-7m4 1c1 6 3 8 5 10-4 0-7-3-8-7m5-6c2 5 5 7 8 7-3 2-7 1-9-3" fill="#c98fe8"/>' +
            '<circle cx="19" cy="22" r="2.2" fill="#fff"/><circle cx="29" cy="22" r="2.2" fill="#fff"/>' +
            '<circle cx="19" cy="22" r="1.1" fill="#3a2f22"/>' +
            '<circle cx="29" cy="22" r="1.1" fill="#3a2f22"/>',
  crab:     '<ellipse cx="24" cy="28" rx="14" ry="10" fill="#ff5a5a"/>' +
            '<circle cx="18" cy="21" r="3" fill="#ff5a5a"/><circle cx="30" cy="21" r="3" fill="#ff5a5a"/>' +
            '<circle cx="18" cy="21" r="1.4" fill="#fff"/><circle cx="30" cy="21" r="1.4" fill="#fff"/>' +
            '<path d="M10 22c-4-1-6-3-6-6 3 0 6 2 7 5zm28 0c4-1 6-3 6-6-3 0-6 2-7 5z" fill="#e04a3a"/>' +
            '<path d="M12 36l-4 5m10-3l-2 6m18-8l4 5m-10-3l2 6" stroke="#e04a3a" stroke-width="3" stroke-linecap="round"/>',
  donut:    '<circle cx="24" cy="24" r="16" fill="#e0a95e"/>' +
            '<path d="M24 8a16 16 0 0 1 14 8c-3 6-9 7-14 6s-10 1-13 5A16 16 0 0 1 24 8z" fill="#ff8fc4"/>' +
            '<circle cx="24" cy="24" r="5.5" fill="#fffdf7"/>' +
            '<g stroke-width="2.4" stroke-linecap="round"><path d="M17 14l2 3" stroke="#7fd0e8"/>' +
            '<path d="M27 12l-1 3" stroke="#ffd166"/><path d="M33 18l-3 1" stroke="#4fbf7a"/></g>',
  cupcake:  '<path d="M13 22h22l-3 15a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3z" fill="#f2d9b0"/>' +
            '<path d="M13 22h22l-2 5H15z" fill="#e0c294"/>' +
            '<path d="M24 6c5 0 9 4 9 8 0 5-4 8-9 8s-9-3-9-8c0-4 4-8 9-8z" fill="#ff8fc4"/>' +
            '<circle cx="24" cy="7" r="2.4" fill="#ff5a5a"/>',
  heart:      '<path d="M24 41.5C24 41.5 5 29.5 5 18.2 5 12.3 9.6 7.6 15.3 7.6 c3.7 0 7 2 8.7 5 1.7-3 5-5 8.7-5 5.7 0 10.3 4.7 10.3 10.6 0 11.3-19 23.3-19 23.3z"' +
              ' fill="#ff5a7a"/>' +
              '<path d="M13 15c-1.6 1.4-2.4 3.3-2.3 5.3" stroke="#ff9fb3" stroke-width="3"' +
              ' fill="none" stroke-linecap="round"/>',
};

/** 콘텐츠 그림. 없는 키면 빈 문자열 */
export const picIcon = (key, size = 34) =>
  (PIC_PATHS[key] ? solid(PIC_PATHS[key], size) : '');
