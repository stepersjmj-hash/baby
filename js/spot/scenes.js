/* ============================================================
   spot/scenes.js — 다른 그림 찾기 문제 (직접 그린 장면)
   ------------------------------------------------------------
   이모지가 아니라 캔버스로 그린 장면 세 개(우리 집·바닷속·밤하늘)를
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

const SCENES = { house: HOUSE, sea: SEA, night: NIGHT };

/* 9문제: 장면 3 × 난이도 3. diffs 가 그 문제에서 바뀌는 항목이다 */
export const SPOTS = [
  { id: 'house1', scene: 'house', hard: 1, diffs: ['roof', 'bird'] },
  { id: 'sea1',   scene: 'sea',   hard: 1, diffs: ['fish', 'crab'] },
  { id: 'night1', scene: 'night', hard: 1, diffs: ['moon', 'planet'] },
  { id: 'house2', scene: 'house', hard: 2, diffs: ['door', 'cloudB', 'flower'] },
  { id: 'sea2',   scene: 'sea',   hard: 2, diffs: ['star', 'weed', 'jelly'] },
  { id: 'night2', scene: 'night', hard: 2, diffs: ['ring', 'comet', 'flame'] },
  { id: 'house3', scene: 'house', hard: 3, diffs: ['apples', 'curtain', 'smoke', 'knob'] },
  { id: 'sea3',   scene: 'sea',   hard: 3, diffs: ['smallfish', 'shell', 'bubbles', 'weed'] },
  { id: 'night3', scene: 'night', hard: 3, diffs: ['winN', 'bigstar', 'ufo', 'fin'] }
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
