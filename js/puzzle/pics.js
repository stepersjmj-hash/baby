/* ============================================================
   puzzle/pics.js — 조각 퍼즐 그림 9장 (난이도별 3장)
   ------------------------------------------------------------
   그림 자산이 없으므로 장면을 **캔버스에 직접 그린다**. 예전에는 배경
   그라데이션 위에 이모지를 찍었는데, 기기마다 그림이 달라지고 iOS 는
   큰 이모지를 아예 안 찍어 주는 함정까지 있어서 전부 손으로 그렸다
   (다른 그림 찾기·세어보기가 같은 이유로 먼저 바뀌었다).

   조각으로 잘랐을 때 어디가 어딘지 알아보려면 **큰 주인공 하나 +
   배경 소품 두어 개**가 제일 좋다. 소품이 많으면 조각마다 비슷해진다.

   난이도는 조각 수로 갈린다 (하 3 · 중 5 · 상 8, cut.js 의 PIECES).
   장면 좌표계는 판과 같은 **560×420** (cut.js 의 PIC) — drawScene 이
   요청받은 크기에 맞춰 눌러 준다. 칩(76×56)도 같은 비율이라 그대로 준다.
   ============================================================ */

export const SCENE = { w: 560, h: 420 };

const TAU = Math.PI * 2;

const disc = (c, x, y, r, f) => { c.fillStyle = f; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
const ell = (c, x, y, rx, ry, f, rot = 0) => {
  c.fillStyle = f; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill();
};
const rr = (c, x, y, w, h, r, f) => {
  c.fillStyle = f; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill();
};
const poly = (c, pts, f) => {
  c.fillStyle = f; c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.closePath(); c.fill();
};
const line = (c, pts, col, w) => {
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.stroke();
};
const sky = (c, a, b) => {
  const g = c.createLinearGradient(0, 0, 0, SCENE.h);
  g.addColorStop(0, a); g.addColorStop(1, b);
  c.fillStyle = g; c.fillRect(0, 0, SCENE.w, SCENE.h);
};

/* 자주 쓰는 소품 ------------------------------------------------ */
function cloud(c, x, y, s, f = '#ffffff') {
  c.fillStyle = f;
  c.beginPath();
  c.arc(x - 30 * s, y, 19 * s, 0, TAU);
  c.arc(x, y - 14 * s, 25 * s, 0, TAU);
  c.arc(x + 31 * s, y, 20 * s, 0, TAU);
  c.rect(x - 30 * s, y, 61 * s, 19 * s);
  c.fill();
}
function sun(c, x, y, r, f = '#ffd21e') {
  c.strokeStyle = f; c.lineWidth = r * 0.2; c.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8;
    c.beginPath();
    c.moveTo(x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35);
    c.lineTo(x + Math.cos(a) * r * 1.75, y + Math.sin(a) * r * 1.75);
    c.stroke();
  }
  disc(c, x, y, r, f);
}
function star(c, x, y, r, f) {
  c.fillStyle = f; c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * q, py = y + Math.sin(a) * q;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath(); c.fill();
}
function eye(c, x, y, r) {
  disc(c, x, y, r, '#3a2f2a');
  disc(c, x - r * 0.3, y - r * 0.35, r * 0.34, '#ffffff');
}
/** 아래를 덮는 땅 — 살짝 볼록한 언덕 */
function ground(c, y, f) {
  c.fillStyle = f;
  c.beginPath();
  c.moveTo(0, y + 26);
  c.quadraticCurveTo(SCENE.w / 2, y - 18, SCENE.w, y + 26);
  c.lineTo(SCENE.w, SCENE.h); c.lineTo(0, SCENE.h);
  c.closePath(); c.fill();
}
function leaf(c, x, y, r, rot, f) {
  c.save(); c.translate(x, y); c.rotate(rot);
  ell(c, 0, 0, r, r * 0.5, f);
  line(c, [[-r * 0.8, 0], [r * 0.8, 0]], 'rgba(0,0,0,.12)', r * 0.09);
  c.restore();
}

/* ── 하: 3조각 ────────────────────────────────────────────── */
function drawApple(c) {
  sky(c, '#eaf7d3', '#fdfbe8');
  ground(c, 336, '#95d472');
  leaf(c, 96, 104, 40, -0.55, '#7ec86a');

  // 사과 — 로브 둘이 맞물린 실루엣
  c.fillStyle = '#e8433f';
  c.beginPath();
  c.moveTo(280, 172);
  c.bezierCurveTo(232, 136, 168, 172, 178, 246);
  c.bezierCurveTo(186, 310, 236, 352, 280, 352);
  c.bezierCurveTo(324, 352, 374, 310, 382, 246);
  c.bezierCurveTo(392, 172, 328, 136, 280, 172);
  c.fill();
  ell(c, 232, 218, 24, 33, 'rgba(255,255,255,.30)', -0.45);
  line(c, [[280, 176], [289, 126]], '#8a5a32', 10);
  leaf(c, 318, 122, 30, -0.5, '#5fbf5a');

  // 애벌레
  for (let i = 0; i < 3; i++) disc(c, 424 + i * 24, 336 - (i % 2) * 8, 15, '#8fce6f');
  disc(c, 492, 328, 17, '#6fbf5a');
  eye(c, 497, 323, 4);
  line(c, [[492, 313], [489, 302]], '#6fbf5a', 4);
  line(c, [[499, 313], [503, 302]], '#6fbf5a', 4);
}

function drawChick(c) {
  sky(c, '#fff3c9', '#fffdf0');
  sun(c, 470, 74, 34);
  ground(c, 344, '#b9e08a');

  // 꽃
  line(c, [[96, 400], [96, 330]], '#6fbf5a', 8);
  for (let i = 0; i < 5; i++) {
    const a = i * TAU / 5 - Math.PI / 2;
    disc(c, 96 + Math.cos(a) * 24, 322 + Math.sin(a) * 24, 16, '#ffffff');
  }
  disc(c, 96, 322, 14, '#ffc94d');

  // 병아리
  ell(c, 285, 278, 90, 78, '#ffd24d');
  ell(c, 250, 288, 40, 44, '#f7c332', -0.25);           // 날개
  disc(c, 285, 182, 58, '#ffd24d');
  poly(c, [[338, 178], [376, 190], [338, 200]], '#ff9c33');   // 부리
  eye(c, 305, 168, 8);
  eye(c, 268, 170, 7);
  line(c, [[262, 348], [258, 384]], '#ff9c33', 9);
  line(c, [[308, 348], [312, 384]], '#ff9c33', 9);
  line(c, [[248, 384], [270, 384]], '#ff9c33', 9);
  line(c, [[302, 384], [324, 384]], '#ff9c33', 9);
}

function drawCar(c) {
  sky(c, '#dff0ff', '#f7fbff');
  cloud(c, 104, 84, 1);
  c.fillStyle = '#8c9199';                                    // 도로
  c.fillRect(0, 320, SCENE.w, 100);
  c.fillStyle = '#b6bcc4';
  c.fillRect(0, 320, SCENE.w, 8);
  for (let x = 20; x < SCENE.w; x += 76) rr(c, x, 388, 42, 7, 3.5, '#f2f3f5');

  // 신호등
  line(c, [[492, 320], [492, 218]], '#5c636b', 10);
  rr(c, 470, 138, 44, 92, 12, '#4a5058');
  disc(c, 492, 162, 13, '#ff5a5a');
  disc(c, 492, 190, 13, '#ffd24d');
  disc(c, 492, 214, 13, '#5fd18a');

  // 자동차
  poly(c, [[190, 246], [230, 196], [318, 196], [352, 246]], '#e8524f');
  rr(c, 132, 240, 268, 74, 26, '#ff6b6b');
  rr(c, 236, 206, 78, 42, 9, '#cfeaff');
  rr(c, 196, 206, 34, 42, 9, '#cfeaff');
  rr(c, 372, 262, 26, 18, 7, '#ffe9a8');                      // 헤드라이트
  disc(c, 196, 314, 32, '#3c4149'); disc(c, 196, 314, 13, '#d9dde2');
  disc(c, 336, 314, 32, '#3c4149'); disc(c, 336, 314, 13, '#d9dde2');
}

/* ── 중: 5조각 ────────────────────────────────────────────── */
function drawDino(c) {
  sky(c, '#d9f2d0', '#f4ffe9');

  // 화산 — 꼭대기가 벌어진 산에서 용암이 흘러넘친다
  poly(c, [[386, 306], [438, 150], [478, 150], [526, 306]], '#9c8271');
  poly(c, [[438, 150], [478, 150], [498, 214], [420, 214]], '#7d6759');
  c.fillStyle = '#e8524f';
  c.beginPath();
  c.moveTo(438, 152);
  c.quadraticCurveTo(458, 144, 478, 152);
  c.quadraticCurveTo(470, 190, 482, 232);
  c.quadraticCurveTo(458, 214, 436, 236);
  c.quadraticCurveTo(444, 192, 438, 152);
  c.fill();
  disc(c, 448, 122, 11, '#f2846b');
  disc(c, 472, 106, 8, '#f2846b');
  disc(c, 460, 84, 5, '#f2846b');

  // 야자수 — 잎을 길고 낮게 벌려야 야자수로 보인다 (뭉치면 브로콜리다)
  c.strokeStyle = '#a9743f'; c.lineWidth = 15; c.lineCap = 'round';
  c.beginPath(); c.moveTo(66, 344); c.quadraticCurveTo(78, 268, 100, 198); c.stroke();
  for (const [dx, dy] of [[-72, -6], [-50, -34], [10, -40], [62, -14], [40, 16], [-34, 22]]) {
    c.fillStyle = '#5fbf5a';
    c.beginPath();
    c.moveTo(100, 198);
    c.quadraticCurveTo(100 + dx * 0.55, 198 + dy * 0.55 - 16, 100 + dx, 198 + dy);
    c.quadraticCurveTo(100 + dx * 0.55, 198 + dy * 0.55 + 16, 100, 198);
    c.fill();
  }
  disc(c, 100, 198, 12, '#4f9c40');
  ground(c, 322, '#8fce6f');

  // 공룡 (긴 목)
  c.fillStyle = '#6fbf5a';
  c.beginPath();                                              // 꼬리
  c.moveTo(212, 300);
  c.quadraticCurveTo(126, 300, 66, 246);
  c.quadraticCurveTo(122, 282, 214, 274);
  c.fill();
  ell(c, 268, 296, 96, 58, '#6fbf5a');
  c.strokeStyle = '#6fbf5a'; c.lineWidth = 30; c.lineCap = 'round';
  c.beginPath();                                              // 목
  c.moveTo(320, 262);
  c.quadraticCurveTo(378, 236, 366, 168);
  c.stroke();
  ell(c, 362, 152, 38, 27, '#6fbf5a', -0.15);
  eye(c, 376, 145, 6);
  for (const x of [222, 262, 300]) rr(c, x - 12, 336, 26, 44, 11, '#5aab48');
  for (let i = 0; i < 4; i++)                                  // 등 돌기
    poly(c, [[236 + i * 26, 250], [248 + i * 26, 222], [260 + i * 26, 250]], '#4f9c40');
}

function drawRocket(c) {
  sky(c, '#22315c', '#45568c');
  for (const [x, y, r] of [[70, 60, 4], [150, 120, 3], [300, 52, 4.5], [420, 96, 3],
                           [96, 232, 3], [500, 210, 4], [368, 300, 3], [190, 356, 3.5]])
    disc(c, x, y, r, '#ffffff');
  star(c, 458, 62, 20, '#ffe066');

  // 토성
  disc(c, 104, 118, 40, '#f0b169');
  c.save(); c.translate(104, 118); c.rotate(-0.42);
  c.strokeStyle = '#ffe0b0'; c.lineWidth = 8;
  c.beginPath(); c.ellipse(0, 0, 66, 19, 0, 0, TAU); c.stroke();
  c.restore();

  // 지구
  disc(c, 468, 340, 46, '#4aa8e8');
  c.save(); c.beginPath(); c.arc(468, 340, 46, 0, TAU); c.clip();
  ell(c, 448, 322, 24, 15, '#6fbf5a', -0.3);
  ell(c, 486, 356, 20, 12, '#6fbf5a', 0.25);
  c.restore();

  // 로켓
  poly(c, [[268, 116], [304, 176], [304, 292], [232, 292], [232, 176]], '#f2eee6');
  poly(c, [[232, 232], [186, 300], [232, 292]], '#e8524f');
  poly(c, [[304, 232], [350, 300], [304, 292]], '#e8524f');
  poly(c, [[232, 292], [304, 292], [286, 320], [250, 320]], '#c9c3b8');
  disc(c, 268, 202, 24, '#7fd0f5'); disc(c, 268, 202, 24 * 0.62, '#cfeaff');
  poly(c, [[250, 320], [268, 386], [286, 320]], '#ffb347');
  poly(c, [[258, 320], [268, 356], [278, 320]], '#ffe066');
}

function drawOctopus(c) {
  sky(c, '#7fc9e8', '#cfeef8');
  c.fillStyle = '#f2e0b6';                                    // 모래
  c.beginPath();
  c.moveTo(0, 372); c.quadraticCurveTo(280, 336, 560, 376);
  c.lineTo(560, 420); c.lineTo(0, 420); c.closePath(); c.fill();
  for (const [x, s] of [[486, 1], [516, 0.8], [456, 0.7]]) {   // 해초
    c.strokeStyle = '#4fae6a'; c.lineWidth = 11 * s; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x, 384);
    c.bezierCurveTo(x - 26 * s, 340, x + 26 * s, 300, x - 8 * s, 250);
    c.stroke();
  }
  // 물고기
  ell(c, 96, 132, 36, 23, '#4aa8e8');
  poly(c, [[60, 132], [26, 112], [26, 152]], '#3a92cf');
  eye(c, 110, 126, 5);
  // 복어 — 가시를 길게 뻗치면 해처럼 보인다. 짧게 눕히고 지느러미·입을 준다
  ell(c, 462, 132, 40, 36, '#f0a24a');
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    poly(c, [[462 + Math.cos(a) * 38, 132 + Math.sin(a) * 34],
             [462 + Math.cos(a + 0.16) * 48, 132 + Math.sin(a + 0.16) * 44],
             [462 + Math.cos(a + 0.32) * 38, 132 + Math.sin(a + 0.32) * 34]], '#d9873a');
  }
  ell(c, 462, 132, 40, 36, '#f0a24a');
  ell(c, 462, 146, 26, 16, '#ffd9a8');
  eye(c, 446, 122, 6);
  eye(c, 478, 122, 6);
  disc(c, 462, 150, 6, '#c96a2e');
  for (const [x, y, r] of [[152, 208, 7], [172, 182, 5], [160, 158, 4]])
    disc(c, x, y, r, 'rgba(255,255,255,.55)');

  // 문어
  c.strokeStyle = '#a95cd8'; c.lineWidth = 22; c.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const x = 190 + i * 36, dir = i % 2 ? 1 : -1;
    c.beginPath();
    c.moveTo(x, 288);
    c.bezierCurveTo(x + dir * 22, 330, x - dir * 20, 352, x + dir * 14, 380);
    c.stroke();
  }
  ell(c, 268, 224, 96, 88, '#b06be0');
  ell(c, 240, 196, 22, 26, 'rgba(255,255,255,.22)', -0.3);
  eye(c, 236, 214, 13);
  eye(c, 300, 214, 13);
  c.strokeStyle = '#7b3fa8'; c.lineWidth = 5;
  c.beginPath(); c.arc(268, 252, 18, 0.25, Math.PI - 0.25); c.stroke();
}

/* ── 상: 8조각 ────────────────────────────────────────────── */
function drawZoo(c) {
  sky(c, '#ffedcc', '#fff9ec');
  ground(c, 300, '#e0c88c');
  for (const [x, s] of [[52, 1], [520, 0.85]]) {              // 풀숲
    c.fillStyle = '#6fbf5a';
    for (let i = -1; i <= 1; i++)
      poly(c, [[x + i * 22 * s - 14 * s, 400], [x + i * 22 * s, 330 - Math.abs(i) * 18 * s],
               [x + i * 22 * s + 14 * s, 400]], '#6fbf5a');
  }

  // 기린
  rr(c, 300, 122, 34, 178, 16, '#f0c04a');
  ell(c, 326, 116, 32, 24, '#f0c04a', -0.2);
  line(c, [[314, 94], [310, 78]], '#f0c04a', 7);
  line(c, [[334, 94], [338, 78]], '#f0c04a', 7);
  eye(c, 338, 110, 5);
  ell(c, 310, 298, 46, 34, '#f0c04a');
  for (const [x, y] of [[308, 164], [322, 204], [306, 238], [296, 294], [322, 302]])
    disc(c, x, y, 9, '#c98f2e');
  line(c, [[292, 324], [288, 368]], '#f0c04a', 11);
  line(c, [[328, 324], [332, 368]], '#f0c04a', 11);

  // 코끼리 — 코가 몸통과 같은 회색이라 묻힌다. 길게 늘이고 주름을 넣어 띄운다
  ell(c, 470, 292, 68, 56, '#a8b0ba');
  line(c, [[446, 340], [446, 376]], '#98a1ac', 16);
  line(c, [[496, 340], [496, 376]], '#98a1ac', 16);
  disc(c, 412, 250, 46, '#b6bec8');
  ell(c, 452, 238, 24, 30, '#98a1ac', 0.3);                   // 귀
  c.strokeStyle = '#b6bec8'; c.lineWidth = 19; c.lineCap = 'round';
  c.beginPath(); c.moveTo(380, 266); c.quadraticCurveTo(348, 312, 366, 352); c.stroke();
  c.strokeStyle = 'rgba(120,128,138,.45)'; c.lineWidth = 3;
  for (const [x, y, x2, y2] of [[364, 288, 380, 284], [358, 312, 374, 310], [364, 334, 378, 338]]) {
    c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
  }
  eye(c, 400, 240, 6);

  // 사자
  disc(c, 168, 268, 66, '#d99a4e');
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    ell(c, 168 + Math.cos(a) * 60, 268 + Math.sin(a) * 60, 20, 13, '#c07a34', a);
  }
  disc(c, 168, 268, 48, '#f0c07a');
  eye(c, 152, 258, 7);
  eye(c, 186, 258, 7);
  ell(c, 169, 282, 9, 6, '#8a5a32');
  c.strokeStyle = '#8a5a32'; c.lineWidth = 4;
  c.beginPath(); c.arc(160, 292, 10, 0, Math.PI); c.arc(180, 292, 10, 0, Math.PI); c.stroke();
  ell(c, 168, 356, 52, 32, '#d99a4e');
}

function drawCity(c) {
  sky(c, '#dceafe', '#f2f7ff');
  cloud(c, 92, 70, 0.9);
  cloud(c, 452, 96, 0.7);

  const windows = (x, y, w, h, cols, rows, on) => {
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++)
        rr(c, x + 12 + i * ((w - 24) / cols), y + 14 + j * ((h - 28) / rows),
           (w - 24) / cols - 8, (h - 28) / rows - 10, 3,
           ((i + j) % 3 === on) ? '#ffe066' : '#bcd4ee');
  };
  rr(c, 96, 150, 116, 200, 8, '#7f93b8');  windows(96, 150, 116, 200, 3, 5, 0);
  rr(c, 232, 96, 100, 254, 8, '#98a9c9');  windows(232, 96, 100, 254, 2, 6, 1);
  rr(c, 352, 178, 128, 172, 8, '#8a9dc0'); windows(352, 178, 128, 172, 3, 4, 2);
  poly(c, [[352, 178], [416, 138], [480, 178]], '#6f82a8');

  c.fillStyle = '#8c9199'; c.fillRect(0, 348, SCENE.w, 72);   // 도로
  for (let x = 16; x < SCENE.w; x += 72) rr(c, x, 400, 38, 6, 3, '#f2f3f5');

  // 택시
  poly(c, [[172, 356], [196, 326], [252, 326], [274, 356]], '#e8b52e');
  rr(c, 148, 352, 172, 42, 15, '#ffd24d');
  rr(c, 200, 332, 46, 24, 6, '#cfeaff');
  rr(c, 218, 314, 34, 14, 4, '#f2f3f5');
  disc(c, 190, 394, 19, '#3c4149'); disc(c, 190, 394, 8, '#d9dde2');
  disc(c, 282, 394, 19, '#3c4149'); disc(c, 282, 394, 8, '#d9dde2');
}

function drawBeach(c) {
  sky(c, '#bfe6f5', '#a8dcf0');
  sun(c, 78, 72, 30);
  c.fillStyle = '#4aa8e8';                                    // 바다
  c.fillRect(0, 196, SCENE.w, 76);
  c.strokeStyle = '#cfeaff'; c.lineWidth = 6; c.lineCap = 'round';
  for (let j = 0; j < 2; j++) {
    c.beginPath();
    for (let x = -20; x < SCENE.w + 20; x += 60) {
      c.moveTo(x, 218 + j * 32);
      c.quadraticCurveTo(x + 15, 208 + j * 32, x + 30, 218 + j * 32);
      c.quadraticCurveTo(x + 45, 228 + j * 32, x + 60, 218 + j * 32);
    }
    c.stroke();
  }
  c.fillStyle = '#f2dda6';                                    // 모래
  c.beginPath();
  c.moveTo(0, 288); c.quadraticCurveTo(280, 258, 560, 292);
  c.lineTo(560, 420); c.lineTo(0, 420); c.closePath(); c.fill();

  // 파라솔
  line(c, [[196, 380], [196, 168]], '#a9743f', 9);
  for (let i = 0; i < 4; i++) {
    const a0 = Math.PI + i * Math.PI / 4;
    c.fillStyle = i % 2 ? '#f2f3f5' : '#e8524f';
    c.beginPath(); c.moveTo(196, 168);
    c.arc(196, 168, 104, a0, a0 + Math.PI / 4);
    c.closePath(); c.fill();
  }
  disc(c, 196, 166, 8, '#e8524f');

  // 공
  disc(c, 336, 336, 34, '#fffdf7');
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 4;
    c.fillStyle = ['#e8524f', '#4aa8e8', '#ffd24d', '#6fbf5a'][i];
    c.beginPath(); c.moveTo(336, 336);
    c.arc(336, 336, 34, a - 0.39, a + 0.39); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(336, 336);
    c.arc(336, 336, 34, a + Math.PI - 0.39, a + Math.PI + 0.39); c.closePath(); c.fill();
  }

  // 게
  ell(c, 468, 348, 40, 28, '#e8524f');
  for (const d of [-1, 1]) {
    line(c, [[468 + d * 30, 352], [468 + d * 52, 366]], '#e8524f', 7);
    line(c, [[468 + d * 26, 362], [468 + d * 44, 382]], '#e8524f', 7);
    disc(c, 468 + d * 58, 326, 13, '#d94340');
    line(c, [[468 + d * 34, 340], [468 + d * 52, 330]], '#e8524f', 7);
  }
  eye(c, 456, 334, 6);
  eye(c, 480, 334, 6);
  // 조개
  c.fillStyle = '#ffc9d6';
  c.beginPath(); c.moveTo(92, 386); c.arc(92, 386, 26, Math.PI, 0); c.closePath(); c.fill();
  c.strokeStyle = '#f2a3b8'; c.lineWidth = 3;
  for (const a of [-2.36, -1.57, -0.79]) {
    c.beginPath(); c.moveTo(92, 386);
    c.lineTo(92 + Math.cos(a) * 25, 386 + Math.sin(a) * 25); c.stroke();
  }
}

/* ── 목록 ─────────────────────────────────────────────────── */
let _n = 0;
const P = (id, name, hard, draw) =>
  ({ id, name, hard, draw, seed: hard * 8117 + (_n++) * 577 + 5 });

export const PICS = [
  /* 하: 3조각 */
  P('apple',   '사과',   1, drawApple),
  P('chick',   '병아리', 1, drawChick),
  P('car',     '자동차', 1, drawCar),
  /* 중: 5조각 */
  P('dino',    '공룡',   2, drawDino),
  P('rocket',  '로켓',   2, drawRocket),
  P('octopus', '문어',   2, drawOctopus),
  /* 상: 8조각 */
  P('zoo',     '동물원', 3, drawZoo),
  P('city',    '도시',   3, drawCity),
  P('beach',   '바닷가', 3, drawBeach)
];

/** 그림 한 장을 (0,0)~(w,h) 에 그린다 (장면 좌표계 560×420 을 눌러 맞춘다) */
export function drawScene(level, c, w, h) {
  if (!level?.draw) {                       // 내 사진 퍼즐 — 그릴 장면이 없다
    c.fillStyle = '#f2ead9';
    c.fillRect(0, 0, w, h);
    return;
  }
  c.save();
  c.scale(w / SCENE.w, h / SCENE.h);
  level.draw(c);
  c.restore();
}
