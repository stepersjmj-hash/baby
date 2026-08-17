/* 브라우저 콘솔에서 붙여넣어 돌리는 자가 점검 스크립트.
   펜 입력 → 각 붓 → 물감통 → 되돌리기/다시하기 → 스티커 순으로 확인한다. */
(async () => {
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const paper = $('paper'), paint = $('c-paint');
  const pctx = paint.getContext('2d');
  const log = [];

  const inkCount = () => {
    const d = pctx.getImageData(0, 0, paint.width, paint.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
    return n;
  };

  function pe(type, x, y, pressure, id = 7) {
    const r = paper.getBoundingClientRect();
    const ev = new PointerEvent(type, {
      pointerId: id, pointerType: 'pen', isPrimary: true, bubbles: true, cancelable: true,
      clientX: r.left + x * r.width, clientY: r.top + y * r.height,
      pressure, width: 2, height: 2, buttons: type === 'pointerup' ? 0 : 1
    });
    (type === 'pointerdown' ? paper : window).dispatchEvent(ev);
  }

  async function stroke(x0, y0, x1, y1, steps = 24) {
    pe('pointerdown', x0, y0, 0.5);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      pe('pointermove', x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0.25 + 0.7 * Math.sin(t * Math.PI));
    }
    pe('pointerup', x1, y1, 0);
    await sleep(12);
  }

  const pick = (tool) => document.querySelector(`.tool[data-tool="${tool}"]`).click();

  // 1) 붓 종류별로 실제 픽셀이 찍히는지
  for (const t of ['crayon', 'pencil', 'brush', 'marker', 'rainbow', 'glitter', 'flower']) {
    const before = inkCount();
    pick(t);
    await stroke(0.12, 0.14, 0.88, 0.16);
    const after = inkCount();
    log.push(`${t}: +${after - before}px ${after > before ? 'OK' : 'FAIL'}`);
    $('btn-undo').click(); await sleep(30);
  }

  // 2) 물감통 — 아이스크림 콘 안쪽
  pick('fill');
  const b0 = inkCount();
  pe('pointerdown', 0.5, 0.82, 0.5); pe('pointerup', 0.5, 0.82, 0);
  await sleep(60);
  const b1 = inkCount();
  log.push(`fill: +${b1 - b0}px ${b1 - b0 > 500 ? 'OK' : 'FAIL'}`);

  // 3) 되돌리기 / 다시하기
  $('btn-undo').click(); await sleep(60);
  const u = inkCount();
  $('btn-redo').click(); await sleep(60);
  const r = inkCount();
  log.push(`undo: ${u === b0 ? 'OK' : `FAIL(${u} vs ${b0})`}`);
  log.push(`redo: ${Math.abs(r - b1) < 40 ? 'OK' : `FAIL(${r} vs ${b1})`}`);

  // 4) 지우개
  pick('eraser');
  const e0 = inkCount();
  await stroke(0.35, 0.85, 0.65, 0.85);
  const e1 = inkCount();
  log.push(`eraser: ${e1 - e0}px ${e1 < e0 ? 'OK' : 'FAIL'}`);

  // 5) 스티커
  pick('sticker'); $('btn-color-close').click();
  const s0 = inkCount();
  pe('pointerdown', 0.2, 0.5, 0.5); pe('pointerup', 0.2, 0.5, 0);
  await sleep(40);
  log.push(`sticker: +${inkCount() - s0}px ${inkCount() > s0 ? 'OK' : 'FAIL'}`);

  // 6) 크기 변경 후 재생 (화면 회전 시나리오)
  const wasInk = inkCount();
  $('stage').style.width = '70%';
  await sleep(120);
  $('stage').style.width = '';
  await sleep(160);
  log.push(`resize-replay: ${inkCount() > wasInk * 0.4 ? 'OK' : 'FAIL'} (${wasInk}→${inkCount()})`);

  pick('crayon');
  return log.join('\n');
})()
