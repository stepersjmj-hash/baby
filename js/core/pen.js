/* ============================================================
   pen.js — 애플펜슬 / 손가락 입력 정규화
   ------------------------------------------------------------
   · getCoalescedEvents() 로 120Hz ProMotion 의 중간 좌표까지 수집
     (이걸 안 쓰면 아이패드에서 선이 각져 보인다)
   · 필압: 펜은 e.pressure 실측값, 손가락은 이동 속도로 대체
   · 손바닥 인식(palm rejection): 펜이 최근에 닿았으면 touch 무시
   ============================================================ */

const PALM_LOCKOUT_MS = 1400;   // 펜 접촉 후 이 시간 동안 손가락 입력 차단
const PALM_CONTACT_PX = 38;     // 접촉면이 이보다 크면 손바닥으로 간주

export const InputMode = { AUTO: 'auto', PEN_ONLY: 'pen', FINGER_OK: 'finger' };

/**
 * @param el       포인터를 받을 DOM 요소
 * @param opts.getSize  () => [캔버스 픽셀 폭, 높이].  요소 크기(CSS px)와
 *                      캔버스 해상도가 다르므로 좌표 환산에 필요하다.
 */
export function attachPen(el, opts) {
  const { onStart, onMove, onEnd,
          getSize = () => [el.clientWidth, el.clientHeight],
          getMode = () => InputMode.AUTO } = opts;

  let activeId = null;
  let lastPenAt = -1e9;
  // 손가락용 속도→필압 계산 상태
  let vPrev = null, vPressure = 0.5;

  const rectOf = () => el.getBoundingClientRect();

  function toLocal(e, rect) {
    const [cw, ch] = getSize();
    const sx = cw / rect.width;
    const sy = ch / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  /** 펜이면 실측 필압, 아니면 속도 기반(느릴수록 굵게) */
  function pressureOf(e, pt, isPen) {
    if (isPen) {
      // 애플펜슬은 접촉 순간 0 을 보내는 경우가 있어 하한을 둔다
      return e.pressure > 0.01 ? Math.min(1, e.pressure) : 0.4;
    }
    const now = e.timeStamp || performance.now();
    if (!vPrev) { vPrev = { ...pt, t: now }; return vPressure; }
    const dt = Math.max(1, now - vPrev.t);
    const speed = Math.hypot(pt.x - vPrev.x, pt.y - vPrev.y) / dt; // px/ms
    vPrev = { ...pt, t: now };
    const target = 1 - Math.min(1, speed / 3.2);        // 빠르면 얇게
    vPressure += (target - vPressure) * 0.25;            // 급변 완화
    return 0.25 + vPressure * 0.75;
  }

  function ignore(e) {
    const mode = getMode();
    if (e.pointerType === 'pen') { lastPenAt = performance.now(); return false; }
    if (mode === InputMode.PEN_ONLY) return true;
    if (e.pointerType === 'touch') {
      if (performance.now() - lastPenAt < PALM_LOCKOUT_MS) return true;   // 손바닥
      if (e.width > PALM_CONTACT_PX || e.height > PALM_CONTACT_PX) return true;
    }
    return false;
  }

  function down(e) {
    // 무시할 입력(손바닥 등)도 기본 동작은 막는다. 그냥 흘려보내면 사파리가
    // 그걸로 확대 제스처를 시작하면서 그리는 중인 펜 포인터를 취소해 버린다.
    if (ignore(e)) { if (e.pointerType !== 'mouse') e.preventDefault(); return; }
    if (activeId !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    activeId = e.pointerId;
    try { el.setPointerCapture(e.pointerId); } catch { /* 캡처 실패해도 window 리스너가 받는다 */ }
    e.preventDefault();

    const isPen = e.pointerType === 'pen';
    vPrev = null; vPressure = 0.5;
    const pt = toLocal(e, rectOf());
    pt.p = pressureOf(e, pt, isPen);
    onStart(pt, { isPen });
  }

  function move(e) {
    if (e.pointerId !== activeId) return;
    e.preventDefault();
    const isPen = e.pointerType === 'pen';
    if (isPen) lastPenAt = performance.now();

    const rect = rectOf();
    const raw = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    const evts = raw && raw.length ? raw : [e];
    const pts = [];
    for (const ev of evts) {
      const pt = toLocal(ev, rect);
      pt.p = pressureOf(ev, pt, isPen);
      pts.push(pt);
    }
    onMove(pts);
  }

  function up(e) {
    if (e.pointerId !== activeId) return;
    e.preventDefault();
    activeId = null;
    try { el.releasePointerCapture(e.pointerId); } catch { /* 이미 풀렸다 */ }
    // canceled = 펜을 뗀 게 아니라 브라우저가 획을 끊은 것.
    // 받는 쪽에서 다음 획을 이어 붙일지 판단한다.
    onEnd({ canceled: e.type === 'pointercancel' });
  }

  // move/up 은 window 에 건다. 포인터 캡처가 실패하는 브라우저에서도
  // 종이 밖으로 나갔다 들어오는 획이 끊기지 않는다.
  el.addEventListener('pointerdown', down, { passive: false });
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up, { passive: false });
  window.addEventListener('pointercancel', up, { passive: false });

  return () => {
    el.removeEventListener('pointerdown', down);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
  };
}

/** mulberry32 — 스트로크마다 시드를 저장해 되돌리기 후에도 질감이 동일하게 재현된다 */
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
