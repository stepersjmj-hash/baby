/* ============================================================
   core/fit.js — 스케치북을 트레이 사이 전체로 펴고,
                 내용을 그 안에 꽉 채운다
   ------------------------------------------------------------
   예전엔 종이를 1000×700 비율로 고정해 두고 남는 자리를 비워 뒀다.
   아이패드 미니처럼 화면이 짧고 넓은 기기에서는 그 여백이 가로 폭의
   3분의 1이라, 글자도 그림도 필요 이상으로 작았다.

   이제 종이는 무대(상하 트레이 사이)를 꽉 채우고, **내용 상자(box)가**
   그 안에서 최대한 커진다. 상자는 화면마다 다르다 — 이름 쓰기는 넓고
   낮고, 미로는 판 전체다. 좌표계는 그대로 1000×700 이라 콘텐츠 파일은
   손댈 일이 없다: 캔버스 컨텍스트의 원점만 옮겨(setOrigin) 두면
   그리는 쪽 코드(x * S)는 그대로 맞아떨어진다.

   ★ 원점을 옮겼으면 전체 지우기가 clearRect(0,0,W,H) 가 아니다.
     각 화면이 clear(ctx) = clearRect(-OX,-OY,W,H) 를 두고 그걸 쓴다 —
     안 그러면 옮긴 만큼 가장자리가 안 지워진다.
   ============================================================ */

const PAD = 14;             // .stage 의 padding 과 같아야 한다

/**
 * 종이 크기를 정하고, 내용 상자를 채울 배율·원점을 계산한다.
 * @param stage  .stage 요소 (남는 자리를 재는 기준)
 * @param paper  .paper 요소 (여기에 크기를 박는다)
 * @param box    내용이 실제로 쓰는 자리 {x,y,w,h} — 1000×700 좌표
 * @param dpr    devicePixelRatio (2 로 상한)
 * @returns {{w,h,W,H,S,OX,OY}|null}  아직 화면에 안 붙었으면 null
 */
export function fitPaper(stage, paper, box, dpr) {
  const st = stage.getBoundingClientRect();
  if (!st.width || !st.height) return null;             // 아직 화면에 안 붙었다

  const w = Math.max(80, Math.floor(st.width - PAD * 2));
  const h = Math.max(56, Math.floor(st.height - PAD * 2));
  paper.style.width = w + 'px';
  paper.style.height = h + 'px';

  const W = Math.round(w * dpr), H = Math.round(h * dpr);
  const S = Math.min(W / box.w, H / box.h);
  // 상자의 가운데가 종이의 가운데에 오게. 좌표계(1000×700)의 가운데가
  // 아니라 상자의 가운데다 — 이름 쓰기처럼 내용이 위아래로 치우친
  // 코스에서도 화면 가운데에 놓인다.
  const OX = Math.round(W / 2 - (box.x + box.w / 2) * S);
  const OY = Math.round(H / 2 - (box.y + box.h / 2) * S);
  return { w, h, W, H, S, OX, OY };
}

/** 캔버스 크기를 바꾼 직후에 부른다 (width 를 넣으면 변환이 초기화된다) */
export const setOrigin = (ctx, fit) => ctx.setTransform(1, 0, 0, 1, fit.OX, fit.OY);

/** 여러 점을 감싸는 상자에 여백을 둘러 준다 */
export function boxOf(pts, margin = 0) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
  }
  return { x: x0 - margin, y: y0 - margin,
           w: (x1 - x0) + margin * 2, h: (y1 - y0) + margin * 2 };
}
