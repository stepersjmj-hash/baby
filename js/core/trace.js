/* ============================================================
   core/trace.js — 펜 궤적을 목표 경로와 맞춰 보는 판정 엔진
   ------------------------------------------------------------
   선 긋기 · 한글 획순 · 숫자 쓰기 · 점 잇기가 전부 이 엔진 하나를
   쓴다. 콘텐츠는 "경로"만 정의하면 된다.

   좌표계는 밑그림(pages.js)과 같은 1000×700. 화면 크기와 무관하고,
   종이의 가로세로비가 1000/700 로 고정이라 배율은 가로·세로가 같다.

   경로 정의
     level.strokes = [ t => ({x, y}), ... ]      t 는 0~1
     획이 여러 개면 순서대로 하나씩 판정한다 (한글 획순이 이걸 쓴다).

   판정 규칙 — 3~6세 UX 원칙 "실패를 만들지 않는다" 를 따른다
     · 진행점(frontier)에서 앞쪽 lookahead 구간 안에 있고 경로에서
       tol 안쪽이면, 그중 가장 멀리 간 지점까지 진행한 것으로 본다.
       (가장 가까운 점이 아니라 가장 먼 점을 잡아야 빨리 그어도 안 멈춘다)
     · 뒤로는 되돌아가지 않는다. 벗어나면 진행이 멈출 뿐, 틀렸다는
       표시도 벌점도 없다.
     · lookahead 를 두는 이유는 경로가 자기 자신에게 가까워지는 곳
       (나선·별)에서 건너뛰지 않게 하기 위해서다.
   ============================================================ */

export const VIEW = { w: 1000, h: 700 };

/** 파라미터 곡선 t→{x,y} 를 등간격 점 배열로 바꾼다 */
export function sampleStroke(fn, spacing = 5) {
  const N = 2000;
  const raw = new Array(N + 1);
  for (let i = 0; i <= N; i++) raw[i] = fn(i / N);

  const pts = [{ x: raw[0].x, y: raw[0].y }];
  let prev = raw[0], carry = 0;
  for (let i = 1; i <= N; i++) {
    const cur = raw[i];
    let dx = cur.x - prev.x, dy = cur.y - prev.y;
    let d = Math.hypot(dx, dy);
    while (d > 0 && carry + d >= spacing) {
      const f = (spacing - carry) / d;
      prev = { x: prev.x + dx * f, y: prev.y + dy * f };
      pts.push({ x: prev.x, y: prev.y });
      carry = 0;
      dx = cur.x - prev.x; dy = cur.y - prev.y; d = Math.hypot(dx, dy);
    }
    carry += d;
    prev = cur;
  }
  const end = raw[N], tail = pts[pts.length - 1];
  if (Math.hypot(end.x - tail.x, end.y - tail.y) > spacing * 0.35)
    pts.push({ x: end.x, y: end.y });
  return pts;
}

/** 꺾은선 경로 만들기. [[x,y], ...] 를 길이에 비례해 잇는다 (모서리가 있는 도형용) */
export function poly(nodes) {
  const seg = [], cum = [0];
  for (let i = 1; i < nodes.length; i++) {
    const d = Math.hypot(nodes[i][0] - nodes[i - 1][0], nodes[i][1] - nodes[i - 1][1]);
    seg.push(d);
    cum.push(cum[i - 1] + d);
  }
  const total = cum[cum.length - 1] || 1;
  return (t) => {
    const d = Math.max(0, Math.min(total, t * total));
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const f = seg[i - 1] ? (d - cum[i - 1]) / seg[i - 1] : 0;
    return {
      x: nodes[i - 1][0] + (nodes[i][0] - nodes[i - 1][0]) * f,
      y: nodes[i - 1][1] + (nodes[i][1] - nodes[i - 1][1]) * f
    };
  };
}

/** 타원 호를 꺾은선 점으로 뽑는다. poly() 에 펼쳐 넣어 곡선을 섞는다
    (숫자 2·3·6·8·9, 한글 ㅇ·ㅎ 이 이걸 쓴다).
    각도는 라디안, y 가 아래로 커지므로 각이 커지면 시계 방향이다. */
export function arc(cx, cy, rx, ry, a0, a1, n = 28) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

/** 레벨 정의 → 판정·그리기에 쓸 점 배열로 굽는다 */
export function buildLevel(level, spacing = 5) {
  return { ...level, paths: level.strokes.map(fn => sampleStroke(fn, spacing)) };
}

/**
 * @param paths        buildLevel 이 구운 점 배열들
 * @param opts.tol     경로에서 이만큼 벗어나도 인정 (1000×700 기준 단위)
 * @param opts.ahead   한 번에 건너뛸 수 있는 구간 (획 길이 대비 비율)
 * @param opts.done    이 비율을 넘으면 획을 다 그은 것으로 본다
 */
export function createTracer(paths, { tol = 44, ahead = 0.16, done = 0.96 } = {}) {
  let si = 0, idx = 0;
  const tol2 = tol * tol;

  return {
    get stroke()   { return si; },
    get index()    { return idx; },
    get finished() { return si >= paths.length; },

    reset() { si = 0; idx = 0; },

    /** 지금 그려야 할 획에서 얼마나 왔는가 0~1 */
    strokeRatio() {
      const p = paths[si];
      return p ? idx / (p.length - 1) : 1;
    },

    /** 레벨 전체 진행률 0~1 */
    overall() {
      if (si >= paths.length) return 1;
      return (si + this.strokeRatio()) / paths.length;
    },

    /** 지금 이어서 그려야 할 지점 (안내용 마커 위치) */
    head() {
      const p = paths[Math.min(si, paths.length - 1)];
      return p[si >= paths.length ? p.length - 1 : idx];
    },

    /** 펜 위치(1000×700 좌표)를 먹인다 */
    feed(x, y) {
      if (si >= paths.length) return { on: false, advanced: false, strokeDone: false, allDone: true };
      const p = paths[si];
      const win = Math.max(8, Math.round(p.length * ahead));
      const to = Math.min(p.length - 1, idx + win);

      let best = -1;
      for (let j = idx; j <= to; j++) {                 // 가장 멀리 간 지점을 택한다
        const dx = x - p[j].x, dy = y - p[j].y;
        if (dx * dx + dy * dy <= tol2) best = j;
      }
      if (best < 0) return { on: false, advanced: false, strokeDone: false, allDone: false };

      const advanced = best > idx;
      idx = best;

      if (idx / (p.length - 1) < done)
        return { on: true, advanced, strokeDone: false, allDone: false };

      idx = p.length - 1;                               // 획 완성
      si++;
      const allDone = si >= paths.length;
      if (!allDone) idx = 0;
      return { on: true, advanced, strokeDone: true, allDone };
    }
  };
}
