/* ============================================================
   core/opts.js — 설정 스위치 한곳 모음
   ------------------------------------------------------------
   부모가 설정(⚙)에서 켜고 끄는 값들이다. 화면마다 localStorage 열쇠를
   따로 들고 있으면 기본값이 어긋나고(어떤 건 기본 켜짐, 어떤 건 꺼짐)
   설정 화면 배선도 화면 수만큼 늘어난다. 여기 한 줄이 스위치 하나다.

     · 열쇠와 기본값이 여기에만 있다 (localStorage 는 문자열 'on'/'off')
     · index.html 의 카드는 data-opt="<id>" 만 달면 main.js 가 배선한다
     · group 이 같은 스위치는 **서로 배타적**이다 — 하나를 켜면 다른 게
       꺼진다. "반복"과 "한 번만"처럼 동시에 참일 수 없는 짝에 쓴다.

   사파리 사생활 모드에서는 localStorage 가 던진다 — 읽기·쓰기를 전부
   감싸서, 저장이 안 되더라도 앱은 기본값으로 멀쩡히 돈다.
   ============================================================ */

const DEF = {
  /* 숨김 활동 — 켜야 홈에 카드가 나온다 (그리기 앱에 영상이 늘 보이면
     아이가 그것만 찾는다. 부모가 열어 주는 자리다).
     영상과 노래는 **스위치 하나로 같이** 열린다 — 부모에게는 "미디어를
     보여 줄까 말까" 한 가지 결정이고, 설정에 스위치가 둘로 늘어날 만큼
     따로 쓰이지 않는다. legacy 는 예전에 따로 쓰던 열쇠 — 한쪽이라도
     켜 두었으면 그대로 켜진 것으로 읽는다(아이패드에 남아 있는 값). */
  media:     { key: 'haichu.media',     def: false,
               legacy: ['haichu.video', 'haichu.music'] },

  /* 미로 자석 — 기본 켜짐(예전부터의 동작). 끄면 지나간 길이 그대로
     남고, 막다른 길에서 펜을 떼면 삐빅 + ✗ 로 알려 준다. */
  magnet:    { key: 'haichu.magnet',    def: true },

  /* 영상 보기 · 노래 듣기 (같은 얼개라 열쇠 이름만 다르다)
     auto  들어가면 마지막에 보던 것을 바로 튼다 (기본은 안 튼다 —
           고르는 것부터가 이 화면의 일이다)
     loop  끝나면 같은 것을 다시
     once  끝나면 멈춘다 (다음으로 안 넘어간다)
     loop·once 를 둘 다 끄면 예전처럼 다음 편/다음 곡으로 이어진다. */
  videoAuto: { key: 'haichu.videoAuto', def: false },
  videoLoop: { key: 'haichu.videoLoop', def: false, group: 'videoEnd' },
  videoOnce: { key: 'haichu.videoOnce', def: false, group: 'videoEnd' },
  musicAuto: { key: 'haichu.musicAuto', def: false },
  musicLoop: { key: 'haichu.musicLoop', def: false, group: 'musicEnd' },
  musicOnce: { key: 'haichu.musicOnce', def: false, group: 'musicEnd' }
};

export const OPT_IDS = Object.keys(DEF);

/** 이 스위치가 켜져 있나 (모르는 id 면 꺼짐) */
export function optOn(id) {
  const o = DEF[id];
  if (!o) return false;
  let v = null;
  try {
    v = localStorage.getItem(o.key);
    // 아직 이 열쇠로 정한 적이 없으면 예전 열쇠를 본다 (한쪽이라도 켜져 있었나)
    if (v === null && o.legacy) v = o.legacy.some(k => localStorage.getItem(k) === 'on') ? 'on' : null;
  } catch { /* 사생활 모드 */ }
  return v === null ? o.def : v === 'on';
}

/**
 * 스위치를 켜고 끈다. 같은 group 의 다른 스위치는 자동으로 꺼진다.
 * @returns 값이 실제로 바뀐 id 들 (화면을 다시 그릴 만큼만 갱신하려고)
 */
export function setOpt(id, on) {
  const o = DEF[id];
  if (!o) return [];
  const changed = [];
  const put = (k, v) => { try { localStorage.setItem(DEF[k].key, v ? 'on' : 'off'); } catch { /* 사생활 모드 */ } };
  if (optOn(id) !== on) { put(id, on); changed.push(id); }
  if (on && o.group) {
    for (const k of OPT_IDS)
      if (k !== id && DEF[k].group === o.group && optOn(k)) { put(k, false); changed.push(k); }
  }
  return changed;
}

/** 눌렀을 때 뒤집기 — 설정 카드가 이것만 쓴다 */
export const toggleOpt = (id) => setOpt(id, !optOn(id));
