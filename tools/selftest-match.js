/* 짝 맞추기 자가 점검. 브라우저 콘솔에 붙여넣어 돌린다.

   판정은 엔진(core/dragdrop.js)을 직접 불러 시험하므로 아이가 모은 별을
   건드리지 않는다. 화면 쪽은 지금 열려 있는지만 훑는다. */
(async () => {
  const q = '?t=' + Date.now();
  const { createDrag } = await import('/js/core/dragdrop.js' + q);
  const { MATCHES } = await import('/js/match/pairs.js' + q);
  const { layout, accepts } = await import('/js/match/board.js' + q);
  const log = [];
  const HARD = { 1: '하', 2: '중', 3: '상' };
  const mk = (L, seed = 3) => {
    const b = layout(L, seed);
    return { b, d: createDrag({ left: b.left, right: b.right, accepts }) };
  };

  // 1) 단계마다: 다 맞출 수 있는가 · 화면 안에 들어오는가 · 섞였는가
  for (const L of MATCHES) {
    const { b, d } = mk(L);
    const oob = [...b.left, ...b.right].some(c => c.y - c.r < 30 || c.y + c.r > 670);
    const mixed = L.pairs.length < 2 || b.right.some((r, i) => r.k !== i);
    for (const l of b.left) {
      const m = b.right.find(r => r.k === l.k);
      d.pick(l.x, l.y); d.drop(m.x, m.y);
    }
    const bad = [];
    if (!d.solved) bad.push('못 맞춤');
    if (oob) bad.push('화면밖');
    if (!mixed) bad.push('안 섞임');
    log.push(`${(L.name + '            ').slice(0, 13)} ${HARD[L.hard]} ${L.pairs.length}쌍  ` +
             (bad.length ? `FAIL → ${bad.join(' ')}` : 'OK'));
  }

  // 2) 짝이 아니면 이어지지 않는다 (모든 잘못된 조합을 다 해 본다)
  {
    const wrong = [];
    for (const L of MATCHES) {
      const { b, d } = mk(L);
      for (const l of b.left) for (const r of b.right) {
        if (l.k === r.k) continue;
        d.pick(l.x, l.y);
        if (d.drop(r.x, r.y)?.ok) wrong.push(`${L.name}/${l.k}-${r.k}`);
      }
      if (d.pairs.length) wrong.push(`${L.name}(틀렸는데 이어짐)`);
    }
    log.push(`틀린 짝 거르기:  ${wrong.length ? `FAIL → ${wrong.slice(0, 3).join(' ')}` : 'OK'}`);
  }

  // 3) 오른쪽에서 시작해도 된다 (아이는 아무 쪽에서나 집는다)
  {
    const bad = [];
    for (const L of MATCHES) {
      const { b, d } = mk(L);
      for (const r of b.right) {
        const m = b.left.find(l => l.k === r.k);
        d.pick(r.x, r.y);
        if (!d.drop(m.x, m.y)?.ok) bad.push(L.name);
      }
      if (!d.solved) bad.push(L.name + '(미완)');
    }
    log.push(`오른쪽부터 잇기: ${bad.length ? `FAIL → ${bad.join(' ')}` : 'OK'}`);
  }

  // 4) 이미 맞춘 카드는 다시 집히지 않는다 (실수로 풀지 않게)
  {
    const { b, d } = mk(MATCHES[0]);
    const l0 = b.left[0], r0 = b.right.find(r => r.k === l0.k);
    d.pick(l0.x, l0.y); d.drop(r0.x, r0.y);
    const again = d.pick(l0.x, l0.y);
    const rightAgain = d.pick(r0.x, r0.y);
    log.push(`맞춘 카드 잠금:  ${!again && !rightAgain ? 'OK' : 'FAIL'}`);
  }

  // 5) 허공에 놓으면 아무 일도 없다
  {
    const { b, d } = mk(MATCHES[0]);
    d.pick(b.left[0].x, b.left[0].y);
    const r = d.drop(500, 20);
    log.push(`허공에 놓기:     ${r === null && d.pairs.length === 0 ? 'OK' : 'FAIL'}`);
  }

  // 6) 다시 섞으면 배치가 달라진다
  {
    const L = MATCHES.find(x => x.pairs.length >= 5) || MATCHES[MATCHES.length - 1];
    const a = layout(L, 11).right.map(c => c.k).join();
    const c = layout(L, 12).right.map(c => c.k).join();
    log.push(`다시하기 섞임:   ${a !== c ? 'OK' : 'FAIL(같은 배치)'}`);
  }

  // 7) 화면
  const strip = document.getElementById('match-strip');
  const cv = document.getElementById('m-board');
  const on = document.getElementById('screen-match')?.classList.contains('is-active');
  log.push(`화면: 칩 ${strip?.children.length ?? 0}개 · 캔버스 ${cv?.width}×${cv?.height} ` +
           (on ? ((strip?.children.length === MATCHES.length && cv?.width > 0) ? 'OK' : 'FAIL')
               : '(짝 맞추기 화면을 열고 다시 돌릴 것)'));

  return log.join('\n');
})()
