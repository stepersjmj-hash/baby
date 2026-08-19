/* 다른 그림 찾기 자가 점검. 브라우저 콘솔에 붙여넣어 돌린다.

   판정은 엔진(spot/judge.js)과 생성기(spot/scenes.js)를 직접 불러 시험하므로
   아이가 모은 별(진행 기록)을 건드리지 않는다. 화면 쪽은 떠 있는지만 훑는다. */
(async () => {
  const q = '?t=' + Date.now();
  const { SPOTS, buildSpot } = await import('/js/spot/scenes.js' + q);
  const { createSpot } = await import('/js/spot/judge.js' + q);
  const log = [];
  const HARD = { 1: '하', 2: '중', 3: '상' };

  // 1) 구성: 30문제, 난이도별 10개씩, 전부 서로 다른 문제
  {
    const byHard = { 1: 0, 2: 0, 3: 0 };
    const ids = new Set(), sigs = new Set();
    for (const L of SPOTS) {
      byHard[L.hard]++;
      ids.add(L.id);
      sigs.add(JSON.stringify([buildSpot(L).objs.map(o => o.e + Math.round(o.x)),
                               [...buildSpot(L).alt]]));
    }
    const ok = SPOTS.length === 30 && byHard[1] === 10 && byHard[2] === 10 && byHard[3] === 10
               && ids.size === 30 && sigs.size === 30;
    log.push(`구성: ${SPOTS.length}문제 (하${byHard[1]} 중${byHard[2]} 상${byHard[3]}) · ` +
             `서로 다른 문제 ${sigs.size}개  ${ok ? 'OK' : 'FAIL'}`);
  }

  // 2) 문제마다: 결정적인가 · 다른 곳 수가 맞나 · 바뀐 게 진짜 다른가 · 다 찾아지나
  const want = { 1: 2, 2: 3, 3: 4 };
  for (const hard of [1, 2, 3]) {
    const bad = [];
    for (const L of SPOTS.filter(x => x.hard === hard)) {
      const b = buildSpot(L), b2 = buildSpot(L);
      if (JSON.stringify([b.objs, [...b.alt]]) !== JSON.stringify([b2.objs, [...b2.alt]]))
        bad.push(L.id + ':비결정적');
      if (b.alt.size !== want[hard]) bad.push(`${L.id}:다른곳 ${b.alt.size}개`);
      for (const [i, e] of b.alt)
        if (e !== null && e === b.objs[i].e) bad.push(L.id + ':안 바뀜');
      // 동그라미로 전부 찾아지는가
      const sp = createSpot(b.diffs);
      for (const d of b.diffs) {
        const ring = [...Array(14)].map((_, k) =>
          ({ x: d.x + Math.cos(k / 14 * 6.28) * 42, y: d.y + Math.sin(k / 14 * 6.28) * 42 }));
        if (sp.feed(ring) < 0) bad.push(L.id + ':못 찾음');
      }
      if (!sp.solved) bad.push(L.id + ':미완');
    }
    log.push(`${HARD[hard]} 10문제:  ${bad.length ? 'FAIL → ' + bad.slice(0, 3).join(' ') : 'OK'}`);
  }

  // 3) 화면 전체를 마구 문질러도 한 획에 하나만 인정된다
  {
    const b = buildSpot(SPOTS[20]);                       // 상 난이도 하나
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
    // 모든 다른 곳에서 가장 먼 지점을 찾아 그 근처를 콕 찍는다
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
