/* ============================================================
   spot/judge.js — "동그라미로 짚었나" 판정
   ------------------------------------------------------------
   다른 그림 찾기만 쓰는 작은 판정기. 화면과 자가 점검이 같이 쓴다.

   아이는 다른 곳을 동그라미 치기도 하고 콕 찍기도 한다. 그래서
   획의 점들 중 가장 가까운 것과 획의 무게중심, 둘 중 나은 쪽으로
   판정한다 — 동그라미는 무게중심이 과녁에 오고, 점 찍기는 점이 온다.

   한 획은 다른 곳 하나만 짚는다. 화면 전체에 마구 그어도
   한 번에 하나만 인정되므로 문지르기로 다 찾을 수는 없다.
   ============================================================ */

/**
 * @param diffs [{x, y, r}]  다른 곳 (판 로컬 좌표)
 * @param tol   과녁 반지름에 더해 주는 여유
 */
export function createSpot(diffs, tol = 46) {
  const found = new Set();
  return {
    get found() { return [...found]; },
    get count() { return found.size; },
    get total() { return diffs.length; },
    get solved() { return found.size >= diffs.length; },

    /** 획 하나(판 로컬 좌표 점 목록)를 판정한다. @returns 찾은 번호 또는 -1 */
    feed(pts) {
      if (!pts.length) return -1;
      let cx = 0, cy = 0;
      for (const p of pts) { cx += p.x; cy += p.y; }
      cx /= pts.length; cy /= pts.length;

      let best = -1, bd = Infinity;
      diffs.forEach((d, i) => {
        if (found.has(i)) return;
        let m = Math.hypot(cx - d.x, cy - d.y);          // 동그라미의 무게중심
        for (const p of pts)                             // 콕 찍기 / 스치기
          m = Math.min(m, Math.hypot(p.x - d.x, p.y - d.y));
        if (m <= d.r + tol && m < bd) { bd = m; best = i; }
      });
      if (best >= 0) found.add(best);
      return best;
    },

    reset() { found.clear(); }
  };
}
