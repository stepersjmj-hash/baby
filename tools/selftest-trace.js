/* 따라 그리기류(선 긋기·한글·숫자·미로·점 잇기) 자가 점검.
   브라우저 콘솔에 붙여넣어 돌린다.

   판정은 엔진(core/trace.js)을 직접 불러 시험하므로 아이가 모은 별(진행 기록)을
   건드리지 않는다. 화면 쪽은 지금 열려 있는 코스가 제대로 떴는지만 훑는다. */
(async () => {
  const q = '?t=' + Date.now();
  const { buildLevel, createTracer } = await import('/js/core/trace.js' + q);
  const COURSES = {
    '선 긋기': [(await import('/js/trace/lines.js' + q)).LINES, 44],
    '한글':    [(await import('/js/trace/hangul.js' + q)).HANGUL, 40],
    '숫자':    [(await import('/js/trace/numbers.js' + q)).NUMBERS, 40],
    '미로':    [(await import('/js/trace/maze.js' + q)).MAZES, 40],
    '점 잇기': [(await import('/js/trace/dots.js' + q)).DOTS, 60]
  };
  const log = [];

  /** 경로를 흔들며 따라가 본다 → 끝까지 갔는가 */
  const run = (level, tol, { wobble = 0, only = null, order = null } = {}) => {
    const b = buildLevel(level);
    const tr = createTracer(b.paths, { tol: level.tol ?? tol });
    for (const i of order || b.paths.map((_, k) => k)) {
      const fn = only || level.strokes[i];
      for (let k = 0; k <= 260; k++) {
        const p = fn(k / 260);
        tr.feed(p.x + Math.sin(k * 1.7) * wobble, p.y + Math.cos(k * 2.1) * wobble);
      }
    }
    return { done: tr.finished, ratio: tr.overall() };
  };

  // 1) 손을 떨며 따라 그리면 모든 단계가 완성되어야 한다.
  //    흔들림은 허용 오차의 3분의 1 — 아이 손 정도로 잡았다.
  for (const [name, [levels, tol]] of Object.entries(COURSES)) {
    const bad = [];
    for (const L of levels) {
      const w = (L.tol ?? tol) / 3;
      const r = run(L, tol, { wobble: w });
      if (!r.done) bad.push(`${L.name}(${(r.ratio * 100).toFixed(0)}%)`);
    }
    log.push(`${(name + '        ').slice(0, 8)} ${String(levels.length).padStart(2)}단계 완주  ` +
             (bad.length ? `FAIL → ${bad.join(' ')}` : 'OK'));
  }

  // 2) 길 밖으로만 그으면 한 발짝도 나가면 안 된다
  {
    const L = COURSES['선 긋기'][0][0];
    const tr = createTracer(buildLevel(L).paths, { tol: 44 });
    for (let k = 0; k <= 100; k++) tr.feed(150 + 7 * k, 660);
    log.push(`길 밖:            ${tr.overall() === 0 ? 'OK' : `FAIL (${tr.overall()})`}`);
  }

  // 3) 시작점에서 끝점으로 곧장 그어서는 완성되지 않아야 한다.
  //    단, 원래 직선인 단계(가로줄·ㅡ·ㅣ 등)는 그게 정답이므로 제외한다.
  const shortcut = [];
  let curved = 0;
  for (const [name, [levels, tol]] of Object.entries(COURSES)) {
    for (const L of levels) {
      if (L.strokes.length > 1) continue;               // 한 획짜리만 시험한다
      const pts = buildLevel(L).paths[0];
      const a = pts[0], z = pts[pts.length - 1];
      const span = Math.hypot(z.x - a.x, z.y - a.y);
      if (span < 200) continue;                         // 시작=끝 인 닫힌 도형
      // 경로가 그 직선에서 얼마나 벗어나는지 — 허용 오차 안이면 애초에 직선이다
      const off = Math.max(...pts.map(q =>
        Math.abs((z.x - a.x) * (a.y - q.y) - (a.x - q.x) * (z.y - a.y)) / span));
      if (off < (L.tol ?? tol)) continue;
      curved++;
      const r = run(L, tol, { only: t => ({ x: a.x + (z.x - a.x) * t, y: a.y + (z.y - a.y) * t }) });
      if (r.done) shortcut.push(`${name}/${L.name}`);
    }
  }
  log.push(`질러가기 방지:     ${shortcut.length ? `FAIL → ${shortcut.join(' ')}` : `OK (굽은 단계 ${curved}개)`}`);

  // 4) 획순 — 마지막 획을 먼저 그어서는 완성되지 않아야 한다.
  //    ㄷ·ㅅ·ㅌ·5 처럼 마지막 획의 시작점이 1획과 같은 글자는 그 점 하나만
  //    인정돼 진행률이 몇 % 나온다. 그건 옳은 동작이라 "완성 안 됨" 으로 본다.
  const order = [];
  let maxRatio = 0;
  for (const [name, [levels, tol]] of Object.entries(COURSES)) {
    for (const L of levels) {
      if (L.strokes.length < 2) continue;
      const r = run(L, tol, { order: [L.strokes.length - 1] });
      maxRatio = Math.max(maxRatio, r.ratio);
      if (r.done || r.ratio > 0.25) order.push(`${name}/${L.name}(${(r.ratio * 100).toFixed(0)}%)`);
    }
  }
  log.push(`획순 지키기:       ${order.length ? `FAIL → ${order.join(' ')}`
                                              : `OK (샌 진행률 최대 ${(maxRatio * 100).toFixed(1)}%)`}`);

  // 5) 화면 — 지금 열려 있는 코스의 단계 칩과 캔버스
  const strip = document.getElementById('trace-strip');
  const cv = document.getElementById('t-guide');
  const on = document.getElementById('screen-trace')?.classList.contains('is-active');
  log.push(`화면: 칩 ${strip?.children.length ?? 0}개 · 캔버스 ${cv?.width}×${cv?.height} ` +
           (on ? ((strip?.children.length > 0 && cv?.width > 0) ? 'OK' : 'FAIL')
               : '(따라 그리기류 화면을 열고 다시 돌릴 것)'));

  return log.join('\n');
})()
