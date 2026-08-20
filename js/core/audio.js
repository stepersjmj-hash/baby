/* ============================================================
   audio.js — 효과음. 음원 파일 없이 WebAudio 로 합성한다.
   (오프라인 PWA 용량을 0 으로 유지하기 위한 선택)

   두 종류가 있다.
     · 짧은 신호음  tone() / hiss()  — 눌렀다, 됐다, 다 했다
     · 이어지는 소리 voice()         — 펜이 닿아 있는 동안 계속 난다.
       크레용은 사각거리고 붓은 스미고 마커는 뽀득거린다. 이게 있으면
       "지금 내가 그리고 있다" 가 손끝 말고 귀로도 전해진다.

   잡음(noise)은 붓·지우개·연필 소리의 재료다. 사인파만으로는 절대
   사각거리는 소리가 안 나온다. 2초짜리 백색잡음을 한 번 만들어 돌려 쓴다.

   iOS 는 사용자 제스처 없이는 소리를 못 내므로 첫 터치에서 unlock().
   소리가 커서 겹치면 거슬리므로 master 게인으로 한 번 눌러 둔다.
   ============================================================ */

const AC = window.AudioContext || window.webkitAudioContext;
let ctx = null, master = null, noiseBuf = null;
let muted = localStorage.getItem('sfx') === 'off';

function ac() {
  if (!ctx && AC) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
  }
  // iOS 는 전화·시리·백그라운드 뒤에 'interrupted' 라는 비표준 상태로
  // 멈춰 있기도 한다 — 'suspended' 만 보면 영영 안 깨어난다.
  if (ctx && ctx.state !== 'running') ctx.resume();
  return ctx;
}

function noise(a) {
  if (noiseBuf) return noiseBuf;
  const n = Math.floor(a.sampleRate * 2);
  noiseBuf = a.createBuffer(1, n, a.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

/* ── iOS 좀비 세션 되살리기 ──────────────────────────────
   TTS·시리·전화가 오디오 세션을 바꿔 놓으면 AudioContext 가
   running 이라면서도 하드웨어로는 안 나간다 (아이패드 실측:
   출력 레벨은 뛰는데 스피커는 무음). <audio> 로 무음 파일을
   제스처에서 틀면 세션이 '재생' 등급으로 올라가 되살아난다
   (unmute.js 기법). 무음이라 들리는 건 없다. */
let kickEl = null;

/* 무음 WAV 를 그 자리에서 합성해 blob 으로 문다.
   파일로 두면 안 되는 이유: iOS 의 <audio> 는 서버가 Range(206)를
   지원하지 않으면 재생을 거부한다 (오류 4) — 개발용 단순 서버에서
   아이패드만 무음 킥이 통째로 죽었다. blob 은 HTTP 를 안 탄다. */
function silenceURL() {
  const sr = 8000, n = sr / 4, size = 44 + n * 2;   // 0.25초 무음
  const b = new DataView(new ArrayBuffer(size));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) b.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); b.setUint32(4, size - 8, true); w(8, 'WAVE');
  w(12, 'fmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
  b.setUint32(24, sr, true); b.setUint32(28, sr * 2, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true);
  w(36, 'data'); b.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([b.buffer], { type: 'audio/wav' }));
}

let kickStarted = false;
function sessionKick() {
  try {
    if (!kickEl) {
      kickEl = new Audio(silenceURL());
      kickEl.loop = true;
      kickEl.setAttribute('playsinline', '');
      // 킥이 '처음으로' 실제 재생되는 순간: 그 전에 만들어진 컨텍스트는
      // 오염된 세션에서 태어나 킥이 돌아도 무음일 수 있다 — 새로 판다.
      // (pointerdown 은 재생 제스처가 아니라서, 첫 획을 긋는 동안 만들어진
      // 컨텍스트가 정확히 이 처지가 된다.)
      kickEl.addEventListener('playing', () => {
        if (kickStarted) return;
        kickStarted = true;
        if (ctx) resetAudio();
      });
    }
    if (kickEl.paused) kickEl.play().catch(() => { /* 제스처 밖이면 다음 기회에 */ });
  } catch { /* Audio 없는 환경 */ }
}

/* 킥을 먼저 틀고 컨텍스트를 만든다 — 세션이 오염된 채로 만든
   컨텍스트는 샘플레이트(24kHz)까지 물려받아 계속 이상하다. */
export function unlock() { sessionKick(); ac(); }

/* 킥은 '진짜 제스처'(click·touchend·pointerup)에서만 재생이 허용된다 —
   구형 iPadOS 는 pointerdown 을 미디어 재생 제스처로 안 쳐 준다.
   (진단 페이지의 click 버튼에선 나는데 앱에선 무음이던 원인.)
   그래서 화면 아무 데나 탭할 때마다 킥이 살아 있는지 확인한다.
   킥이 이미 돌고 있으면 paused 검사 한 번이라 비용은 없다. */
if (typeof window !== 'undefined') {
  for (const ev of ['click', 'touchend', 'pointerup'])
    window.addEventListener(ev, () => unlock(), { capture: true, passive: true });
}

/** 진단·구급용: 컨텍스트를 버리고 새로 만든다 (좀비 세션 탈출) */
export function resetAudio() {
  try { ctx && ctx.close(); } catch { /* 이미 닫혔다 */ }
  ctx = null; master = null; noiseBuf = null; sinkEl = null;
  clipBufs.clear();
  unlock();
}

/* ── 최후 우회로: WebAudio 출력을 <audio> 로 돌린다 ─────────
   기기에 따라 WebAudio 의 destination 만 죽고 <audio> 재생은
   멀쩡한 경우가 있다. master 를 MediaStream 으로 뽑아 <audio>
   에 물리면 효과음이 미디어 재생 통로로 나간다. */
let sinkEl = null;
export function enableSink() {
  const a = ac();
  if (!a) return false;
  if (sinkEl) return true;
  try {
    const d = a.createMediaStreamDestination();
    master.disconnect();
    master.connect(d);
    sinkEl = new Audio();
    sinkEl.srcObject = d.stream;
    sinkEl.setAttribute('playsinline', '');
    sinkEl.play().catch(() => { /* 제스처 밖 */ });
    return true;
  } catch { return false; }
}
export function setMuted(v) { muted = v; localStorage.setItem('sfx', v ? 'off' : 'on'); }
export function isMuted() { return muted; }

/** 음 하나. to 를 주면 그 높이로 미끄러진다 */
function tone(freq, dur, type = 'sine', gain = 0.14, delay = 0, to = 0) {
  const a = ac();
  if (!a || muted) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

/** 잡음 한 조각. 사각거림·스침·문지름의 재료 */
function hiss(dur, { gain = 0.06, freq = 2000, q = 0.8, type = 'bandpass', delay = 0, to = 0 } = {}) {
  const a = ac();
  if (!a || muted) return;
  const t0 = a.currentTime + delay;
  const s = a.createBufferSource();
  s.buffer = noise(a); s.loop = true;
  const f = a.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (to) f.frequency.exponentialRampToValueAtTime(Math.max(60, to), t0 + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t0); s.stop(t0 + dur + 0.02);
}

const seq = (notes, dur, type, gain, gap) =>
  notes.forEach((f, i) => tone(f, dur, type, gain, i * gap));

/* ── 이어지는 소리 (펜이 닿아 있는 동안) ────────────────────
   도구마다 재료가 다르다. noise = 사각거림, tone = 뽀득/미끄러짐.
   wobble 은 긋는 속도에 따라 음색이 얼마나 움직이는지. */
const VOICES = {
  crayon:  { src: 'noise', filter: 'bandpass', freq: 1250, q: 0.8, gain: 0.075, wobble: 450 },
  pencil:  { src: 'noise', filter: 'highpass', freq: 3000, q: 0.7, gain: 0.050, wobble: 900 },
  brush:   { src: 'noise', filter: 'lowpass',  freq: 850,  q: 1.0, gain: 0.065, wobble: 300 },
  marker:  { src: 'tone',  type: 'sine',       freq: 215,  gain: 0.055, wobble: 30 },
  rainbow: { src: 'tone',  type: 'triangle',   freq: 330,  gain: 0.045, wobble: 190 },
  glitter: { src: 'noise', filter: 'highpass', freq: 5200, q: 0.6, gain: 0.040, wobble: 1400 },
  flower:  { src: 'noise', filter: 'bandpass', freq: 1800, q: 1.4, gain: 0.035, wobble: 500 },
  eraser:  { src: 'noise', filter: 'bandpass', freq: 620,  q: 0.5, gain: 0.070, wobble: 220 },

  write:   { src: 'noise', filter: 'bandpass', freq: 2700, q: 1.1, gain: 0.045, wobble: 800 },
  slide:   { src: 'noise', filter: 'lowpass',  freq: 1100, q: 0.7, gain: 0.040, wobble: 600 },
  scurry:  { src: 'noise', filter: 'bandpass', freq: 900,  q: 2.0, gain: 0.045, wobble: 350 }
};

const SILENT = { move() {}, stop() {} };

/**
 * 펜이 닿는 동안 계속 나는 소리를 하나 연다.
 * @param name VOICES 의 키
 * @returns {{move:(speed:number,pressure:number)=>void, stop:()=>void}}
 */
export function voice(name) {
  const a = ac();
  const spec = VOICES[name];
  if (!a || muted || !spec) return SILENT;

  const g = a.createGain();
  g.gain.value = 0.0001;
  g.connect(master);

  let src, tuned;
  if (spec.src === 'noise') {
    src = a.createBufferSource();
    src.buffer = noise(a); src.loop = true;
    const f = a.createBiquadFilter();
    f.type = spec.filter; f.Q.value = spec.q; f.frequency.value = spec.freq;
    src.connect(f); f.connect(g);
    tuned = f.frequency;
  } else {
    src = a.createOscillator();
    src.type = spec.type; src.frequency.value = spec.freq;
    src.connect(g);
    tuned = src.frequency;
  }
  try { src.start(); } catch { return SILENT; }

  let alive = true;
  return {
    /** @param speed 0~1 로 정규화한 긋는 속도 @param pressure 필압 0~1 */
    move(speed = 0.5, pressure = 0.6) {
      if (!alive) return;
      try {
        const t = a.currentTime;
        const s = Math.min(1, Math.max(0, speed));
        const lvl = spec.gain * (0.22 + 0.78 * s) * (0.55 + 0.45 * pressure);
        g.gain.setTargetAtTime(Math.max(0.0001, lvl), t, 0.03);
        tuned.setTargetAtTime(Math.max(60, spec.freq + spec.wobble * (s - 0.5)), t, 0.05);
      } catch { alive = false; /* 획 도중 resetAudio 로 컨텍스트가 닫혔다 */ }
    },
    stop() {
      if (!alive) return;
      alive = false;
      try {
        const t = a.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setTargetAtTime(0.0001, t, 0.035);
        src.stop(t + 0.3);
      } catch { /* 이미 멈췄거나 컨텍스트가 닫혔다 */ }
    }
  };
}

/* ── 도구를 고를 때: 그 도구가 무엇인지 소리로 알린다 ─────── */
const TOOL = {
  crayon:  () => { hiss(0.13, { gain: .07, freq: 1300, to: 700 }); tone(185, .10, 'square', .05); },
  pencil:  () => { hiss(0.09, { gain: .05, freq: 3200, q: 1.3 }); tone(920, .05, 'triangle', .05); },
  brush:   () => hiss(0.24, { gain: .06, freq: 500, to: 1700, type: 'lowpass', q: 1 }),
  marker:  () => tone(300, .13, 'sine', .09, 0, 430),
  rainbow: () => seq([523, 659, 784, 988], .12, 'triangle', .07, .045),
  glitter: () => seq([1568, 2093, 2637], .16, 'sine', .06, .05),
  flower:  () => { tone(700, .08, 'sine', .08, 0, 1200); tone(1050, .10, 'sine', .05, .06); },
  fill:    () => { tone(280, .15, 'sine', .12, 0, 540); hiss(.20, { gain: .04, freq: 700, to: 2200 }); },
  sticker: () => { tone(660, .07, 'triangle', .09, 0, 990); tone(1320, .09, 'triangle', .06, .05); },
  eraser:  () => hiss(0.18, { gain: .07, freq: 620, q: .5 })
};

/* ── 활동별 진행·완료 소리 ─────────────────────────────────
   3~6세 UX 원칙: 틀렸다는 소리는 만들지 않는다. 잘 가고 있을 때만 울린다. */
const STEP = {
  trace:  (p) => tone(480 + 620 * p, .05, 'triangle', .05),          // 갈수록 높아진다
  hangul: () => hiss(.04, { gain: .03, freq: 2700, q: 1.4 }),        // 사각사각 쓰는 소리
  number: () => hiss(.04, { gain: .03, freq: 2700, q: 1.4 }),
  english:() => hiss(.04, { gain: .03, freq: 2700, q: 1.4 }),
  names:  () => hiss(.04, { gain: .03, freq: 2700, q: 1.4 }),
  maze:   () => hiss(.05, { gain: .045, freq: 420, q: 3.5 }),        // 또각또각 발소리
  dots:   () => {}                                                    // 점에 닿을 때만 운다
};

const CHEER = {
  trace:  () => seq([523, 659, 784, 1047, 1319], .22, 'triangle', .10, .07),
  hangul: () => { seq([784, 988, 1175], .26, 'sine', .10, .06); tone(392, .5, 'triangle', .06, .02); },
  number: () => { seq([784, 988, 1175], .26, 'sine', .10, .06); tone(392, .5, 'triangle', .06, .02); },
  english:() => { seq([784, 988, 1175], .26, 'sine', .10, .06); tone(392, .5, 'triangle', .06, .02); },
  names:  () => { seq([659, 831, 988, 1319], .28, 'sine', .10, .07); tone(330, .5, 'triangle', .06, .02); },
  maze:   () => { tone(300, .10, 'square', .07, 0, 480);              // 치즈에 도착!
                  seq([659, 880, 1047], .24, 'triangle', .10, .08); },
  dots:   () => { hiss(.35, { gain: .05, freq: 900, to: 5000, type: 'bandpass', q: .6 });
                  seq([1047, 1319, 1568, 2093], .28, 'sine', .08, .06); },
  puzzle: () => { seq([659, 831, 988, 1319], .30, 'sine', .09, .075);
                  tone(330, .55, 'triangle', .05, .04); },
  spot:   () => { hiss(.3, { gain: .05, freq: 1200, to: 6000, type: 'bandpass', q: .7 });
                  seq([880, 1109, 1319, 1760], .26, 'triangle', .09, .07); },
  count:  () => { seq([523, 659, 784, 1047], .24, 'triangle', .10, .08);
                  tone(262, .5, 'sine', .06, .05); }
};

/* ── 읽어 주기 ────────────────────────────────────────────
   글자·숫자를 다 쓰면 이름을 읽어 준다. 음원 파일 없이 기기 내장
   TTS(speechSynthesis)를 쓴다 — iOS 에 한국어·영어 목소리가 있다.
   음소거(🔊)를 켜면 이것도 조용해진다. */
/* ── 음성 팩 ─────────────────────────────────────────────
   assets/voice/ 에 미리 만든 클립(m4a·wav)이 있으면 TTS 대신 재생한다.
   tools/make-voice.mjs 가 유나 음성으로 전부 만들어 두고, 더 좋은
   음성으로 바꾸려면 TTS 사이트에서 받은 파일을 assets/voice-src/ 에
   문구 이름으로 넣고 생성기를 다시 돌리면 된다.
   클립 재생은 WebAudio 라 iOS TTS 의 터치 제약도 받지 않는다. */
let pack = null;
fetch(new URL('../../assets/voice/manifest.json', import.meta.url))
  .then(r => (r.ok ? r.json() : null))
  .then(m => { pack = m; })
  .catch(() => { /* 팩이 없으면 TTS 만 쓴다 */ });
const clipBufs = new Map();
let clipPlaying = null;

async function playClip(file) {
  const a = ac();
  if (!a) return false;
  try {
    let buf = clipBufs.get(file);
    if (!buf) {
      const res = await fetch(new URL('../../assets/voice/' + file, import.meta.url));
      if (!res.ok) return false;
      buf = await a.decodeAudioData(await res.arrayBuffer());
      clipBufs.set(file, buf);
    }
    try { clipPlaying?.stop(); } catch { /* 이미 끝났다 */ }
    const src = a.createBufferSource();
    src.buffer = buf;
    src.connect(master);
    src.start();
    clipPlaying = src;
    return true;
  } catch { return false; }
}

let lastUtter = null;      // iOS 는 utterance 를 붙잡아 두지 않으면 GC 돼서 소리가 안 난다

/* ── 제일 좋은 목소리 고르기 ─────────────────────────────────
   lang 만 주면 iOS 가 압축(기계음) 음성을 쓴다. 기기에 향상/프리미엄
   음성이 설치돼 있으면 그걸 고른다 (설정 → 손쉬운 사용 → 콘텐츠 말하기
   → 음성 → 한국어에서 다운로드). 목록은 늦게 채워지므로 캐시하고
   voiceschanged 에서 비운다. */
const voiceCache = new Map();
try {
  speechSynthesis.addEventListener?.('voiceschanged', () => voiceCache.clear());
} catch { /* speechSynthesis 없는 환경 */ }

function bestVoice(lang) {
  if (voiceCache.has(lang)) return voiceCache.get(lang);
  let pick = null;
  try {
    const pre = lang.slice(0, 2).toLowerCase();
    const cands = speechSynthesis.getVoices()
      .filter(v => (v.lang || '').replace('_', '-').toLowerCase().startsWith(pre))
      // iOS 는 Siri 음성을 목록에 주지만 Web Speech 로 쓰면 소리 없이
      // 삼켜진다 (알려진 버그) — 절대 고르면 안 된다.
      .filter(v => !/siri|시리/i.test(v.name));
    const score = (v) => {
      const n = v.name.toLowerCase();
      return (/premium|프리미엄/.test(n) ? 40 : 0) +
             (/enhanced|향상/.test(n) ? 30 : 0) +
             (/yuna|유나|seoyeon|서연|samantha/.test(n) ? 5 : 0) +
             (v.localService ? 2 : 0);
    };
    cands.sort((x, y) => score(y) - score(x));
    pick = cands[0] ?? null;
  } catch { /* 무시 */ }
  if (pick) voiceCache.set(lang, pick);   // 빈 목록일 땐 캐시하지 않는다 (늦게 채워짐)
  return pick;
}

/** 진단용: 지금 이 언어로 말하면 어떤 목소리가 쓰이는지 */
export function voiceInfo(lang = 'ko-KR') {
  const v = bestVoice(lang);
  return v ? v.name : '(기본)';
}

/** 진단용: master 출력에 붙인 분석기 — 화면에 레벨 미터를 그릴 때 쓴다.
    미터가 움직이는데 안 들리면 기기 쪽(무음 모드·볼륨), 안 움직이면 코드 쪽. */
export function analyser() {
  const a = ac();
  if (!a) return null;
  const an = a.createAnalyser();
  an.fftSize = 256;
  master.connect(an);
  return an;
}

/** 진단용: 오디오 상태 요약 */
export function audioState() {
  return {
    컨텍스트: ctx ? ctx.state : '아직 안 만듦',
    샘플레이트: ctx ? ctx.sampleRate : 0,        // 44100/48000 정상 · 24000 은 세션 오염
    음소거: muted,
    팩: pack ? Object.keys(pack).length + '문구' : '없음(로딩 중이거나 실패)',
    킥: kickEl
      ? (kickEl.error ? '오류 ' + kickEl.error.code
         : kickEl.paused ? '멈춤' : '재생 중 ' + kickEl.currentTime.toFixed(1) + 's')
      : '아직',
    싱크: sinkEl ? (sinkEl.paused ? '멈춤' : '켜짐') : '꺼짐'
  };
}

/* 아이패드에서 안 읽히는 문제를 쫓으며 배운 것: 꾸미지 말 것.
   cancel·rate·pitch·suspend 같은 손질이 하나씩 iOS 의 함정을 밟았다.
   (suspend 는 오디오 세션을 끊어 TTS 까지 죽이고, cancel 직후 speak 는
   삼켜지고, 빈 발화 잠금 해제는 큐를 어지럽혔다.)
   진단 페이지에서 검증된 "resume + speak" 그대로만 쓴다. */
export function say(text, lang = 'ko-KR') {
  if (muted) return;
  const file = pack?.[lang + '|' + text];
  if (file) {                                  // 클립 우선, 실패하면 TTS 로
    playClip(file).then(ok => { if (!ok) ttsSay(text, lang); });
    return;
  }
  ttsSay(text, lang);
}

function ttsSay(text, lang) {
  if (muted || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const v = bestVoice(lang);
    if (v) u.voice = v;                        // 향상/프리미엄 음성이 있으면 그걸로
    lastUtter = u;
    speechSynthesis.resume();
    speechSynthesis.speak(u);
  } catch { /* 목소리가 없는 기기면 조용히 넘어간다 */ }
}

export const sfx = {
  tap:     () => tone(660, 0.07, 'triangle', 0.10),
  undo:    () => tone(340, 0.10, 'square', 0.06),
  save:    () => seq([523, 659, 784, 1047], 0.20, 'sine', 0.11, 0.09),
  clear:   () => { tone(420, 0.18, 'sawtooth', 0.05); tone(210, 0.26, 'sine', 0.08, 0.08); },

  /** 도구를 고를 때. 없는 이름이면 그냥 딸깍 */
  tool:    (id) => (TOOL[id] || sfx.tap)(),
  fill:    () => TOOL.fill(),
  sticker: () => TOOL.sticker(),

  /** 따라 그리기류: 진행 중 / 획 하나 완성 / 점 하나 도착 / 단계 완성 */
  step:    (ratio = 0, course = 'trace') =>
             (STEP[course] || STEP.trace)(Math.min(1, Math.max(0, ratio))),
  strokeDone: (i = 0, n = 1) => tone(587 * Math.pow(2, i / Math.max(1, n) / 2), .16, 'sine', .09),
  dot:     (i = 0, n = 1) => {                                        // 점마다 한 음씩 올라간다
             const scale = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];
             tone(scale[Math.min(scale.length - 1, i)], .18, 'sine', .10);
             tone(scale[Math.min(scale.length - 1, i)] * 2, .10, 'triangle', .04, .01);
           },
  cheer:   (course = 'trace') => (CHEER[course] || CHEER.trace)(),

  /** 짝·조각을 하나 맞췄다 — 맞출수록 한 음씩 올라간다 */
  pair:    (i = 0, n = 1) => {
             const scale = [523, 659, 784, 880, 1047, 1175, 1319];
             const f = scale[Math.min(scale.length - 1, i)];
             tone(f, .16, 'sine', .10);
             tone(f * 1.5, .12, 'triangle', .05, .05);
           },

  /** 짝이 아니다 — "틀렸다" 가 아니라 "아직이야" 정도의 중립음.
      3~6세 UX 원칙상 벌주는 소리는 만들지 않는다. 낮고 짧고 부드럽게. */
  again:   () => tone(300, .09, 'sine', .045)
};
