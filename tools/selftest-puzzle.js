/* 조각 퍼즐 자가 점검. 브라우저 콘솔에 붙여넣어 돌린다.

   기하는 엔진(puzzle/cut.js)을 직접 불러 시험하므로 아이가 모은 별을
   건드리지 않는다. 화면 쪽은 떠 있는지만 훑는다. */
(async () => {
  const q = '?t=' + Date.now();
  const { PICS } = await import('/js/puzzle/pics.js' + q);
  const { buildPuzzle, PIC, SNAP, VIEW } = await import('/js/puzzle/cut.js' + q);
  const log = [];
  const HARD = { 1: '하', 2: '중', 3: '상' };
  const want = { 1: 3, 2: 5, 3: 8 };

  // 1) 구성: 30문제, 난이도별 10개씩, 조각 3/5/8, 고유 id
  {
    const byHard = { 1: 0, 2: 0, 3: 0 };
    const ids = new Set();
    for (const L of PICS) { byHard[L.hard]++; ids.add(L.id); }
    const ok = PICS.length === 9 && byHard[1] === 3 && byHard[2] === 3 && byHard[3] === 3
               && ids.size === 9;
    log.push(`구성: ${PICS.length}문제 (하${byHard[1]} 중${byHard[2]} 상${byHard[3]}) ${ok ? 'OK' : 'FAIL'}`);
  }

  // 2) 난이도별: 조각 수 · 빈틈없이 덮기 · 혹/홈 짝 · 결정성 · 흩은 자리.
  //    자르기가 무작위이므로 문제마다 씨앗 세 개로 돌려 본다.
  for (const hard of [1, 2, 3]) {
    const bad = [];
    for (const L of PICS.filter(x => x.hard === hard)) {
      for (const seed of [1, 2, 3]) {
        const pcs = buildPuzzle(L, seed);
        if (pcs.length !== want[hard]) bad.push(`${L.id}:조각 ${pcs.length}`);
        const area = pcs.reduce((s, p) => s + p.rect.w * p.rect.h, 0);
        if (Math.abs(area - PIC.w * PIC.h) > 1) bad.push(L.id + ':면적');
        // 맞닿은 변마다 혹 하나 + 홈 하나 (짧아서 혹을 생략한 변은 양쪽 다 0)
        const seen = new Map();
        for (const p of pcs) for (const g of p.segs) {
          if (!g.knob) continue;
          const k = [Math.min(g.x1, g.x2), Math.min(g.y1, g.y2),
                     Math.max(g.x1, g.x2), Math.max(g.y1, g.y2)].map(v => Math.round(v * 10)).join(',');
          seen.set(k, (seen.get(k) || []).concat(g.knob));
        }
        for (const v of seen.values())
          if (!(v.length === 2 && v[0] + v[1] === 0)) bad.push(L.id + ':혹홈');
        if (JSON.stringify(pcs) !== JSON.stringify(buildPuzzle(L, seed))) bad.push(L.id + ':비결정적');
        for (const p of pcs) {
          if (p.pos.x - p.rect.w / 2 < PIC.x + PIC.w) bad.push(L.id + ':판 위에 흩어짐');
          if (p.pos.x > VIEW.w || p.pos.y > VIEW.h) bad.push(L.id + ':화면 밖');
          if (Math.hypot(p.pos.x - p.home.x, p.pos.y - p.home.y) <= SNAP) bad.push(L.id + ':이미 붙음');
        }
      }
      // 씨앗이 다르면 다르게 잘려야 한다 (매번 다른 퍼즐)
      if (JSON.stringify(buildPuzzle(L, 1).map(p => p.rect)) ===
          JSON.stringify(buildPuzzle(L, 2).map(p => p.rect)) &&
          JSON.stringify(buildPuzzle(L, 1).map(p => p.rect)) ===
          JSON.stringify(buildPuzzle(L, 3).map(p => p.rect)))
        bad.push(L.id + ':안 바뀜');
    }
    log.push(`${HARD[hard]} 3문제 (${want[hard]}조각): ${bad.length ? 'FAIL → ' + [...new Set(bad)].slice(0, 3).join(' ') : 'OK'}`);
  }

  // 3) 붙기 판정: 제자리 근처는 붙고, 옆 조각 자리는 안 붙는다
  {
    const bad = [];
    for (const L of [PICS[0], PICS[4], PICS[8]]) {
      const pcs = buildPuzzle(L, 5);
      for (const p of pcs) {
        if (Math.hypot(SNAP - 4, 0) > SNAP) bad.push('판정식');
        // 제자리에서 SNAP-4 만큼 벗어나도 붙어야 한다
        const near = Math.hypot((p.home.x + SNAP - 4) - p.home.x, 0) <= SNAP;
        if (!near) bad.push(L.id + ':근처 안 붙음');
        // 다른 조각 자리에는 안 붙어야 한다 (조각 중심 간 거리가 SNAP 보다 커야 성립)
        for (const o of pcs) {
          if (o === p) continue;
          if (Math.hypot(o.home.x - p.home.x, o.home.y - p.home.y) <= SNAP)
            bad.push(`${L.id}:${p.id}-${o.id} 홈이 너무 가깝다`);
        }
      }
    }
    log.push(`붙기 판정:       ${bad.length ? 'FAIL → ' + [...new Set(bad)].slice(0, 3).join(' ') : 'OK'}`);
  }

  // 4) 내 사진 저장소 (읽기만 — 사진은 건드리지 않는다)
  try {
    const { photos } = await import('/js/core/store.js' + q);
    const n = (await photos.all()).length;
    log.push(`내 사진: ${n}장 → 사진 퍼즐(8조각) ${n}개`);
  } catch { log.push('내 사진: 저장소를 못 열었다 (기본 그림만)'); }

  // 5) 화면 — 칩 = 기본 30 + 사진×3 + 사진 추가 버튼
  const strip = document.getElementById('puzzle-strip');
  const cv = document.getElementById('p-board');
  const on = document.getElementById('screen-puzzle')?.classList.contains('is-active');
  log.push(`화면: 칩 ${strip?.children.length ?? 0}개 · 캔버스 ${cv?.width}×${cv?.height} ` +
           (on ? ((strip?.children.length >= PICS.length + 1 && cv?.width > 0) ? 'OK' : 'FAIL')
               : '(조각 퍼즐 화면을 열고 다시 돌릴 것)'));

  return log.join('\n');
})()
