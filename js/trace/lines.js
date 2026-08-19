/* ============================================================
   trace/lines.js — 선 긋기 코스 (12 기본 + 10 심화)
   ------------------------------------------------------------
   좌표계는 1000×700 (core/trace.js 의 VIEW). 작업 영역은 여백을 두고
   x 140~860, y 130~570 안에서 논다.

   한 단계 = { id, name, ico, from, to, strokes[] }
     strokes : t(0~1) → {x,y} 함수 목록. 여러 개면 획순대로 그려야 한다.
     from/to : 출발점을 타고 가는 그림, 도착점에서 기다리는 그림.
               글자를 못 읽는 나이라 "무엇을 어디로" 를 그림으로 알린다.
     tol     : (선택) 허용 오차. 경로가 자기 자신에 가까워지는 단계만 줄인다.

   쉬운 것부터 어려운 것으로 정렬한다 — 직선 → 곡선 → 꺾은선 → 도형.
   ============================================================ */

import { poly, arc } from '../core/trace.js';

const PI = Math.PI;

export const LINES = [
  {
    id: 'h', name: '가로줄', ico: '➡️', from: '🐝', to: '🌻',
    strokes: [poly([[150, 350], [850, 350]])]
  },
  {
    id: 'v', name: '세로줄', ico: '⬇️', from: '☁️', to: '🌱',
    strokes: [poly([[500, 130], [500, 570]])]
  },
  {
    id: 'd', name: '비스듬', ico: '↘️', from: '🐦', to: '🌳',
    strokes: [poly([[170, 160], [830, 550]])]
  },
  {
    id: 'arch', name: '무지개', ico: '🌈', from: '🐰', to: '🥕',
    strokes: [t => ({ x: 150 + 700 * t, y: 560 - Math.sin(Math.PI * t) * 330 })]
  },
  {
    id: 'wave', name: '물결', ico: '〰️', from: '🐟', to: '🫧',
    strokes: [t => ({ x: 150 + 700 * t, y: 350 - Math.sin(t * Math.PI * 4) * 115 })]
  },
  {
    id: 'zig', name: '지그재그', ico: '⚡', from: '🐿️', to: '🌰',
    strokes: [poly([[160, 170], [276, 530], [393, 170], [510, 530],
                    [626, 170], [743, 530], [860, 170]])]
  },
  {
    id: 'steps', name: '계단', ico: '🪜', from: '🐜', to: '🍯',
    strokes: [poly([[170, 560], [170, 460], [310, 460], [310, 360], [450, 360],
                    [450, 260], [590, 260], [590, 160], [830, 160]])]
  },
  {
    id: 'cross', name: '십자', ico: '➕', from: '✏️', to: '⭐',
    strokes: [poly([[160, 350], [840, 350]]),          // 1획 가로
              poly([[500, 130], [500, 570]])]          // 2획 세로
  },
  {
    id: 'circle', name: '동그라미', ico: '⭕', from: '🐛', to: '🍎',
    strokes: [t => {                                    // 맨 위에서 시계 방향
      const a = -Math.PI / 2 + t * Math.PI * 2;
      return { x: 500 + Math.cos(a) * 215, y: 350 + Math.sin(a) * 215 };
    }]
  },
  {
    id: 'square', name: '네모', ico: '⬜', from: '🚗', to: '🏁',
    strokes: [poly([[290, 150], [710, 150], [710, 550], [290, 550], [290, 150]])]
  },
  {
    id: 'tri', name: '세모', ico: '🔺', from: '🐧', to: '🐟',
    strokes: [poly([[500, 140], [830, 555], [170, 555], [500, 140]])]
  },
  {
    id: 'spiral', name: '나선', ico: '🌀', from: '🐌', to: '🍃', tol: 38,
    strokes: [t => {                                    // 가운데서 밖으로 두 바퀴
      const a = -Math.PI / 2 + t * Math.PI * 4;
      const r = 70 + 210 * t;
      return { x: 500 + Math.cos(a) * r, y: 350 + Math.sin(a) * r };
    }]
  },

  /* ── 여기서부터 어려운 단계 ──────────────────────────────
     경로가 자기 자신과 가까워지는 모양이 많아 tol 을 각자 조인다.
     물결·지그재그처럼 반복이 촘촘한 모양은 반복 간격이 진행률로
     lookahead(16%)보다 멀어야 질러가기가 안 된다 — 새로 넣을 땐
     selftest-trace 의 질러가기 검사를 꼭 확인할 것. */
  {
    // 반복 곡선은 이웃 교차점이 진행률로 lookahead(16%)보다 멀어야 한다.
    // 5반주기(간격 20%)는 tol 여유까지 더하면 아슬아슬하게 닿아서 2주기로 줄였다.
    id: 'wave2', name: '큰 물결', ico: '🌊', from: '⛵', to: '🏝️',
    strokes: [t => ({ x: 150 + 700 * t, y: 355 - Math.sin(t * PI * 4) * 170 })]
  },
  {
    id: 'snake', name: '뱀길', ico: '🐍', from: '🐍', to: '🐸',
    strokes: [poly([[160, 165], [840, 165], [840, 315], [160, 315],
                    [160, 465], [840, 465], [840, 565], [500, 565]])]
  },
  {
    id: 'bolt', name: '번개', ico: '⚡', from: '☁️', to: '🌱',
    strokes: [poly([[560, 135], [330, 350], [520, 370], [400, 565],
                    [660, 330], [480, 310], [640, 135]])]
  },
  {
    id: 'cloud', name: '구름', ico: '☁️', from: '🐦', to: '🌤️', tol: 40,
    strokes: [poly([
      ...arc(255, 390, 100, 100, PI, 2 * PI, 18),
      ...arc(425, 340, 90, 105, PI, 2 * PI, 18),
      ...arc(595, 340, 90, 105, PI, 2 * PI, 18),
      ...arc(760, 395, 95, 95, PI, 2 * PI, 18)
    ])]
  },
  {
    id: 'star2', name: '별', ico: '⭐', from: '🚀', to: '🌟', tol: 38,
    strokes: [poly((() => {                              // 꼭짓점 5개, 위에서 시작
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const a = -PI / 2 + i * PI / 5;
        const r = i % 2 ? 105 : 240;
        pts.push([500 + Math.cos(a) * r, 355 + Math.sin(a) * r]);
      }
      return pts;
    })())]
  },
  {
    id: 'heart', name: '하트', ico: '❤️', from: '💛', to: '💖', tol: 40,
    strokes: [t => {                                     // 위 가운데서 오른쪽으로
      const a = t * PI * 2;
      return { x: 500 + 14.5 * Math.pow(Math.sin(a), 3) * 16,
               y: 335 - (13 * Math.cos(a) - 5 * Math.cos(2 * a)
                         - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 14.5 };
    }]
  },
  {
    id: 'fig8', name: '8자', ico: '♾️', from: '🐝', to: '🌸', tol: 38,
    strokes: [t => {                                     // 가운데서 오른쪽 위로
      const a = t * PI * 2;
      return { x: 500 + Math.sin(a) * 260, y: 350 + Math.sin(2 * a) * 165 };
    }]
  },
  {
    id: 'flower2', name: '꽃잎', ico: '🌸', from: '🐛', to: '🦋', tol: 34,
    strokes: [t => {                                     // 꽃잎 4장 장미곡선
      const a = t * PI * 2;
      const r = Math.abs(Math.sin(2 * a)) * 235;
      return { x: 500 + Math.cos(a - PI / 2) * r, y: 350 + Math.sin(a - PI / 2) * r };
    }]
  },
  {
    id: 'snail', name: '달팽이집', ico: '🐌', from: '🐌', to: '🏠', tol: 32,
    strokes: [poly([[500, 350], [590, 350], [590, 440], [410, 440], [410, 260],
                    [680, 260], [680, 530], [320, 530], [320, 170], [790, 170]])]
  },
  {
    id: 'spiral2', name: '큰 나선', ico: '🌪️', from: '🍂', to: '🌰', tol: 26,
    strokes: [t => {                                     // 세 바퀴 — 궤도 간격 72
      const a = -PI / 2 + t * PI * 6;
      const r = 42 + 213 * t;
      return { x: 500 + Math.cos(a) * r, y: 355 + Math.sin(a) * r };
    }]
  }
];
