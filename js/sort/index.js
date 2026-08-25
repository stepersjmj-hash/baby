/* ============================================================
   sort/index.js — 모양 분류
   ------------------------------------------------------------
   위쪽에 흩어진 물건을 아래 바구니로 끌어다 담는다. 무엇으로 나누는지는
   문제가 정하고(색·모양·크기·무엇인지), 바구니에는 **글자 대신 견본**이
   하나 얹혀 있다 — 글자를 못 읽는 나이라 그림으로만 알린다.

   판정은 core/dragdrop.js (한 바구니에 여럿이 들어가므로 reuseRight).
   틀리면 물건이 제자리로 돌아갈 뿐, 오답 소리도 감점도 없다.

   레이어 2장 — so-board(판·바구니·담긴 것) · so-drag(끌고 있는 것 하나).
   끌 때마다 판 전체를 다시 그리면 아이패드에서 느려진다.
   ============================================================ */

import { attachPen } from '../core/pen.js';
import { fitPaper, setOrigin } from '../core/fit.js';
import { createDrag } from '../core/dragdrop.js';
import { sfx, say } from '../core/audio.js';
import { STAR, picIcon } from '../core/icons.js';
import { VIEW, AREA, BIN, LEVELS, buildSort } from './levels.js';

const DPR = Math.min(window.devicePixelRatio || 1, 2);

/* 바구니 줄과 물건 자리만 쓴다 — 그 상자를 종이에 꽉 채운다.
   ★ 자가 점검과 공용이다 (다른 그림 찾기와 같은 이유 — 화면이 쓰는 상자와
     점검이 짐작한 상자가 갈리면 좌표가 어긋나도 점검이 못 잡는다). */
export const BOX = {
  x: 30, y: AREA.y - 60,
  w: VIEW.w - 60,
  h: (BIN.y + BIN.h / 2 + 14) - (AREA.y - 60)
};

export function initSort({ toast, goHome }) {
  const $ = (id) => document.getElementById(id);
  const paper = $('sort-paper');
  const cBoard = $('so-board'), cDrag = $('so-drag');
  const bctx = cBoard.getContext('2d'), dctx = cDrag.getContext('2d');

  let W = 0, H = 0, S = 1;
  let OX = 0, OY = 0;
  const clear = (ctx) => ctx.clearRect(-OX, -OY, W, H);

  let li = 0, level = LEVELS[0], board = null, drag = null;
  let done = new Set(JSON.parse(localStorage.getItem('sortDone') || '[]'));
  let held = null, party = null, raf = 0, advanceTimer = 0;

  function doLayout() {
    const fit = fitPaper($('sort-stage'), paper, BOX, DPR);
    if (!fit) return;
    if (fit.W === W && fit.H === H) return;
    W = fit.W; H = fit.H; S = fit.S; OX = fit.OX; OY = fit.OY;
    for (const cv of [cBoard, cDrag]) {
      cv.width = W; cv.height = H;                   // 크기를 넣으면 변환이 초기화된다
      setOrigin(cv.getContext('2d'), fit);
    }
    redrawAll();
  }

  /* ── 그림 굽기 (SVG 는 캔버스에 바로 못 찍는다) ────────── */
  const artCache = new Map();
  function pic(key) {
    let im = artCache.get(key);
    if (!im) {
      im = new Image();
      im.onload = () => { if (W) redrawAll(); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        picIcon(key, 128).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
      artCache.set(key, im);
    }
    return (im.complete && im.naturalWidth) ? im : null;
  }

  /** 물건 하나를 그린다 (도형은 직접, 사물은 그림) */
  function drawItem(ctx, it, x, y, k = 1) {
    const r = it.r * k;
    if (it.kind === 'pic') {
      const im = pic(it.key);
      if (im) ctx.drawImage(im, (x - r) * S, (y - r) * S, r * 2 * S, r * 2 * S);
      return;
    }
    ctx.save();
    ctx.fillStyle = it.color;
    ctx.beginPath();
    if (it.sh === 'circle') ctx.arc(x * S, y * S, r * S, 0, 6.283);
    else if (it.sh === 'square') {
      const a = r * 1.72;
      ctx.roundRect((x - a / 2) * S, (y - a / 2) * S, a * S, a * S, 10 * S);
    } else {                                          // triangle
      const a = r * 1.05;
      ctx.moveTo(x * S, (y - a) * S);
      ctx.lineTo((x + a * 0.95) * S, (y + a * 0.8) * S);
      ctx.lineTo((x - a * 0.95) * S, (y + a * 0.8) * S);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }

  /* ── 그리기 ───────────────────────────────────────────── */
  function drawBoard() {
    clear(bctx);

    // 바구니 — 견본을 얹은 통. 담긴 것은 그 안에 작게 쌓인다
    for (const b of board.bins) {
      const x = b.x - BIN.w / 2, y = b.y - BIN.h / 2;
      bctx.save();
      bctx.beginPath();
      bctx.roundRect(x * S, y * S, BIN.w * S, BIN.h * S, 26 * S);
      bctx.fillStyle = '#fff';
      bctx.strokeStyle = held && held.item.bin === b.at ? '#ff8a3d' : '#e6dac2';
      bctx.lineWidth = (held && held.item.bin === b.at ? 6 : 4) * S;
      bctx.fill(); bctx.stroke();
      bctx.restore();

      // 견본. **크기를 살려 그린다** — 크기로 나누는 문제에서는 견본의
      // 크기가 곧 단서라, 한 치수로 맞춰 그리면 두 바구니가 똑같아진다.
      drawItem(bctx, { ...b, r: 40 * (b.size ?? 1) }, b.x, y + 46, 1);
      bctx.save();                                            // 견본과 담긴 것 사이 줄
      bctx.strokeStyle = '#efe6d4'; bctx.lineWidth = 3 * S;
      bctx.beginPath();
      bctx.moveTo((x + 22) * S, (y + 92) * S); bctx.lineTo((x + BIN.w - 22) * S, (y + 92) * S);
      bctx.stroke();
      bctx.restore();

      const inside = board.items.filter(it => drag.pairs.some(([l, r]) => l === it.id && r === b.id));
      inside.forEach((it, k) => {
        const per = 4, cx = x + 42 + (k % per) * 56, cy = y + 126 + Math.floor(k / per) * 42;
        drawItem(bctx, it, cx, cy, 0.52);
      });
    }

    // 아직 안 담은 물건
    for (const it of board.items) {
      if (drag.pairs.some(([l]) => l === it.id)) continue;
      if (held && held.item.id === it.id) continue;
      drawItem(bctx, it, it.x, it.y);
    }

    if (party) {
      bctx.save();
      bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
      for (const q of party) {
        bctx.globalAlpha = Math.max(0, 1 - q.life);
        bctx.font = `${q.size * S}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
        bctx.fillText(q.ch, q.x * S, q.y * S);
      }
      bctx.restore();
    }
  }

  function drawDrag() {
    clear(dctx);
    if (!held) return;
    drawItem(dctx, held.item, held.at.x, held.at.y, 1.1);
  }

  const redrawAll = () => { if (W) { drawBoard(); drawDrag(); } };

  /* ── 칭찬 ─────────────────────────────────────────────── */
  function celebrate() {
    party = [];
    for (let i = 0; i < 20; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, sp = 6 + Math.random() * 8;
      party.push({ ch: ['⭐', '✨', '🎉'][i % 3], x: VIEW.w / 2, y: 300,
                   vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                   size: 26 + Math.random() * 22, life: 0 });
    }
    animate();
  }
  function animate() {
    if (raf) return;
    const tick = () => {
      raf = 0;
      if (!party) return;
      party = party.filter(q => {
        q.x += q.vx; q.y += q.vy; q.vy += 0.55; q.life += 0.016;
        return q.life < 1;
      });
      if (!party.length) party = null;
      drawBoard();
      if (party) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function finish() {
    if (!done.has(level.id)) {
      done.add(level.id);
      localStorage.setItem('sortDone', JSON.stringify([...done]));
      buildStrip();
    }
    sfx.cheer('puzzle');
    celebrate();
    toast('다 담았어요! 🎉');
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => {
      const next = LEVELS.findIndex((L, i) => i > li && !done.has(L.id));
      openLevel(next >= 0 ? next : Math.min(li + 1, LEVELS.length - 1));
    }, 1800);
  }

  /* ── 펜 입력 ──────────────────────────────────────────── */
  const local = (pt) => ({ x: (pt.x - OX) / S, y: (pt.y - OY) / S });

  attachPen(paper, {
    getSize: () => [W, H],
    onStart: (raw) => {
      if (!drag || drag.solved) return;
      const p = local(raw);
      const g = drag.pick(p.x, p.y);
      // 바구니는 제자리에 있는 물건이다 — 집혔으면 놓아 준다
      if (!g || g.side !== 'left') { drag.cancel(); return; }
      held = { item: g.item, at: { ...p }, grab: { x: p.x - g.item.x, y: p.y - g.item.y } };
      sfx.tap();
      drawBoard(); drawDrag();
    },
    onMove: (raws) => {
      if (!held) return;
      const p = local(raws[raws.length - 1]);
      held.at = { x: p.x - held.grab.x, y: p.y - held.grab.y };
      drawDrag();
    },
    onEnd: () => {
      if (!held) return;
      const at = held.at;
      held = null;
      const r = drag.drop(at.x, at.y);
      if (r?.ok) {
        sfx.pair(drag.pairs.length - 1, board.items.length);
        drawBoard(); drawDrag();
        if (drag.solved) finish();
      } else {
        sfx.again();                                  // 벌 아님 — 제자리로 돌아갈 뿐
        drawBoard(); drawDrag();
      }
    }
  });

  /* ── 단계 ─────────────────────────────────────────────── */
  function openLevel(i) {
    clearTimeout(advanceTimer);
    li = Math.max(0, Math.min(LEVELS.length - 1, i));
    level = LEVELS[li];
    board = buildSort(level);
    drag = createDrag({
      left: board.items, right: board.bins, reuseRight: true, grab: 1.15,
      accepts: (it, bin) => it.bin === bin.at
    });
    held = null; party = null;
    localStorage.setItem('sortAt', level.id);
    $('sort-name').textContent = level.name;
    $('btn-sort-prev').disabled = li === 0;
    $('btn-sort-next').disabled = li === LEVELS.length - 1;
    for (const el of document.querySelectorAll('#sort-strip .lvl'))
      el.classList.toggle('is-on', el.dataset.lvl === level.id);
    say(level.ask);
    doLayout();
    redrawAll();
  }

  function buildStrip() {
    const strip = $('sort-strip');
    strip.innerHTML = '';
    LEVELS.forEach((L, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lvl' + (L.id === level?.id ? ' is-on' : '');
      b.dataset.lvl = L.id;
      b.dataset.hard = L.hard;
      b.innerHTML = `<span class="ico art">${picIcon(L.ico, 34)}</span>` +
                    `<span class="lbl">${L.name}</span>` +
                    (done.has(L.id) ? `<span class="star">${STAR}</span>` : '');
      b.addEventListener('click', () => { sfx.tap(); openLevel(i); });
      strip.appendChild(b);
    });
  }

  $('btn-sort-home').addEventListener('click', () => { clearTimeout(advanceTimer); goHome(); });
  $('btn-sort-again').addEventListener('click', () => { sfx.undo(); openLevel(li); });
  $('btn-sort-prev').addEventListener('click', () => { sfx.tap(); openLevel(li - 1); });
  $('btn-sort-next').addEventListener('click', () => { sfx.tap(); openLevel(li + 1); });

  if (window.ResizeObserver) new ResizeObserver(doLayout).observe($('sort-stage'));
  window.addEventListener('resize', doLayout);
  window.addEventListener('orientationchange', () => setTimeout(doLayout, 250));

  return {
    enter() {
      done = new Set(JSON.parse(localStorage.getItem('sortDone') || '[]'));
      const last = localStorage.getItem('sortAt');
      let i = Math.max(0, LEVELS.findIndex(L => L.id === last));
      if (done.has(LEVELS[i].id)) {
        const next = LEVELS.findIndex(L => !done.has(L.id));
        if (next >= 0) i = next;
      }
      level = LEVELS[i];
      buildStrip();
      openLevel(i);
    }
  };
}
