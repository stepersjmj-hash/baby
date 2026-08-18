/* ============================================================
   core/dragdrop.js — "끌어다 놓고 맞는지 본다" 판정 엔진
   ------------------------------------------------------------
   짝 맞추기 · 모양 분류 · 세어보기 · 크기 순서 · 조각 퍼즐 · 기억력 카드가
   전부 이 엔진 하나를 쓴다. 콘텐츠는 "무엇과 무엇이 짝인가" 만 정하면 된다.

   좌표계는 1000×700 (VIEW). trace.js 와 같다.

   양쪽 아무 데서나 시작할 수 있다. 아이는 왼쪽부터 집기도 하고 오른쪽부터
   집기도 하는데 한쪽만 되면 "왜 안 되지" 로 막힌다.

   3~6세 UX 원칙: 틀려도 벌하지 않는다. 안 맞으면 이어지지 않을 뿐이고
   몇 번이든 다시 할 수 있다. 이미 맞춘 것은 집히지 않는다(실수로 풀지 않게).
   ============================================================ */

export const VIEW = { w: 1000, h: 700 };

/**
 * @param left     [{ id, x, y, r, data }]  왼쪽 카드들
 * @param right    [{ id, x, y, r, data }]  오른쪽 카드들
 * @param accepts  (a, b) => boolean   두 카드가 짝인가.
 *                 좌우 어느 쪽을 먼저 집었든 (왼쪽것, 오른쪽것) 순서로 부른다.
 * @param grab     집히는 반경 배수. 아이 손이라 넉넉하게 잡는다.
 */
export function createDrag({ left, right, accepts, grab = 1.2 }) {
  const pairs = new Map();            // leftId → rightId (맞춘 것)
  const usedRight = new Set();
  let held = null;                    // { item, side }

  const doneL = (it) => pairs.has(it.id);
  const doneR = (it) => usedRight.has(it.id);

  function nearest(list, x, y, done) {
    let best = null, bd = Infinity;
    for (const it of list) {
      if (done(it)) continue;
      const d = Math.hypot(x - it.x, y - it.y);
      if (d <= it.r * grab && d < bd) { bd = d; best = it; }
    }
    return best;
  }

  return {
    /** 지금 집고 있는 카드 */
    get held() { return held; },
    /** 맞춘 짝들 [[leftId, rightId], ...] */
    get pairs() { return [...pairs]; },
    get solved() { return pairs.size >= Math.min(left.length, right.length); },
    ratio() { return pairs.size / Math.max(1, Math.min(left.length, right.length)); },

    /** pointerdown — 카드를 집는다. 양쪽 어디서나 집을 수 있다 */
    pick(x, y) {
      const l = nearest(left, x, y, doneL);
      if (l) return (held = { item: l, side: 'left' });
      const r = nearest(right, x, y, doneR);
      if (r) return (held = { item: r, side: 'right' });
      return (held = null);
    },

    /** pointermove — 지금 겨누고 있는 반대쪽 카드 (하이라이트용) */
    hover(x, y) {
      if (!held) return null;
      return held.side === 'left'
        ? nearest(right, x, y, doneR)
        : nearest(left, x, y, doneL);
    },

    /** pointerup — 놓는다. @returns {{ok, from, to}} 또는 null(허공에 놓음) */
    drop(x, y) {
      const from = held;
      held = null;
      if (!from) return null;
      const to = from.side === 'left'
        ? nearest(right, x, y, doneR)
        : nearest(left, x, y, doneL);
      if (!to) return null;

      const [a, b] = from.side === 'left' ? [from.item, to] : [to, from.item];
      const ok = !!accepts(a, b);
      if (ok) { pairs.set(a.id, b.id); usedRight.add(b.id); }
      return { ok, from: from.item, to, leftItem: a, rightItem: b };
    },

    /** 집은 것을 취소한다 (화면 밖으로 나갔을 때 등) */
    cancel() { held = null; },

    reset() { pairs.clear(); usedRight.clear(); held = null; }
  };
}
