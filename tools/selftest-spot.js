/* 다른 그림 찾기 자가 점검. 브라우저 콘솔에 붙여넣어 돌린다.

   장면(scenes.js)과 판정(judge.js)을 직접 불러 시험하므로 아이가 모은
   별(진행 기록)을 건드리지 않는다. 화면 쪽은 떠 있는지만 훑는다. */
(async () => {
  const q = '?t=' + Date.now();
  const { SPOTS, buildSpot, PANEL } = await import('/js/spot/scenes.js' + q);
  const { createSpot } = await import('/js/spot/judge.js' + q);
  const log = [];
  const HARD = { 1: '하', 2: '중', 3: '상' };
  const want = { 1: 2, 2: 3, 3: 4 };

  const render = (fn) => {
    const cv = document.createElement('canvas');
    cv.width = PANEL.w; cv.height = PANEL.h;
    const c = cv.getContext('2d', { willReadFrequently: true });
    fn(c);
    return c.getImageData(0, 0, PANEL.w, PANEL.h).data;
  };

  // 1) 구성: 9문제, 난이도별 3개, 다른 곳 수 2/3/4
  {
    const byHard = { 1: 0, 2: 0, 3: 0 };
    const ids = new Set();
    let bad = 0;
    for (const L of SPOTS) {
      byHard[L.hard]++; ids.add(L.id);
      if (L.diffs.length !== want[L.hard]) bad++;
    }
    const ok = SPOTS.length === 9 && byHard[1] === 3 && byHard[2] === 3 && byHard[3] === 3
               && ids.size === 9 && !bad;
    log.push(`구성: ${SPOTS.length}문제 (하${byHard[1]} 중${byHard[2]} 상${byHard[3]}) ${ok ? 'OK' : 'FAIL'}`);
  }

  // 2) 두 그림은 "다른 곳 근처" 말고는 픽셀까지 같아야 한다.
  //    (같은 코드가 그리므로 안티에일리어싱까지 같다 — 어긋나면
  //     파라미터가 엉뚱한 데를 건드린 것이다.)
  //    또 다른 곳마다 실제로 바뀐 픽셀이 있어야 한다.
  const MARGIN = 130;
  for (const hard of [1, 2, 3]) {
    const bad = [];
    for (const L of SPOTS.filter(x => x.hard === hard)) {
      const b = buildSpot(L);
      const dl = render(b.drawL), dr = render(b.drawR);
      const near = b.diffs.map(() => 0);
      let leak = 0;
      for (let i = 0; i < dl.length; i += 4) {
        if (dl[i] === dr[i] && dl[i+1] === dr[i+1] && dl[i+2] === dr[i+2] && dl[i+3] === dr[i+3]) continue;
        const x = (i / 4) % PANEL.w, y = (i / 4 / PANEL.w) | 0;
        let inside = false;
        b.diffs.forEach((d, k) => {
          const dist = Math.hypot(x - d.x, y - d.y);
          if (dist <= d.r) near[k]++;
          if (dist <= d.r + MARGIN) inside = true;
        });
        if (!inside) leak++;
      }
      if (leak) bad.push(`${L.id}:엉뚱한 곳 ${leak}px 다름`);
      near.forEach((n, k) => { if (n < 4) bad.push(`${L.id}:${L.diffs[k]} 안 바뀜`); });
      // 판정: 각 다른 곳을 동그라미 치면 전부 찾아진다
      const sp = createSpot(b.diffs);
      for (const d of b.diffs) {
        const ring = [...Array(14)].map((_, k) =>
          ({ x: d.x + Math.cos(k / 14 * 6.28) * 40, y: d.y + Math.sin(k / 14 * 6.28) * 40 }));
        if (sp.feed(ring) < 0) bad.push(`${L.id}:못 찾음`);
      }
      if (!sp.solved) bad.push(L.id + ':미완');
    }
    log.push(`${HARD[hard]} 3문제:  ${bad.length ? 'FAIL → ' + [...new Set(bad)].slice(0, 3).join(' ') : 'OK'}`);
  }

  // 3) 화면 전체를 마구 문질러도 한 획에 하나만 인정된다
  {
    const b = buildSpot(SPOTS[8]);
    const sp = createSpot(b.diffs);
    const scribble = [];
    for (let y = 20; y < 540; y += 24)
      for (let x = 20; x < 440; x += 24) scribble.push({ x, y });
    sp.feed(scribble);
    log.push(`문지르기 방지:   한 획에 ${sp.count}개 인정 ${sp.count === 1 ? 'OK' : 'FAIL'}`);
  }

  // 4) 다른 곳에서 먼 획은 인정되지 않는다
  {
    const b = buildSpot(SPOTS[0]);
    const sp = createSpot(b.diffs);
    let far = null, fd = -1;
    for (let y = 30; y < 530; y += 10) for (let x = 30; x < 430; x += 10) {
      const d = Math.min(...b.diffs.map(t => Math.hypot(x - t.x, y - t.y)));
      if (d > fd) { fd = d; far = { x, y }; }
    }
    const r = sp.feed([far, { x: far.x + 4, y: far.y + 3 }]);
    log.push(`먼 곳 콕 찍기:   ${r < 0 && sp.count === 0 ? 'OK' : `FAIL(잡힘, 거리 ${fd.toFixed(0)})`}`);
  }

  // 5) 화면
  const strip = document.getElementById('spot-strip');
  const cv = document.getElementById('s-board');
  const on = document.getElementById('screen-spot')?.classList.contains('is-active');
  log.push(`화면: 칩 ${strip?.children.length ?? 0}개 · 캔버스 ${cv?.width}×${cv?.height} ` +
           (on ? ((strip?.children.length === SPOTS.length && cv?.width > 0) ? 'OK' : 'FAIL')
               : '(다른 그림 찾기 화면을 열고 다시 돌릴 것)'));

  return log.join('\n');
})()
