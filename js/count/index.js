/* ============================================================
   count/index.js — 세어보기
   ------------------------------------------------------------
   문제는 levels.js. 여기는 보여 주기와 배선만.

   조작은 전부 탭(click)이다 — iOS 실측 규칙상 click 핸들러 안에서만
   소리 권한이 확실하므로, 세는 소리("하나, 둘…")와 정답 읽기가
   전부 제스처 안에서 나온다. 펜 판정 엔진은 쓰지 않는다.

   놀이 흐름
     물건을 하나씩 탭 → 번호 배지가 붙고 "하나, 둘, 셋…" 세어 준다
     (다시 탭하면 배지가 빠지고 번호가 당겨진다 — 다시 셀 수 있다)
     아래 숫자 카드에서 정답을 탭 → "다섯 개!" + 팡파르 → 다음 문제
     오답 카드는 잠깐 흐려질 뿐, 벌점도 오답음도 없다 (중립음만)

   레이어 2장: cn-mark(배지·강조) / cn-board(물건·숫자 카드)
   ============================================================ */

import { VIEW, AREA, CARDS, CARD_W, CARD_H, LEVELS, buildCount, COUNT_SAY, GAE } from './levels.js';
import { sfx, say } from '../core/audio.js';

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const DONE_KEY = 'countDone';
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export function initCount({ toast, goHome }) {
  const $ = (id) => document.getElementById(id);

  const paper = $('count-paper');
  const cBoard = $('cn-board'), cMark = $('cn-mark');
  const bctx = cBoard.getContext('2d');
  const mctx = cMark.getContext('2d');

  let done = new Set();
  let W = 0, H = 0, S = 1;
  let li = 0, level = LEVELS[0];
  let quiz = null;
  let marked = [];                      // 탭한 순서의 물건 번호들
  let solved = false, dimmed = null;
  let party = null, raf = 0, advanceTimer = 0, dimTimer = 0;

  /* ── 레이아웃 ─────────────────────────────────────────── */
  function doLayout() {
    const st = $('count-stage').getBoundingClientRect();
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
    for (const cv of [cBoard, cMark]) { cv.width = W; cv.height = H; }
    redrawAll();
  }

  /* ── 그리기 ───────────────────────────────────────────── */
  function drawBoard() {
    bctx.clearRect(0, 0, W, H);
    bctx.save();
    bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
    bctx.font = `${quiz.size * S}px ${EMOJI_FONT}`;
    for (const it of quiz.items) bctx.fillText(it.e, it.x * S, it.y * S);
    bctx.restore();

    quiz.choices.forEach((n, k) => {                     // 숫자 카드
      const { x, y } = CARDS[k];
      bctx.save();
      if (dimmed === k) bctx.globalAlpha = 0.35;
      bctx.beginPath();
      bctx.roundRect((x - CARD_W / 2) * S, (y - CARD_H / 2) * S, CARD_W * S, CARD_H * S, 24 * S);
      bctx.fillStyle = solved && n === quiz.answer ? '#dff5d0' : '#ffffff';
      bctx.shadowColor = 'rgba(120,84,30,.2)';
      bctx.shadowBlur = 10 * S; bctx.shadowOffsetY = 4 * S;
      bctx.fill();
      bctx.shadowColor = 'transparent';
      bctx.lineWidth = 4 * S;
      bctx.strokeStyle = solved && n === quiz.answer ? '#3fb950' : '#e6dac2';
      bctx.stroke();
      bctx.fillStyle = '#3a2f22';
      bctx.font = `800 ${64 * S}px system-ui,-apple-system,sans-serif`;
      bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
      bctx.fillText(String(n), x * S, y * S + 2 * S);
      bctx.restore();
    });
  }

  function drawMarks() {
    mctx.clearRect(0, 0, W, H);
    marked.forEach((idx, k) => {                         // 센 순서대로 번호 배지
      const it = quiz.items[idx];
      const r = quiz.size * 0.52;
      mctx.strokeStyle = `hsl(${(k * 47) % 360} 82% 52%)`;
      mctx.lineWidth = 6 * S;
      mctx.beginPath(); mctx.arc(it.x * S, it.y * S, r * S, 0, 6.283); mctx.stroke();
      const bx = it.x + r * 0.8, by = it.y - r * 0.8;
      mctx.fillStyle = '#ff8a3d';
      mctx.beginPath(); mctx.arc(bx * S, by * S, 19 * S, 0, 6.283); mctx.fill();
      mctx.fillStyle = '#fff';
      mctx.font = `800 ${22 * S}px system-ui,sans-serif`;
      mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
      mctx.fillText(String(k + 1), bx * S, by * S + S);
    });
    if (party) {
      mctx.save();
      mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
      for (const q of party) {
        mctx.globalAlpha = Math.max(0, 1 - q.life);
        mctx.font = `${q.size * S}px ${EMOJI_FONT}`;
        mctx.fillText(q.ch, q.x * S, q.y * S);
      }
      mctx.restore();
    }
  }

  function redrawAll() {
    if (!W || !quiz) return;
    drawBoard(); drawMarks();
  }

  function celebrate() {
    const chars = ['⭐', '✨', '🎉', '💛', '🌟'];
    party = [];
    for (let i = 0; i < 24; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const sp = 6 + Math.random() * 9;
      party.push({ ch: chars[i % chars.length], x: 500, y: 320,
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

  /* ── 탭 (click — iOS 소리 권한이 확실한 유일한 경로) ────── */
  paper.addEventListener('click', (e) => {
    if (!quiz || solved) return;
    const r = paper.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * VIEW.w;
    const y = (e.clientY - r.top) / r.height * VIEW.h;

    // 숫자 카드?
    for (let k = 0; k < CARDS.length; k++) {
      const c = CARDS[k];
      if (Math.abs(x - c.x) <= CARD_W / 2 && Math.abs(y - c.y) <= CARD_H / 2) {
        if (quiz.choices[k] === quiz.answer) {
          solved = true;
          say(`${level.name.replace(/만$/, '')} ${GAE[quiz.answer - 1]}!`);
          sfx.cheer('count');
          celebrate();
          if (!done.has(level.id)) {
            done.add(level.id);
            localStorage.setItem(DONE_KEY, JSON.stringify([...done]));
            buildStrip();
          }
          drawBoard();
          clearTimeout(advanceTimer);
          advanceTimer = setTimeout(() => {
            const next = LEVELS.findIndex((L, i) => i > li && !done.has(L.id));
            openLevel(next >= 0 ? next : Math.min(li + 1, LEVELS.length - 1));
          }, 2000);
        } else {
          sfx.again();                                   // 벌 아님 — 카드만 잠깐 흐려진다
          dimmed = k;
          drawBoard();
          clearTimeout(dimTimer);
          dimTimer = setTimeout(() => { dimmed = null; drawBoard(); }, 700);
        }
        return;
      }
    }

    // 물건? — 셀 대상만 반응한다 (방해꾼은 조용)
    let best = -1, bd = 1e9;
    quiz.items.forEach((it, i) => {
      if (!it.target) return;
      const d = Math.hypot(x - it.x, y - it.y);
      if (d <= quiz.size * 0.62 && d < bd) { bd = d; best = i; }
    });
    if (best < 0) return;
    const at = marked.indexOf(best);
    if (at >= 0) {
      marked.splice(at, 1);                              // 다시 탭 = 빼기 (다시 센다)
      sfx.undo();
    } else {
      marked.push(best);
      sfx.dot(marked.length - 1, quiz.answer);           // 셀수록 음이 올라간다
      say(COUNT_SAY[Math.min(marked.length, COUNT_SAY.length) - 1]);
    }
    drawMarks();
  });

  /* ── 단계 이동 ────────────────────────────────────────── */
  function openLevel(i) {
    clearTimeout(advanceTimer);
    clearTimeout(dimTimer);
    cancelAnimationFrame(raf);
    li = Math.max(0, Math.min(LEVELS.length - 1, i));
    level = LEVELS[li];
    quiz = buildCount(level);
    marked = []; solved = false; dimmed = null; party = null;
    localStorage.setItem(DONE_KEY + ':at', level.id);
    // 무엇을 셀지 읽어 준다 — 여는 경로가 전부 click 이라 소리가 난다
    say(level.ask);
    $('count-name').textContent = level.name;
    $('btn-count-prev').disabled = li === 0;
    $('btn-count-next').disabled = li === LEVELS.length - 1;
    for (const el of document.querySelectorAll('#count-strip .lvl'))
      el.classList.toggle('is-on', el.dataset.lvl === level.id);
    redrawAll();
  }

  function buildStrip() {
    const strip = $('count-strip');
    strip.innerHTML = '';
    LEVELS.forEach((L, i) => {
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

  $('btn-count-home').addEventListener('click', () => { clearTimeout(advanceTimer); goHome(); });
  $('btn-count-again').addEventListener('click', () => { sfx.undo(); openLevel(li); });
  $('btn-count-prev').addEventListener('click', () => { sfx.tap(); openLevel(li - 1); });
  $('btn-count-next').addEventListener('click', () => { sfx.tap(); openLevel(li + 1); });
  $('count-name').addEventListener('click', () => say(level.ask));

  if (window.ResizeObserver) new ResizeObserver(doLayout).observe($('count-stage'));
  window.addEventListener('resize', doLayout);
  window.addEventListener('orientationchange', () => setTimeout(doLayout, 250));

  return {
    enter() {
      done = new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]'));
      const last = localStorage.getItem(DONE_KEY + ':at');
      let i = Math.max(0, LEVELS.findIndex(L => L.id === last));
      if (done.has(LEVELS[i].id)) {
        const next = LEVELS.findIndex(L => !done.has(L.id));
        if (next >= 0) i = next;
      }
      level = LEVELS[i];
      buildStrip();
      openLevel(i);
      doLayout();
    }
  };
}
