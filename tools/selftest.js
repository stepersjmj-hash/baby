/* 브라우저 콘솔에서 붙여넣어 돌리는 자가 점검 스크립트.
   펜 입력 → 각 붓 → 물감통 → 되돌리기/다시하기 → 스티커 순으로 확인한다. */
(async () => {
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const paper = $('paper'), paint = $('c-paint');
  const pctx = paint.getContext('2d');
  const log = [];

  // 화면을 막 열었으면 종이 크기가 아직 안 잡혔을 수 있다 (ResizeObserver 가
  // 잡아 준다). 준비될 때까지 기다린다 — 안 그러면 작은 캔버스에 그렸다가
  // 크기가 바뀌면서 지워져 "전부 0px" 로 보인다.
  for (let i = 0; i < 60 && document.getElementById('c-paint').width < 400; i++) await new Promise(r => setTimeout(r, 50));


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

  // 0) 종이 비우기 — 자동 저장된 그림이 남아 있으면 이후 판정이 전부 어긋난다.
  //    실제 UI 경로(1초 길게 누르기)를 그대로 태운다.
  {
    const btn = $('btn-clear');
    btn.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 99, bubbles: true, cancelable: true }));
    await sleep(1200);
    btn.dispatchEvent(new PointerEvent('pointerup', { pointerId: 99, bubbles: true, cancelable: true }));
    await sleep(60);
    if (inkCount() > 0) return '실패: 종이를 비우지 못했습니다 (전체 지우기 동작 확인 필요)';
  }

  // 1) 붓 종류별로 실제 픽셀이 찍히는지
  for (const t of ['crayon', 'pencil', 'brush', 'marker', 'rainbow', 'glitter', 'flower']) {
    const before = inkCount();
    pick(t);
    await stroke(0.12, 0.14, 0.88, 0.16);
    const after = inkCount();
    log.push(`${t}: +${after - before}px ${after > before ? 'OK' : 'FAIL'}`);
    $('btn-undo').click(); await sleep(30);
  }

  // 2) 물감통. 밑그림은 열 때마다 무작위라 한 점만 찍으면 하필 선 위에
  //    떨어져 아무것도 안 칠해질 수 있다 — 칠해질 때까지 몇 곳을 시도한다.
  pick('fill');
  const b0 = inkCount();
  let b1 = b0;
  for (const [fx, fy] of [[0.5, 0.82], [0.5, 0.5], [0.3, 0.3], [0.72, 0.68]]) {
    pe('pointerdown', fx, fy, 0.5); pe('pointerup', fx, fy, 0);
    await sleep(60);
    b1 = inkCount();
    if (b1 - b0 > 500) break;
  }
  log.push(`fill: +${b1 - b0}px ${b1 - b0 > 500 ? 'OK' : 'FAIL'}`);

  // 3) 되돌리기 / 다시하기
  $('btn-undo').click(); await sleep(60);
  const u = inkCount();
  $('btn-redo').click(); await sleep(60);
  const r = inkCount();
  log.push(`undo: ${u === b0 ? 'OK' : `FAIL(${u} vs ${b0})`}`);
  log.push(`redo: ${Math.abs(r - b1) < 40 ? 'OK' : `FAIL(${r} vs ${b1})`}`);

  // 4) 지우개 — 지울 게 없으면 0 이 나온다. 밑그림이 무작위라 그 자리가
  //    비어 있을 수 있으니, 먼저 그 자리에 한 줄 긋고 지운다.
  pick('crayon');
  await stroke(0.35, 0.85, 0.65, 0.85);
  pick('eraser');
  const e0 = inkCount();
  await stroke(0.35, 0.85, 0.65, 0.85);
  const e1 = inkCount();
  log.push(`eraser: ${e1 - e0}px ${e1 < e0 ? 'OK' : 'FAIL'}`);

  // 5) 스티커 — 알파 수가 아니라 "달라진 픽셀"로 센다. 물감통이 넓게
  //    칠해 놓은 자리에 찍으면 색만 바뀌고 알파 수는 그대로다.
  pick('sticker'); $('btn-color-close').click();
  const s0 = pctx.getImageData(0, 0, paint.width, paint.height).data;
  pe('pointerdown', 0.2, 0.5, 0.5); pe('pointerup', 0.2, 0.5, 0);
  await sleep(40);
  const s1 = pctx.getImageData(0, 0, paint.width, paint.height).data;
  let moved = 0;
  for (let i = 0; i < s1.length; i += 4)
    if (s0[i] !== s1[i] || s0[i + 1] !== s1[i + 1] ||
        s0[i + 2] !== s1[i + 2] || s0[i + 3] !== s1[i + 3]) moved++;
  log.push(`sticker: ${moved}px ${moved > 200 ? 'OK' : 'FAIL'}`);

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
