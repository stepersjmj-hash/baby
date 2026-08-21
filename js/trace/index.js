/* ============================================================
   trace/index.js — 따라 그리기류 공용 러너
   ------------------------------------------------------------
   선 긋기 · 한글 획순 · 숫자 쓰기 · 미로 · 점 잇기가 화면과 배선을
   전부 공유한다. 판정은 core/trace.js, 내용은 각 코스 파일이 맡고
   여기는 "보여 주기" 만 한다. 새 코스를 추가하려면 아래 COURSES 에
   한 줄 넣으면 된다 — 화면도 HTML 도 건드릴 필요 없다.

   레이어 4장 (CSS 로 겹쳐 두고 GPU 가 합성한다)
     t-fx    ④ 출발/도착 그림, 획 번호, 점 번호, 칭찬 반짝이
     t-fill  ③ 지나온 길 (무지개로 채워진다)
     t-guide ② 길 + 점선, 미로 벽, 점 잇기의 점  ← 단계가 바뀔 때만
     t-ink   ① 아이가 실제로 그은 자국

   진행 채우기는 "새로 늘어난 구간만" 덧칠한다. 매번 경로 전체를 다시
   그리면 점이 수백 개라 펜을 움직일 때마다 느려진다.
   ============================================================ */

import { attachPen } from '../core/pen.js';
import { STAR } from '../core/icons.js';
import { VIEW, buildLevel, createTracer } from '../core/trace.js';
import { sfx, voice, say } from '../core/audio.js';
import { LINES } from './lines.js';
import { HANGUL } from './hangul.js';
import { NUMBERS } from './numbers.js';
import { ENGLISH } from './english.js';
import { MAZES } from './maze.js';
import { DOTS } from './dots.js';
import { NAMES } from './names.js';

/* 코스 정의. guide:false 면 길을 그려 주지 않는다(미로·점 잇기). */
const COURSES = {
  trace:  { levels: LINES,   guide: true,  tol: 44, key: 'traceDone',  voice: 'slide' },
  hangul: { levels: HANGUL,  guide: true,  tol: 40, key: 'hangulDone', voice: 'write',
            from: '✏️', to: '⭐', lang: 'ko-KR' },
  number: { levels: NUMBERS, guide: true,  tol: 40, key: 'numberDone', voice: 'write',
            from: '✏️', to: '⭐', lang: 'ko-KR' },
  english:{ levels: ENGLISH, guide: true,  tol: 40, key: 'englishDone', voice: 'write',
            from: '✏️', to: '⭐', lang: 'en-US' },
  maze:   { levels: MAZES,   guide: false, tol: 40, key: 'mazeDone',   voice: 'scurry' },
  dots:   { levels: DOTS,    guide: false, tol: 60, key: 'dotsDone',   voice: null },
  /* 이름 쓰기: 음절 블록이 작아 길·표시를 가늘게(road/fill/icon/badge),
     full 이면 열 때 이름을 미리 읽지 않고(intro 만) 완성 후 📣 로 듣는다 */
  names:  { levels: NAMES,   guide: true,  tol: 28, key: 'namesDone',  voice: 'write',
            from: '✏️', to: '⭐', lang: 'ko-KR', full: true, intro: '이름을 써 보자',
            road: 34, fill: 24, icon: 44, badge: 12, photos: true }
};

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const ROAD = 62;        // 길 너비 (1000×700 좌표 단위)
const FILL = 44;        // 채워지는 선 너비
const ICON = 62;        // 출발/도착 그림 크기

const emoji = (ctx, ch, x, y, size) => {
  ctx.save();
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, x, y);
  ctx.restore();
};

export function initPractice({ toast, goHome }) {
  const $ = (id) => document.getElementById(id);

  const paper = $('trace-paper');
  const cGuide = $('t-guide'), cFill = $('t-fill'), cInk = $('t-ink'), cFx = $('t-fx');
  const gctx = cGuide.getContext('2d');
  const fctx = cFill.getContext('2d');
  const ictx = cInk.getContext('2d');
  const xctx = cFx.getContext('2d');

  // 코스별로 한 번만 구워 둔다 (경로 리샘플링은 다시 할 이유가 없다)
  const baked = {};
  for (const [id, c] of Object.entries(COURSES)) baked[id] = c.levels.map(L => buildLevel(L));

  let course = COURSES.trace, courseId = 'trace', built = baked.trace;
  let done = new Set();

  let W = 0, H = 0, S = 1;              // S = 캔버스px / 1000×700 좌표 단위
  let li = 0, level = built[0], tracer = null;
  let filled = [];                      // 획별로 어디까지 칠했는지
  let drawing = false, party = null;
  let raf = 0, advanceTimer = 0, lastBeep = 0;

  /* 안내말("이름을 써 보자")을 이미 한 코스들 — 세션당 한 번만 말한다.
     단계를 옮길 때마다 반복하면 성가시다. */
  const introSaid = new Set();

  /* 펜이 닿아 있는 동안 계속 나는 소리 (선 긋기=미끄러짐, 한글·숫자=사각사각,
     미로=또각또각). 점 잇기만 없다 — 점에 닿을 때 울리는 게 더 분명하다. */
  let vox = null, voxAt = 0, voxPt = null;

  /* 완성 때 읽어 줄 말. 펜을 떼는 순간(pointerup = 사용자 제스처 안)에
     동기로 읽는다 — iOS 에서 유일하게 확실히 소리가 나는 경로다. */
  let sayOnLift = null;

  /* 점 잇기: 각 점이 경로의 몇 번째 점인지 미리 찾아 둔다.
     진행이 그 지점을 넘으면 "딩" 하고 한 음씩 올라간다. */
  let dotAt = [], dotsHit = 0;

  /* ── 레이아웃 ─────────────────────────────────────────── */
  function layout() {
    const st = $('trace-stage').getBoundingClientRect();
    if (!st.width || !st.height) return;               // 아직 화면에 안 붙었다
    const AR = VIEW.w / VIEW.h;
    let w = st.width - 28, h = st.height - 28;
    if (w / h > AR) w = h * AR; else h = w / AR;
    w = Math.max(80, Math.floor(w)); h = Math.max(56, Math.floor(h));
    paper.style.width = w + 'px';
    paper.style.height = h + 'px';

    const nW = Math.round(w * DPR), nH = Math.round(h * DPR);
    if (nW === W && nH === H) return;
    W = nW; H = nH; S = W / VIEW.w;
    for (const cv of [cGuide, cFill, cInk, cFx]) { cv.width = W; cv.height = H; }
    redrawAll();
  }

  /* 코스별 치수 — 이름 쓰기는 획이 촘촘해서 가늘게 그린다 */
  const roadW  = () => course.road ?? ROAD;
  const fillW  = () => course.fill ?? FILL;
  const iconSz = () => course.icon ?? ICON;
  const badgeR = () => course.badge ?? 17;

  /* ── 그리기 ───────────────────────────────────────────── */
  function pathTo(ctx, pts, from, to) {
    ctx.beginPath();
    ctx.moveTo(pts[from].x * S, pts[from].y * S);
    for (let j = from + 1; j <= to; j++) ctx.lineTo(pts[j].x * S, pts[j].y * S);
  }

  /** 배경(길·벽·점). 단계가 바뀌거나 화면 크기가 바뀔 때만 부른다 */
  function drawGuide() {
    gctx.clearRect(0, 0, W, H);
    gctx.lineCap = 'round'; gctx.lineJoin = 'round';

    if (level.walls) {                                  // 미로 벽
      gctx.fillStyle = '#c9b189';
      for (const [x, y, w, h] of level.walls) {
        const r = Math.min(w, h) * 0.22 * S;
        gctx.beginPath();
        gctx.roundRect(x * S, y * S, w * S + 1, h * S + 1, r);
        gctx.fill();
      }
    }

    if (course.guide) {                                 // 따라갈 길 + 점선
      for (const p of level.paths) {
        pathTo(gctx, p, 0, p.length - 1);
        gctx.strokeStyle = '#f0e7d3'; gctx.lineWidth = roadW() * S; gctx.stroke();
        gctx.setLineDash([7 * S, 17 * S]);
        gctx.strokeStyle = '#cbb896'; gctx.lineWidth = 4 * S; gctx.stroke();
        gctx.setLineDash([]);
      }
    }

    if (level.dots) {                                   // 점 잇기: 번호 붙은 점
      level.dots.forEach(([x, y], i) => {
        const hit = i < dotsHit;                        // 이미 지나온 점은 색이 찬다
        gctx.fillStyle = hit ? '#ffd166' : '#fff';
        gctx.strokeStyle = hit ? '#ff8a3d' : '#c9a86a';
        gctx.lineWidth = 3 * S;
        gctx.beginPath(); gctx.arc(x * S, y * S, 26 * S, 0, 6.283);
        gctx.fill(); gctx.stroke();
        gctx.fillStyle = hit ? '#7a4a12' : '#6b5c47';
        gctx.font = `800 ${28 * S}px system-ui,sans-serif`;
        gctx.textAlign = 'center'; gctx.textBaseline = 'middle';
        gctx.fillText(String(i + 1), x * S, y * S + S);
      });
    }
  }

  /** 새로 지나온 구간만 덧칠한다 */
  function paintProgress() {
    fctx.lineCap = 'round'; fctx.lineJoin = 'round';
    fctx.lineWidth = fillW() * S;
    const upto = Math.min(tracer.stroke, level.paths.length - 1);
    for (let i = 0; i <= upto; i++) {
      const p = level.paths[i];
      const target = (i < tracer.stroke) ? p.length - 1 : tracer.index;
      for (let j = filled[i]; j < target; j++) {
        // 무지개로 흘러가게 — 어디까지 왔는지 한눈에 보인다
        fctx.strokeStyle = `hsl(${(j / p.length) * 280 + 12} 88% 56%)`;
        fctx.beginPath();
        fctx.moveTo(p[j].x * S, p[j].y * S);
        fctx.lineTo(p[j + 1].x * S, p[j + 1].y * S);
        fctx.stroke();
      }
      if (target > filled[i]) filled[i] = target;
    }
  }

  /** 출발/도착 그림, 획 번호, 칭찬 반짝이 */
  function drawFx(now = performance.now()) {
    xctx.clearRect(0, 0, W, H);
    const si = Math.min(tracer.stroke, level.paths.length - 1);
    const p = level.paths[si];

    // 획이 여러 개면 획 번호를 붙인다 (한글·숫자 획순의 핵심 안내).
    // ㄷ·ㄹ·ㅌ·ㅅ·5 처럼 획의 시작점이 겹치는 글자가 있어서, 겹치면
    // 그 획을 따라 조금 밀어 놓는다 — 번호가 포개지면 획순을 못 읽는다.
    if (level.paths.length > 1) {
      const R = badgeR(), placed = [];
      for (let i = 0; i < level.paths.length; i++) {
        const p2 = level.paths[i];
        let k = 0;
        while (k < p2.length - 1 &&
               placed.some(b => Math.hypot(b.x - p2[k].x, b.y - p2[k].y) < R * 2.2)) k += 3;
        const a = p2[k];
        placed.push(a);
        xctx.fillStyle = i < tracer.stroke ? '#bda981' : '#ff8a3d';
        xctx.beginPath(); xctx.arc(a.x * S, a.y * S, R * S, 0, 6.283); xctx.fill();
        xctx.fillStyle = '#fff';
        xctx.font = `800 ${R * 1.3 * S}px system-ui,sans-serif`;
        xctx.textAlign = 'center'; xctx.textBaseline = 'middle';
        xctx.fillText(String(i + 1), a.x * S, a.y * S + S);
      }
    }

    const goal = p[p.length - 1];
    emoji(xctx, level.to ?? course.to ?? '⭐', goal.x * S, goal.y * S, iconSz() * S);

    if (!tracer.finished) {
      const head = tracer.head();
      // 아직 시작 안 했으면 출발점을 살짝 두근거리게 (글자 없이 "여기서 시작")
      if (tracer.index === 0) {
        const pulse = 1 + Math.sin(now / 260) * 0.12;
        xctx.strokeStyle = '#3fb950'; xctx.lineWidth = 5 * S;
        xctx.beginPath(); xctx.arc(head.x * S, head.y * S, iconSz() * 0.72 * S * pulse, 0, 6.283); xctx.stroke();
      }
      emoji(xctx, level.from ?? course.from ?? '✏️', head.x * S, head.y * S, iconSz() * S);
    }

    if (party) {
      for (const q of party.bits) {
        xctx.globalAlpha = Math.max(0, 1 - q.life);
        emoji(xctx, q.ch, q.x * S, q.y * S, q.size * S);
      }
      xctx.globalAlpha = 1;
    }
  }

  function redrawAll() {
    filled = level.paths.map(() => 0);      // 화면 크기를 아직 몰라도 상태는 맞춰 둔다
    if (!W) return;
    drawGuide();
    fctx.clearRect(0, 0, W, H);
    ictx.clearRect(0, 0, W, H);
    paintProgress();
    drawFx();
    animate();
  }

  /* ── 애니메이션 (반짝이 · 출발점 두근거림) ────────────────
     상태는 절대 여기에 기대지 않는다. 백그라운드 탭이면 rAF 가 안 돌아
     멈추지만, 판정과 진행은 전부 포인터 이벤트 쪽에서 끝난다. */
  function needsAnim() { return !!party || (!tracer.finished && tracer.index === 0 && !drawing); }

  function animate() {
    cancelAnimationFrame(raf);
    if (!needsAnim()) return;
    const tick = () => {
      if (party) {
        party.bits = party.bits.filter(q => {
          q.x += q.vx; q.y += q.vy; q.vy += 0.55; q.life += 0.016;
          return q.life < 1;
        });
        if (!party.bits.length) party = null;
      }
      drawFx();
      raf = needsAnim() ? requestAnimationFrame(tick) : 0;
    };
    raf = requestAnimationFrame(tick);
  }

  function celebrate() {
    const p = level.paths[level.paths.length - 1];
    const end = p[p.length - 1];
    const chars = ['⭐', '✨', '🎉', '💛', '🌟'];
    party = { bits: [] };
    for (let i = 0; i < 22; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const sp = 6 + Math.random() * 9;
      party.bits.push({
        ch: chars[i % chars.length], x: end.x, y: end.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: 28 + Math.random() * 26, life: 0
      });
    }
    animate();
  }

  /* ── 펜 입력 ──────────────────────────────────────────── */
  function feed(pt) {
    // 다 끝난 뒤에도 펜을 떼지 않으면 계속 allDone 이 돌아온다.
    // 그대로 두면 팡파르가 겹쳐 울리고, 더 나쁘게는 자동 넘어가기 타이머가
    // 매번 다시 시작돼서 다음 단계로 영영 안 넘어간다.
    if (tracer.finished) return { on: false, advanced: false, strokeDone: false, allDone: true };
    const r = tracer.feed(pt.x / S, pt.y / S);
    if (r.advanced) {
      paintProgress();
      const now = performance.now();
      if (now - lastBeep > 90) { sfx.step(tracer.overall(), courseId); lastBeep = now; }
      // 점 잇기: 다음 점을 지났으면 한 음 올려 "딩"
      while (dotsHit < dotAt.length && tracer.index >= dotAt[dotsHit]) {
        sfx.dot(dotsHit, dotAt.length);
        dotsHit++;
        drawGuide();
      }
    }
    if (r.strokeDone || r.allDone) {
      // 이름 쓰기: 방금 끝낸 획이 글자의 마지막 획이면 그 글자를 읽는다
      const just = (r.allDone ? level.paths.length : tracer.stroke) - 1;
      if (course.full && level.sylSay?.[just]) sayOnLift = level.sylSay[just];
    }
    if (r.strokeDone && !r.allDone) sfx.strokeDone(tracer.stroke, level.paths.length);
    if (r.allDone) finish();
    else if (r.advanced || r.strokeDone) drawFx();
    return r;
  }

  function finish() {
    if (!done.has(level.id)) {
      done.add(level.id);
      localStorage.setItem(course.key, JSON.stringify([...done]));
      buildStrip();
    }
    ictx.clearRect(0, 0, W, H);
    vox?.stop(); vox = null;          // 쓰는 소리를 끄고 팡파르만 들리게
    sfx.cheer(courseId);
    // 읽기는 여기서 하지 않는다 — 완성은 보통 펜이 움직이는 중에 판정되는데,
    // iOS 는 터치 제스처의 동기 흐름 밖에서 부른 첫 speak 을 무음으로 버린다.
    // 펜을 떼는 pointerup(제스처 안)에서 읽도록 표시만 해 둔다.
    // 이름 쓰기(full)는 마지막 글자 읽기(feed 에서 예약됨)를 두고,
    // 전체 이름은 📣 버튼으로 듣는다.
    if (course.lang && !course.full) sayOnLift = level.say ?? level.name;
    celebrate();
    toast('잘했어요! 🎉');
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => {                 // 다음 단계로 자동으로 넘어간다
      const next = built.findIndex((L, i) => i > li && !done.has(L.id));
      if (next >= 0) openLevel(next);
      else if (li < built.length - 1) openLevel(li + 1);
    }, 1600);
  }

  let inkPrev = null;
  attachPen(paper, {
    getSize: () => [W, H],
    onStart: (pt) => {
      if (!tracer || tracer.finished) return;
      drawing = true;
      ictx.clearRect(0, 0, W, H);                     // 시도할 때마다 자국은 새로
      inkPrev = pt;
      vox?.stop();
      vox = course.voice ? voice(course.voice) : null;
      voxAt = performance.now(); voxPt = pt;
      feed(pt);
      animate();
    },
    onMove: (pts) => {
      if (!drawing) return;
      ictx.strokeStyle = '#ded2b8';                   // 불투명 — 겹쳐도 진해지지 않는다
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
        if (feed(pt).allDone) break;
      }
      const last = pts[pts.length - 1];
      if (last) {
        const now = performance.now();
        const dt = Math.max(1, now - voxAt);
        const d = voxPt ? Math.hypot(last.x - voxPt.x, last.y - voxPt.y) / DPR : 0;
        voxAt = now; voxPt = last;
        vox?.move(Math.min(1, d / dt / 3), last.p ?? 0.6);
      }
    },
    onEnd: () => {
      drawing = false; inkPrev = null; voxPt = null;
      vox?.stop(); vox = null;
      // 터치 기기(아이패드)에서는 pointerup 직후 원천 이벤트인 touchend 가
      // 따라온다 — 읽기는 거기서 한다 (아래 리스너). iOS 가 제스처 권한을
      // 주는 건 원천 터치 이벤트 쪽이다. 터치가 없는 기기(맥)만 여기서 읽는다.
      if (sayOnLift && !('ontouchend' in window)) {
        say(sayOnLift, course.lang);
        sayOnLift = null;
      }
      animate();
    }
  });

  /* ── 단계 이동 ────────────────────────────────────────── */
  function openLevel(i) {
    clearTimeout(advanceTimer);
    li = Math.max(0, Math.min(built.length - 1, i));
    level = built[li];
    tracer = createTracer(level.paths, { tol: level.tol ?? course.tol });
    party = null;
    drawing = false;
    sayOnLift = null;
    vox?.stop(); vox = null;
    dotsHit = 0;
    dotAt = (level.dots || []).map(([x, y]) => {          // 점 → 경로 인덱스
      const p = level.paths[0];
      let best = 0, bd = Infinity;
      for (let j = 0; j < p.length; j++) {
        const d = (p[j].x - x) ** 2 + (p[j].y - y) ** 2;
        if (d < bd) { bd = d; best = j; }
      }
      return best;
    }).filter((v, i) => i > 0);                           // 1번 점은 출발점이라 뺀다
    localStorage.setItem(course.key + ':at', level.id);
    // 단계를 열면 무엇을 쓸지 먼저 읽어 준다 ("기역" → 아이가 따라 쓴다).
    // 여는 경로(홈 카드·칩·◀▶)가 전부 click 이라 iOS 소리 권한이 있고,
    // 여기서 한 번 성공하면 세션이 풀려 완성 읽기(비동기)도 나온다.
    // 실측: 그리기(드래그)의 끝 이벤트는 pointerup/touchend 모두 권한이 없다.
    // 이름 쓰기는 이름을 미리 읽지 않는다 — 완성이 보상이다.
    // 안내말은 이 코스에 처음 들어왔을 때 한 번만 한다.
    if (course.lang) {
      if (!course.full) say(level.say ?? level.name, course.lang);
      else if (course.intro && !introSaid.has(courseId)) {
        introSaid.add(courseId);
        say(course.intro, course.lang);
      }
    }
    const sayBtn = $('btn-trace-say');
    sayBtn.hidden = !course.full;
    sayBtn.disabled = false;                    // 언제든 눌러서 들을 수 있다
    $('trace-name').textContent = level.name;
    $('btn-trace-prev').disabled = li === 0;
    $('btn-trace-next').disabled = li === built.length - 1;
    for (const el of document.querySelectorAll('#trace-strip .lvl'))
      el.classList.toggle('is-on', el.dataset.lvl === level.id);
    redrawAll();
  }

  function again() {
    tracer.reset();
    party = null;
    dotsHit = 0;
    clearTimeout(advanceTimer);
    redrawAll();
    sfx.undo();
  }

/* ── 이름 사진 ──────────────────────────────────────────────
   이름 칩에 그 사람 얼굴을 보여 준다. 사진은 저장소에 두지 않고
   **집 NAS 에서 받아 온다** — 이 저장소는 public 이라 가족 사진을
   커밋할 수 없기 때문이다. 주소에 이름을 그대로 붙이면 된다.

   사진을 추가하려면 코드가 아니라 그 폴더에 파일을 올리면 된다.
   없는 이름은 조용히 원래 아이콘(가족 하트)으로 남는다 — NAS 가
   꺼져 있거나 비행기 모드여도 화면은 멀쩡하다.

   · <img> 로 보여 주기만 하므로 CORS 설정이 필요 없다.
   · 서비스 워커는 다른 origin 요청에 끼어들지 않으므로(sw.js) 오프라인
     에서는 안 보인다. 그때도 하트로 남을 뿐이라 괜찮다.
   · https 라 GitHub Pages(https)에서도 혼합 콘텐츠로 막히지 않는다. */
const FACE_BASE = 'https://stepersjmj.synology.me:28443/mjimage/upload/face/';
const FACE_EXT = ['jpg', 'png'];
const faceURL = (name, k) => FACE_BASE + encodeURIComponent(name) + '.' + FACE_EXT[k];

/** 사진이 있으면 칩의 아이콘을 그 사진으로 갈아 끼운다 (없으면 아무 일 없음) */
function tryFace(chip, name) {
  let k = 0;
  const im = new Image();
  im.className = 'thumb face';
  im.alt = '';
  im.onload = () => {
    chip.querySelector('.ico')?.replaceWith(im);
    // 얼굴이 붙으면 이름 글자는 뺀다. 글자를 못 읽는 나이라 얼굴이
    // 훨씬 잘 통하고, 뺀 자리만큼 사진을 크게 쓸 수 있다.
    chip.querySelector('.lbl')?.remove();
    chip.classList.add('has-face');
  };
  im.onerror = () => { if (++k < FACE_EXT.length) im.src = faceURL(name, k); };
  im.src = faceURL(name, 0);
}

  function buildStrip() {
    const strip = $('trace-strip');
    strip.innerHTML = '';
    built.forEach((L, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lvl' + (L.id === level?.id ? ' is-on' : '');
      b.dataset.lvl = L.id;
      b.innerHTML = `<span class="ico">${L.ico}</span><span class="lbl">${L.name}</span>` +
                    (done.has(L.id) ? `<span class="star">${STAR}</span>` : '');
      b.addEventListener('click', () => {
        sfx.tap();
        /* 사진 칩은 누른 그 자리에서 이름을 읽어 준다 — 얼굴과 이름을
           잇는 게 이 활동의 핵심이라, 다 쓴 뒤가 아니라 고를 때 들려준다.
           click 핸들러의 동기 흐름이라 iOS 소리 권한도 확실하다.
           읽었으면 안내말("이름을 써 보자")은 건너뛴다 — 뒤이어 나오면
           방금 읽은 이름을 잘라 먹는다 (클립은 새로 틀 때 앞엣것을 끊는다). */
        if (course.photos && course.lang) {
          say(L.say ?? L.name, course.lang);
          introSaid.add(courseId);
        }
        openLevel(i);
      });
      if (course.photos) tryFace(b, L.name);
      strip.appendChild(b);
    });
  }

  // 아이패드: 펜을 떼면 pointerup 다음에 원천 touchend 가 온다.
  // 완성 읽기는 여기서 동기로 한다 — iOS 는 click/touchend 같은 원천
  // 이벤트 핸들러 안의 speak 만 확실히 소리를 낸다.
  document.addEventListener('touchend', () => {
    if (!sayOnLift) return;
    say(sayOnLift, course.lang);
    sayOnLift = null;
  }, true);

  // 아래 이름표를 누르면 읽어 준다 — 아이가 듣고 싶을 때 다시 듣는 용도이자,
  // 터치 안에서 도는 가장 확실한 TTS 경로다
  $('trace-name').addEventListener('click', () => {
    if (course.lang) say(level.say ?? level.name, course.lang);
  });

  // 📣 전체 듣기 — 언제든 누르면 전체 이름을 읽어 준다
  $('btn-trace-say').addEventListener('click', () => {
    sfx.tap();
    say(level.say ?? level.name, course.lang ?? 'ko-KR');
  });

  $('btn-trace-home').addEventListener('click', () => { clearTimeout(advanceTimer); goHome(); });
  $('btn-trace-again').addEventListener('click', again);
  $('btn-trace-prev').addEventListener('click', () => { sfx.tap(); openLevel(li - 1); });
  $('btn-trace-next').addEventListener('click', () => { sfx.tap(); openLevel(li + 1); });

  // 화면 전환·회전·창 크기 변경을 한꺼번에 잡는다 (rAF 에 기대지 않는다)
  if (window.ResizeObserver) new ResizeObserver(layout).observe($('trace-stage'));
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 250));

  return {
    /** @param id COURSES 의 키 (trace / hangul / number / maze / dots) */
    enter(id) {
      courseId = id in COURSES ? id : 'trace';
      course = COURSES[courseId];
      built = baked[courseId];
      done = new Set(JSON.parse(localStorage.getItem(course.key) || '[]'));

      // 마지막에 하던 단계로 돌아간다. 그게 이미 끝난 단계면 아직 안 한 곳으로.
      const last = localStorage.getItem(course.key + ':at');
      let i = Math.max(0, built.findIndex(L => L.id === last));
      if (done.has(built[i].id)) {
        const next = built.findIndex(L => !done.has(L.id));
        if (next >= 0) i = next;
      }
      level = built[i];
      buildStrip();
      openLevel(i);
      layout();
    }
  };
}
