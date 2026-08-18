/* 따라 그리기 자가 점검. 브라우저 콘솔에 붙여넣어 돌린다.
   판정은 엔진(core/trace.js)을 직접 불러 시험하므로 아이가 모은 별(진행 기록)을
   건드리지 않는다. 화면 쪽은 제대로 떠 있는지만 훑는다. */
(async () => {
  const q = '?t=' + Date.now();
  const { buildLevel, createTracer } = await import('/js/core/trace.js' + q);
  const { LEVELS } = await import('/js/trace/paths.js' + q);
  const log = [];

  /** 경로를 흔들며 따라가 본다 → 끝까지 갔는가 */
  const run = (level, { wobble = 0, only = null, order = null } = {}) => {
    const b = buildLevel(level);
    const tr = createTracer(b.paths, { tol: level.tol ?? 44 });
    const idx = order || b.paths.map((_, i) => i);
    for (const i of idx) {
      const fn = only || level.strokes[i];
      for (let k = 0; k <= 220; k++) {
        const p = fn(k / 220);
        tr.feed(p.x + Math.sin(k * 1.7) * wobble, p.y + Math.cos(k * 2.1) * wobble);
      }
    }
    return { done: tr.finished, ratio: tr.overall() };
  };

  // 1) 손을 떨며(±14) 따라 그리면 12단계 모두 완성되어야 한다
  for (const L of LEVELS) {
    const r = run(L, { wobble: 14 });
    log.push(`${(L.name + '        ').slice(0, 9)} ${L.strokes.length}획  ` +
             `${r.done ? 'OK' : `FAIL (${(r.ratio * 100).toFixed(0)}%)`}`);
  }

  // 2) 길 밖으로만 그으면 한 발짝도 나가면 안 된다
  {
    const b = buildLevel(LEVELS[0]);
    const tr = createTracer(b.paths, {});
    for (let k = 0; k <= 100; k++) tr.feed(150 + 7 * k, 660);
    log.push(`길 밖:      ${tr.overall() === 0 ? 'OK' : `FAIL (${tr.overall()})`}`);
  }

  // 3) 질러가기로는 완성되지 않아야 한다 (도형·나선)
  for (const id of ['circle', 'square', 'tri', 'spiral']) {
    const L = LEVELS.find(x => x.id === id);
    const a = L.strokes[0](0), z = L.strokes[0](1);
    const r = run(L, { only: t => ({ x: a.x + (z.x - a.x) * t, y: a.y + (z.y - a.y) * t }) });
    log.push(`질러가기 ${(id + '      ').slice(0, 7)} ${r.done ? 'FAIL (완성돼 버림)' : 'OK'}`);
  }

  // 4) 획순 — 십자에서 2획을 먼저 그으면 아무 일도 없어야 한다
  {
    const L = LEVELS.find(x => x.id === 'cross');
    const only2 = run(L, { order: [1] });          // 2획만 그어 본다
    const fwd = run(L, { order: [0, 1] });         // 1획 → 2획
    log.push(`획순 2획먼저: ${only2.ratio === 0 ? 'OK' : `FAIL (${only2.ratio})`}`);
    log.push(`획순 바르게:  ${fwd.done ? 'OK' : 'FAIL'}`);
  }

  // 5) 화면 — 단계 칩, 캔버스 크기
  const strip = document.getElementById('trace-strip');
  const cv = document.getElementById('t-guide');
  const onScreen = document.getElementById('screen-trace')?.classList.contains('is-active');
  log.push(`화면: 칩 ${strip?.children.length ?? 0}개 · 캔버스 ${cv?.width}×${cv?.height} ` +
           `${(strip?.children.length === LEVELS.length && cv?.width > 0) ? 'OK'
              : onScreen ? 'FAIL' : '(따라 그리기 화면을 열고 다시 돌릴 것)'}`);

  return log.join('\n');
})()
