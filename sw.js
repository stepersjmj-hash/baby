/* ============================================================
   sw.js — 오프라인 캐시
   ------------------------------------------------------------
   앱 파일을 통째로 캐시해서 비행기 안에서도 돌아가게 한다.
   ★ 파일을 추가/수정했으면 VERSION 을 올릴 것. 안 올리면 아이패드가
     예전 캐시를 계속 쓴다 (가장 자주 겪는 함정).
   ============================================================ */

const VERSION = 'v7';
const CACHE = `ainori-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/main.js',
  './js/core/pen.js',
  './js/core/audio.js',
  './js/core/store.js',
  './js/coloring/index.js',
  './js/coloring/brushes.js',
  './js/coloring/fill.js',
  './js/coloring/pages.js',
  './js/core/trace.js',
  './js/trace/index.js',
  './js/trace/lines.js',
  './js/trace/hangul.js',
  './js/trace/numbers.js',
  './js/trace/maze.js',
  './js/trace/dots.js',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 네트워크 우선 + 실패하면 캐시.
   캐시 우선으로 하면 코드를 고쳐도 아이패드가 옛날 화면을 계속 보여줘서
   "왜 안 바뀌지?" 로 시간을 버리게 된다. 오프라인은 캐시 폴백으로 충분하다. */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
