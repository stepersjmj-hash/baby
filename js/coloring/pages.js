/* ============================================================
   pages.js — 색칠용 밑그림
   ------------------------------------------------------------
   1000 × 700 좌표계에 그리면 drawPage() 가 캔버스 크기에 맞춰
   비율을 유지한 채 확대/가운데 정렬한다.

   ★ 밑그림 규칙: 물감통으로 칠하려면 영역이 "닫혀" 있어야 한다.
     두 형태가 만나는 곳은 반드시 경계선을 그어 막아 둘 것.
   ============================================================ */

const TAU = Math.PI * 2;

const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); };
const dot    = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
const ell    = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.stroke(); };
const seg    = (c, x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
const arc    = (c, x, y, r, a0, a1) => { c.beginPath(); c.arc(x, y, r, a0, a1); c.stroke(); };
const shape  = (c, fn, close = true) => { c.beginPath(); fn(c); if (close) c.closePath(); c.stroke(); };

/** 3차 베지에 위의 점과 접선. 등 돌기를 곡선에 딱 붙여 세우는 데 쓴다 */
function bez(p, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6],
    y: u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7],
    dx: 3 * u * u * (p[2] - p[0]) + 6 * u * t * (p[4] - p[2]) + 3 * t * t * (p[6] - p[4]),
    dy: 3 * u * u * (p[3] - p[1]) + 6 * u * t * (p[5] - p[3]) + 3 * t * t * (p[7] - p[5])
  };
}
/** 곡선 바깥쪽으로 삼각 돌기를 n 개 세운다 */
function spikes(c, p, n, h) {
  for (let i = 0; i < n; i++) {
    const q = bez(p, (i + 0.5) / n);
    const L = Math.hypot(q.dx, q.dy) || 1;
    const tx = q.dx / L, ty = q.dy / L;
    const nx = q.dy / L, ny = -q.dx / L;
    shape(c, () => {
      c.moveTo(q.x - tx * h * 0.55, q.y - ty * h * 0.55);
      c.lineTo(q.x + nx * h, q.y + ny * h);
      c.lineTo(q.x + tx * h * 0.55, q.y + ty * h * 0.55);
    }, false);
  }
}

/* 별 / 구름 같은 공용 소품 */
function cloud(c, x, y, s) {
  shape(c, () => {
    c.moveTo(x - 60 * s, y + 22 * s);
    c.bezierCurveTo(x - 100 * s, y + 22 * s, x - 96 * s, y - 24 * s, x - 54 * s, y - 20 * s);
    c.bezierCurveTo(x - 46 * s, y - 62 * s, x + 18 * s, y - 62 * s, x + 24 * s, y - 22 * s);
    c.bezierCurveTo(x + 70 * s, y - 30 * s, x + 78 * s, y + 22 * s, x + 30 * s, y + 22 * s);
  });
}
function star(c, x, y, r) {
  shape(c, () => {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 ? r * 0.45 : r;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
  });
}

export const PAGES = [

  /* ── 아이스크림 (첨부 사진과 같은 소재) ───────────────── */
  {
    id: 'icecream', name: '아이스크림',
    draw(c) {
      const cone = () => { c.moveTo(395, 402); c.lineTo(500, 664); c.lineTo(605, 402); c.closePath(); };

      // 콘 격자무늬 — 콘 안쪽으로 클립해서 밖으로 삐져나오지 않게 한다
      c.save();
      c.beginPath(); cone(); c.clip();
      c.lineWidth = 6;
      // 간격을 좁히면 칸이 잘게 쪼개져 물감통을 수십 번 눌러야 한다 (3세에겐 고역)
      for (let i = -5; i <= 5; i++) { seg(c, 300 + i * 92, 380, 560 + i * 92, 700); }
      for (let i = -5; i <= 5; i++) { seg(c, 700 - i * 92, 380, 440 - i * 92, 700); }
      c.restore();
      c.lineWidth = 9;

      shape(c, cone);                                   // 콘 외곽
      seg(c, 395, 402, 605, 402);                       // 콘 윗변 = 칸막이

      // 아래 덩이
      shape(c, () => { c.moveTo(395, 402); c.bezierCurveTo(345, 238, 655, 238, 605, 402); }, false);
      // 위 덩이
      seg(c, 428, 300, 572, 300);
      shape(c, () => { c.moveTo(428, 300); c.bezierCurveTo(386, 152, 614, 152, 572, 300); }, false);
      // 체리
      circle(c, 500, 158, 38);
      shape(c, () => { c.moveTo(500, 120); c.quadraticCurveTo(540, 78, 580, 90); }, false);

      // 초코칩
      [[452, 358], [552, 352], [500, 384], [470, 262], [536, 258]]
        .forEach(([x, y]) => circle(c, x, y, 13));

      star(c, 168, 214, 44); star(c, 852, 268, 36); cloud(c, 190, 402, .8); cloud(c, 826, 120, .9);
    }
  },

  /* ── 나비 ─────────────────────────────────────────────── */
  {
    id: 'butterfly', name: '나비',
    draw(c) {
      const wing = (sx) => {
        const X = (v) => 500 + (v - 500) * sx;
        shape(c, () => {                                  // 윗날개
          c.moveTo(X(482), 262);
          c.bezierCurveTo(X(400), 148, X(244), 132, X(226), 250);
          c.bezierCurveTo(X(212), 336, X(384), 372, X(482), 352);
        });
        shape(c, () => {                                  // 아랫날개
          c.moveTo(X(482), 368);
          c.bezierCurveTo(X(384), 382, X(272), 436, X(296), 536);
          c.bezierCurveTo(X(316), 608, X(444), 522, X(484), 436);
        });
        circle(c, X(330), 236, 40);                       // 무늬
        circle(c, X(392), 300, 24);
        circle(c, X(370), 484, 32);
      };
      wing(1); wing(-1);
      ell(c, 500, 360, 26, 118);                          // 몸통
      circle(c, 500, 228, 32);                            // 머리
      seg(c, 500, 242, 500, 478);                         // 몸통 마디
      seg(c, 462, 320, 538, 320); seg(c, 466, 384, 534, 384); seg(c, 474, 440, 526, 440);
      shape(c, () => { c.moveTo(486, 204); c.quadraticCurveTo(432, 140, 404, 116); }, false);
      shape(c, () => { c.moveTo(514, 204); c.quadraticCurveTo(568, 140, 596, 116); }, false);
      circle(c, 398, 108, 16); circle(c, 602, 108, 16);
    }
  },

  /* ── 꽃 ───────────────────────────────────────────────── */
  {
    id: 'flower', name: '꽃',
    draw(c) {
      for (let i = 0; i < 8; i++) {                       // 꽃잎 8장
        const a = i * TAU / 8;
        ell(c, 500 + Math.cos(a) * 146, 250 + Math.sin(a) * 146, 78, 52, a);
      }
      circle(c, 500, 250, 72);
      circle(c, 500, 250, 34);
      shape(c, () => { c.moveTo(500, 322); c.bezierCurveTo(518, 430, 484, 520, 502, 648); }, false);
      shape(c, () => {                                    // 잎 오른쪽
        c.moveTo(506, 452); c.bezierCurveTo(600, 396, 690, 424, 700, 470);
        c.bezierCurveTo(660, 528, 556, 520, 506, 452);
      });
      shape(c, () => {                                    // 잎 왼쪽
        c.moveTo(494, 548); c.bezierCurveTo(410, 502, 330, 528, 322, 570);
        c.bezierCurveTo(358, 622, 450, 614, 494, 548);
      });
      seg(c, 150, 650, 850, 650);                         // 땅
      cloud(c, 190, 150, .9); cloud(c, 830, 190, .8);
    }
  },

  /* ── 물고기 ───────────────────────────────────────────── */
  {
    id: 'fish', name: '물고기',
    draw(c) {
      ell(c, 460, 356, 236, 150);                         // 몸통
      shape(c, () => {                                    // 꼬리
        c.moveTo(676, 292); c.lineTo(872, 190); c.lineTo(836, 356);
        c.lineTo(872, 522); c.lineTo(676, 420);
      });
      seg(c, 676, 292, 676, 420);
      shape(c, () => { c.moveTo(392, 212); c.bezierCurveTo(430, 118, 546, 130, 566, 226); }, false);
      shape(c, () => { c.moveTo(400, 500); c.bezierCurveTo(438, 588, 540, 578, 558, 494); }, false);
      arc(c, 330, 356, 130, -1.0, 1.0);                   // 아가미
      circle(c, 314, 306, 34); dot(c, 322, 310, 14);      // 눈
      shape(c, () => { c.moveTo(246, 384); c.quadraticCurveTo(292, 418, 246, 442); }, false);
      for (let r = 0; r < 3; r++)                          // 비늘
        for (let i = 0; i < 4; i++)
          arc(c, 470 + i * 62, 288 + r * 68 - (i % 2) * 34, 34, -1.15, 1.15);
      circle(c, 210, 168, 22); circle(c, 262, 112, 15); circle(c, 168, 96, 11);
      seg(c, 60, 640, 940, 640);
    }
  },

  /* ── 자동차 ───────────────────────────────────────────── */
  {
    id: 'car', name: '자동차',
    draw(c) {
      shape(c, () => {                                    // 차체
        c.moveTo(150, 500); c.lineTo(150, 400);
        c.quadraticCurveTo(152, 372, 190, 368);
        c.lineTo(300, 366); c.lineTo(392, 240);
        c.quadraticCurveTo(404, 224, 428, 224);
        c.lineTo(654, 224); c.quadraticCurveTo(678, 226, 690, 244);
        c.lineTo(762, 366); c.lineTo(830, 380);
        c.quadraticCurveTo(862, 388, 862, 420);
        c.lineTo(862, 500);
      });
      seg(c, 150, 500, 862, 500);
      seg(c, 300, 366, 762, 366);                         // 창문 아래 칸막이
      shape(c, () => {                                    // 앞 유리
        c.moveTo(340, 356); c.lineTo(414, 258); c.lineTo(492, 258); c.lineTo(492, 356);
      });
      shape(c, () => {                                    // 뒤 유리
        c.moveTo(520, 356); c.lineTo(520, 258); c.lineTo(646, 258); c.lineTo(716, 356);
      });
      circle(c, 320, 500, 92); circle(c, 320, 500, 40);   // 바퀴
      circle(c, 700, 500, 92); circle(c, 700, 500, 40);
      arc(c, 320, 500, 92, Math.PI, TAU); arc(c, 700, 500, 92, Math.PI, TAU);
      ell(c, 172, 424, 26, 20);                           // 전조등
      seg(c, 60, 592, 940, 592);
      for (let x = 120; x < 900; x += 130) seg(c, x, 640, x + 62, 640);
      circle(c, 820, 130, 56); cloud(c, 220, 140, .9);
    }
  },

  /* ── 고양이 ───────────────────────────────────────────── */
  {
    id: 'cat', name: '고양이',
    draw(c) {
      shape(c, () => { c.moveTo(346, 258); c.lineTo(318, 116); c.lineTo(452, 190); }, true);
      shape(c, () => { c.moveTo(654, 258); c.lineTo(682, 116); c.lineTo(548, 190); }, true);
      circle(c, 500, 372, 214);                           // 얼굴
      ell(c, 424, 336, 40, 46); dot(c, 430, 340, 20);     // 눈
      ell(c, 576, 336, 40, 46); dot(c, 582, 340, 20);
      shape(c, () => { c.moveTo(474, 420); c.lineTo(526, 420); c.lineTo(500, 450); });
      shape(c, () => { c.moveTo(500, 450); c.quadraticCurveTo(500, 486, 458, 486);
                       c.quadraticCurveTo(432, 486, 428, 464); }, false);
      shape(c, () => { c.moveTo(500, 450); c.quadraticCurveTo(500, 486, 542, 486);
                       c.quadraticCurveTo(568, 486, 572, 464); }, false);
      [[-1, 0], [1, 0]].forEach(([s]) => {                 // 수염
        for (let i = 0; i < 3; i++)
          shape(c, () => {
            c.moveTo(500 + s * 96, 420 + i * 30);
            c.quadraticCurveTo(500 + s * 200, 400 + i * 40, 500 + s * 286, 386 + i * 52);
          }, false);
      });
      shape(c, () => {                                    // 리본
        c.moveTo(500, 596); c.lineTo(408, 550); c.lineTo(408, 646); c.closePath();
        c.moveTo(500, 596); c.lineTo(592, 550); c.lineTo(592, 646); c.closePath();
      }, false);
      circle(c, 500, 596, 26);
    }
  },

  /* ── 집 ───────────────────────────────────────────────── */
  {
    id: 'house', name: '우리 집',
    draw(c) {
      shape(c, () => { c.moveTo(258, 342); c.lineTo(500, 168); c.lineTo(742, 342); });
      seg(c, 258, 342, 742, 342);                         // 지붕 아래 칸막이
      shape(c, () => { c.moveTo(300, 342); c.lineTo(300, 620); c.lineTo(700, 620); c.lineTo(700, 342); }, false);
      shape(c, () => { c.moveTo(444, 620); c.lineTo(444, 466); c.lineTo(556, 466); c.lineTo(556, 620); }, false);
      dot(c, 534, 546, 12);                               // 손잡이
      shape(c, () => { c.moveTo(336, 396); c.lineTo(414, 396); c.lineTo(414, 474); c.lineTo(336, 474); });
      seg(c, 375, 396, 375, 474); seg(c, 336, 435, 414, 435);
      shape(c, () => { c.moveTo(586, 396); c.lineTo(664, 396); c.lineTo(664, 474); c.lineTo(586, 474); });
      seg(c, 625, 396, 625, 474); seg(c, 586, 435, 664, 435);
      shape(c, () => { c.moveTo(620, 250); c.lineTo(620, 172); c.lineTo(672, 172); c.lineTo(672, 288); }, false);
      circle(c, 838, 148, 62);                            // 해
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8;
        seg(c, 838 + Math.cos(a) * 80, 148 + Math.sin(a) * 80,
               838 + Math.cos(a) * 112, 148 + Math.sin(a) * 112);
      }
      cloud(c, 200, 156, 1);
      seg(c, 40, 620, 960, 620);
      for (let x = 70; x < 960; x += 74)                  // 잔디
        shape(c, () => { c.moveTo(x, 620); c.quadraticCurveTo(x + 12, 590, x + 26, 620); }, false);
    }
  },

  /* ── 공룡 ─────────────────────────────────────────────── */
  {
    id: 'dino', name: '공룡',
    draw(c) {
      // 꼬리끝 → 등 → 목 → 머리 → 목앞 → 배 → 다리 → 꼬리 아래, 한 붓으로 닫는다
      shape(c, () => {
        c.moveTo(80, 352);
        c.bezierCurveTo(190, 362, 300, 394, 392, 346);    // 꼬리 위 ~ 등
        c.bezierCurveTo(470, 298, 570, 210, 690, 192);    // 목 뒤
        c.bezierCurveTo(730, 152, 800, 154, 828, 194);    // 머리 위
        c.bezierCurveTo(846, 220, 826, 250, 786, 254);    // 주둥이
        c.lineTo(724, 254);
        c.bezierCurveTo(688, 300, 648, 344, 600, 384);    // 목 앞
        c.bezierCurveTo(566, 418, 540, 448, 520, 474);    // 가슴
        c.lineTo(506, 486);
        c.lineTo(506, 616); c.lineTo(432, 616); c.lineTo(432, 498);   // 앞다리
        c.bezierCurveTo(400, 508, 372, 510, 346, 504);    // 배
        c.lineTo(346, 616); c.lineTo(272, 616); c.lineTo(272, 494);   // 뒷다리
        c.bezierCurveTo(206, 480, 136, 426, 80, 352);     // 꼬리 아래
      });
      spikes(c, [80, 352, 190, 362, 300, 394, 392, 346], 4, 34);      // 꼬리 돌기
      spikes(c, [392, 346, 470, 298, 570, 210, 690, 192], 3, 40);     // 등 돌기

      circle(c, 772, 208, 20); dot(c, 776, 212, 9);       // 눈
      dot(c, 820, 216, 8);                                // 콧구멍
      shape(c, () => { c.moveTo(760, 252); c.quadraticCurveTo(792, 268, 822, 252); }, false);
      for (let i = 0; i < 3; i++) arc(c, 350 + i * 62, 470, 36, 0.35, 2.6);   // 배 무늬
      seg(c, 40, 656, 960, 656);
      cloud(c, 190, 148, .8); circle(c, 858, 470, 40); circle(c, 906, 546, 26);
    }
  }
];

/**
 * 밑그림(1000×700)이 캔버스 어디에 얼마로 앉는지. 비율을 지켜 가운데다.
 * **아이가 칠한 것도 이 상자를 기준으로 저장한다** — 화면을 돌려 종이
 * 비율이 바뀌어도 그림과 칠이 같이 움직여야 찌그러지지 않는다.
 */
export const artBox = (W, H) => {
  const s = Math.min(W / 1000, H / 700) * 0.94;
  return { s, w: 1000 * s, h: 700 * s, ox: (W - 1000 * s) / 2, oy: (H - 700 * s) / 2 };
};

/** 밑그림을 캔버스에 비율 유지하며 그린다 */
export function drawPage(page, ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  const { s, ox, oy } = artBox(W, H);
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  ctx.strokeStyle = '#241f1a';
  ctx.fillStyle = '#241f1a';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  page.draw(ctx);
  ctx.restore();
}
