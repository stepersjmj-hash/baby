/* ============================================================
   match/index.js — 짝 맞추기
   ------------------------------------------------------------
   판정은 core/dragdrop.js, 문제는 pairs.js, 카드 위치는 board.js.
   여기는 보여 주기와 배선만 한다.

   조작은 "선으로 잇기" 다. 학습지에서 하던 그대로라 설명이 필요 없고,
   펜으로 하기에도 가장 자연스럽다. 양쪽 어디서 시작해도 된다.

   레이어 3장 (CSS 로 겹쳐 두고 GPU 가 합성한다)
     m-drag  ③ 지금 끌고 있는 선, 겨누는 카드 강조, 칭찬 반짝이
     m-link  ② 이미 이어 붙인 선
     m-board ① 카드   ← 짝을 맞췄을 때만 다시 그린다

   그림 자산이 없어서 그림자는 이모지를 찍고 source-atop 으로 덮어 만든다.
   ============================================================ */

import { attachPen } from '../core/pen.js';
import { VIEW, createDrag } from '../core/dragdrop.js';
import { MATCHES } from './pairs.js';
import { layout, accepts } from './board.js';
import { sfx, voice } from '../core/audio.js';

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const DONE_KEY = 'matchDone';
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

/* 이모지 그림자. 한 번 만들면 캐시해 둔다 (매 프레임 만들면 느리다) */
const shadowCache = new Map();
function shadowOf(ch, size) {
  const px = Math.max(16, Math.round(size));
  const key = ch + '|' + px;
  let cv = shadowCache.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const c = cv.getContext('2d');
  c.font = `${px * 0.84}px ${EMOJI_FONT}`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(ch, px / 2, px / 2);
  c.globalCompositeOperation = 'source-atop';   // 찍힌 자리에만 색을 덮는다 = 실루엣
  c.fillStyle = '#3f3428';
  c.fillRect(0, 0, px, px);
  shadowCache.set(key, cv);
  return cv;
}

export function initMatch({ toast, goHome }) {
  const $ = (id) => document.getElementById(id);

  const paper = $('match-paper');
  const cBoard = $('m-board'), cLink = $('m-link'), cDrag = $('m-drag');
  const bctx = cBoard.getContext('2d');
  const lctx = cLink.getContext('2d');
  const dctx = cDrag.getContext('2d');

  let done = new Set();
  let W = 0, H = 0, S = 1;
  let li = 0, level = MATCHES[0];
  let board = null, drag = null, seed = 1;
  let pen = null, aim = null;                 // 지금 끌고 있는 끝점 / 겨누는 카드
  let party = null, raf = 0, advanceTimer = 0;
  let vox = null;

  /* ── 레이아웃 ─────────────────────────────────────────── */
  function doLayout() {
    const st = $('match-stage').getBoundingClientRect();
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
    for (const cv of [cBoard, cLink, cDrag]) { cv.width = W; cv.height = H; }
    redrawAll();
  }

  /* ── 카드 그리기 ──────────────────────────────────────── */
  function drawCard(ctx, card, state) {
    const { x, y, r } = card, d = card.data;
    const px = x * S, py = y * S, pr = r * S;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px - pr, py - pr, pr * 2, pr * 2, 20 * S);
    ctx.fillStyle = state === 'done' ? '#fff7e6' : '#ffffff';
    ctx.shadowColor = 'rgba(120,84,30,.18)';
    ctx.shadowBlur = 10 * S; ctx.shadowOffsetY = 3 * S;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = (state === 'aim' ? 6 : 3) * S;
    ctx.strokeStyle = state === 'aim' ? '#ff8a3d'
                    : state === 'done' ? '#e8c98d' : '#e6dac2';
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (d.color) {
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.arc(px, py, pr * 0.62, 0, 6.283); ctx.fill();
    } else if (d.shape) {
      ctx.fillStyle = '#6b8cff';
      drawShape(ctx, d.shape, px, py, pr * 0.66);
    } else if (d.shadow) {
      const sz = pr * 1.5;
      ctx.drawImage(shadowOf(d.shadow, sz), px - sz / 2, py - sz / 2, sz, sz);
    } else if (d.t) {
      ctx.fillStyle = '#3a2f22';
      ctx.font = `800 ${pr * 1.15}px system-ui,-apple-system,sans-serif`;
      ctx.fillText(d.t, px, py + pr * 0.06);
    } else if (d.n) {
      // 개수 세기 — 작은 그림 여러 개를 격자로
      const cols = d.n <= 2 ? d.n : 2;
      const rows = Math.ceil(d.n / cols);
      const sz = pr * (d.n <= 2 ? 0.9 : 0.72);
      ctx.font = `${sz}px ${EMOJI_FONT}`;
      for (let i = 0; i < d.n; i++) {
        const cx = px + ((i % cols) - (cols - 1) / 2) * sz * 1.02;
        const cy = py + (Math.floor(i / cols) - (rows - 1) / 2) * sz * 1.0;
        ctx.fillText(d.e, cx, cy);
      }
    } else if (d.e) {
      ctx.font = `${pr * 1.3}px ${EMOJI_FONT}`;
      ctx.fillText(d.e, px, py);
    }
    ctx.restore();
  }

  function drawShape(ctx, kind, x, y, r) {
    ctx.beginPath();
    if (kind === 'circle') ctx.arc(x, y, r, 0, 6.283);
    else if (kind === 'square') ctx.rect(x - r * 0.86, y - r * 0.86, r * 1.72, r * 1.72);
    else if (kind === 'tri') {
      ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.92, y + r * 0.75); ctx.lineTo(x - r * 0.92, y + r * 0.75);
      ctx.closePath();
    } else {                                        // star
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const rr = i % 2 ? r * 0.45 : r;
        const fx = x + Math.cos(a) * rr, fy = y + Math.sin(a) * rr;
        i ? ctx.lineTo(fx, fy) : ctx.moveTo(fx, fy);
      }
      ctx.closePath();
    }
    ctx.fill();
  }

  const hue = (i) => `hsl(${(i * 47) % 360} 80% 55%)`;

  function drawBoard() {
    bctx.clearRect(0, 0, W, H);
    const paired = new Map(drag.pairs);
    const usedR = new Set([...paired.values()]);
    for (const c of board.left)
      drawCard(bctx, c, paired.has(c.id) ? 'done' : (aim === c ? 'aim' : ''));
    for (const c of board.right)
      drawCard(bctx, c, usedR.has(c.id) ? 'done' : (aim === c ? 'aim' : ''));
  }

  function drawLinks() {
    lctx.clearRect(0, 0, W, H);
    lctx.lineCap = 'round';
    drag.pairs.forEach(([lid, rid], i) => {
      const a = board.left.find(c => c.id === lid);
      const b = board.right.find(c => c.id === rid);
      if (!a || !b) return;
      lctx.strokeStyle = hue(a.k);
      lctx.lineWidth = 11 * S;
      lctx.beginPath();
      lctx.moveTo(a.x * S, a.y * S);
      lctx.lineTo(b.x * S, b.y * S);
      lctx.stroke();
    });
  }

  function drawDrag() {
    dctx.clearRect(0, 0, W, H);
    const h = drag.held;
    if (h && pen) {
      dctx.strokeStyle = '#ff8a3d';
      dctx.lineWidth = 9 * S; dctx.lineCap = 'round';
      dctx.setLineDash([16 * S, 12 * S]);
      dctx.beginPath();
      dctx.moveTo(h.item.x * S, h.item.y * S);
      dctx.lineTo(pen.x, pen.y);
      dctx.stroke();
      dctx.setLineDash([]);
    }
    if (party) {
      dctx.save();
      dctx.textAlign = 'center'; dctx.textBaseline = 'middle';
      for (const q of party) {
        dctx.globalAlpha = Math.max(0, 1 - q.life);
        dctx.font = `${q.size * S}px ${EMOJI_FONT}`;
        dctx.fillText(q.ch, q.x * S, q.y * S);
      }
      dctx.restore();
    }
  }

  function redrawAll() {
    if (!W || !board) return;
    drawBoard(); drawLinks(); drawDrag();
  }

  /* ── 칭찬 반짝이 (상태는 여기에 기대지 않는다) ──────────── */
  function celebrate() {
    const chars = ['⭐', '✨', '🎉', '💛', '🌟'];
    party = [];
    for (let i = 0; i < 24; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const sp = 6 + Math.random() * 9;
      party.push({ ch: chars[i % chars.length], x: 500, y: 380,
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
    sfx.cheer('match');
    celebrate();
    toast('다 맞췄어요! 🎉');
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => {
      const next = MATCHES.findIndex((L, i) => i > li && !done.has(L.id));
      if (next >= 0) openLevel(next);
      else if (li < MATCHES.length - 1) openLevel(li + 1);
    }, 1700);
  }

  /* ── 펜 입력 ──────────────────────────────────────────── */
  attachPen(paper, {
    getSize: () => [W, H],
    onStart: (pt) => {
      if (!drag || drag.solved) return;
      const got = drag.pick(pt.x / S, pt.y / S);
      if (!got) return;
      pen = pt; aim = null;
      vox?.stop(); vox = voice('slide');
      sfx.tap();
      drawBoard(); drawDrag();
    },
    onMove: (pts) => {
      if (!drag?.held) return;
      pen = pts[pts.length - 1];
      const was = aim;
      aim = drag.hover(pen.x / S, pen.y / S);
      vox?.move(0.45, 0.6);
      if (was !== aim) drawBoard();
      drawDrag();
    },
    onEnd: () => {
      vox?.stop(); vox = null;
      if (!drag?.held) { pen = null; aim = null; return; }
      const r = drag.drop(pen.x / S, pen.y / S);
      pen = null; aim = null;
      if (r?.ok) {
        sfx.pair(drag.pairs.length - 1, level.pairs.length);
        drawBoard(); drawLinks(); drawDrag();
        if (drag.solved) finish();
      } else {
        // 짝이 아니면 선이 그냥 사라진다. 벌주지 않는다.
        if (r) sfx.again();
        drawBoard(); drawDrag();
      }
    }
  });

  /* ── 단계 이동 ────────────────────────────────────────── */
  function openLevel(i, reshuffle = true) {
    clearTimeout(advanceTimer);
    cancelAnimationFrame(raf);
    li = Math.max(0, Math.min(MATCHES.length - 1, i));
    level = MATCHES[li];
    if (reshuffle) seed = (Math.random() * 1e9) | 0;
    board = layout(level, seed);
    drag = createDrag({ left: board.left, right: board.right, accepts });
    pen = null; aim = null; party = null;
    vox?.stop(); vox = null;
    localStorage.setItem(DONE_KEY + ':at', level.id);
    $('match-name').textContent = level.name;
    $('btn-match-prev').disabled = li === 0;
    $('btn-match-next').disabled = li === MATCHES.length - 1;
    for (const el of document.querySelectorAll('#match-strip .lvl'))
      el.classList.toggle('is-on', el.dataset.lvl === level.id);
    redrawAll();
  }

  function buildStrip() {
    const strip = $('match-strip');
    strip.innerHTML = '';
    MATCHES.forEach((L, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lvl' + (L.id === level?.id ? ' is-on' : '');
      b.dataset.lvl = L.id;
      b.dataset.hard = L.hard;              // 난이도는 색 띠로만 (글자를 못 읽으니까)
      b.innerHTML = `<span class="ico">${L.ico}</span><span class="lbl">${L.name}</span>` +
                    (done.has(L.id) ? '<span class="star">⭐</span>' : '');
      b.addEventListener('click', () => { sfx.tap(); openLevel(i); });
      strip.appendChild(b);
    });
  }

  $('btn-match-home').addEventListener('click', () => { clearTimeout(advanceTimer); goHome(); });
  $('btn-match-again').addEventListener('click', () => { sfx.undo(); openLevel(li); });
  $('btn-match-prev').addEventListener('click', () => { sfx.tap(); openLevel(li - 1); });
  $('btn-match-next').addEventListener('click', () => { sfx.tap(); openLevel(li + 1); });

  if (window.ResizeObserver) new ResizeObserver(doLayout).observe($('match-stage'));
  window.addEventListener('resize', doLayout);
  window.addEventListener('orientationchange', () => setTimeout(doLayout, 250));

  return {
    enter() {
      done = new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]'));
      const last = localStorage.getItem(DONE_KEY + ':at');
      let i = Math.max(0, MATCHES.findIndex(L => L.id === last));
      if (done.has(MATCHES[i].id)) {
        const next = MATCHES.findIndex(L => !done.has(L.id));
        if (next >= 0) i = next;
      }
      level = MATCHES[i];
      buildStrip();
      openLevel(i);
      doLayout();
    }
  };
}
