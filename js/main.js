/* ============================================================
   main.js — 앱 셸: 화면 전환, 홈 목록, 갤러리, PWA 등록
   ============================================================ */

import { initColoring } from './coloring/index.js';
import { initPractice } from './trace/index.js';
import { initPuzzle } from './puzzle/index.js';
import { initSpot } from './spot/index.js';
import { initCount } from './count/index.js';
import { unlock, sfx, setMuted, isMuted } from './core/audio.js';
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

/* 홈 화면 목록 = 그대로 콘텐츠 로드맵.
   ready:false 는 "곧 나와요" 카드로 보인다. */
const ACTIVITIES = [
  { id: 'coloring', emoji: '🎨', name: '색칠하기',   desc: '펜으로 자유롭게', ready: true },
  { id: 'trace',    emoji: '✏️', name: '따라 그리기', desc: '점선 따라 쓱쓱', ready: true },
  { id: 'hangul',   emoji: '🇰🇷', name: '한글 쓰기',   desc: 'ㄱ ㄴ ㄷ 획순', ready: true },
  { id: 'names',    emoji: '📛', name: '이름 쓰기',   desc: '우리 가족 이름', ready: true },
  { id: 'number',   emoji: '🔢', name: '숫자 쓰기',   desc: '1부터 100까지', ready: true },
  { id: 'english',  emoji: '🔤', name: '영어 쓰기',   desc: 'A B C 획순', ready: true },
  { id: 'maze',     emoji: '🌀', name: '미로 찾기',   desc: '길을 그어 탈출', ready: true },
  { id: 'dots',     emoji: '🔗', name: '점 잇기',     desc: '이으면 그림이!', ready: true },
  { id: 'puzzle',   emoji: '🧩', name: '조각 퍼즐',   desc: '맞추면 그림 완성!', ready: true },
  { id: 'sort',     emoji: '🗂️', name: '모양 분류',   desc: '끌어다 담기' },
  { id: 'count',    emoji: '🍎', name: '세어보기',    desc: '몇 개일까?', ready: true },
  { id: 'spot',     emoji: '🔍', name: '다른 그림 찾기', desc: '눈썰미 대결', ready: true }
];

/* ── 화면 전환 ─────────────────────────────────────────────
   따라 그리기류 다섯(선 긋기·한글·숫자·미로·점 잇기)은 화면이 같아서
   #screen-trace 하나를 공유한다. 러너가 코스만 갈아 끼운다. */
const SCREEN_OF = { coloring: 'coloring', trace: 'trace', hangul: 'trace', english: 'trace',
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
  const grid = $('activity-grid');
  grid.innerHTML = '';
  for (const a of ACTIVITIES) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card' + (a.ready ? '' : ' locked');
    card.innerHTML = `
      <span class="emoji">${a.emoji}</span>
      <span class="name">${a.name}</span>
      <span class="desc">${a.desc}</span>
      ${a.ready ? '' : '<span class="badge">곧 나와요</span>'}`;
    card.addEventListener('click', () => {
      if (!a.ready) { toast('아직 준비 중이에요 🙂'); return; }
      sfx.tap();
      show(a.id);
      ACTIVITY_APPS[a.id].enter(a.id);
    });
    grid.appendChild(card);
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
  coloring,
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
  b.textContent = isMuted() ? '🔇' : '🔊';
  b.classList.toggle('is-off', isMuted());
}
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
