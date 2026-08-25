/* 다른 그림 찾기 자가 점검. 브라우저 콘솔에 붙여넣어 돌린다.

   장면(scenes.js)과 판정(judge.js)을 직접 불러 시험하므로 아이가 모은
   별(진행 기록)을 건드리지 않는다. 화면 쪽은 떠 있는지만 훑는다. */
(async () => {
  const q = '?t=' + Date.now();
  const { SPOTS, buildSpot, PANEL } = await import('/js/spot/scenes.js' + q);
  const { createSpot } = await import('/js/spot/judge.js' + q);
  const { BOX } = await import('/js/spot/index.js');       // 화면이 쓰는 상자를 그대로.
  // ★ 여기만 `?t=` 를 안 붙인다 — 앱이 이미 띄운 그 모듈을 그대로 써야 한다.
  //   새로 읽으면 audio.js 까지 다시 태어나 창 리스너가 한 벌 더 붙는다.
  const log = [];
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const inkOf = (cv) => {
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
    return n;
  };
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
    const ok = SPOTS.length === 24 && byHard[1] === 8 && byHard[2] === 8 && byHard[3] === 8
               && ids.size === 24 && !bad;
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
    log.push(`${HARD[hard]} 8문제:  ${bad.length ? 'FAIL → ' + [...new Set(bad)].slice(0, 3).join(' ') : 'OK'}`);
  }

  // 3) 화면 전체를 마구 문질러도 한 획에 하나만 인정된다
  {
    const b = buildSpot(SPOTS[16]);
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
  /* 위 검사들이 메인 스레드를 오래 잡고 있으면 ResizeObserver 가 밀려서
     캔버스가 아직 기본 크기(300×150)일 수 있다 — 잡힐 때까지 기다린다. */
  for (let i = 0; on && i < 60 && cv.width < 400; i++) await sleep(50);
  log.push(`화면: 칩 ${strip?.children.length ?? 0}개 · 캔버스 ${cv?.width}×${cv?.height} ` +
           (on ? ((strip?.children.length === SPOTS.length && cv?.width > 0) ? 'OK' : 'FAIL')
               : '(다른 그림 찾기 화면을 열고 다시 돌릴 것)'));

  /* 6) 화면 좌표 → 판정 좌표. **실제로 동그라미를 쳐 본다.**
        판정 엔진만 시험하면 여기가 빈다 — 원점을 두 번 빼는 바람에 잉크는
        손끝을 따라가는데 판정만 어긋나 "엉뚱한 곳이 체크되던" 버그가 이 자리에서
        났다. 다른 곳 하나만 짚으므로(하 난이도는 2개) 별은 안 붙는다 = 진행
        기록은 그대로다. 짚은 표시는 그 단계를 다시 열어 지운다. */
  if (on && cv?.width) {
    const paper = document.getElementById('spot-paper');
    const mark = document.getElementById('s-mark');
    const cur = strip.querySelector('.lvl.is-on')?.dataset.lvl;
    const lv = SPOTS.find(L => L.id === cur);
    const t = cv.getContext('2d').getTransform();

    // 화면이 쓰는 상자로 배율을 다시 구해 원점과 대조한다
    const S = Math.min(cv.width / BOX.w, cv.height / BOX.h);
    const OX = Math.round(cv.width / 2 - (BOX.x + BOX.w / 2) * S);
    const OY = Math.round(cv.height / 2 - (BOX.y + BOX.h / 2) * S);
    const same = Math.abs(t.e - OX) < 2 && Math.abs(t.f - OY) < 2;

    let hit = '건너뜀(단계를 못 찾음)';
    if (lv && same) {
      const d = buildSpot(lv).diffs[0];
      const r = paper.getBoundingClientRect();
      const view = { x: PANEL.lx + d.x, y: PANEL.ty + d.y };
      const cl = { x: r.left + (view.x * S + OX) * (r.width / cv.width),
                   y: r.top + (view.y * S + OY) * (r.height / cv.height) };
      const before = inkOf(mark);
      // pen.js 규칙: pointerdown 은 요소, move/up 은 window 가 받는다
      const send = (ty, x, y) => {
        const ev = new PointerEvent(ty, { pointerId: 99, pointerType: 'pen', isPrimary: true,
          clientX: x, clientY: y, pressure: .6, width: 2, height: 2,
          bubbles: true, cancelable: true, buttons: ty === 'pointerup' ? 0 : 1 });
        (ty === 'pointerdown' ? paper : window).dispatchEvent(ev);
      };
      const rad = 34;
      send('pointerdown', cl.x + rad, cl.y);
      for (let k = 1; k <= 30; k++) {
        const a = k / 30 * Math.PI * 2;
        send('pointermove', cl.x + Math.cos(a) * rad, cl.y + Math.sin(a) * rad);
      }
      send('pointerup', cl.x + rad, cl.y);
      await sleep(120);
      hit = inkOf(mark) > before ? 'OK' : 'FAIL (동그라미를 쳤는데 인정 안 됨)';
      strip.querySelector('.lvl.is-on')?.click();       // 짚은 표시를 지운다
      await sleep(80);
    } else if (!same) {
      hit = `FAIL (원점이 어긋남: 화면 ${t.e},${t.f} ≠ 계산 ${OX},${OY})`;
    }
    log.push(`정답 자리 짚기:  ${hit}`);
  }

  return log.join('\n');
})()
