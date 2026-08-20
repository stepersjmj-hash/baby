/* ============================================================
   spot/scenes.js — 다른 그림 찾기 문제 (직접 그린 장면)
   ------------------------------------------------------------
   이모지가 아니라 캔버스로 그린 장면 여덟 개(우리 집·바닷속·밤하늘·
   농장·놀이터·생일·기차·겨울)를
   쓴다. 왼쪽은 기본값(base), 오른쪽은 고른 항목만 바뀐 값(alt)으로
   같은 코드가 그린다 — 그래서 두 그림은 바뀐 곳 말고는 픽셀까지 같다
   (자가 점검이 이 성질을 그대로 검사한다).

   난이도 = 다른 곳 수 + 티 나는 정도:
     하 2곳 (지붕 색이 다르다, 게가 없다 …)
     중 3곳 (문 색, 구름 하나, 꽃 색 …)
     상 4곳 (사과 2개↔3개, 커튼, 연기, 문손잡이 위치 …)

   장면 좌표계는 그림판 로컬 452×548 (PANEL.w × PANEL.h).
   ============================================================ */

export const VIEW = { w: 1000, h: 700 };
export const PANEL = { w: 452, h: 548, lx: 24, rx: 524, ty: 108 };

const TAU = Math.PI * 2;
const disc = (c, x, y, r, f) => { c.fillStyle = f; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
const rr = (c, x, y, w, h, r, f) => { c.fillStyle = f; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); };
const tri = (c, p, f) => {
  c.fillStyle = f; c.beginPath();
  c.moveTo(p[0][0], p[0][1]); c.lineTo(p[1][0], p[1][1]); c.lineTo(p[2][0], p[2][1]);
  c.closePath(); c.fill();
};
const grad = (c, h, a, b) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, a); g.addColorStop(1, b);
  return g;
};
function cloud(c, x, y, s, f) {
  c.fillStyle = f;
  c.beginPath();
  c.arc(x - 26 * s, y, 16 * s, 0, TAU);
  c.arc(x, y - 12 * s, 21 * s, 0, TAU);
  c.arc(x + 27 * s, y, 17 * s, 0, TAU);
  c.rect(x - 26 * s, y, 53 * s, 16 * s);
  c.fill();
}
function sparkle(c, x, y, r, f) {
  c.fillStyle = f;
  c.beginPath();
  for (let k = 0; k < 4; k++) {
    c.rotate ? 0 : 0;
    const a = -Math.PI / 2 + k * Math.PI / 2;
    c.moveTo(x, y);
    c.quadraticCurveTo(x + Math.cos(a + 0.5) * r * 0.35, y + Math.sin(a + 0.5) * r * 0.35,
                       x + Math.cos(a) * r, y + Math.sin(a) * r);
    c.quadraticCurveTo(x + Math.cos(a - 0.5) * r * 0.35, y + Math.sin(a - 0.5) * r * 0.35, x, y);
  }
  c.fill();
}
function starfish(c, x, y, r, f) {
  c.fillStyle = f;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr2 = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath(); c.fill();
}

/* ── 장면 1: 우리 집 ─────────────────────────────────────── */
const HOUSE = {
  name: '우리 집', ico: '🏠',
  base: { roof: '#d95f4b', door: '#7a4a2b', bird: true, cloudB: true,
          flower: '#e8646c', apples: 3, curtain: true, smoke: true, knob: 'l' },
  alt:  { roof: '#5a8fd0', door: '#e8b52e', bird: false, cloudB: false,
          flower: '#e8b52e', apples: 2, curtain: false, smoke: false, knob: 'r' },
  spots: {
    roof: { x: 226, y: 218, r: 60 }, door: { x: 227, y: 372, r: 38 },
    bird: { x: 92, y: 192, r: 30 }, cloudB: { x: 158, y: 148, r: 42 },
    flower: { x: 110, y: 468, r: 26 }, apples: { x: 372, y: 318, r: 20 },
    curtain: { x: 164, y: 300, r: 30 }, smoke: { x: 308, y: 145, r: 36 },
    knob: { x: 227, y: 374, r: 24 }
  },
  draw(c, P) {
    c.fillStyle = grad(c, 548, '#aee2f7', '#e9f8ff');
    c.fillRect(0, 0, 452, 548);
    c.fillStyle = '#8fce6f';
    c.beginPath();
    c.moveTo(0, 424); c.quadraticCurveTo(226, 392, 452, 424);
    c.lineTo(452, 548); c.lineTo(0, 548); c.closePath(); c.fill();

    disc(c, 66, 76, 32, '#ffd21e');
    c.strokeStyle = '#ffd21e'; c.lineWidth = 5; c.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      c.beginPath();
      c.moveTo(66 + Math.cos(a) * 42, 76 + Math.sin(a) * 42);
      c.lineTo(66 + Math.cos(a) * 54, 76 + Math.sin(a) * 54);
      c.stroke();
    }
    cloud(c, 330, 84, 1, '#ffffff');
    if (P.cloudB) cloud(c, 158, 148, 0.8, '#ffffff');
    if (P.bird) {
      c.strokeStyle = '#3a3f4a'; c.lineWidth = 4;
      c.beginPath(); c.arc(83, 196, 10, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      c.beginPath(); c.arc(101, 196, 10, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    }

    rr(c, 286, 198, 26, 62, 4, '#b0654a');                       // 굴뚝
    if (P.smoke) {
      disc(c, 300, 168, 9, 'rgba(255,255,255,.85)');
      disc(c, 308, 146, 12, 'rgba(255,255,255,.72)');
      disc(c, 318, 121, 15, 'rgba(255,255,255,.58)');
    }
    rr(c, 120, 258, 212, 152, 6, '#f6e7cd');                     // 몸체
    tri(c, [[100, 262], [352, 262], [226, 176]], P.roof);        // 지붕

    for (const wx of [142, 266]) {                               // 창 2
      rr(c, wx, 286, 44, 38, 4, '#cfeaf7');
      c.strokeStyle = '#8a6a4a'; c.lineWidth = 3;
      c.strokeRect(wx, 286, 44, 38);
      c.beginPath(); c.moveTo(wx + 22, 286); c.lineTo(wx + 22, 324); c.stroke();
    }
    if (P.curtain) {                                             // 왼쪽 창 커튼
      tri(c, [[142, 287], [162, 287], [142, 322]], '#e8646c');
      tri(c, [[186, 287], [166, 287], [186, 322]], '#e8646c');
    }
    rr(c, 204, 336, 46, 74, 8, P.door);                          // 문
    disc(c, P.knob === 'l' ? 213 : 241, 374, 4.5, '#f7d774');    // 손잡이

    rr(c, 372, 332, 22, 82, 5, '#8a5a2b');                       // 나무
    disc(c, 383, 288, 54, '#58a84c');
    disc(c, 354, 302, 33, '#63b356');
    disc(c, 413, 303, 31, '#63b356');
    disc(c, 362, 272, 8, '#e04a3a');
    disc(c, 404, 296, 8, '#e04a3a');
    if (P.apples === 3) disc(c, 372, 318, 8, '#e04a3a');

    [[70, '#f2c94c'], [110, P.flower], [150, '#a48ae8']].forEach(([fx, col]) => {   // 꽃 3
      c.strokeStyle = '#4d8f3f'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(fx, 496); c.lineTo(fx, 462); c.stroke();
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * TAU - Math.PI / 2;
        disc(c, fx + Math.cos(a) * 9, 462 + Math.sin(a) * 9, 6.5, col);
      }
      disc(c, fx, 462, 5, '#7a4a2b');
    });
  }
};

/* ── 장면 2: 바닷속 ──────────────────────────────────────── */
const SEA = {
  name: '바닷속', ico: '🐠',
  base: { fish: '#f2a03d', crab: true, star: '#e8646c', weed: 3,
          jelly: true, smallfish: 3, shell: '#f7f0e0', bubbles: true },
  alt:  { fish: '#5fb8e8', crab: false, star: '#e8b52e', weed: 2,
          jelly: false, smallfish: 2, shell: '#f2b8d0', bubbles: false },
  spots: {
    fish: { x: 190, y: 255, r: 64 }, crab: { x: 330, y: 502, r: 38 },
    star: { x: 118, y: 498, r: 30 }, weed: { x: 82, y: 460, r: 28 },
    jelly: { x: 82, y: 128, r: 34 }, smallfish: { x: 356, y: 184, r: 26 },
    shell: { x: 238, y: 516, r: 24 }, bubbles: { x: 276, y: 168, r: 36 }
  },
  draw(c, P) {
    c.fillStyle = grad(c, 548, '#8fd0ea', '#2e7fb8');
    c.fillRect(0, 0, 452, 548);
    c.fillStyle = '#eed9a4';                                     // 모래
    c.beginPath();
    c.moveTo(0, 484); c.quadraticCurveTo(226, 458, 452, 484);
    c.lineTo(452, 548); c.lineTo(0, 548); c.closePath(); c.fill();

    for (const [sx, lean] of [[34, -10], [58, 12], [82, -8]]) {  // 미역
      if (sx === 82 && P.weed === 2) continue;
      c.strokeStyle = '#3f8f5a'; c.lineWidth = 7; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(sx, 500);
      c.bezierCurveTo(sx + lean, 470, sx - lean, 445, sx + lean, 415);
      c.stroke();
    }

    if (P.jelly) {                                               // 해파리
      c.fillStyle = '#f2a8c8';
      c.beginPath(); c.arc(82, 124, 22, Math.PI, 0); c.closePath(); c.fill();
      c.strokeStyle = '#f2a8c8'; c.lineWidth = 4; c.lineCap = 'round';
      for (const dx of [-13, -4, 5, 14]) {
        c.beginPath();
        c.moveTo(82 + dx, 126);
        c.quadraticCurveTo(82 + dx + 5, 142, 82 + dx - 3, 156);
        c.stroke();
      }
    }

    // 큰 물고기
    c.fillStyle = P.fish;
    c.beginPath(); c.ellipse(196, 255, 62, 38, 0, 0, TAU); c.fill();
    tri(c, [[136, 255], [98, 228], [98, 282]], P.fish);          // 꼬리
    c.fillStyle = 'rgba(0,0,0,.12)';
    c.beginPath(); c.ellipse(190, 268, 20, 10, 0.3, 0, TAU); c.fill();   // 지느러미 그늘
    disc(c, 224, 244, 8, '#ffffff'); disc(c, 226, 244, 4, '#26303a');   // 눈
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 3;
    c.beginPath(); c.arc(238, 262, 8, 0.3, 1.6); c.stroke();            // 입

    if (P.bubbles) {
      for (const [bx, by, br] of [[262, 196, 6], [276, 168, 8], [290, 136, 10]]) {
        c.fillStyle = 'rgba(255,255,255,.45)';
        c.beginPath(); c.arc(bx, by, br, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2;
        c.beginPath(); c.arc(bx, by, br, 0, TAU); c.stroke();
      }
    }

    const small = [[352, 118], [392, 152], [356, 184]];          // 작은 물고기 떼
    for (let i = 0; i < (P.smallfish === 3 ? 3 : 2); i++) {
      const [fx, fy] = small[i];
      c.fillStyle = '#f7c948';
      c.beginPath(); c.ellipse(fx, fy, 16, 10, 0, 0, TAU); c.fill();
      tri(c, [[fx - 15, fy], [fx - 25, fy - 7], [fx - 25, fy + 7]], '#f7c948');
      disc(c, fx + 8, fy - 2, 2.4, '#26303a');
    }

    starfish(c, 118, 498, 24, P.star);                           // 불가사리
    for (const [dx, dy] of [[0, -8], [-7, 4], [7, 4]]) disc(c, 118 + dx, 498 + dy, 2.2, 'rgba(255,255,255,.7)');

    if (P.crab) {                                                // 게
      c.fillStyle = '#e0653a';
      c.beginPath(); c.ellipse(330, 504, 26, 17, 0, 0, TAU); c.fill();
      disc(c, 308, 488, 8, '#e0653a'); disc(c, 352, 488, 8, '#e0653a');   // 집게
      c.strokeStyle = '#e0653a'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(322, 492); c.lineTo(320, 480); c.stroke();
      c.beginPath(); c.moveTo(338, 492); c.lineTo(340, 480); c.stroke();
      disc(c, 320, 478, 4.5, '#26303a'); disc(c, 340, 478, 4.5, '#26303a');
    }

    disc(c, 238, 516, 13, P.shell);                              // 소라
    c.strokeStyle = '#b08a5a'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(238, 516, 8, 0.5, 4.5); c.stroke();
    c.beginPath(); c.arc(240, 514, 4, 0.5, 4.2); c.stroke();
  }
};

/* ── 장면 3: 밤하늘 ──────────────────────────────────────── */
const NIGHT = {
  name: '밤하늘', ico: '🌙',
  base: { moon: 'full', planet: '#e88a4a', ring: true, comet: true,
          flame: true, winN: 2, bigstar: '#ffe14d', ufo: true, fin: '#d95f4b' },
  alt:  { moon: 'crescent', planet: '#7ac06a', ring: false, comet: false,
          flame: false, winN: 1, bigstar: '#ff9ad0', ufo: false, fin: '#5a8fd0' },
  spots: {
    moon: { x: 370, y: 88, r: 42 }, planet: { x: 88, y: 300, r: 36 },
    ring: { x: 88, y: 300, r: 48 }, comet: { x: 332, y: 158, r: 40 },
    flame: { x: 226, y: 446, r: 36 }, winN: { x: 226, y: 356, r: 22 },
    bigstar: { x: 110, y: 150, r: 26 }, ufo: { x: 62, y: 222, r: 32 },
    fin: { x: 226, y: 410, r: 58 }
  },
  draw(c, P) {
    c.fillStyle = grad(c, 548, '#1b2950', '#41528a');
    c.fillRect(0, 0, 452, 548);

    c.globalAlpha = 0.9;
    for (const [sx, sy] of [[50, 60], [150, 92], [250, 48], [320, 210], [424, 170], [50, 420], [410, 300]])
      sparkle(c, sx, sy, 5.5, '#ffffff');
    c.globalAlpha = 1;
    sparkle(c, 110, 150, 13, P.bigstar);

    // 달 (보름달 ↔ 초승달). 초승달은 작은 캔버스에서 파낸 뒤 붙인다 —
    // 본 캔버스에서 destination-out 을 쓰면 배경까지 뚫린다
    const mc = document.createElement('canvas');
    mc.width = mc.height = 90;
    const m = mc.getContext('2d');
    m.fillStyle = '#f7e8a0';
    m.beginPath(); m.arc(45, 45, 34, 0, TAU); m.fill();
    if (P.moon === 'crescent') {
      m.globalCompositeOperation = 'destination-out';
      m.beginPath(); m.arc(60, 37, 30, 0, TAU); m.fill();
    }
    c.drawImage(mc, 325, 43);

    if (P.ufo) {                                                 // 유에프오
      c.fillStyle = '#cfe0f0';
      c.beginPath(); c.arc(62, 216, 11, Math.PI, 0); c.closePath(); c.fill();
      c.fillStyle = '#9aa8c0';
      c.beginPath(); c.ellipse(62, 222, 24, 8, 0, 0, TAU); c.fill();
      for (const dx of [-12, 0, 12]) disc(c, 62 + dx, 224, 2.4, '#ffe14d');
    }
    if (P.comet) {
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(298, 184); c.lineTo(362, 136); c.stroke();
      disc(c, 366, 133, 6, '#ffffff');
    }

    disc(c, 88, 300, 28, P.planet);                              // 행성
    c.fillStyle = 'rgba(0,0,0,.12)';
    disc(c, 78, 292, 7, 'rgba(0,0,0,.12)'); disc(c, 97, 306, 5, 'rgba(0,0,0,.12)');
    if (P.ring) {
      c.strokeStyle = '#e8d6a0'; c.lineWidth = 5;
      c.save(); c.translate(88, 300); c.rotate(-0.35);
      c.beginPath(); c.ellipse(0, 0, 46, 12, 0, 0, TAU); c.stroke();
      c.restore();
    }

    c.fillStyle = '#141d38';                                     // 언덕
    c.beginPath();
    c.moveTo(0, 548); c.lineTo(0, 500);
    c.quadraticCurveTo(120, 452, 240, 502);
    c.quadraticCurveTo(350, 545, 452, 496);
    c.lineTo(452, 548); c.closePath(); c.fill();

    // 로켓
    if (P.flame) {
      tri(c, [[208, 422], [244, 422], [226, 472]], '#f7a03d');
      tri(c, [[216, 422], [236, 422], [226, 452]], '#ffd21e');
    }
    tri(c, [[198, 378], [198, 428], [164, 428]], P.fin);
    tri(c, [[254, 378], [254, 428], [288, 428]], P.fin);
    rr(c, 196, 268, 60, 156, 26, '#eceff7');
    tri(c, [[196, 288], [256, 288], [226, 230]], '#d95f4b');
    disc(c, 226, 320, 12, '#8fd0ea');
    c.strokeStyle = '#8a93a8'; c.lineWidth = 3;
    c.beginPath(); c.arc(226, 320, 12, 0, TAU); c.stroke();
    if (P.winN === 2) {
      disc(c, 226, 356, 8, '#8fd0ea');
      c.beginPath(); c.arc(226, 356, 8, 0, TAU); c.stroke();
    }
  }
};


/* ── 장면 4: 농장 ────────────────────────────────────────── */
const FARM = {
  name: '농장', ico: '🐄',
  base: { barn: '#c9524a', door: '#7a4a2b', pig: true, hay: true, sunflower: '#f2c94c',
          cowSpots: 3, fence: true, butterfly: true, chick: true },
  alt:  { barn: '#5a8fd0', door: '#e8b52e', pig: false, hay: false, sunflower: '#f2884c',
          cowSpots: 2, fence: false, butterfly: false, chick: false },
  spots: {
    barn: { x: 200, y: 310, r: 60 }, door: { x: 200, y: 340, r: 32 },
    pig: { x: 85, y: 465, r: 36 }, hay: { x: 258, y: 428, r: 32 },
    sunflower: { x: 44, y: 300, r: 30 }, cowSpots: { x: 350, y: 448, r: 32 },
    fence: { x: 384, y: 366, r: 26 }, butterfly: { x: 240, y: 170, r: 28 },
    chick: { x: 162, y: 476, r: 24 }
  },
  draw(c, P) {
    c.fillStyle = grad(c, 548, '#bfe8f7', '#f0fbff');
    c.fillRect(0, 0, 452, 548);
    c.fillStyle = '#a8d178';
    c.fillRect(0, 376, 452, 172);

    disc(c, 396, 64, 28, '#ffd21e');
    cloud(c, 300, 76, 0.9, '#ffffff');

    if (P.butterfly) {
      disc(c, 233, 166, 8, '#a48ae8'); disc(c, 247, 166, 8, '#c9a8f2');
      c.strokeStyle = '#4a3a30'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(240, 158); c.lineTo(240, 180); c.stroke();
    }

    // 헛간
    tri(c, [[96, 250], [304, 250], [200, 168]], '#8a4038');
    rr(c, 112, 246, 176, 130, 4, P.barn);
    rr(c, 172, 300, 56, 76, 4, P.door);
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(176, 304); c.lineTo(224, 372); c.stroke();
    c.beginPath(); c.moveTo(224, 304); c.lineTo(176, 372); c.stroke();
    disc(c, 200, 222, 14, '#fdf0e0');
    c.strokeStyle = '#8a4038'; c.lineWidth = 3;
    c.beginPath(); c.arc(200, 222, 14, 0, TAU); c.stroke();

    // 해바라기
    c.strokeStyle = '#4d8f3f'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(44, 380); c.lineTo(44, 312); c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      disc(c, 44 + Math.cos(a) * 13, 298 + Math.sin(a) * 13, 7, P.sunflower);
    }
    disc(c, 44, 298, 8, '#7a4a2b');

    // 울타리
    c.strokeStyle = '#b08a5a'; c.lineWidth = 6; c.lineCap = 'round';
    for (const ry of [352, 372]) {
      c.beginPath(); c.moveTo(312, ry); c.lineTo(444, ry); c.stroke();
    }
    for (const px of [320, 352, 384, 416]) {
      if (px === 384 && !P.fence) continue;
      rr(c, px - 5, 340, 10, 52, 3, '#b08a5a');
    }

    // 젖소
    c.fillStyle = '#ffffff';
    c.beginPath(); c.ellipse(350, 442, 44, 27, 0, 0, TAU); c.fill();
    for (const [lx] of [[330], [368]]) c.fillRect(lx, 462, 9, 22);
    disc(c, 392, 420, 15, '#ffffff');
    c.fillStyle = '#f2b8c8';
    c.beginPath(); c.ellipse(398, 427, 8, 5.5, 0, 0, TAU); c.fill();
    disc(c, 388, 414, 2.2, '#26303a');
    tri(c, [[382, 407], [390, 402], [388, 411]], '#e8e0d8');
    disc(c, 336, 432, 9, '#4a3a30');
    disc(c, 366, 450, 8, '#4a3a30');
    if (P.cowSpots === 3) disc(c, 346, 452, 6.5, '#4a3a30');

    if (P.pig) {
      c.fillStyle = '#f2a8b8';
      c.beginPath(); c.ellipse(80, 468, 26, 17, 0, 0, TAU); c.fill();
      disc(c, 102, 462, 12, '#f2a8b8');
      tri(c, [[96, 452], [104, 446], [104, 456]], '#e8879a');
      c.fillStyle = '#e8879a';
      c.beginPath(); c.ellipse(110, 464, 6, 4.5, 0, 0, TAU); c.fill();
      disc(c, 108, 464, 1.4, '#7a3a4a'); disc(c, 112, 464, 1.4, '#7a3a4a');
      disc(c, 100, 458, 2, '#26303a');
    }

    if (P.hay) {
      rr(c, 232, 410, 52, 36, 8, '#e8c25a');
      c.strokeStyle = '#c9a13d'; c.lineWidth = 3;
      for (const hx of [245, 258, 271]) {
        c.beginPath(); c.moveTo(hx, 412); c.lineTo(hx, 444); c.stroke();
      }
    }

    if (P.chick) {
      disc(c, 160, 478, 10, '#ffd21e');
      disc(c, 168, 470, 6.5, '#ffd21e');
      tri(c, [[173, 469], [180, 471], [173, 474]], '#f2884c');
      disc(c, 169, 468, 1.6, '#26303a');
    }
  }
};

/* ── 장면 5: 놀이터 ──────────────────────────────────────── */
const PARK = {
  name: '놀이터', ico: '⚽',
  base: { slide: '#e8646c', dog: true, balloon: '#e04a3a', kite: true, ball: '#f2c94c',
          cloudB: true, tulip: '#a48ae8', bows: 3, rungs: 4 },
  alt:  { slide: '#5fb8e8', dog: false, balloon: '#58a84c', kite: false, ball: '#a48ae8',
          cloudB: false, tulip: '#e8646c', bows: 2, rungs: 3 },
  spots: {
    slide: { x: 330, y: 410, r: 62 }, dog: { x: 152, y: 455, r: 36 },
    balloon: { x: 90, y: 180, r: 34 }, kite: { x: 345, y: 110, r: 52 },
    ball: { x: 222, y: 478, r: 26 }, cloudB: { x: 150, y: 78, r: 40 },
    tulip: { x: 92, y: 462, r: 26 }, bows: { x: 303, y: 172, r: 30 },
    rungs: { x: 260, y: 371, r: 24 }
  },
  draw(c, P) {
    c.fillStyle = grad(c, 548, '#b8e4f7', '#eefaff');
    c.fillRect(0, 0, 452, 548);
    c.fillStyle = '#95d276';
    c.beginPath();
    c.moveTo(0, 420); c.quadraticCurveTo(226, 392, 452, 420);
    c.lineTo(452, 548); c.lineTo(0, 548); c.closePath(); c.fill();

    disc(c, 56, 64, 26, '#ffd21e');
    cloud(c, 330, 64, 0.9, '#ffffff');
    if (P.cloudB) cloud(c, 150, 78, 0.75, '#ffffff');

    if (P.kite) {
      c.fillStyle = '#f2884c';
      c.beginPath();
      c.moveTo(345, 76); c.lineTo(374, 110); c.lineTo(345, 144); c.lineTo(316, 110);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(345, 76); c.lineTo(345, 144); c.stroke();
      c.beginPath(); c.moveTo(316, 110); c.lineTo(374, 110); c.stroke();
      c.strokeStyle = '#8a93a8';
      c.beginPath(); c.moveTo(345, 144); c.quadraticCurveTo(318, 162, 298, 192); c.stroke();
      const bows = [[326, 154], [312, 168], [300, 186]];
      for (let i = 0; i < P.bows; i++) {
        const [bx, by] = bows[i];
        tri(c, [[bx, by], [bx - 8, by - 5], [bx - 8, by + 5]], '#5fb8e8');
        tri(c, [[bx, by], [bx + 8, by - 5], [bx + 8, by + 5]], '#5fb8e8');
      }
    }

    // 미끄럼틀
    c.strokeStyle = '#8a93a8'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(252, 470); c.lineTo(252, 356); c.stroke();
    c.beginPath(); c.moveTo(272, 470); c.lineTo(272, 356); c.stroke();
    c.lineWidth = 4;
    const rungs = [445, 420, 395, 370];
    for (let i = 0; i < P.rungs; i++) {
      c.beginPath(); c.moveTo(252, rungs[i]); c.lineTo(272, rungs[i]); c.stroke();
    }
    c.fillStyle = P.slide;
    c.beginPath();
    c.moveTo(268, 350); c.lineTo(296, 350); c.lineTo(404, 466); c.lineTo(372, 470);
    c.closePath(); c.fill();
    rr(c, 248, 342, 52, 12, 5, P.slide);

    if (P.dog) {
      rr(c, 126, 450, 48, 26, 12, '#c9995a');
      disc(c, 178, 446, 14, '#c9995a');
      tri(c, [[170, 436], [182, 430], [184, 442]], '#8a5a2b');
      c.strokeStyle = '#c9995a'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(126, 452); c.lineTo(114, 438); c.stroke();
      c.fillRect ? 0 : 0;
      c.fillStyle = '#c9995a';
      c.fillRect(132, 472, 8, 12); c.fillRect(158, 472, 8, 12);
      disc(c, 183, 443, 2.2, '#26303a'); disc(c, 191, 449, 3, '#3a2f22');
    }

    disc(c, 222, 478, 16, P.ball);
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3;
    c.beginPath(); c.arc(222, 478, 16, -0.6, 0.9); c.stroke();
    c.beginPath(); c.arc(222, 478, 9, 2.4, 4.2); c.stroke();

    // 풍선
    c.fillStyle = P.balloon;
    c.beginPath(); c.ellipse(90, 172, 19, 24, 0, 0, TAU); c.fill();
    tri(c, [[90, 196], [84, 206], [96, 206]], P.balloon);
    c.strokeStyle = '#8a93a8'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(90, 206); c.quadraticCurveTo(80, 260, 88, 320); c.stroke();

    // 튤립 3
    [[60, '#e8646c'], [92, P.tulip], [124, '#f2c94c']].forEach(([fx, col]) => {
      c.strokeStyle = '#4d8f3f'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(fx, 496); c.lineTo(fx, 466); c.stroke();
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(fx - 10, 466); c.lineTo(fx - 10, 452); c.lineTo(fx - 4, 458);
      c.lineTo(fx, 450); c.lineTo(fx + 4, 458); c.lineTo(fx + 10, 452); c.lineTo(fx + 10, 466);
      c.closePath(); c.fill();
    });
  }
};

/* ── 장면 6: 생일 ────────────────────────────────────────── */
const BDAY = {
  name: '생일', ico: '🎂',
  base: { cake: '#f2a8c8', balloonL: '#e04a3a', ribbon: '#f2c94c', balloonR: true,
          hat: true, candles: 3, flag: '#f2c94c', straw: true, sprinkle: true },
  alt:  { cake: '#a06a4a', balloonL: '#5a8fd0', ribbon: '#e8646c', balloonR: false,
          hat: false, candles: 2, flag: '#58a84c', straw: false, sprinkle: false },
  spots: {
    cake: { x: 226, y: 394, r: 54 }, balloonL: { x: 66, y: 150, r: 34 },
    ribbon: { x: 92, y: 396, r: 30 }, balloonR: { x: 390, y: 150, r: 34 },
    hat: { x: 360, y: 396, r: 34 }, candles: { x: 226, y: 308, r: 26 },
    flag: { x: 174, y: 92, r: 26 }, straw: { x: 316, y: 372, r: 24 },
    sprinkle: { x: 226, y: 346, r: 26 }
  },
  draw(c, P) {
    c.fillStyle = grad(c, 548, '#fdeef7', '#fff9f2');
    c.fillRect(0, 0, 452, 548);

    // 깃발줄
    c.strokeStyle = '#b08a5a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, 36); c.quadraticCurveTo(226, 84, 452, 36); c.stroke();
    const cols = ['#e8646c', '#5fb8e8', P.flag, '#58a84c', '#a48ae8', '#f2884c'];
    cols.forEach((col, i) => {
      const t = (i + 0.7) / 7;
      const fx = t * 452;
      const fy = 36 + Math.sin(t * Math.PI) * 47;
      tri(c, [[fx - 13, fy], [fx + 13, fy], [fx, fy + 26]], col);
    });

    // 테이블
    rr(c, 36, 420, 380, 18, 8, '#b58a5a');
    rr(c, 62, 438, 16, 90, 4, '#9a7248');
    rr(c, 374, 438, 16, 90, 4, '#9a7248');

    // 케이크
    c.fillStyle = '#ffffff';
    c.beginPath(); c.ellipse(226, 420, 78, 12, 0, 0, TAU); c.fill();
    rr(c, 166, 368, 120, 50, 10, P.cake);
    rr(c, 182, 332, 88, 40, 10, '#fdf0e0');
    c.fillStyle = '#f2a8c8';
    for (const dx of [-33, -11, 11, 33]) disc(c, 226 + dx, 336, 6, '#f2a8c8');
    if (P.sprinkle) {
      for (const [dx, dy, col] of [[-28, 14, '#5fb8e8'], [-10, 18, '#58a84c'],
                                   [8, 13, '#e04a3a'], [26, 17, '#a48ae8']])
        disc(c, 226 + dx, 332 + dy, 2.6, col);
    }
    const cx = [206, 246, 226];
    for (let i = 0; i < P.candles; i++) {
      rr(c, cx[i] - 3.5, 306, 7, 26, 3, i % 2 ? '#5fb8e8' : '#e8646c');
      disc(c, cx[i], 300, 4.5, '#f7a03d');
    }

    // 풍선
    c.fillStyle = P.balloonL;
    c.beginPath(); c.ellipse(60, 144, 19, 24, 0, 0, TAU); c.fill();
    c.fillStyle = '#f2c94c';
    c.beginPath(); c.ellipse(90, 128, 17, 22, 0, 0, TAU); c.fill();
    c.strokeStyle = '#8a93a8'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(60, 168); c.quadraticCurveTo(70, 230, 76, 290); c.stroke();
    c.beginPath(); c.moveTo(90, 150); c.quadraticCurveTo(80, 220, 76, 290); c.stroke();
    if (P.balloonR) {
      c.fillStyle = '#58a84c';
      c.beginPath(); c.ellipse(390, 142, 19, 24, 0, 0, TAU); c.fill();
      c.strokeStyle = '#8a93a8';
      c.beginPath(); c.moveTo(390, 166); c.quadraticCurveTo(384, 230, 390, 290); c.stroke();
    }

    // 선물
    rr(c, 66, 372, 52, 48, 6, '#5fb8e8');
    rr(c, 87, 372, 10, 48, 3, P.ribbon);
    disc(c, 86, 370, 6, P.ribbon); disc(c, 98, 370, 6, P.ribbon);

    if (P.hat) {
      tri(c, [[338, 420], [382, 420], [360, 362]], '#a48ae8');
      disc(c, 360, 362, 6, '#f2c94c');
      disc(c, 352, 400, 3.5, '#fdf0e0'); disc(c, 366, 388, 3.5, '#fdf0e0');
    }

    rr(c, 296, 384, 28, 36, 5, '#f28a3d');                       // 주스 컵
    if (P.straw) {
      c.strokeStyle = '#e8646c'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(314, 386); c.lineTo(324, 360); c.stroke();
    }
  }
};

/* ── 장면 7: 기차 ────────────────────────────────────────── */
const TRAIN = {
  name: '기차', ico: '🚂',
  base: { engine: '#d95f4b', cargo: '#e04a3a', smoke: true, cloud: true, tree: true,
          light: '#ffe14d', bird: true, tie: true, flag: true },
  alt:  { engine: '#58a84c', cargo: '#5fb8e8', smoke: false, cloud: false, tree: false,
          light: '#9aa8c0', bird: false, tie: false, flag: false },
  spots: {
    engine: { x: 118, y: 414, r: 54 }, cargo: { x: 284, y: 402, r: 42 },
    smoke: { x: 158, y: 318, r: 36 }, cloud: { x: 300, y: 84, r: 40 },
    tree: { x: 392, y: 296, r: 38 }, light: { x: 178, y: 414, r: 20 },
    bird: { x: 250, y: 128, r: 28 }, tie: { x: 308, y: 477, r: 22 },
    flag: { x: 70, y: 334, r: 26 }
  },
  draw(c, P) {
    c.fillStyle = grad(c, 548, '#c8ecf7', '#f2fbff');
    c.fillRect(0, 0, 452, 548);
    c.fillStyle = '#8fbf6f';                                     // 언덕
    c.beginPath();
    c.moveTo(0, 548); c.lineTo(0, 400);
    c.quadraticCurveTo(140, 330, 280, 396);
    c.quadraticCurveTo(380, 340, 452, 386);
    c.lineTo(452, 548); c.closePath(); c.fill();

    disc(c, 402, 62, 27, '#ffd21e');
    if (P.cloud) cloud(c, 300, 84, 0.9, '#ffffff');
    if (P.bird) {
      c.strokeStyle = '#3a3f4a'; c.lineWidth = 4;
      c.beginPath(); c.arc(241, 128, 10, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      c.beginPath(); c.arc(259, 128, 10, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    }
    if (P.tree) {
      rr(c, 386, 300, 13, 34, 4, '#8a5a2b');
      disc(c, 392, 284, 26, '#58a84c');
      disc(c, 374, 296, 16, '#63b356'); disc(c, 410, 297, 15, '#63b356');
    }

    // 선로
    c.strokeStyle = '#8a6a4a'; c.lineWidth = 7;
    for (let tx = 24; tx < 452; tx += 36) {
      if (tx === 312 && !P.tie) continue;
      c.beginPath(); c.moveTo(tx, 466); c.lineTo(tx, 490); c.stroke();
    }
    c.strokeStyle = '#6b6154'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(0, 468); c.lineTo(452, 468); c.stroke();
    c.beginPath(); c.moveTo(0, 486); c.lineTo(452, 486); c.stroke();

    // 기관차
    if (P.smoke) {
      disc(c, 150, 342, 9, 'rgba(160,170,185,.8)');
      disc(c, 158, 318, 12, 'rgba(160,170,185,.65)');
      disc(c, 168, 292, 15, 'rgba(160,170,185,.5)');
    }
    rr(c, 140, 360, 18, 36, 3, '#4a4038');                       // 굴뚝
    if (P.flag) {
      c.strokeStyle = '#8a93a8'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(68, 352); c.lineTo(68, 324); c.stroke();
      tri(c, [[68, 324], [92, 330], [68, 338]], '#f2c94c');
    }
    rr(c, 58, 352, 46, 56, 6, P.engine);                         // 운전칸
    rr(c, 52, 344, 58, 12, 4, '#4a4038');
    rr(c, 66, 362, 30, 22, 4, '#cfeaf7');
    rr(c, 58, 392, 122, 64, 8, P.engine);                        // 몸체
    disc(c, 178, 414, 7, P.light);                               // 전조등
    c.strokeStyle = '#4a4038'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(178, 414, 7, 0, TAU); c.stroke();
    for (const [wx, wr] of [[86, 16], [130, 16], [166, 12]]) {
      disc(c, wx, 460, wr, '#3a3f4a'); disc(c, wx, 460, wr * 0.45, '#9aa8c0');
    }

    // 짐칸
    c.strokeStyle = '#4a4038'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(180, 430); c.lineTo(228, 430); c.stroke();
    rr(c, 228, 408, 108, 48, 6, '#8a5a2b');
    for (const [dx, dy] of [[22, -6], [48, -12], [74, -6], [92, -2]])
      disc(c, 228 + dx, 408 + dy, 9, P.cargo);
    disc(c, 254, 460, 13, '#3a3f4a'); disc(c, 254, 460, 6, '#9aa8c0');
    disc(c, 310, 460, 13, '#3a3f4a'); disc(c, 310, 460, 6, '#9aa8c0');
  }
};

/* ── 장면 8: 겨울 ────────────────────────────────────────── */
const WINTER = {
  name: '겨울', ico: '⛄',
  base: { hat: '#d95f4b', sled: '#d95f4b', scarf: '#e8646c', bunny: true, nose: 'carrot',
          buttons: 3, flake: true, star: true, treeSnow: true },
  alt:  { hat: '#3a5fa8', sled: '#8a5a2b', scarf: '#58a84c', bunny: false, nose: 'button',
          buttons: 2, flake: false, star: false, treeSnow: false },
  spots: {
    hat: { x: 190, y: 304, r: 36 }, sled: { x: 84, y: 466, r: 40 },
    scarf: { x: 192, y: 370, r: 30 }, bunny: { x: 318, y: 472, r: 30 },
    nose: { x: 202, y: 352, r: 22 }, buttons: { x: 190, y: 412, r: 20 },
    flake: { x: 64, y: 120, r: 28 }, star: { x: 380, y: 308, r: 22 },
    treeSnow: { x: 380, y: 385, r: 46 }
  },
  draw(c, P) {
    c.fillStyle = grad(c, 548, '#cfe2f2', '#eef7fd');
    c.fillRect(0, 0, 452, 548);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(0, 400); c.quadraticCurveTo(226, 372, 452, 400);
    c.lineTo(452, 548); c.lineTo(0, 548); c.closePath(); c.fill();

    c.globalAlpha = 0.85;
    for (const [sx, sy] of [[40, 60], [130, 40], [250, 70], [330, 44], [420, 100],
                            [100, 200], [300, 170], [420, 220], [40, 300]])
      disc(c, sx, sy, 3.2, '#ffffff');
    c.globalAlpha = 1;
    if (P.flake) {
      sparkle(c, 64, 120, 13, '#ffffff');
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * Math.PI;
        c.beginPath();
        c.moveTo(64 - Math.cos(a) * 11, 120 - Math.sin(a) * 11);
        c.lineTo(64 + Math.cos(a) * 11, 120 + Math.sin(a) * 11);
        c.stroke();
      }
    }

    // 나무
    rr(c, 372, 428, 16, 42, 4, '#8a5a2b');
    tri(c, [[380, 316], [346, 372], [414, 372]], '#3f7f4f');
    tri(c, [[380, 344], [338, 406], [422, 406]], '#3f7f4f');
    tri(c, [[380, 376], [330, 438], [430, 438]], '#3f7f4f');
    if (P.treeSnow) {
      tri(c, [[380, 316], [366, 340], [394, 340]], '#ffffff');
      tri(c, [[380, 344], [364, 368], [396, 368]], '#ffffff');
      tri(c, [[380, 376], [362, 400], [398, 400]], '#ffffff');
    }
    if (P.star) sparkle(c, 380, 308, 11, '#ffd21e');

    // 눈사람
    const line = (x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
    c.strokeStyle = '#8a5a2b'; c.lineWidth = 5; c.lineCap = 'round';
    line(152, 390, 112, 362); line(112, 362, 102, 368); line(112, 362, 106, 352);
    line(228, 390, 268, 360); line(268, 360, 278, 366); line(268, 360, 274, 350);
    for (const [cy, cr] of [[462, 52], [398, 38], [340, 27]]) {
      disc(c, 190, cy, cr, '#ffffff');
      c.strokeStyle = '#dbe8f0'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(190, cy, cr, 0, TAU); c.stroke();
    }
    rr(c, 160, 316, 60, 10, 4, P.hat);
    rr(c, 172, 286, 36, 32, 4, P.hat);
    disc(c, 181, 334, 3, '#26303a'); disc(c, 199, 334, 3, '#26303a');
    for (const a of [2.0, 2.35, 2.7]) disc(c, 190 + Math.cos(a) * -12, 348 + Math.sin(a) * 4, 1.8, '#26303a');
    if (P.nose === 'carrot') tri(c, [[190, 348], [190, 358], [218, 355]], '#f2884c');
    else disc(c, 196, 352, 4.5, '#3a3f4a');
    rr(c, 166, 362, 48, 13, 6, P.scarf);
    rr(c, 204, 372, 13, 30, 5, P.scarf);
    const bn = [384, 398, 412];
    for (let i = 0; i < P.buttons; i++) disc(c, 190, bn[i], 4, '#3a3f4a');

    // 썰매
    rr(c, 48, 458, 74, 15, 7, P.sled);
    c.strokeStyle = '#8a93a8'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(42, 480); c.quadraticCurveTo(36, 470, 44, 464); c.stroke();
    c.beginPath(); c.moveTo(42, 480); c.lineTo(126, 480); c.stroke();
    c.strokeStyle = '#b08a5a'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(48, 464); c.quadraticCurveTo(30, 440, 38, 420); c.stroke();

    if (P.bunny) {
      disc(c, 312, 478, 15, '#ffffff');
      disc(c, 326, 466, 10, '#ffffff');
      c.strokeStyle = '#dbe8f0'; c.lineWidth = 2;
      c.beginPath(); c.arc(312, 478, 15, 0, TAU); c.stroke();
      c.beginPath(); c.arc(326, 466, 10, 0, TAU); c.stroke();
      for (const dx of [-4, 3]) {
        c.fillStyle = '#ffffff';
        c.beginPath(); c.ellipse(326 + dx, 450, 3.5, 9, dx * 0.04, 0, TAU); c.fill();
      }
      disc(c, 329, 464, 1.8, '#26303a'); disc(c, 334, 468, 2, '#f2a8b8');
    }
  }
};

const SCENES = { house: HOUSE, sea: SEA, night: NIGHT,
                 farm: FARM, park: PARK, bday: BDAY, train: TRAIN, winter: WINTER };

/* 24문제: 장면 8 × 난이도 3. diffs 가 그 문제에서 바뀌는 항목이다 */
export const SPOTS = [
  { id: 'house1',  scene: 'house',  hard: 1, diffs: ['roof', 'bird'] },
  { id: 'sea1',    scene: 'sea',    hard: 1, diffs: ['fish', 'crab'] },
  { id: 'night1',  scene: 'night',  hard: 1, diffs: ['moon', 'planet'] },
  { id: 'farm1',   scene: 'farm',   hard: 1, diffs: ['barn', 'pig'] },
  { id: 'park1',   scene: 'park',   hard: 1, diffs: ['slide', 'dog'] },
  { id: 'bday1',   scene: 'bday',   hard: 1, diffs: ['cake', 'balloonL'] },
  { id: 'train1',  scene: 'train',  hard: 1, diffs: ['engine', 'cargo'] },
  { id: 'winter1', scene: 'winter', hard: 1, diffs: ['hat', 'sled'] },

  { id: 'house2',  scene: 'house',  hard: 2, diffs: ['door', 'cloudB', 'flower'] },
  { id: 'sea2',    scene: 'sea',    hard: 2, diffs: ['star', 'weed', 'jelly'] },
  { id: 'night2',  scene: 'night',  hard: 2, diffs: ['ring', 'comet', 'flame'] },
  { id: 'farm2',   scene: 'farm',   hard: 2, diffs: ['door', 'hay', 'sunflower'] },
  { id: 'park2',   scene: 'park',   hard: 2, diffs: ['balloon', 'kite', 'ball'] },
  { id: 'bday2',   scene: 'bday',   hard: 2, diffs: ['ribbon', 'balloonR', 'hat'] },
  { id: 'train2',  scene: 'train',  hard: 2, diffs: ['smoke', 'cloud', 'tree'] },
  { id: 'winter2', scene: 'winter', hard: 2, diffs: ['scarf', 'bunny', 'nose'] },

  { id: 'house3',  scene: 'house',  hard: 3, diffs: ['apples', 'curtain', 'smoke', 'knob'] },
  { id: 'sea3',    scene: 'sea',    hard: 3, diffs: ['smallfish', 'shell', 'bubbles', 'weed'] },
  { id: 'night3',  scene: 'night',  hard: 3, diffs: ['winN', 'bigstar', 'ufo', 'fin'] },
  { id: 'farm3',   scene: 'farm',   hard: 3, diffs: ['cowSpots', 'fence', 'butterfly', 'chick'] },
  { id: 'park3',   scene: 'park',   hard: 3, diffs: ['tulip', 'cloudB', 'bows', 'rungs'] },
  { id: 'bday3',   scene: 'bday',   hard: 3, diffs: ['candles', 'flag', 'straw', 'sprinkle'] },
  { id: 'train3',  scene: 'train',  hard: 3, diffs: ['light', 'bird', 'tie', 'flag'] },
  { id: 'winter3', scene: 'winter', hard: 3, diffs: ['buttons', 'flake', 'star', 'treeSnow'] }
].map(L => ({ ...L, name: SCENES[L.scene].name, ico: SCENES[L.scene].ico }));

/**
 * @returns {{ drawL, drawR, diffs }}
 *   drawL/drawR : 그림판 로컬(452×548) 좌표계에 왼쪽/오른쪽 그림을 그린다
 *   diffs       : 다른 곳 [{x, y, r}] (판 로컬)
 */
export function buildSpot(level) {
  const S = SCENES[level.scene];
  const alt = { ...S.base };
  for (const k of level.diffs) alt[k] = S.alt[k];
  return {
    drawL: (c) => S.draw(c, S.base),
    drawR: (c) => S.draw(c, alt),
    diffs: level.diffs.map(k => ({ ...S.spots[k] }))
  };
}
