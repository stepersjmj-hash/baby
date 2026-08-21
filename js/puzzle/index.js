/* ============================================================
   puzzle/index.js — 조각 퍼즐
   ------------------------------------------------------------
   그림은 pics.js(기본 30장) + 내가 등록한 사진, 조각 기하는 cut.js.
   여기는 보여 주기와 배선만.

   왼쪽이 맞추는 판(제 그림이 흐리게 비치고 조각 자리가 그려져 있다),
   오른쪽에 조각이 흩어져 있다. 조각을 끌어 제자리 근처에 놓으면
   착 붙는다. 엉뚱한 자리에 놓으면 그냥 그 자리에 남는다 — 벌 없음.

   자르기는 열 때마다 무작위다 (cut.js 의 BSP). 같은 그림이라도
   매번 다르게 잘린다.

   내 사진: 📷 사진 추가 칩 → 사진첩에서 고르면 줄여서 IndexedDB 에
   저장하고, 사진마다 상(8조각) 퍼즐 하나가 생긴다. 사진 칩을 2초
   길게 누르면 지운다 (파괴적 동작은 어렵게 — 3~6세 UX 원칙).

   레이어 3장 (CSS 로 겹쳐 두고 GPU 가 합성한다)
     p-drag   ③ 지금 끌고 있는 조각, 칭찬 반짝이
     p-loose  ② 아직 못 맞춘 조각들
     p-board  ① 판: 흐린 그림 + 조각 자리 + 맞춘 조각

   조각 비트맵은 단계를 열 때 한 번 구워 캐시한다.
   끌 때마다 경로를 다시 자르면 아이패드에서 느려진다.
   ============================================================ */

import { attachPen } from '../core/pen.js';
import { fitPaper, setOrigin } from '../core/fit.js';
import { STAR } from '../core/icons.js';
import { VIEW, PIC, SCAT, SNAP, buildPuzzle, tracePiece } from './cut.js';
import { PICS, drawScene } from './pics.js';
import { sfx, voice } from '../core/audio.js';
import { photos } from '../core/store.js';

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const DONE_KEY = 'puzzleDone';

export function initPuzzle({ toast, goHome }) {
  const $ = (id) => document.getElementById(id);

  const paper = $('puzzle-paper');
  const cBoard = $('p-board'), cLoose = $('p-loose'), cDrag = $('p-drag');
  const bctx = cBoard.getContext('2d');
  const lctx = cLoose.getContext('2d');
  const dctx = cDrag.getContext('2d');

  let done = new Set();
  let LV = [...PICS];                   // 기본 그림 + 내 사진 단계들
  let W = 0, H = 0, S = 1;
  let OX = 0, OY = 0;                   // 내용을 종이 가운데로 옮기는 원점
  const clear = (ctx) => ctx.clearRect(-OX, -OY, W, H);
  let li = 0, level = LV[0];
  let pieces = [], placed = new Set();
  let order = [];                       // 그리는 순서 = 아래→위. 집으면 맨 위로
  let held = null, grab = { x: 0, y: 0 };
  let scene = null, bitmaps = new Map();
  let party = null, raf = 0, advanceTimer = 0;
  let vox = null;

  /* 내 사진: id → { blob, url, img } */
  const album = new Map();

  /* ── 레이아웃 ─────────────────────────────────────────── */

  /* 판(PIC)과 조각이 놓이는 자리만 쓴다 — 그 상자를 종이에 꽉 채운다.
     좌표계(1000×700)째로 맞추면 위아래가 남아서 조각이 작아진다.
     조각은 SCAT 안에 "중심"이 놓이므로 큰 조각은 오른쪽·아래로 반쯤
     삐져나온다 — 흩는 자리 대신 화면 끝(VIEW-6)까지 상자에 넣어야
     조각이 잘리지 않는다 (cut.js 의 흩기 규칙과 짝을 이룬다). */
  const BOX = {
    x: PIC.x - 12, y: Math.min(PIC.y - 12, SCAT.y),
    w: (VIEW.w - 6) - (PIC.x - 12),
    h: (VIEW.h - 6) - Math.min(PIC.y - 12, SCAT.y)
  };

  function doLayout() {
    const fit = fitPaper($('puzzle-stage'), paper, BOX, DPR);
    if (!fit) return;
    if (fit.W === W && fit.H === H) return;
    W = fit.W; H = fit.H; S = fit.S; OX = fit.OX; OY = fit.OY;
    for (const cv of [cBoard, cLoose, cDrag]) {
      cv.width = W; cv.height = H;                      // 크기를 넣으면 변환이 초기화된다
      setOrigin(cv.getContext('2d'), fit);
    }
    bake();
    redrawAll();
  }

  /* ── 조각 굽기 ────────────────────────────────────────── */
  function paintScene(c, w, h) {
    if (!level.photo) { drawScene(level, c, w, h); return; }
    const img = album.get(level.photo)?.img;
    if (!img) {                                        // 아직 로딩 중
      c.fillStyle = '#f2ead9';
      c.fillRect(0, 0, w, h);
      return;
    }
    // 사진을 판 비율(4:3)에 맞춰 가운데를 꽉 차게 자른다
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const k = Math.max(w / iw, h / ih);
    const cw = w / k, ch = h / k;
    c.drawImage(img, (iw - cw) / 2, (ih - ch) / 2, cw, ch, 0, 0, w, h);
  }

  function bake() {
    if (!W || !level) return;
    scene = document.createElement('canvas');
    scene.width = Math.max(2, Math.round(PIC.w * S));
    scene.height = Math.max(2, Math.round(PIC.h * S));
    paintScene(scene.getContext('2d'), scene.width, scene.height);

    bitmaps = new Map();
    for (const p of pieces) {
      const m = p.margin;
      const cv = document.createElement('canvas');
      cv.width  = Math.max(2, Math.round((p.rect.w + m * 2) * S));
      cv.height = Math.max(2, Math.round((p.rect.h + m * 2) * S));
      const c = cv.getContext('2d');
      const ox = (m - p.rect.x) * S, oy = (m - p.rect.y) * S;
      c.save();
      c.beginPath();
      tracePiece(c, p, S, ox, oy);
      c.clip();
      c.drawImage(scene, ox, oy);
      c.restore();
      c.beginPath();
      tracePiece(c, p, S, ox, oy);
      c.lineWidth = 3.5 * S; c.strokeStyle = 'rgba(255,255,255,.9)'; c.stroke();
      c.lineWidth = 1.5 * S; c.strokeStyle = 'rgba(90,64,30,.35)'; c.stroke();
      bitmaps.set(p.id, cv);
    }
  }

  /* ── 그리기 ───────────────────────────────────────────── */
  function drawPieceAt(ctx, p, cx, cy) {
    const bm = bitmaps.get(p.id);
    if (!bm) return;
    ctx.drawImage(bm, cx * S - bm.width / 2, cy * S - bm.height / 2);
  }

  function drawBoard() {
    clear(bctx);
    bctx.save();
    bctx.beginPath();
    bctx.roundRect((PIC.x - 10) * S, (PIC.y - 10) * S, (PIC.w + 20) * S, (PIC.h + 20) * S, 16 * S);
    bctx.fillStyle = '#fff';
    bctx.shadowColor = 'rgba(120,84,30,.16)';
    bctx.shadowBlur = 12 * S; bctx.shadowOffsetY = 3 * S;
    bctx.fill();
    bctx.restore();
    if (scene) {
      bctx.save();
      bctx.globalAlpha = 0.16;
      bctx.drawImage(scene, PIC.x * S, PIC.y * S);
      bctx.restore();
    }
    bctx.save();
    bctx.lineWidth = 1.5 * S;
    bctx.strokeStyle = 'rgba(120,95,60,.3)';
    bctx.setLineDash([6 * S, 6 * S]);
    for (const p of pieces) {
      if (placed.has(p.id)) continue;
      bctx.beginPath();
      tracePiece(bctx, p, S, PIC.x * S, PIC.y * S);
      bctx.stroke();
    }
    bctx.restore();
    for (const p of pieces) if (placed.has(p.id)) drawPieceAt(bctx, p, p.home.x, p.home.y);
  }

  function drawLoose() {
    clear(lctx);
    for (const p of order) {
      if (placed.has(p.id) || p === held) continue;
      drawPieceAt(lctx, p, p.pos.x, p.pos.y);
    }
  }

  function drawDrag() {
    clear(dctx);
    if (held) drawPieceAt(dctx, held, held.pos.x, held.pos.y);
    if (party) {
      dctx.save();
      dctx.textAlign = 'center'; dctx.textBaseline = 'middle';
      for (const q of party) {
        dctx.globalAlpha = Math.max(0, 1 - q.life);
        dctx.font = `${q.size * S}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
        dctx.fillText(q.ch, q.x * S, q.y * S);
      }
      dctx.restore();
    }
  }

  function redrawAll() {
    if (!W || !pieces.length) return;
    drawBoard(); drawLoose(); drawDrag();
  }

  /* ── 칭찬 ─────────────────────────────────────────────── */
  function celebrate() {
    const chars = ['⭐', '✨', '🎉', '💛', '🌟'];
    party = [];
    for (let i = 0; i < 24; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const sp = 6 + Math.random() * 9;
      party.push({ ch: chars[i % chars.length],
                   x: PIC.x + PIC.w / 2, y: PIC.y + PIC.h / 2,
                   vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                   size: 28 + Math.random() * 26, life: 0 });
    }
    cancelAnimationFrame(raf);
    const tick = () => {
      party = party.filter(q => {
        q.x += q.vx; q.y += q.vy; q.vy += 0.55; q.life += 0.016;
        return q.life < 1;
      });
      if (!party.length) party = null;
      drawDrag();
      raf = party ? requestAnimationFrame(tick) : 0;
    };
    raf = requestAnimationFrame(tick);
  }

  function finish() {
    if (!done.has(level.id)) {
      done.add(level.id);
      localStorage.setItem(DONE_KEY, JSON.stringify([...done]));
      buildStrip();
    }
    vox?.stop(); vox = null;
    sfx.cheer('puzzle');
    celebrate();
    toast('다 맞췄어요! 🎉');
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => {
      const next = LV.findIndex((L, i) => i > li && !done.has(L.id));
      if (next >= 0) openLevel(next);
      else if (li < LV.length - 1) openLevel(li + 1);
    }, 1700);
  }

  /* ── 펜 입력 ──────────────────────────────────────────── */
  function pieceAt(x, y) {
    for (let i = order.length - 1; i >= 0; i--) {       // 위에 그려진 것부터
      const p = order[i];
      if (placed.has(p.id)) continue;
      const hw = p.rect.w / 2 + p.margin + 6, hh = p.rect.h / 2 + p.margin + 6;
      if (Math.abs(x - p.pos.x) <= hw && Math.abs(y - p.pos.y) <= hh) return p;
    }
    return null;
  }

  attachPen(paper, {
    getSize: () => [W, H],
    onStart: (pt) => {
      if (!pieces.length || placed.size >= pieces.length) return;
      const x = (pt.x - OX) / S, y = (pt.y - OY) / S;
      const p = pieceAt(x, y);
      if (!p) return;
      held = p;
      grab = { x: x - p.pos.x, y: y - p.pos.y };
      order.splice(order.indexOf(p), 1);
      order.push(p);                                    // 맨 위로
      vox?.stop(); vox = voice('slide');
      sfx.tap();
      drawLoose(); drawDrag();
    },
    onMove: (pts) => {
      if (!held) return;
      const pt = pts[pts.length - 1];
      held.pos.x = (pt.x - OX) / S - grab.x;
      held.pos.y = (pt.y - OY) / S - grab.y;
      vox?.move(0.45, pt.p ?? 0.6);
      drawDrag();
    },
    onEnd: () => {
      vox?.stop(); vox = null;
      if (!held) return;
      const p = held;
      held = null;
      if (Math.hypot(p.pos.x - p.home.x, p.pos.y - p.home.y) <= SNAP) {
        placed.add(p.id);
        p.pos = { ...p.home };
        sfx.pair(placed.size - 1, pieces.length);       // 맞출수록 한 음씩 올라간다
        drawBoard(); drawLoose(); drawDrag();
        if (placed.size >= pieces.length) finish();
      } else {
        sfx.again();                                    // 벌 아님 — 그 자리에 남을 뿐
        drawLoose(); drawDrag();
      }
    }
  });

  /* ── 내 사진 ──────────────────────────────────────────── */
  /** 사진첩 원본은 크다 — 긴 변 1280 으로 줄여 JPEG 로 저장한다 */
  async function shrink(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i); i.onerror = rej;
        i.src = url;
      });
      const k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement('canvas');
      cv.width = Math.max(2, Math.round(img.naturalWidth * k));
      cv.height = Math.max(2, Math.round(img.naturalHeight * k));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      return await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.86));
    } finally { URL.revokeObjectURL(url); }
  }

  /* 사진마다 상(8조각) 하나만 만든다. id 는 예전 하·중·상 시절의
     h3 와 같아서 그때 모은 별이 그대로 남는다. */
  function photoLevels(items) {
    return items.map(ph => ({
      id: `p${ph.id}h3`, photo: ph.id, hard: 3,
      name: '내 사진', ico: '📷',
      seed: ph.id * 131 + 3
    }));
  }

  /** IndexedDB 의 사진을 읽어 단계 목록과 이미지 캐시를 맞춘다 */
  async function refreshPhotos() {
    let items = [];
    try { items = await photos.all(); } catch { /* 저장소를 못 열면 기본 그림만 */ }
    for (const ph of items) {
      if (album.has(ph.id)) continue;
      const url = URL.createObjectURL(ph.blob);
      const entry = { blob: ph.blob, url, img: null };
      album.set(ph.id, entry);
      const img = new Image();
      img.onload = () => {
        entry.img = img;
        if (level?.photo === ph.id) { bake(); redrawAll(); }   // 열려 있으면 바로 갱신
      };
      img.src = url;
    }
    for (const [id, e] of album)                       // 지워진 사진 정리
      if (!items.some(ph => ph.id === id)) { URL.revokeObjectURL(e.url); album.delete(id); }
    LV = [...PICS, ...photoLevels(items)];
    li = Math.max(0, Math.min(li, LV.length - 1));
  }

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.multiple = true;
  fileInput.addEventListener('change', async () => {
    const files = [...fileInput.files];
    fileInput.value = '';
    if (!files.length) return;
    let firstId = null;
    for (const f of files) {
      try {
        const blob = await shrink(f);
        if (blob) firstId = await photos.add(blob);
      } catch { /* 한 장이 깨져도 나머지는 계속 */ }
    }
    await refreshPhotos();
    buildStrip();
    if (firstId != null) {
      toast('사진 퍼즐이 생겼어요! 📷');
      openLevel(LV.findIndex(L => L.photo === firstId));
    }
  });

  async function removePhoto(photoId) {
    if (!window.confirm('이 사진 퍼즐을 지울까요?')) return;
    try { await photos.del(photoId); } catch { /* 못 지워도 그냥 둔다 */ }
    await refreshPhotos();
    buildStrip();
    sfx.clear();
    toast('사진을 지웠어요');
    if (level.photo === photoId) openLevel(Math.min(li, LV.length - 1));
  }

  /* ── 단계 이동 ────────────────────────────────────────── */
  function openLevel(i) {
    clearTimeout(advanceTimer);
    cancelAnimationFrame(raf);
    li = Math.max(0, Math.min(LV.length - 1, i));
    level = LV[li];
    // 열 때마다 새로 자른다 — 같은 그림이라도 매번 다른 조각이 나온다
    pieces = buildPuzzle(level, (Math.random() * 1e9) | 0);
    placed = new Set();
    order = [...pieces];
    held = null; party = null;
    vox?.stop(); vox = null;
    localStorage.setItem(DONE_KEY + ':at', level.id);
    $('puzzle-name').textContent = level.name;
    $('btn-puzzle-prev').disabled = li === 0;
    $('btn-puzzle-next').disabled = li === LV.length - 1;
    for (const el of document.querySelectorAll('#puzzle-strip .lvl'))
      el.classList.toggle('is-on', el.dataset.lvl === level.id);
    bake();
    redrawAll();
  }

  function buildStrip() {
    const strip = $('puzzle-strip');
    strip.innerHTML = '';
    LV.forEach((L, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lvl' + (L.id === level?.id ? ' is-on' : '');
      b.dataset.lvl = L.id;
      b.dataset.hard = L.hard;
      b.innerHTML = `<span class="lbl">${L.name}</span>` +
                    (done.has(L.id) ? `<span class="star">${STAR}</span>` : '');
      /* 칩에는 그 문제의 그림을 그대로 줄여 보여 준다. 이모지 한 글자보다
         "무엇을 맞추는지" 가 훨씬 잘 보인다 (사진 퍼즐은 원래 그랬다).
         2배로 그려 넣어야 레티나에서 안 뭉갠다. */
      if (L.photo) {
        const im = document.createElement('img');
        im.className = 'thumb'; im.alt = '';
        im.src = album.get(L.photo)?.url ?? '';
        b.prepend(im);
      } else {
        const cv = document.createElement('canvas');
        cv.className = 'thumb'; cv.width = 76; cv.height = 56;
        drawScene(L, cv.getContext('2d'), 76, 56);
        b.prepend(cv);
      }
      b.addEventListener('click', () => { sfx.tap(); openLevel(i); });
      if (L.photo) {                                    // 2초 길게 누르면 사진 삭제
        let t = 0;
        b.addEventListener('pointerdown', () => { t = setTimeout(() => removePhoto(L.photo), 2000); });
        for (const ev of ['pointerup', 'pointercancel', 'pointerleave'])
          b.addEventListener(ev, () => clearTimeout(t));
      }
      strip.appendChild(b);
    });
    // 📷 사진 추가 — 부모가 쓰는 버튼이라 맨 뒤에 둔다
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'lvl';
    add.innerHTML = '<span class="ico">📷</span><span class="lbl">사진 추가</span>';
    add.addEventListener('click', () => { sfx.tap(); fileInput.click(); });
    strip.appendChild(add);
  }

  $('btn-puzzle-home').addEventListener('click', () => { clearTimeout(advanceTimer); goHome(); });
  $('btn-puzzle-again').addEventListener('click', () => { sfx.undo(); openLevel(li); });
  $('btn-puzzle-prev').addEventListener('click', () => { sfx.tap(); openLevel(li - 1); });
  $('btn-puzzle-next').addEventListener('click', () => { sfx.tap(); openLevel(li + 1); });

  if (window.ResizeObserver) new ResizeObserver(doLayout).observe($('puzzle-stage'));
  window.addEventListener('resize', doLayout);
  window.addEventListener('orientationchange', () => setTimeout(doLayout, 250));

  return {
    enter() {
      done = new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]'));
      refreshPhotos().finally(() => {
        const last = localStorage.getItem(DONE_KEY + ':at');
        let i = Math.max(0, LV.findIndex(L => L.id === last));
        if (done.has(LV[i].id)) {
          const next = LV.findIndex(L => !done.has(L.id));
          if (next >= 0) i = next;
        }
        level = LV[i];
        buildStrip();
        openLevel(i);
        doLayout();
      });
    }
  };
}
