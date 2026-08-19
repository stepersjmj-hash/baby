/* ============================================================
   puzzle/index.js — 조각 퍼즐
   ------------------------------------------------------------
   그림은 pics.js, 조각 기하는 cut.js. 여기는 보여 주기와 배선만.

   왼쪽이 맞추는 판(제 그림이 흐리게 비치고 조각 자리가 그려져 있다),
   오른쪽에 조각이 흩어져 있다. 조각을 끌어 제자리 근처에 놓으면
   착 붙는다. 엉뚱한 자리에 놓으면 그냥 그 자리에 남는다 — 벌 없음.

   레이어 3장 (CSS 로 겹쳐 두고 GPU 가 합성한다)
     p-drag   ③ 지금 끌고 있는 조각, 칭찬 반짝이
     p-loose  ② 아직 못 맞춘 조각들
     p-board  ① 판: 흐린 그림 + 조각 자리 + 맞춘 조각

   조각 비트맵은 단계를 열 때 한 번 구워 캐시한다.
   끌 때마다 경로를 다시 자르면 아이패드에서 느려진다.
   ============================================================ */

import { attachPen } from '../core/pen.js';
import { VIEW, PIC, SNAP, buildPuzzle, tracePiece } from './cut.js';
import { PICS, drawScene } from './pics.js';
import { sfx, voice } from '../core/audio.js';

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
  let W = 0, H = 0, S = 1;
  let li = 0, level = PICS[0];
  let pieces = [], placed = new Set();
  let order = [];                       // 그리는 순서 = 아래→위. 집으면 맨 위로
  let held = null, grab = { x: 0, y: 0 };
  let scene = null, bitmaps = new Map();
  let party = null, raf = 0, advanceTimer = 0;
  let vox = null;

  /* ── 레이아웃 ─────────────────────────────────────────── */
  function doLayout() {
    const st = $('puzzle-stage').getBoundingClientRect();
    if (!st.width || !st.height) return;
    const AR = VIEW.w / VIEW.h;
    let w = st.width - 28, h = st.height - 28;
    if (w / h > AR) w = h * AR; else h = w / AR;
    w = Math.max(80, Math.floor(w)); h = Math.max(56, Math.floor(h));
    paper.style.width = w + 'px';
    paper.style.height = h + 'px';
    const nW = Math.round(w * DPR), nH = Math.round(h * DPR);
    if (nW === W && nH === H) return;
    W = nW; H = nH; S = W / VIEW.w;
    for (const cv of [cBoard, cLoose, cDrag]) { cv.width = W; cv.height = H; }
    bake();
    redrawAll();
  }

  /* ── 조각 굽기 ────────────────────────────────────────── */
  function bake() {
    if (!W || !level) return;
    scene = document.createElement('canvas');
    scene.width = Math.max(2, Math.round(PIC.w * S));
    scene.height = Math.max(2, Math.round(PIC.h * S));
    drawScene(level, scene.getContext('2d'), scene.width, scene.height);

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
    bctx.clearRect(0, 0, W, H);
    // 판 테두리
    bctx.save();
    bctx.beginPath();
    bctx.roundRect((PIC.x - 10) * S, (PIC.y - 10) * S, (PIC.w + 20) * S, (PIC.h + 20) * S, 16 * S);
    bctx.fillStyle = '#fff';
    bctx.shadowColor = 'rgba(120,84,30,.16)';
    bctx.shadowBlur = 12 * S; bctx.shadowOffsetY = 3 * S;
    bctx.fill();
    bctx.restore();
    // 흐린 본그림 — 어디에 무엇이 오는지 알려 준다
    if (scene) {
      bctx.save();
      bctx.globalAlpha = 0.16;
      bctx.drawImage(scene, PIC.x * S, PIC.y * S);
      bctx.restore();
    }
    // 조각 자리
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
    // 맞춘 조각
    for (const p of pieces) if (placed.has(p.id)) drawPieceAt(bctx, p, p.home.x, p.home.y);
  }

  function drawLoose() {
    lctx.clearRect(0, 0, W, H);
    for (const p of order) {
      if (placed.has(p.id) || p === held) continue;
      drawPieceAt(lctx, p, p.pos.x, p.pos.y);
    }
  }

  function drawDrag() {
    dctx.clearRect(0, 0, W, H);
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
      const next = PICS.findIndex((L, i) => i > li && !done.has(L.id));
      if (next >= 0) openLevel(next);
      else if (li < PICS.length - 1) openLevel(li + 1);
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
      const x = pt.x / S, y = pt.y / S;
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
      held.pos.x = pt.x / S - grab.x;
      held.pos.y = pt.y / S - grab.y;
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

  /* ── 단계 이동 ────────────────────────────────────────── */
  function openLevel(i, scatterSeed) {
    clearTimeout(advanceTimer);
    cancelAnimationFrame(raf);
    li = Math.max(0, Math.min(PICS.length - 1, i));
    level = PICS[li];
    // 처음 열 때는 씨앗을 고정한다 — 같은 문제는 조각도 같은 자리에서 시작한다.
    // (자가 점검이 조각 위치를 알 수 있는 방법이기도 하다)
    // 다시하기(again)만 무작위 씨앗으로 새로 흩는다.
    pieces = buildPuzzle(level, scatterSeed ?? level.seed);
    placed = new Set();
    order = [...pieces];
    held = null; party = null;
    vox?.stop(); vox = null;
    localStorage.setItem(DONE_KEY + ':at', level.id);
    $('puzzle-name').textContent = level.name;
    $('btn-puzzle-prev').disabled = li === 0;
    $('btn-puzzle-next').disabled = li === PICS.length - 1;
    for (const el of document.querySelectorAll('#puzzle-strip .lvl'))
      el.classList.toggle('is-on', el.dataset.lvl === level.id);
    bake();
    redrawAll();
  }

  function buildStrip() {
    const strip = $('puzzle-strip');
    strip.innerHTML = '';
    PICS.forEach((L, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lvl' + (L.id === level?.id ? ' is-on' : '');
      b.dataset.lvl = L.id;
      b.dataset.hard = L.hard;
      b.innerHTML = `<span class="ico">${L.ico}</span><span class="lbl">${L.name}</span>` +
                    (done.has(L.id) ? '<span class="star">⭐</span>' : '');
      b.addEventListener('click', () => { sfx.tap(); openLevel(i); });
      strip.appendChild(b);
    });
  }

  $('btn-puzzle-home').addEventListener('click', () => { clearTimeout(advanceTimer); goHome(); });
  $('btn-puzzle-again').addEventListener('click', () =>
    { sfx.undo(); openLevel(li, (Math.random() * 1e9) | 0); });
  $('btn-puzzle-prev').addEventListener('click', () => { sfx.tap(); openLevel(li - 1); });
  $('btn-puzzle-next').addEventListener('click', () => { sfx.tap(); openLevel(li + 1); });

  if (window.ResizeObserver) new ResizeObserver(doLayout).observe($('puzzle-stage'));
  window.addEventListener('resize', doLayout);
  window.addEventListener('orientationchange', () => setTimeout(doLayout, 250));

  return {
    enter() {
      done = new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]'));
      const last = localStorage.getItem(DONE_KEY + ':at');
      let i = Math.max(0, PICS.findIndex(L => L.id === last));
      if (done.has(PICS[i].id)) {
        const next = PICS.findIndex(L => !done.has(L.id));
        if (next >= 0) i = next;
      }
      level = PICS[i];
      buildStrip();
      openLevel(i);
      doLayout();
    }
  };
}
