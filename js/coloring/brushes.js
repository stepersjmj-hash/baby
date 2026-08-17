/* ============================================================
   brushes.js — 붓 종류별 그리기 로직
   ------------------------------------------------------------
   각 스트로크는 별도의 stroke 레이어에 그린 뒤, 획이 끝날 때
   alpha / blend 로 paint 레이어에 한 번에 합성된다.
   → 마커처럼 반투명한 도구가 한 획 안에서 겹쳐 진해지는 문제가 없다.

   direct:true 인 도구(지우개)만 paint 레이어에 바로 그린다.

   seg(ctx, a, b, st) 규약
     a,b : 직전/현재 점. {x, y, p(필압 0~1), w(계산된 굵기 px)}
     st  : 이 획 전용 상태 { color, rnd(), seed, base, ... }
           난수는 반드시 st.rnd() 로 — 시드가 저장돼 있어서
           되돌리기 후 다시 그려도 질감이 똑같이 재현된다.
   ============================================================ */

const line = (ctx, a, b, w) => {
  ctx.lineWidth = Math.max(0.6, w);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
};

const FLOWERS = ['🌸', '🌼', '🌺', '🌷', '🍀', '🌻', '💐'];

export function stampText(ctx, ch, x, y, size, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, 0, 0);
  ctx.restore();
}

export const BRUSHES = {

  /* 크레용 — 왁스 질감. 옆으로 번지는 결이 핵심 */
  crayon: {
    id: 'crayon', label: '크레용', ico: '🖍️',
    alpha: 1, blend: 'source-over', width: [0.55, 1.30], step: 1.4,
    seg(ctx, a, b, st) {
      const w = b.w;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = st.color;
      ctx.globalAlpha = 0.5;
      line(ctx, a, b, w * 0.92);

      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const n = Math.min(9, Math.max(3, Math.round(w / 3)));
      ctx.globalAlpha = 0.14;
      for (let i = 0; i < n; i++) {
        const o = (st.rnd() - 0.5) * w * 1.05;
        const t = w * (0.05 + st.rnd() * 0.13);
        line(ctx, { x: a.x + nx * o, y: a.y + ny * o },
                  { x: b.x + nx * o, y: b.y + ny * o }, t);
      }
      ctx.globalAlpha = 1;
    }
  },

  /* 색연필 — 가늘고 단단하며 겹칠수록 진해진다 */
  pencil: {
    id: 'pencil', label: '색연필', ico: '✏️',
    alpha: 0.92, blend: 'source-over', width: [0.18, 0.45], step: 1.0,
    seg(ctx, a, b, st) {
      const w = b.w;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = st.color;
      ctx.globalAlpha = 0.55;
      line(ctx, a, b, w);
      ctx.globalAlpha = 0.22;
      const j = w * 0.6;
      line(ctx, { x: a.x + (st.rnd() - .5) * j, y: a.y + (st.rnd() - .5) * j },
                { x: b.x + (st.rnd() - .5) * j, y: b.y + (st.rnd() - .5) * j }, w * 0.7);
      ctx.globalAlpha = 1;
    }
  },

  /* 붓 — 부드러운 가장자리, 필압에 따른 굵기 변화가 가장 크다 */
  brush: {
    id: 'brush', label: '붓', ico: '🖌️',
    alpha: 0.95, blend: 'source-over', width: [0.30, 1.85], step: 1.2,
    seg(ctx, a, b, st) {
      const w = b.w;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = st.color;
      ctx.globalAlpha = 0.16; line(ctx, a, b, w * 1.45);
      ctx.globalAlpha = 0.32; line(ctx, a, b, w * 1.10);
      ctx.globalAlpha = 0.85; line(ctx, a, b, w * 0.80);
      ctx.globalAlpha = 1;
    }
  },

  /* 마커 — 굵기 일정, 아래 색과 곱해져 형광펜처럼 보인다 */
  marker: {
    id: 'marker', label: '마커', ico: '🖊️',
    alpha: 0.72, blend: 'multiply', width: [0.85, 1.0], step: 1.2,
    seg(ctx, a, b, st) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = st.color;
      ctx.globalAlpha = 1;
      line(ctx, a, b, b.w);
    }
  },

  /* 무지개 — 그리는 동안 색이 흘러간다 */
  rainbow: {
    id: 'rainbow', label: '무지개', ico: '🌈',
    alpha: 1, blend: 'source-over', width: [0.5, 1.4], step: 1.2,
    init(st) { st.hue = st.seed % 360; },
    seg(ctx, a, b, st) {
      st.hue = (st.hue + 2.4) % 360;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = `hsl(${st.hue} 92% 58%)`;
      line(ctx, a, b, b.w);
      ctx.globalAlpha = 1;
    }
  },

  /* 반짝이 — 알갱이가 흩뿌려진다 */
  glitter: {
    id: 'glitter', label: '반짝이', ico: '✨',
    alpha: 1, blend: 'source-over', width: [0.6, 1.6], step: 2.2,
    init(st) { st.hue = st.seed % 360; },
    seg(ctx, a, b, st) {
      const w = b.w, r = st.rnd;
      const n = Math.max(3, Math.round(w / 4));
      for (let i = 0; i < n; i++) {
        const t = r();
        const x = a.x + (b.x - a.x) * t + (r() - 0.5) * w * 1.6;
        const y = a.y + (b.y - a.y) * t + (r() - 0.5) * w * 1.6;
        const s = w * (0.06 + r() * 0.16);
        ctx.globalAlpha = 0.45 + r() * 0.55;
        ctx.fillStyle = r() < 0.35 ? `hsl(${(st.hue + r() * 60) % 360} 95% 72%)` : st.color;
        ctx.beginPath(); ctx.arc(x, y, s, 0, 6.283); ctx.fill();
      }
      if (r() < 0.18) {                       // 가끔 반짝 별 하나
        const s = w * 0.5;
        ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff';
        ctx.save(); ctx.translate(b.x, b.y);
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          ctx.rotate(Math.PI / 2);
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(s * .2, s * .2, 0, s);
          ctx.quadraticCurveTo(-s * .2, s * .2, 0, 0);
        }
        ctx.fill(); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  },

  /* 꽃 도장 — 첨부 사진의 꽃무늬 채우기. 색 대신 꽃이 찍힌다 */
  flower: {
    id: 'flower', label: '꽃', ico: '🌸',
    alpha: 1, blend: 'source-over', width: [0.9, 1.9], step: 0.8,
    init(st) { st.dist = 1e9; st.i = Math.floor(st.seed % FLOWERS.length); },
    seg(ctx, a, b, st) {
      const r = st.rnd;
      st.dist += Math.hypot(b.x - a.x, b.y - a.y);
      const gap = Math.max(4, b.w * 0.62);
      let guard = 0;
      while (st.dist >= gap && guard++ < 40) {
        st.dist -= gap;
        const ch = FLOWERS[(st.i++) % FLOWERS.length];
        stampText(ctx, ch,
          b.x + (r() - 0.5) * b.w * 0.9,
          b.y + (r() - 0.5) * b.w * 0.9,
          b.w * (0.7 + r() * 0.6), r() * 6.283);
      }
      if (guard >= 40) st.dist = 0;
    }
  },

  /* 지우개 — paint 레이어에서 직접 지운다 */
  eraser: {
    id: 'eraser', label: '지우개', ico: '🧽',
    alpha: 1, blend: 'destination-out', direct: true,
    width: [0.9, 1.6], step: 1.2,
    seg(ctx, a, b) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000'; ctx.globalAlpha = 1;
      line(ctx, a, b, b.w);
      ctx.restore();
    }
  }
};

/** 도구 트레이 순서. fill / sticker 는 그리기 도구가 아니라 탭 도구다 */
export const TOOL_ORDER = [
  'crayon', 'pencil', 'brush', 'marker', 'rainbow', 'glitter', 'flower',
  'fill', 'sticker', 'eraser'
];

export const SPECIAL = {
  fill:    { id: 'fill',    label: '물감통', ico: '🪣' },
  sticker: { id: 'sticker', label: '스티커', ico: '⭐' }
};

export const STICKERS = [
  '⭐','🌟','❤️','🌈','☁️','☀️','🌙','⚡','🍓','🍎','🍌','🍇',
  '🐝','🦋','🐞','🐣','🐶','🐱','🐰','🐸','🐳','🦄',
  '🎈','🎀','🎁','🍰','🍭','🚗','✈️','🚀','⚽','🌸'
];
