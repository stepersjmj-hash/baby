/* 모양 분류 자가 점검. 브라우저 콘솔에 붙여넣어 돌린다.

   문제(levels.js)와 판정(dragdrop.js)을 직접 불러 시험하므로 아이가 모은
   별(진행 기록)을 건드리지 않는다. 화면 쪽은 좌표가 맞는지까지 본다 —
   끌어다 놓는 화면은 "잉크는 손끝을 따라가는데 판정만 어긋나는" 버그가
   나기 쉬운 자리다 (다른 그림 찾기에서 실제로 겪었다). */
(async () => {
  const q = '?t=' + Date.now();
  const { LEVELS, buildSort, AREA, BIN } = await import('/js/sort/levels.js' + q);
  const { createDrag } = await import('/js/core/dragdrop.js' + q);
  const { BOX } = await import('/js/sort/index.js');       // 화면이 쓰는 상자를 그대로.
  // ★ 여기만 `?t=` 를 안 붙인다 — 앱이 이미 띄운 그 모듈을 그대로 써야 한다.
  //   새로 읽으면 audio.js 까지 다시 태어나 창 리스너가 한 벌 더 붙는다.
  const log = [];
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const HARD = { 1: '하', 2: '중', 3: '상' };

  const mkDrag = (b, L) => createDrag({
    left: b.items, right: b.bins, reuseRight: true, grab: 1.15,
    accepts: (it, bin) => it.bin === bin.at
  });

  // 1) 구성: 6문제, 난이도별 2개
  {
    const by = { 1: 0, 2: 0, 3: 0 }, ids = new Set();
    for (const L of LEVELS) { by[L.hard]++; ids.add(L.id); }
    const ok = LEVELS.length === 6 && by[1] === 2 && by[2] === 2 && by[3] === 2 && ids.size === 6;
    log.push(`구성: ${LEVELS.length}문제 (하${by[1]} 중${by[2]} 상${by[3]}) ${ok ? 'OK' : 'FAIL'}`);
  }

  // 2) 문제마다: 갈 곳이 있고, 바구니마다 물건이 있고, 물건이 겹치지 않고,
  //    작업 영역 안에 있고, 전부 담으면 끝난다
  for (const L of LEVELS) {
    const bad = [];
    const b = buildSort(L);
    const used = new Set();
    for (const it of b.items) {
      if (it.bin < 0) bad.push(`${it.id} 갈 곳 없음`);
      used.add(it.bin);
      if (it.x - it.r < AREA.x - 8 || it.x + it.r > AREA.x + AREA.w + 8 ||
          it.y - it.r < AREA.y - 8 || it.y + it.r > AREA.y + AREA.h + 8) bad.push(`${it.id} 영역 밖`);
    }
    if (used.size !== L.bins.length) bad.push('빈 바구니 있음');
    for (let i = 0; i < b.items.length; i++)
      for (let j = i + 1; j < b.items.length; j++) {
        const a = b.items[i], c = b.items[j];
        if (Math.hypot(a.x - c.x, a.y - c.y) < (a.r + c.r) * 0.9) bad.push(`${a.id}·${c.id} 겹침`);
      }
    // 바구니끼리 겹치지 않는다
    for (let i = 1; i < b.bins.length; i++)
      if (b.bins[i].x - b.bins[i - 1].x < BIN.w + 10) bad.push('바구니 겹침');

    // 전부 옳게 담기
    const d = mkDrag(b, L);
    for (const it of b.items) {
      const bin = b.bins[it.bin];
      d.pick(it.x, it.y);
      const r = d.drop(bin.x, bin.y);
      if (!r?.ok) bad.push(`${it.id} 안 담김`);
    }
    if (!d.solved) bad.push('미완');

    // 틀린 바구니에 놓으면 담기지 않는다 (그리고 몇 번이든 다시 된다)
    const d2 = mkDrag(buildSort(L), L);
    const b2 = buildSort(L);
    const wrong = b2.items.find(it => b2.bins.some(x => x.at !== it.bin));
    if (wrong) {
      const other = b2.bins.find(x => x.at !== wrong.bin);
      const dd = mkDrag(b2, L);
      dd.pick(wrong.x, wrong.y);
      if (dd.drop(other.x, other.y)?.ok) bad.push('틀린 바구니에 담김');
      dd.pick(wrong.x, wrong.y);
      if (!dd.drop(b2.bins[wrong.bin].x, b2.bins[wrong.bin].y)?.ok) bad.push('다시 못 담음');
    }
    log.push(`${HARD[L.hard]} ${L.name}: 물건 ${b.items.length}·바구니 ${b.bins.length}  ` +
             (bad.length ? 'FAIL → ' + [...new Set(bad)].slice(0, 3).join(' ') : 'OK'));
  }

  // 3) 같은 씨앗이면 같은 판이다 (점검이 기하를 검사할 수 있는 근거)
  {
    const a = buildSort(LEVELS[2]), b = buildSort(LEVELS[2]);
    const same = JSON.stringify(a.items.map(i => [i.x | 0, i.y | 0])) ===
                 JSON.stringify(b.items.map(i => [i.x | 0, i.y | 0]));
    log.push(`씨앗 고정: ${same ? 'OK' : 'FAIL'}`);
  }

  // 4) 화면
  const strip = document.getElementById('sort-strip');
  const cv = document.getElementById('so-board');
  const on = document.getElementById('screen-sort')?.classList.contains('is-active');
  for (let i = 0; on && i < 60 && cv.width < 400; i++) await sleep(50);
  log.push(`화면: 칩 ${strip?.children.length ?? 0}개 · 캔버스 ${cv?.width}×${cv?.height} ` +
           (on ? ((strip?.children.length === LEVELS.length && cv?.width > 0) ? 'OK' : 'FAIL')
               : '(모양 분류 화면을 열고 다시 돌릴 것)'));

  /* 5) 화면 좌표 → 판정 좌표. **실제로 끌어다 놓아 본다.**
        물건 하나만 옮기므로 단계가 끝나지 않는다 = 별은 안 붙는다.
        옮긴 흔적은 그 단계를 다시 열어 지운다. */
  if (on && cv?.width) {
    const paper = document.getElementById('sort-paper');
    const cur = strip.querySelector('.lvl.is-on')?.dataset.lvl;
    const L = LEVELS.find(x => x.id === cur);
    const t = cv.getContext('2d').getTransform();

    // 화면이 쓰는 상자로 배율을 다시 구해 원점과 대조한다
    const S = Math.min(cv.width / BOX.w, cv.height / BOX.h);
    const OX = Math.round(cv.width / 2 - (BOX.x + BOX.w / 2) * S);
    const OY = Math.round(cv.height / 2 - (BOX.y + BOX.h / 2) * S);
    const same = Math.abs(t.e - OX) < 2 && Math.abs(t.f - OY) < 2;

    let res = '건너뜀(단계를 못 찾음)';
    if (L && same) {
      const b = buildSort(L);
      const it = b.items[0], bin = b.bins[it.bin];
      const r = paper.getBoundingClientRect();
      const toClient = (p) => ({ x: r.left + (p.x * S + OX) * (r.width / cv.width),
                                 y: r.top + (p.y * S + OY) * (r.height / cv.height) });
      const a = toClient(it), z = toClient(bin);
      const send = (ty, x, y) => {
        const ev = new PointerEvent(ty, { pointerId: 97, pointerType: 'pen', isPrimary: true,
          clientX: x, clientY: y, pressure: .6, width: 2, height: 2,
          bubbles: true, cancelable: true, buttons: ty === 'pointerup' ? 0 : 1 });
        (ty === 'pointerdown' ? paper : window).dispatchEvent(ev);
      };
      send('pointerdown', a.x, a.y);
      for (let k = 1; k <= 20; k++)
        send('pointermove', a.x + (z.x - a.x) * k / 20, a.y + (z.y - a.y) * k / 20);
      send('pointerup', z.x, z.y);
      await sleep(120);
      // 담겼으면 그 물건이 흩어진 자리에서 사라진다 → 그 자리의 잉크가 준다
      const d = cv.getContext('2d').getImageData(
        Math.max(0, (it.x - it.r) * S + OX) | 0, Math.max(0, (it.y - it.r) * S + OY) | 0,
        Math.max(1, it.r * 2 * S) | 0, Math.max(1, it.r * 2 * S) | 0).data;
      let ink = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) ink++;
      res = ink < 40 ? 'OK' : `FAIL (끌어다 놓았는데 안 담김, 남은 잉크 ${ink}px)`;
      strip.querySelector('.lvl.is-on')?.click();
      await sleep(80);
    } else if (!same) {
      res = `FAIL (원점이 어긋남: 화면 ${t.e},${t.f} ≠ 계산 ${OX},${OY})`;
    }
    log.push(`끌어다 놓기: ${res}`);
  }

  return log.join('\n');
})()
