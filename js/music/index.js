/* ============================================================
   music/index.js — 노래 듣기 (숨김 기능)
   ------------------------------------------------------------
   영상 보기와 형제다. 다른 점은 **폴더가 아니라 파일 하나가 한 곡**이라
   시리즈·편수 개념이 없다는 것뿐이다.

     <NAS>/music/꼭꼭약속해.mp4      ← 파일명이 곧 제목
     <NAS>/music/list.js             ← tools/make-music.mjs 가 만든다

   ★ **브라우저는 남의 서버 폴더를 훑어볼 수 없다**(보안). 영상은 `1.mp4`
     라는 번호 규칙이 있어 앱이 세어 볼 수 있었지만, 노래는 파일명이 곧
     제목이라 규칙이 없다 — 그래서 이름 목록만은 NAS 가 알려 줘야 한다.
     노래를 올리고 맥에서 `node tools/make-music.mjs` 한 줄이면 된다.

   ★ 목록을 fetch 가 아니라 `<script>` 로 읽는다 — script 는 CORS 헤더가
     필요 없다(영상 목록·색칠 도안과 같은 요령). NAS 설정을 안 건드린다.

   **상단이 노래 목록이다. 골라야 재생된다** — 들어가자마자 틀지 않는다
   (아이가 고르는 것부터가 이 화면의 일이다). 한 곡이 끝나면 다음 곡으로
   넘어가고, 마지막 곡이 끝나면 멈춘다. 마지막에 들은 곡은 기억한다.

   칩 그림은 **그 곡의 한 장면**이다 — 노래 파일이 mp4(율동 영상)라
   장면을 뜰 수 있다. 글자를 못 읽는 나이라 제목만으론 못 고른다.
   다른 origin 영상이라 캔버스가 오염돼 toDataURL 은 막히지만 화면에
   그리는 건 된다 — 그래서 저장은 못 하고 열 때마다 새로 뜬다.

   NAS 가 꺼져 있거나 집 밖이면 조용히 "노래가 없어요" 로 남는다.
   ============================================================ */

import { sfx } from '../core/audio.js';
import { icon } from '../core/icons.js';
import { optOn, setOpt } from '../core/opts.js';

const BASE = 'https://stepersjmj.synology.me:28443/mjimage/upload/music/';
const AT_KEY = 'haichu.musicAt';               // 마지막에 들은 곡

/** 목록을 <script> 로 불러 본다 (CORS 가 필요 없다) */
function loadList() {
  return new Promise((res) => {
    window.HAICHU_MUSIC = undefined;
    const s = document.createElement('script');
    s.src = BASE + 'list.js?t=' + Date.now();    // 새로 넣은 곡이 바로 보이게
    s.onload = () => {
      const v = window.HAICHU_MUSIC;
      res(Array.isArray(v)
        ? v.map(x => (typeof x === 'string' ? { name: x, file: x + '.mp4' }
                                            : { name: x.name, file: x.file || x.name + '.mp4' }))
        : []);
      s.remove();
    };
    s.onerror = () => { res([]); s.remove(); };   // 없거나 NAS 가 꺼져 있으면
    document.head.appendChild(s);
  });
}

const url = (song) => BASE + encodeURIComponent(song.file);

/** 칩 그림 — 그 곡의 3초 지점을 떠서 쓴다 (없으면 음표 아이콘 그대로) */
function coverFromVideo(src, onReady) {
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
    } catch { /* 소리만 있는 파일(mp3·m4a)이면 그냥 음표로 남는다 */ }
    v.onloadeddata = v.onerror = null;
    v.removeAttribute('src');
  };
  v.onloadeddata = give;
  v.onerror = () => { v.onloadeddata = null; };
  v.src = src + '#t=3';
}

export function initMusic({ toast, goHome }) {
  const $ = (id) => document.getElementById(id);
  const player = $('music-player'), empty = $('music-empty'), strip = $('music-strip');
  const topTray = strip.closest('.tray');
  let songs = [], mi = -1;                       // mi < 0 = 아직 아무것도 안 골랐다

  function remember() {
    try { localStorage.setItem(AT_KEY, songs[mi].name); }
    catch { /* 사파리 사생활 모드 */ }
  }

  /** 한 곡을 튼다 (칩을 눌렀을 때, 또는 자동 재생일 때) */
  function play(i) {
    mi = i;
    player.hidden = false;
    empty.hidden = true;
    // 반복 듣기는 <video loop> 에 맡긴다 — 다시 받아 오지 않아 끊김이 없다
    // (이때는 ended 가 아예 안 울린다).
    player.loop = optOn('musicLoop');
    player.src = url(songs[i]);
    player.play().catch(() => { /* 자동재생을 막으면 재생 버튼으로 */ });
    $('music-name').textContent = songs[i].name;
    $('btn-music-prev').disabled = i <= 0;
    $('btn-music-next').disabled = i >= songs.length - 1;
    for (const b of strip.children) b.classList.toggle('is-on', +b.dataset.i === i);
    remember();
  }

  /** 상단 = 노래 목록. 골라야 재생된다 */
  function build() {
    strip.innerHTML = '';
    songs.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lvl';
      b.dataset.i = i;
      b.innerHTML = `<span class="ico art">${icon('note', { size: 32 })}</span>` +
                    `<span class="lbl">${s.name}</span>`;
      coverFromVideo(url(s), (el) => b.querySelector('.ico, .thumb')?.replaceWith(el));
      b.addEventListener('click', () => { sfx.tap(); play(i); });
      strip.appendChild(b);
    });
  }

  const stop = () => { player.pause(); player.removeAttribute('src'); };

  /** 다 듣고 멈춘다 — 다시 고를 수 있게 목록 화면으로 돌아간다 */
  function stopToList() {
    stop();
    player.hidden = true;
    empty.hidden = false;
    empty.textContent = '무슨 노래를 들을까요?';
  }

  /* ── 재생 방식 버튼 (하단) — 영상 보기와 같은 얼개 ─────────
     설정 시트가 아니라 이 화면 아래에 둔다. 반복과 한 번만은 서로
     배타적이고(opts.js 의 group), 켠 순간 듣고 있는 곡에 바로 반영된다. */
  const TOGGLES = [
    ['btn-music-auto', 'musicAuto', '자동 재생 — 들어오면 바로 이어서 틀어요'],
    ['btn-music-loop', 'musicLoop', '반복 — 끝나면 같은 노래를 다시 틀어요'],
    ['btn-music-once', 'musicOnce', '한 번만 — 끝나면 멈춰요']
  ];
  function paintToggles() {
    for (const [id, opt] of TOGGLES) {
      const b = $(id);
      b.classList.toggle('is-on', optOn(opt));
      b.setAttribute('aria-pressed', String(optOn(opt)));
    }
  }
  for (const [id, opt, msg] of TOGGLES) {
    $(id).addEventListener('click', () => {
      sfx.tap();
      const on = !optOn(opt);
      setOpt(opt, on);
      paintToggles();
      player.loop = optOn('musicLoop');          // 지금 듣고 있는 곡에 바로
      toast(on ? msg : '껐어요');
    });
  }

  $('btn-music-home').addEventListener('click', () => { stop(); goHome(); });
  $('btn-music-prev').addEventListener('click', () => { sfx.tap(); play(mi - 1); });
  $('btn-music-next').addEventListener('click', () => { sfx.tap(); play(mi + 1); });
  /* 한 곡이 끝나면 — 기본은 다음 곡으로, 마지막 곡이면 멈춘다.
     설정에서 "한 번만 듣기" 를 켜면 한 곡으로 끝난다.
     "반복 듣기" 는 player.loop 라 여기까지 오지도 않는다. */
  player.addEventListener('ended', () => {
    if (optOn('musicOnce')) { stopToList(); return; }
    if (mi < songs.length - 1) play(mi + 1);
    else stopToList();
  });

  return {
    async enter() {
      paintToggles();
      // 열 때마다 목록을 다시 읽는다 — 노래를 더 넣었는데 안 보이면 안 된다
      songs = await loadList();
      stop();
      player.hidden = true;
      mi = -1;
      if (!songs.length) {
        topTray.hidden = true;
        strip.innerHTML = '';
        empty.hidden = false;
        empty.textContent = '아직 들을 노래가 없어요 (집 와이파이에 있어야 들려요)';
        $('music-name').textContent = '';
        $('btn-music-prev').disabled = true;
        $('btn-music-next').disabled = true;
        return;
      }
      topTray.hidden = false;
      build();
      empty.hidden = false;
      empty.textContent = '무슨 노래를 들을까요?';

      // 마지막에 들은 곡을 칩에서 짚어만 준다 (틀지는 않는다)
      const last = localStorage.getItem(AT_KEY);
      const k = songs.findIndex(s => s.name === last);
      $('music-name').textContent = k >= 0 ? songs[k].name : '';
      if (k >= 0) strip.children[k]?.classList.add('is-on');
      $('btn-music-prev').disabled = true;
      $('btn-music-next').disabled = true;
      /* 자동 재생(설정에서 켠다) — 마지막에 듣던 곡을 바로 이어 튼다.
         기본이 꺼짐인 이유: 무슨 노래를 들을지 고르는 것부터가 이 화면의
         일이다. 소리를 사파리가 막으면 재생 버튼이 남는다(play 의 catch). */
      if (optOn('musicAuto') && k >= 0) play(k);
    }
  };
}
