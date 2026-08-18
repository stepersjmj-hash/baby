/* ============================================================
   trace/paths.js — 선 긋기 코스
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

import { poly } from '../core/trace.js';

export const LEVELS = [
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
  }
];
