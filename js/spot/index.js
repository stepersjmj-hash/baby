/* ============================================================
   spot/index.js — 다른 그림 찾기
   ------------------------------------------------------------
   문제는 scenes.js, 판정은 judge.js. 여기는 보여 주기와 배선만.

   두 그림을 나란히 두고, 다른 곳을 펜으로 동그라미 치거나 콕 찍는다.
   어느 쪽 그림에 표시해도 된다 — 찾은 곳은 양쪽에 다 동그라미가 남는다.

   레이어 3장 (CSS 로 겹쳐 두고 GPU 가 합성한다)
     s-ink   ③ 지금 긋고 있는 획
     s-mark  ② 찾은 곳 동그라미, 진행 ●○
     s-board ① 두 그림   ← 단계가 바뀔 때만 다시 그린다

   3~6세 UX 원칙: 못 찾은 동그라미는 벌 없이 획만 사라진다.
   힌트도 정답 공개도 없다 — 시간 제한이 없으니 언젠가는 찾는다.
   ============================================================ */

import { attachPen } from '../core/pen.js';
import { fitPaper, setOrigin } from '../core/fit.js';
import { STAR } from '../core/icons.js';
import { VIEW, PANEL, SPOTS, buildSpot } from './scenes.js';
import { createSpot } from './judge.js';
import { sfx } from '../core/audio.js';

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const DONE_KEY = 'spotDone';
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export function initSpot({ toast, goHome }) {
  const $ = (id) => document.getElementById(id);

  const paper = $('spot-paper');
  const cBoard = $('s-board'), cMark = $('s-mark'), cInk = $('s-ink');
  const bctx = cBoard.getContext('2d');
  const mctx = cMark.getContext('2d');
  const ictx = cInk.getContext('2d');

  let done = new Set();
  let W = 0, H = 0, S = 1;
  let OX = 0, OY = 0;                   // 내용을 종이 가운데로 옮기는 원점
  const clear = (ctx) => ctx.clearRect(-OX, -OY, W, H);
  let li = 0, level = SPOTS[0];
  let scene = null, judge = null;
  let stroke = null;                    // 지금 긋는 획 (판 로컬 좌표)
  let inkPrev = null;
  let party = null, raf = 0, advanceTimer = 0;

  /* ── 레이아웃 ─────────────────────────────────────────── */

  /* 두 그림판과 그 위의 ⭐ 표시줄만 쓴다 — 그 상자를 종이에 꽉 채운다.
     그림이 클수록 다른 곳이 잘 보인다. */
  const BOX = {
    x: PANEL.lx - 14, y: 34,
    w: (PANEL.rx + PANEL.w + 14) - (PANEL.lx - 14),
    h: (PANEL.ty + PANEL.h + 14) - 34
  };

  function doLayout() {
    const fit = fitPaper($('spot-stage'), paper, BOX, DPR);
    if (!fit) return;
    if (fit.W === W && fit.H === H) return;
    W = fit.W; H = fit.H; S = fit.S; OX = fit.OX; OY = fit.OY;
    for (const cv of [cBoard, cMark, cInk]) {
      cv.width = W; cv.height = H;                      // 크기를 넣으면 변환이 초기화된다
      setOrigin(cv.getContext('2d'), fit);
    }
    redrawAll();
  }

  /* ── 그리기 ───────────────────────────────────────────── */
  function drawPanel(ox) {
    bctx.save();
    bctx.beginPath();
    bctx.roundRect(ox * S, PANEL.ty * S, PANEL.w * S, PANEL.h * S, 18 * S);
    bctx.fillStyle = '#ffffff';
    bctx.shadowColor = 'rgba(120,84,30,.16)';
    bctx.shadowBlur = 12 * S; bctx.shadowOffsetY = 3 * S;
    bctx.fill();
    bctx.restore();
  }

  function drawBoard() {
    clear(bctx);
    for (const [ox, paint] of [[PANEL.lx, scene.drawL], [PANEL.rx, scene.drawR]]) {
      drawPanel(ox);
      bctx.save();
      bctx.beginPath();
      bctx.roundRect(ox * S, PANEL.ty * S, PANEL.w * S, PANEL.h * S, 18 * S);
      bctx.clip();
      bctx.translate(ox * S, PANEL.ty * S);
      bctx.scale(S, S);
      paint(bctx);                                  // 장면이 판을 꽉 채운다
      bctx.restore();
      bctx.lineWidth = 3 * S; bctx.strokeStyle = '#e6dac2';   // 테두리는 장면 위에
      bctx.beginPath();
      bctx.roundRect(ox * S, PANEL.ty * S, PANEL.w * S, PANEL.h * S, 18 * S);
      bctx.stroke();
    }
  }

  /** 찾은 곳 동그라미(양쪽) + 진행 ●○ */
  function drawMarks() {
    clear(mctx);
    mctx.lineCap = 'round';
    for (const i of judge.found) {
      const d = scene.diffs[i];
      mctx.strokeStyle = `hsl(${(i * 67) % 360} 82% 52%)`;
      mctx.lineWidth = 8 * S;
      for (const ox of [PANEL.lx, PANEL.rx]) {
        mctx.beginPath();
        mctx.arc((ox + d.x) * S, (PANEL.ty + d.y) * S, (d.r + 14) * S, 0, 6.283);
        mctx.stroke();
      }
    }
    // 몇 개 찾았나 — 가운데 위에 ●○ 로만 (숫자를 못 읽어도 안다)
    const n = judge.total, cx = VIEW.w / 2, gap = 46;
    mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
    mctx.font = `${30 * S}px ${EMOJI_FONT}`;
    for (let i = 0; i < n; i++)
      mctx.fillText(i < judge.count ? '⭐' : '⚪',
                    (cx + (i - (n - 1) / 2) * gap) * S, 58 * S);
    if (party) {
      mctx.save();
      for (const q of party) {
        mctx.globalAlpha = Math.max(0, 1 - q.life);
        mctx.font = `${q.size * S}px ${EMOJI_FONT}`;
        mctx.fillText(q.ch, q.x * S, q.y * S);
      }
      mctx.restore();
    }
  }

  function redrawAll() {
    if (!W || !scene) return;
    drawBoard(); drawMarks();
    clear(ictx);
  }

  function celebrate() {
    const chars = ['⭐', '✨', '🎉', '💛', '🌟'];
    party = [];
    for (let i = 0; i < 24; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const sp = 6 + Math.random() * 9;
      party.push({ ch: chars[i % chars.length], x: 500, y: 350,
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
      drawMarks();
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
    clear(ictx);
    sfx.cheer('spot');
    celebrate();
    toast('다 찾았어요! 🎉');
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => {
      const next = SPOTS.findIndex((L, i) => i > li && !done.has(L.id));
      if (next >= 0) openLevel(next);
      else if (li < SPOTS.length - 1) openLevel(li + 1);
    }, 1700);
  }

  /* ── 펜 입력 ──────────────────────────────────────────── */
  /** 화면 좌표 → 어느 그림판이든 그 판의 로컬 좌표. 판 밖이면 null */
  function toLocal(pt) {
    const x = (pt.x - OX) / S, y = (pt.y - OY) / S - PANEL.ty;
    if (y < -20 || y > PANEL.h + 20) return null;
    for (const ox of [PANEL.lx, PANEL.rx]) {
      const lx = x - ox;
      if (lx >= -20 && lx <= PANEL.w + 20)
        return { x: Math.max(0, Math.min(PANEL.w, lx)), y: Math.max(0, Math.min(PANEL.h, y)) };
    }
    return null;
  }

  /* 펜은 캔버스 픽셀로 들어온다 — 옮겨 둔 원점만큼 같이 옮긴다 */
  const local = (pt) => ({ ...pt, x: pt.x - OX, y: pt.y - OY });
  attachPen(paper, {
    getSize: () => [W, H],
    onStart: (raw) => {
      if (!judge || judge.solved) return;
      const pt = local(raw);
      stroke = [];
      inkPrev = pt;
      clear(ictx);                        // 새 시도 = 새 획
      const l = toLocal(pt);
      if (l) stroke.push(l);
    },
    onMove: (raws) => {
      if (!stroke) return;
      const pts = raws.map(local);
      ictx.strokeStyle = '#ff8a3d';
      ictx.lineCap = 'round'; ictx.lineJoin = 'round';
      ictx.lineWidth = 7 * S;
      for (const pt of pts) {
        if (inkPrev) {
          ictx.beginPath();
          ictx.moveTo(inkPrev.x, inkPrev.y);
          ictx.lineTo(pt.x, pt.y);
          ictx.stroke();
        }
        inkPrev = pt;
        const l = toLocal(pt);
        if (l) stroke.push(l);
      }
    },
    onEnd: () => {
      const s = stroke;
      stroke = null; inkPrev = null;
      if (!s || !s.length || judge.solved) return;
      const hit = judge.feed(s);
      clear(ictx);                        // 획은 판정 후 사라진다
      if (hit >= 0) {
        sfx.dot(judge.count - 1, judge.total);           // 찾을수록 한 음씩 올라간다
        drawMarks();
        if (judge.solved) finish();
      } else {
        sfx.again();                                     // 벌 아님 — "아직이야" 정도
      }
    }
  });

  /* ── 단계 이동 ────────────────────────────────────────── */
  function openLevel(i) {
    clearTimeout(advanceTimer);
    cancelAnimationFrame(raf);
    li = Math.max(0, Math.min(SPOTS.length - 1, i));
    level = SPOTS[li];
    scene = buildSpot(level);
    judge = createSpot(scene.diffs);
    stroke = null; party = null;
    localStorage.setItem(DONE_KEY + ':at', level.id);
    $('spot-name').textContent = level.name;
    $('btn-spot-prev').disabled = li === 0;
    $('btn-spot-next').disabled = li === SPOTS.length - 1;
    for (const el of document.querySelectorAll('#spot-strip .lvl'))
      el.classList.toggle('is-on', el.dataset.lvl === level.id);
    redrawAll();
  }

  function buildStrip() {
    const strip = $('spot-strip');
    strip.innerHTML = '';
    SPOTS.forEach((L, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lvl' + (L.id === level?.id ? ' is-on' : '');
      b.dataset.lvl = L.id;
      b.dataset.hard = L.hard;
      b.innerHTML = `<span class="ico">${L.ico}</span><span class="lbl">${L.name}</span>` +
                    (done.has(L.id) ? `<span class="star">${STAR}</span>` : '');
      b.addEventListener('click', () => { sfx.tap(); openLevel(i); });
      strip.appendChild(b);
    });
  }

  $('btn-spot-home').addEventListener('click', () => { clearTimeout(advanceTimer); goHome(); });
  $('btn-spot-again').addEventListener('click', () => { sfx.undo(); judge.reset(); party = null; redrawAll(); });
  $('btn-spot-prev').addEventListener('click', () => { sfx.tap(); openLevel(li - 1); });
  $('btn-spot-next').addEventListener('click', () => { sfx.tap(); openLevel(li + 1); });

  if (window.ResizeObserver) new ResizeObserver(doLayout).observe($('spot-stage'));
  window.addEventListener('resize', doLayout);
  window.addEventListener('orientationchange', () => setTimeout(doLayout, 250));

  return {
    enter() {
      done = new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]'));
      const last = localStorage.getItem(DONE_KEY + ':at');
      let i = Math.max(0, SPOTS.findIndex(L => L.id === last));
      if (done.has(SPOTS[i].id)) {
        const next = SPOTS.findIndex(L => !done.has(L.id));
        if (next >= 0) i = next;
      }
      level = SPOTS[i];
      buildStrip();
      openLevel(i);
      doLayout();
    }
  };
}
