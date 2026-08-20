/* 세어보기 자가 점검. 브라우저 콘솔에 붙여넣어 돌린다.
   문제 생성기(count/levels.js)를 직접 시험하므로 아이가 모은 별을
   건드리지 않는다. 화면 쪽은 떠 있는지만 훑는다. */
(async () => {
  const q = '?t=' + Date.now();
  const { LEVELS, buildCount, AREA, CARDS } = await import('/js/count/levels.js' + q);
  const log = [];
  const HARD = { 1: '하', 2: '중', 3: '상' };
  const RANGE = { 1: [1, 5], 2: [6, 10], 3: [4, 9] };

  // 1) 구성
  {
    const byHard = { 1: 0, 2: 0, 3: 0 };
    const ids = new Set();
    for (const L of LEVELS) { byHard[L.hard]++; ids.add(L.id); }
    const ok = LEVELS.length === 15 && byHard[1] === 5 && byHard[2] === 5 && byHard[3] === 5
               && ids.size === 15;
    log.push(`구성: ${LEVELS.length}문제 (하${byHard[1]} 중${byHard[2]} 상${byHard[3]}) ${ok ? 'OK' : 'FAIL'}`);
  }

  // 2) 문제마다: 결정성 · 개수 범위 · 카드(정답 포함, 3개 고유, 1 이상) ·
  //    방해꾼 규칙 · 영역 안 · 겹침 없음
  for (const hard of [1, 2, 3]) {
    const bad = [];
    for (const L of LEVELS.filter(x => x.hard === hard)) {
      const b = buildCount(L);
      if (JSON.stringify(b) !== JSON.stringify(buildCount(L))) bad.push(L.id + ':비결정적');
      const targets = b.items.filter(i => i.target);
      if (targets.length !== b.answer) bad.push(L.id + ':개수 불일치');
      const [lo, hi] = RANGE[hard];
      if (b.answer < lo || b.answer > hi) bad.push(L.id + ':범위 밖');
      if (!b.choices.includes(b.answer) || new Set(b.choices).size !== 3 ||
          b.choices.some(c => c < 1)) bad.push(L.id + ':카드');
      const decoys = b.items.filter(i => !i.target);
      if (hard === 3 && (decoys.length < 2 || decoys.some(d => d.e === L.ico))) bad.push(L.id + ':방해꾼');
      if (hard !== 3 && decoys.length) bad.push(L.id + ':방해꾼 있음');
      for (const it of b.items)
        if (it.x < AREA.x - 40 || it.x > AREA.x + AREA.w + 40 ||
            it.y < AREA.y - 40 || it.y > AREA.y + AREA.h + 40) bad.push(L.id + ':영역 밖');
      for (let i = 0; i < b.items.length; i++)
        for (let j = i + 1; j < b.items.length; j++)
          if (Math.hypot(b.items[i].x - b.items[j].x, b.items[i].y - b.items[j].y) < b.size * 0.75)
            bad.push(L.id + ':겹침');
      // 물건이 숫자 카드를 가리지 않는다
      for (const it of b.items)
        if (it.y + b.size * 0.5 > CARDS[0].y - 80) bad.push(L.id + ':카드 침범');
    }
    log.push(`${HARD[hard]} 5문제:  ${bad.length ? 'FAIL → ' + [...new Set(bad)].slice(0, 3).join(' ') : 'OK'}`);
  }

  // 3) 화면
  const strip = document.getElementById('count-strip');
  const cv = document.getElementById('cn-board');
  const on = document.getElementById('screen-count')?.classList.contains('is-active');
  log.push(`화면: 칩 ${strip?.children.length ?? 0}개 · 캔버스 ${cv?.width}×${cv?.height} ` +
           (on ? ((strip?.children.length === LEVELS.length && cv?.width > 0) ? 'OK' : 'FAIL')
               : '(세어보기 화면을 열고 다시 돌릴 것)'));
  return log.join('\n');
})()
