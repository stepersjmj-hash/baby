/* ============================================================
   main.js — 앱 셸: 화면 전환, 홈 목록, 갤러리, PWA 등록
   ============================================================ */

import { initColoring } from './coloring/index.js';
import { initPractice } from './trace/index.js';
import { initPuzzle } from './puzzle/index.js';
import { initSpot } from './spot/index.js';
import { initCount } from './count/index.js';
import { unlock, sfx, setMuted, isMuted, audioState } from './core/audio.js';
import { works } from './core/store.js';

const $ = (id) => document.getElementById(id);

/* iPadOS 16.3 이하에는 canvas 의 roundRect 가 없다. 미로 벽·퍼즐 판·
   다른 그림 찾기 판이 이걸 쓰는데, 없으면 그리다 예외가 나서 화면이
   통째로 빈다 (증상: "퍼즐에서 그림이 안 나와"). 없을 때만 채워 넣는다. */
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r = 0) {
    r = Math.max(0, Math.min(Array.isArray(r) ? r[0] : r, w / 2, h / 2));
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

/* ── 홈 화면 ──────────────────────────────────────────────
   활동을 네 갈래로 묶는다. 그룹마다 색이 있고, 그 색이 라벨 점 · 아이콘
   타일 배경(tint) · 아이콘 선(stroke) · 카드 하단 띠에 함께 쓰인다 —
   글자를 못 읽는 나이라 "같은 색 = 같은 갈래" 가 유일한 단서다.
   ready:false 는 "곧 나와요" 그룹으로 내려가 잠긴 카드가 된다. */
const GROUPS = [
  { id: 'create', title: '창작',      dot: '#ff8a3d', tint: '#fff0e0', stroke: '#e8762a' },
  { id: 'write',  title: '쓰기 준비', dot: '#7fd18a', tint: '#e9f7ea', stroke: '#4da55c' },
  { id: 'think',  title: '생각 놀이', dot: '#7ab8f2', tint: '#e8f1fc', stroke: '#4d84c4' },
  { id: 'soon',   title: '곧 나와요', dot: '#c9b88f', tint: '#f6efe2', stroke: '#a08b5f' }
];

/* 아이콘은 이모지가 아니라 인라인 SVG 다. 이모지는 기기마다 그림이 다르고
   색을 그룹에 맞출 수 없다. 좌표계는 48×48 로 통일. */
const svg = (inner, color, size = 46, sw = 3) =>
  `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" stroke="${color}"` +
  ` stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

/* 글자를 쓰는 코스(한글·숫자·영어)는 "글자 + 연필 + 점선" 으로 통일한다 */
const glyph = (txt) => (c) => svg(
  `<text x="18" y="30" font-size="24" font-weight="800" text-anchor="middle"` +
  ` fill="${c}" stroke="none" font-family="sans-serif">${txt}</text>` +
  '<path d="M30 38l9-9 4 4-9 9-5 1z"/><path d="M8 41h14" stroke-dasharray="4 4"/>', c);

const ICON = {
  coloring: (c) => svg('<path d="M37 9c2 2 3 5 1 7L23 31l-6-6L32 10c2-2 3-3 5-1z"/>' +
                       '<path d="M17 26c-3 1-5 3-6 6-1 3-2 4-4 5 4 2 9 1 12-2 2-2 2-5 1-7z"/>', c),
  photo:    (c) => svg('<rect x="6" y="15" width="36" height="25" rx="5"/>' +
                       '<circle cx="24" cy="27" r="7"/><path d="M17 15l3-5h8l3 5"/>', c),
  trace:    (c) => svg('<path d="M6 32c6-12 12 10 18-2s6-8 18-8" stroke-dasharray="6 5"/>', c),
  hangul:   glyph('가'),
  names:    (c) => svg('<rect x="6" y="13" width="36" height="23" rx="6"/>' +
                       '<circle cx="16" cy="24" r="4"/><path d="M25 20h11M25 28h7"/>', c),
  number:   glyph('12'),
  english:  glyph('Ab'),
  maze:     (c) => svg('<path d="M24 25c0-3 5-3 5 0 0 4-10 4-10 0 0-8 15-8 15 0' +
                       ' 0 10-20 10-20 0 0-13 25-13 25 0"/>', c),
  dots:     (c) => svg('<circle cx="10" cy="36" r="3.5"/><circle cx="24" cy="12" r="3.5"/>' +
                       '<circle cx="38" cy="32" r="3.5"/>' +
                       '<path d="M12 32l10-16m4 1l10 12" stroke-dasharray="4 4"/>', c),
  puzzle:   (c) => svg('<path d="M10 15h9a5 5 0 1 1 10 0h9v8a5 5 0 1 0 0 10v8h-9' +
                       'a5 5 0 1 0-10 0h-9v-8a5 5 0 1 1 0-10z"/>', c),
  count:    (c) => svg('<circle cx="14" cy="31" r="7"/><circle cx="32" cy="31" r="7"/>' +
                       '<path d="M14 24v-7m18 7v-7m-18 0c2-2 4-2 6 0m10 0c2-2 4-2 6 0"/>', c),
  spot:     (c) => svg('<circle cx="20" cy="20" r="11"/><path d="M29 29l11 11"/>', c),
  sort:     (c) => svg('<rect x="8" y="8" width="13" height="13" rx="3"/>' +
                       '<circle cx="35" cy="14" r="7"/><path d="M17 40l7-11 7 11z"/>', c)
};

/* 헤더 아이콘 (26·24px, 선이 굵다) */
const INK = '#3a2f22';
const ICON_SOUND = svg('<path d="M8 19v10h7l9 8V11l-9 8H8z"/><path d="M30 18c3 3 3 9 0 12"/>' +
                       '<path d="M35 14c5 5 5 15 0 20"/>', INK, 26, 3.5);
const ICON_MUTED = svg('<path d="M8 19v10h7l9 8V11l-9 8H8z"/>' +
                       '<path d="M31 19l11 11M42 19L31 30"/>', INK, 26, 3.5);
const ICON_GALLERY = svg('<rect x="5" y="9" width="38" height="30" rx="6"/>' +
                         '<circle cx="16" cy="19" r="3.5"/><path d="M9 35l9-9 8 8 7-8 10 11"/>',
                         INK, 24, 3.5);

const ACTIVITIES = [
  { id: 'coloring', group: 'create', name: '색칠하기',      desc: '펜으로 자유롭게', ready: true },
  { id: 'photo',    group: 'create', name: '내 사진 색칠',  desc: '내 사진이 밑그림으로', ready: true },

  { id: 'trace',    group: 'write',  name: '따라 그리기',   desc: '점선 따라 쓱쓱', ready: true },
  { id: 'hangul',   group: 'write',  name: '한글 쓰기',     desc: 'ㄱ ㄴ ㄷ 획순', ready: true },
  { id: 'names',    group: 'write',  name: '이름 쓰기',     desc: '우리 가족 이름', ready: true },
  { id: 'number',   group: 'write',  name: '숫자 쓰기',     desc: '1부터 100까지', ready: true },
  { id: 'english',  group: 'write',  name: '영어 쓰기',     desc: 'A B C 획순', ready: true },

  { id: 'maze',     group: 'think',  name: '미로 찾기',     desc: '길을 그어 탈출', ready: true },
  { id: 'dots',     group: 'think',  name: '점 잇기',       desc: '이으면 그림이!', ready: true },
  { id: 'puzzle',   group: 'think',  name: '조각 퍼즐',     desc: '맞추면 그림 완성!', ready: true },
  { id: 'count',    group: 'think',  name: '세어보기',      desc: '몇 개일까?', ready: true },
  { id: 'spot',     group: 'think',  name: '다른 그림 찾기', desc: '눈썰미 대결', ready: true },

  { id: 'sort',     group: 'soon',   name: '모양 분류',     desc: '끌어다 담기' }
];

/* ── 화면 전환 ─────────────────────────────────────────────
   따라 그리기류 다섯(선 긋기·한글·숫자·미로·점 잇기)은 화면이 같아서
   #screen-trace 하나를 공유한다. 러너가 코스만 갈아 끼운다. */
const SCREEN_OF = { coloring: 'coloring', photo: 'coloring',
                    trace: 'trace', hangul: 'trace', english: 'trace',
                    names: 'trace',
                    number: 'trace', maze: 'trace', dots: 'trace', puzzle: 'puzzle',
                    spot: 'spot', count: 'count' };

function show(name) {
  for (const s of document.querySelectorAll('.screen')) s.classList.remove('is-active');
  $('screen-' + (SCREEN_OF[name] || name)).classList.add('is-active');
}

/* ── 토스트 ──────────────────────────────────────────────── */
let toastTimer = 0;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 1800);
}

/* ── 홈 ──────────────────────────────────────────────────── */
function buildHome() {
  const wrap = $('activity-groups');
  wrap.innerHTML = '';
  for (const g of GROUPS) {
    const items = ACTIVITIES.filter(a => a.group === g.id);
    if (!items.length) continue;

    const box = document.createElement('div');
    box.className = 'group';
    box.innerHTML =
      `<div class="group-label">
         <span class="group-dot" style="background:${g.dot}"></span>
         <span class="group-name">${g.title}</span>
       </div>`;

    const grid = document.createElement('div');
    grid.className = 'group-grid';
    for (const a of items) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card' + (a.ready ? '' : ' locked');
      card.innerHTML = `
        <span class="tile" style="background:${g.tint}">${(ICON[a.id] || ICON.sort)(g.stroke)}</span>
        <span class="name">${a.name}</span>
        <span class="desc">${a.desc}</span>
        ${a.ready ? '' : '<span class="badge">곧 나와요</span>'}
        <i class="bar" style="background:${g.dot}"></i>`;
      card.addEventListener('click', () => {
        if (!a.ready) { toast('아직 준비 중이에요'); return; }
        sfx.tap();
        show(a.id);
        ACTIVITY_APPS[a.id].enter(a.id);
      });
      grid.appendChild(card);
    }
    box.appendChild(grid);
    wrap.appendChild(box);
  }
}

/* ── 갤러리 ──────────────────────────────────────────────── */
const urls = new Set();
async function buildGallery() {
  const grid = $('gallery-grid');
  for (const u of urls) URL.revokeObjectURL(u);
  urls.clear();
  grid.innerHTML = '';

  let items = [];
  try { items = await works.all(); } catch { /* 저장소를 못 열면 빈 화면 */ }
  items.sort((a, b) => b.at - a.at);

  if (!items.length) {
    grid.innerHTML = '<div class="empty">아직 저장한 그림이 없어요<br>색칠하고 💾 를 눌러 보세요</div>';
    return;
  }

  for (const it of items) {
    const url = URL.createObjectURL(it.blob);
    urls.add(url);
    const box = document.createElement('div');
    box.className = 'gallery-item';
    box.innerHTML = `<img src="${url}" alt="내 그림">
                     <button class="del" type="button" aria-label="지우기">🗑️</button>`;
    box.querySelector('img').addEventListener('click', () => shareBlob(it.blob));
    box.querySelector('.del').addEventListener('click', async () => {
      await works.del(it.id); buildGallery();
    });
    grid.appendChild(box);
  }
}

async function shareBlob(blob) {
  const file = new File([blob], `내그림-${Date.now()}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: '내 그림' });
      return;
    }
  } catch { /* 사용자가 취소 */ return; }
  // 공유가 안 되는 환경: 새 탭에 열어 두면 길게 눌러 사진에 저장할 수 있다
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ── 시작 ────────────────────────────────────────────────── */
const goHome = () => show('home');
const coloring = initColoring({ toast, goHome });
const practice = initPractice({ toast, goHome });
const ACTIVITY_APPS = {
  coloring, photo: coloring,
  trace: practice, hangul: practice, number: practice, maze: practice, dots: practice,
  english: practice, names: practice,
  puzzle: initPuzzle({ toast, goHome }),
  spot: initSpot({ toast, goHome }),
  count: initCount({ toast, goHome })
};

buildHome();
/* 소리 켜기/끄기. 부모 모드가 생기기 전까지는 홈에 그냥 둔다 —
   아이가 눌러도 되돌릴 수 있는 동작이라 잠글 이유가 없다. */
function paintSoundBtn() {
  const b = $('btn-sound');
  b.innerHTML = isMuted() ? ICON_MUTED : ICON_SOUND;
  b.classList.toggle('is-off', isMuted());
}
$('btn-gallery').innerHTML = ICON_GALLERY + '내 그림';
paintSoundBtn();
$('btn-sound').addEventListener('click', () => {
  setMuted(!isMuted());
  paintSoundBtn();
  if (!isMuted()) { unlock(); sfx.tap(); }
});

$('btn-gallery').addEventListener('click', () => { sfx.tap(); show('gallery'); buildGallery(); });
$('btn-gallery-back').addEventListener('click', () => { sfx.tap(); show('home'); });

// iOS 는 사용자 제스처 안에서만 오디오를 켤 수 있다
window.addEventListener('pointerdown', unlock, { once: true });

// 두 손가락 확대/더블탭 확대 차단 (그림 그릴 때 화면이 튀는 걸 막는다)
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

// 홈화면에 추가 안내 (사파리에서 그냥 열었을 때만)
if (!window.matchMedia('(display-mode: standalone)').matches && !navigator.standalone) {
  $('install-hint').textContent =
    '공유 버튼 → "홈 화면에 추가" 하면 전체 화면 앱처럼 쓸 수 있어요';
}

// 지금 화면이 어느 버전인지 홈 구석에 찍는다 — "반영된 거야?" 를 눈으로 확인
fetch('sw.js').then(r => r.text()).then(t => {
  const m = /VERSION = '([^']+)'/.exec(t);
  if (m) $('install-hint').textContent += ($('install-hint').textContent ? ' · ' : '') + m[1];
}).catch(() => {});

/* 음소거 상태로 시작하면 조용한 이유를 화면이 직접 알린다.
   음소거는 **주소(origin)마다 따로 저장된다** — 로컬 서버에선 켜져 있어도
   GitHub Pages 에선 꺼져 있을 수 있다. 실제로 그것 때문에 헤맸다. */
if (isMuted()) toast('소리가 꺼져 있어요 — 오른쪽 위 스피커 버튼을 누르면 켜져요');

/* 소리 진단 — 홈 아래에 오디오 상태를 찍는다. 단, **이상할 때만.**
   아이패드에는 콘솔이 없어서 "왜 조용하지" 를 눈으로 읽을 수 있어야
   기기 문제(무음 스위치)인지 코드 문제(컨텍스트가 안 깨어남)인지 갈린다.
   평소엔 아이 화면에 군더더기라 숨기고, 다음 중 하나라도 걸리면 띄운다.
     · 컨텍스트가 running 이 아니다        → 코드/세션 쪽
     · 샘플레이트가 24000                  → 오염된 세션에서 태어난 컨텍스트
     · 킥에 오류가 붙었다                   → 무음 킥이 못 돌아감
     · 음소거                              → 조용한 이유를 화면이 직접 알린다
   깊이 파야 할 땐 tools/ios-check.html 을 쓴다.
   홈에 있을 때만 갱신하므로 노는 동안은 비용이 없다. */
setInterval(() => {
  if (!$('screen-home').classList.contains('is-active')) return;
  const s = audioState();
  const 이상 = s.음소거 || s.킥오류 !== '없음' || s.킥거부 !== '없음' ||
               s.깨우기거부 !== '없음' ||
               (s.컨텍스트 !== '아직 안 만듦' && s.컨텍스트 !== 'running') ||
               s.샘플레이트 === 24000;
  $('audio-state').textContent = 이상
    ? `🔈 ${s.컨텍스트}·${s.샘플레이트} 킥:${s.킥} 탭:${s.제스처}` +
      (s.킥오류 !== '없음' ? ` 킥오류:${s.킥오류}` : '') +
      (s.킥거부 !== '없음' ? ` 킥거부:${s.킥거부}` : '') +
      (s.깨우기거부 !== '없음' ? ` 깨우기거부:${s.깨우기거부}` : '') +
      (s.음소거 ? ' 🔇음소거' : '')
    : '';
}, 700);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
