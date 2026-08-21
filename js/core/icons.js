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
  sort:     act('<rect x="8" y="8" width="13" height="13" rx="3"/>' +
                '<circle cx="35" cy="14" r="7"/><path d="M17 40l7-11 7 11z"/>')
};
