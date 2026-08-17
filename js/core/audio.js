/* ============================================================
   audio.js — 효과음. 음원 파일 없이 WebAudio 로 합성한다.
   (오프라인 PWA 용량을 0 으로 유지하기 위한 선택)

   iOS 는 사용자 제스처 없이는 소리를 못 내므로 첫 터치에서 unlock().
   ============================================================ */

let ctx = null;
let muted = localStorage.getItem('sfx') === 'off';

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlock() { ac(); }
export function setMuted(v) { muted = v; localStorage.setItem('sfx', v ? 'off' : 'on'); }
export function isMuted() { return muted; }

function tone(freq, dur, type = 'sine', gain = 0.14, delay = 0) {
  const a = ac();
  if (!a || muted) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

export const sfx = {
  tap:    () => tone(660, 0.07, 'triangle', 0.10),
  tool:   () => { tone(520, 0.07, 'triangle', 0.11); tone(780, 0.09, 'triangle', 0.09, 0.05); },
  fill:   () => { tone(300, 0.10, 'sine', 0.16); tone(600, 0.16, 'sine', 0.10, 0.06); },
  undo:   () => tone(340, 0.10, 'square', 0.06),
  sticker:() => { tone(880, 0.06, 'triangle', 0.10); tone(1320, 0.08, 'triangle', 0.08, 0.04); },
  save:   () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.20, 'sine', 0.11, i * 0.09)),
  clear:  () => { tone(420, 0.18, 'sawtooth', 0.05); tone(210, 0.26, 'sine', 0.08, 0.08); }
};
