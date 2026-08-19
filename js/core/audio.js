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
  if (ctx && ctx.state === 'suspended') ctx.resume();
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

export function unlock() { ac(); }
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
      const t = a.currentTime;
      const s = Math.min(1, Math.max(0, speed));
      const lvl = spec.gain * (0.22 + 0.78 * s) * (0.55 + 0.45 * pressure);
      g.gain.setTargetAtTime(Math.max(0.0001, lvl), t, 0.03);
      tuned.setTargetAtTime(Math.max(60, spec.freq + spec.wobble * (s - 0.5)), t, 0.05);
    },
    stop() {
      if (!alive) return;
      alive = false;
      const t = a.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0.0001, t, 0.035);
      try { src.stop(t + 0.3); } catch { /* 이미 멈췄다 */ }
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
  maze:   () => hiss(.05, { gain: .045, freq: 420, q: 3.5 }),        // 또각또각 발소리
  dots:   () => {}                                                    // 점에 닿을 때만 운다
};

const CHEER = {
  trace:  () => seq([523, 659, 784, 1047, 1319], .22, 'triangle', .10, .07),
  hangul: () => { seq([784, 988, 1175], .26, 'sine', .10, .06); tone(392, .5, 'triangle', .06, .02); },
  number: () => { seq([784, 988, 1175], .26, 'sine', .10, .06); tone(392, .5, 'triangle', .06, .02); },
  maze:   () => { tone(300, .10, 'square', .07, 0, 480);              // 치즈에 도착!
                  seq([659, 880, 1047], .24, 'triangle', .10, .08); },
  dots:   () => { hiss(.35, { gain: .05, freq: 900, to: 5000, type: 'bandpass', q: .6 });
                  seq([1047, 1319, 1568, 2093], .28, 'sine', .08, .06); },
  match:  () => { seq([659, 831, 988, 1319], .30, 'sine', .09, .075);
                  tone(330, .55, 'triangle', .05, .04); },
  spot:   () => { hiss(.3, { gain: .05, freq: 1200, to: 6000, type: 'bandpass', q: .7 });
                  seq([880, 1109, 1319, 1760], .26, 'triangle', .09, .07); }
};

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

  /** 짝을 하나 맞췄다 — 맞출수록 한 음씩 올라간다 */
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
