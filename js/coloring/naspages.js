/* ============================================================
   coloring/naspages.js — NAS 색칠 도안 불러오기
   ------------------------------------------------------------
   집 NAS 의 sketch 폴더에 도안(흰 바탕 선 그림)을 올리고 맥에서
   `node tools/make-sketch.mjs` 를 돌리면, 같은 폴더에 목록(list.js)과
   장마다 투명 선화 PNG 를 데이터 URI 로 감싼 JS 가 생긴다.
   여기서는 그것들을 <script> 태그로 읽는다 — 영상 보기와 같은 요령이다.

   왜 <img> 가 아니라 <script> 인가: NAS 는 CORS 헤더를 못 주므로
   남의 origin 이미지를 캔버스에 그리면 캔버스가 오염되어
   물감통(alphaMask 의 getImageData)과 완성작 저장(toBlob)이 죽는다.
   script 는 CORS 제약이 없고, 데이터 URI 로 만든 이미지는 same-origin
   이라 픽셀 접근이 온전하다.

   NAS 가 꺼져 있거나 집 밖이면 조용히 빈 목록 — 기본 그림만 나온다.
   ============================================================ */

const BASE = 'https://stepersjmj.synology.me:28443/mjimage/upload/sketch/';

function loadScript(url) {
  return new Promise((res) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = () => { res(true); s.remove(); };
    s.onerror = () => { res(false); s.remove(); };
    document.head.appendChild(s);
  });
}

/* 한 번 읽은 그림은 세션 동안 다시 안 받는다. v(원본 수정 시각)가
   바뀌면 다시 받는다 — 같은 이름으로 그림을 갈아 끼워도 반영된다. */
const cache = new Map();                   // id → { v, img }

/** NAS 도안 목록을 읽어 색칠 페이지 배열로 돌려준다 */
export async function refreshSketch() {
  window.HAICHU_SKETCH = undefined;
  await loadScript(BASE + 'list.js?t=' + Date.now());
  const list = Array.isArray(window.HAICHU_SKETCH) ? window.HAICHU_SKETCH : [];

  await Promise.all(list.map(async (e) => {
    const c = cache.get(e.id);
    if (c && c.v === e.v) return;
    try {
      window.HAICHU_SKETCH_IMG = window.HAICHU_SKETCH_IMG || {};
      delete window.HAICHU_SKETCH_IMG[e.id];
      await loadScript(BASE + encodeURIComponent(e.id) + '.js?v=' + e.v);
      const data = window.HAICHU_SKETCH_IMG[e.id];
      if (!data) return;
      delete window.HAICHU_SKETCH_IMG[e.id];             // 큰 문자열을 오래 들고 있지 않는다
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = data; });
      cache.set(e.id, { v: e.v, img });
    } catch { /* 한 장이 깨져도 나머지는 계속 */ }
  }));

  return list.filter(e => cache.has(e.id)).map(e => ({
    id: 'nas-' + e.id,
    name: e.name || e.id,
    draw: (c) => c.drawImage(cache.get(e.id).img, 0, 0, 1000, 700)
  }));
}
