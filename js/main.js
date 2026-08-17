/* ============================================================
   main.js — 앱 셸: 화면 전환, 홈 목록, 갤러리, PWA 등록
   ============================================================ */

import { initColoring } from './coloring/index.js';
import { unlock, sfx } from './core/audio.js';
import { works } from './core/store.js';

const $ = (id) => document.getElementById(id);

/* 홈 화면 목록 = 그대로 콘텐츠 로드맵.
   ready:false 는 "곧 나와요" 카드로 보인다. */
const ACTIVITIES = [
  { id: 'coloring', emoji: '🎨', name: '색칠하기',   desc: '펜으로 자유롭게', ready: true },
  { id: 'trace',    emoji: '✏️', name: '따라 그리기', desc: '점선 따라 쓱쓱' },
  { id: 'hangul',   emoji: '🇰🇷', name: '한글 쓰기',   desc: 'ㄱ ㄴ ㄷ 획순' },
  { id: 'number',   emoji: '🔢', name: '숫자 쓰기',   desc: '1부터 10까지' },
  { id: 'maze',     emoji: '🌀', name: '미로 찾기',   desc: '길을 그어 탈출' },
  { id: 'dots',     emoji: '🔗', name: '점 잇기',     desc: '이으면 그림이!' },
  { id: 'match',    emoji: '🧩', name: '짝 맞추기',   desc: '같은 걸 찾아요' },
  { id: 'sort',     emoji: '🗂️', name: '모양 분류',   desc: '끌어다 담기' },
  { id: 'count',    emoji: '🍎', name: '세어보기',    desc: '몇 개일까?' },
  { id: 'spot',     emoji: '🔍', name: '다른 그림 찾기', desc: '눈썰미 대결' }
];

/* ── 화면 전환 ───────────────────────────────────────────── */
function show(name) {
  for (const s of document.querySelectorAll('.screen')) s.classList.remove('is-active');
  $('screen-' + name).classList.add('is-active');
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
      show('coloring');
      coloring.enter();
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
const coloring = initColoring({ toast, goHome: () => { show('home'); } });

buildHome();
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
