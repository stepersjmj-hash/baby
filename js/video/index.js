/* ============================================================
   video/index.js — 영상 보기 (숨김 기능)
   ------------------------------------------------------------
   기본은 **홈에 없다.** 설정에서 켜야 카드가 나온다 — 그리기 앱에
   영상이 늘 보이면 아이가 그것만 찾는다. 부모가 열어 주는 자리다.

   영상은 저장소가 아니라 **집 NAS** 에 둔다 (이름 사진과 같은 이유:
   저장소가 public 이고, 영상은 용량이 커서 커밋할 것이 못 된다).

     <NAS>/video/한글용사/1.mp4 … 12.mp4
     <NAS>/video/한글용사/cover.jpg   →  시리즈 표지 — 고르는 동안 큰 화면에 걸린다
     <NAS>/video/한글용사/1.jpg       →  그 편의 썸네일 (.png 도 된다. 없어도 된다)

   목록은 **list.php 를 먼저, 없으면 list.js** 를 부른다.
     · list.php  — 폴더를 훑어 목록을 만들어 준다 (tools/nas-video-list.php).
                   **이걸 두면 폴더만 만들면 끝이다.**
     · list.js   — PHP 를 못 쓸 때. `window.HAICHU_VIDEOS = ['한글용사', ...]`

   ★ **브라우저는 남의 서버 폴더 목록을 물어볼 수 없다** (보안). 파일 이름을
     알 때 가져오는 것만 된다 — 편수를 셀 수 있는 것도 `1.mp4` 라는 규칙이
     있어서다. 그래서 폴더 이름은 NAS 쪽에서 알려 줘야 한다.

   이름만 알면 나머지는 앱이 한다: 편수는 1.mp4 부터 있는 만큼 세고,
   표지가 없으면 그 편의 한 장면을 떠서 쓴다. `{ name, count }` 로 편수까지
   적혀 오면 세는 일을 건너뛴다 (list.php 는 편수도 같이 준다).

   **상단은 편 목록이다** — 썸네일을 골라야 재생된다(들어가자마자 틀지 않는다).
   시리즈가 둘 이상이면 하단 ◀ ▶ 로 시리즈를 넘긴다.
   마지막에 본 자리는 기억한다.

   ★ 목록을 `fetch` 가 아니라 `<script>` 로 읽는다. fetch 는 CORS 헤더가
     있어야 하지만 script 는 필요 없다 — 사진을 `<img>` 로 가져오는 것과
     같은 요령이다. NAS 설정을 건드리지 않아도 된다.

   NAS 가 꺼져 있거나 집 밖이면 조용히 "영상이 없어요" 로 남는다.
   서비스 워커는 다른 origin 에 끼어들지 않으므로 캐시도 안 탄다.
   ============================================================ */

import { sfx } from '../core/audio.js';
import { icon } from '../core/icons.js';

const BASE = 'https://stepersjmj.synology.me:28443/mjimage/upload/video/';
const dir = (name) => BASE + encodeURIComponent(name) + '/';
const AT_KEY = 'haichu.videoAt';               // 마지막에 본 자리

/** 목록 파일 하나를 <script> 로 불러 본다 (script 라 CORS 가 필요 없다) */
function tryList(file) {
  return new Promise((res) => {
    const s = document.createElement('script');
    s.src = BASE + file + '?t=' + Date.now();       // 갱신이 바로 보이게
    s.onload = () => { res(window.HAICHU_VIDEOS); s.remove(); };
    s.onerror = () => { res(null); s.remove(); };   // 없거나 NAS 가 꺼져 있으면
    document.head.appendChild(s);
  });
}

/** 목록을 한 번만 읽는다. list.php(폴더 자동) → list.js(손으로) 순서 */
let listed = null;
function loadList() {
  if (listed) return listed;
  listed = (async () => {
    for (const f of ['list.php', 'list.js']) {
      window.HAICHU_VIDEOS = undefined;
      const v = await tryList(f);
      if (Array.isArray(v)) {
        return v.map(x => (typeof x === 'string' ? { name: x, count: 0 }
                                                 : { name: x.name, count: x.count | 0 }));
      }
    }
    return [];
  })();
  return listed;
}

/* ── 편수 세기 ────────────────────────────────────────────
   list.js 에 편수를 안 적어도 되게, 파일이 있는지 직접 물어본다.
   `<video preload="metadata">` 는 CORS 헤더가 없어도 되고 첫 몇 KB 만
   받는다 — HEAD 요청(fetch)은 CORS 가 필요해서 못 쓴다.
   여덟 편씩 한꺼번에 물어보고, 끊기는 자리에서 멈춘다. */
const MAX_EP = 64;
function has(url) {
  return new Promise((res) => {
    const v = document.createElement('video');
    const done = (ok) => { v.onloadedmetadata = v.onerror = null; v.removeAttribute('src'); res(ok); };
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = () => done(true);
    v.onerror = () => done(false);
    v.src = url;
  });
}
async function countEpisodes(name) {
  /* 세어 둔 값을 기억하지 않는다 — 영상을 더 넣었는데 "1편만 나온다" 가
     된다. 여덟 편을 한꺼번에 물어보므로 다시 세도 금방이다. */
  let n = 0;
  for (let from = 1; from <= MAX_EP; from += 8) {
    const batch = await Promise.all(
      Array.from({ length: 8 }, (_, k) => has(dir(name) + (from + k) + '.mp4')));
    const gap = batch.indexOf(false);
    n = from - 1 + (gap < 0 ? 8 : gap);
    if (gap >= 0) break;                            // 끊겼다 = 여기까지
  }
  return n;
}

/* ── 표지 ────────────────────────────────────────────────
   cover.jpg 가 있으면 그것, 없으면 **1편의 한 장면**을 떠서 쓴다.
   다른 origin 의 영상을 캔버스에 그리면 캔버스가 오염돼 toDataURL 은
   막히지만, **화면에 보여 주는 건 된다** — 그래서 저장은 못 하고
   열 때마다 새로 뜬다 (시리즈가 몇 개뿐이라 부담이 없다). */
/** 폴더 표지(cover.jpg/png)를 찾는다. 있으면 그 시리즈는 전부 이 그림이다 */
function seriesCover(base) {
  const next = (exts) => new Promise((res) => {
    if (!exts.length) return res(null);
    const im = new Image();
    im.onload = () => res(im.src);
    im.onerror = () => next(exts.slice(1)).then(res);
    im.src = base + 'cover.' + exts[0];
  });
  return next(['jpg', 'png']);
}

/** 그 편의 표지를 찾아 넣는다: N.jpg → N.png → 영상에서 한 장면 */
function cover(base, n, put) {
  const tryImg = (exts) => {
    if (!exts.length) return coverFromVideo(base + n + '.mp4', put);
    const im = new Image();
    im.className = 'thumb';
    im.onload = () => put(im);
    im.onerror = () => tryImg(exts.slice(1));
    im.src = base + n + '.' + exts[0];
  };
  tryImg(['jpg', 'png']);
}

function coverFromVideo(url, onReady) {
  const v = document.createElement('video');
  v.preload = 'metadata';
  v.muted = true;
  v.playsInline = true;
  const give = () => {
    const c = document.createElement('canvas');
    c.width = 112; c.height = 68;
    try {
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      c.className = 'thumb';
      onReady(c);
    } catch { /* 못 그리면 필름 아이콘 그대로 */ }
    v.onloadeddata = v.onerror = null;
    v.removeAttribute('src');
  };
  v.onloadeddata = give;
  v.onerror = () => { v.onloadeddata = null; };
  v.src = url + '#t=3';                             // 3초 지점 (짧으면 첫 장면)
}

export function initVideo({ goHome }) {
  const $ = (id) => document.getElementById(id);
  const player = $('video-player'), empty = $('video-empty'), strip = $('video-strip');
  const coverImg = $('video-cover');
  const topTray = strip.closest('.tray');
  let series = [], si = 0, ep = 0;                  // ep 0 = 아직 아무것도 안 골랐다

  const cur = () => series[si];

  function remember() {
    try { localStorage.setItem(AT_KEY, JSON.stringify({ name: cur().name, ep })); }
    catch { /* 사파리 사생활 모드 */ }
  }

  /** 편 하나를 튼다 (썸네일을 눌렀을 때만) */
  function play(n) {
    ep = n;
    player.hidden = false;
    empty.hidden = true;
    coverImg.hidden = true;
    player.src = dir(cur().name) + n + '.mp4';
    player.play().catch(() => { /* 자동재생을 막으면 재생 버튼으로 */ });
    for (const b of strip.children) b.classList.toggle('is-on', +b.dataset.ep === n);
    remember();
  }

  /** 상단 = 편 목록. 썸네일을 골라야 재생된다.
      칩 그림은 그 편의 것이다 — N.jpg/N.png 가 있으면 그것, 없으면 영상에서.
      폴더의 cover 는 칩이 아니라 **큰 화면**에 걸린다(showCover). */
  function build() {
    const s = cur();
    strip.innerHTML = '';
    $('video-name').textContent = s.name;
    $('btn-video-prev').disabled = si <= 0;
    $('btn-video-next').disabled = si >= series.length - 1;
    for (let n = 1; n <= s.count; n++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lvl';
      b.dataset.ep = n;
      b.innerHTML = `<span class="ico art">${icon('film', { size: 32 })}</span>` +
                    `<span class="lbl">${n}</span>`;
      cover(dir(s.name), n, (el) => b.querySelector('.ico, .thumb')?.replaceWith(el));
      b.addEventListener('click', () => { sfx.tap(); play(n); });
      strip.appendChild(b);
    }
  }

  /** 고르는 동안 재생 자리에 시리즈 표지를 걸어 둔다 (없으면 안내 글) */
  async function showCover() {
    const mine = si;
    coverImg.hidden = true;
    empty.hidden = false;
    empty.textContent = '무엇을 볼까요?';
    const src = await seriesCover(dir(cur().name));
    if (si !== mine || ep) return;                  // 그새 시리즈를 넘겼거나 재생을 시작했다
    if (!src) return;
    coverImg.src = src;
    coverImg.hidden = false;
    empty.hidden = true;
  }

  /** 시리즈를 바꾼다 — 목록만 갈아 끼우고 틀지는 않는다 */
  function openSeries(i) {
    si = i; ep = 0;
    player.pause();
    player.removeAttribute('src');
    player.hidden = true;
    build();
    showCover();
  }

  $('btn-video-home').addEventListener('click', () => {
    player.pause();
    player.removeAttribute('src');
    goHome();
  });
  $('btn-video-prev').addEventListener('click', () => { sfx.tap(); openSeries(si - 1); });
  $('btn-video-next').addEventListener('click', () => { sfx.tap(); openSeries(si + 1); });
  // 한 편이 끝나면 다음 편으로 (마지막이면 목록으로 돌아온다)
  player.addEventListener('ended', () => {
    if (ep < cur().count) play(ep + 1);
    else openSeries(si);
  });

  return {
    async enter() {
      if (!series.length) series = await loadList();
      // 편수는 열 때마다 다시 센다 (영상을 더 넣으면 바로 보이게)
      await Promise.all(series.map(async (s) => { s.count = s.count || await countEpisodes(s.name); }));
      const live = series.filter(s => s.count > 0);   // 빈 폴더는 안 보인다
      if (!live.length) {
        topTray.hidden = true; player.hidden = true; coverImg.hidden = true; strip.innerHTML = '';
        empty.hidden = false;
        empty.textContent = '아직 볼 영상이 없어요 (집 와이파이에 있어야 보여요)';
        $('video-name').textContent = '';
        return;
      }
      series = live;
      topTray.hidden = false;

      let at = null;
      try { at = JSON.parse(localStorage.getItem(AT_KEY) || 'null'); } catch { /* 무시 */ }
      const k = at ? series.findIndex(s => s.name === at.name) : -1;
      openSeries(k >= 0 ? k : 0);                     // 고르기 전까지는 틀지 않는다
    }
  };
}
