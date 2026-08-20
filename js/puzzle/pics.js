/* ============================================================
   puzzle/pics.js — 조각 퍼즐 그림 9장 (난이도별 3장)
   ------------------------------------------------------------
   그림 자산이 없으므로 장면을 캔버스에 그린다 — 그라데이션 배경 위에
   이모지 몇 개. 조각으로 잘랐을 때 어디가 어딘지 알아보려면
   큰 주인공 하나 + 배경 소품 두어 개가 제일 좋다.

   난이도는 조각 수로 갈린다 (하 3 · 중 5 · 상 8, cut.js 의 LAYOUTS).
   x, y, s 는 그림 크기 대비 비율 (s 는 세로 기준).
   ============================================================ */

let _n = 0;
const P = (id, name, ico, hard, bg, items) =>
  ({ id, name, ico, hard, bg, items, seed: hard * 8117 + (_n++) * 577 + 5 });

export const PICS = [
  /* ── 하: 3조각 ── */
  P('apple',   '사과',   '🍎', 1, ['#eaf7d3', '#fdfbe8'],
    [{ e: '🍃', x: .20, y: .22, s: .18 }, { e: '🐛', x: .80, y: .74, s: .15 }, { e: '🍎', x: .50, y: .52, s: .58 }]),
  P('chick',   '병아리', '🐣', 1, ['#fff3c9', '#fffdf0'],
    [{ e: '☀️', x: .84, y: .16, s: .19 }, { e: '🌼', x: .15, y: .78, s: .16 }, { e: '🐣', x: .50, y: .55, s: .55 }]),
  P('car',     '자동차', '🚗', 1, ['#dff0ff', '#f7fbff'],
    [{ e: '☁️', x: .18, y: .17, s: .16 }, { e: '🚦', x: .85, y: .32, s: .21 }, { e: '🚗', x: .48, y: .60, s: .50 }]),

  /* ── 중: 5조각 ── */
  P('dino',    '공룡',   '🦕', 2, ['#d9f2d0', '#f4ffe9'],
    [{ e: '🌋', x: .80, y: .28, s: .26 }, { e: '🌴', x: .14, y: .54, s: .30 }, { e: '🦕', x: .50, y: .60, s: .48 }]),
  P('rocket',  '로켓',   '🚀', 2, ['#22315c', '#45568c'],
    [{ e: '🪐', x: .19, y: .22, s: .20 }, { e: '⭐', x: .82, y: .16, s: .12 }, { e: '🌍', x: .83, y: .80, s: .19 },
     { e: '🚀', x: .48, y: .52, s: .46 }]),
  P('octopus', '문어',   '🐙', 2, ['#bfe8f7', '#e6f9ff'],
    [{ e: '🐟', x: .19, y: .28, s: .16 }, { e: '🌿', x: .86, y: .76, s: .22 }, { e: '🐡', x: .76, y: .26, s: .16 },
     { e: '🐙', x: .45, y: .60, s: .48 }]),

  /* ── 상: 8조각 ── */
  P('zoo',     '동물원', '🦁', 3, ['#ffedcc', '#fff9ec'],
    [{ e: '🌿', x: .11, y: .82, s: .16 }, { e: '🦒', x: .56, y: .30, s: .28 }, { e: '🐘', x: .77, y: .58, s: .32 },
     { e: '🦁', x: .28, y: .60, s: .36 }]),
  P('city',    '도시',   '🏙️', 3, ['#dceafe', '#f2f7ff'],
    [{ e: '☁️', x: .14, y: .12, s: .14 }, { e: '🏢', x: .26, y: .42, s: .34 }, { e: '🏫', x: .72, y: .46, s: .30 },
     { e: '🚕', x: .42, y: .82, s: .20 }, { e: '🚦', x: .90, y: .76, s: .18 }]),
  P('beach',   '바닷가', '⛱️', 3, ['#bfe6f5', '#ffedc2'],
    [{ e: '☀️', x: .12, y: .12, s: .16 }, { e: '🌊', x: .86, y: .34, s: .20 }, { e: '⛱️', x: .32, y: .54, s: .34 },
     { e: '🦀', x: .70, y: .80, s: .18 }, { e: '🐚', x: .14, y: .84, s: .13 }])
];

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

/* iOS 사파리는 캔버스에서 Apple Color Emoji 를 큰 폰트(대략 256px 초과)로
   찍으면 소리 없이 아무것도 안 그린다. 퍼즐 주인공은 300px 를 훌쩍 넘어서
   아이패드에서만 그림이 빈다 — 작게 찍어 확대하는 것으로 우회한다. */
const EMOJI_CAP = 120;

function fillEmoji(c, ch, x, y, size) {
  if (size <= EMOJI_CAP) {
    c.font = `${size}px ${EMOJI_FONT}`;
    c.fillText(ch, x, y);
    return;
  }
  const pad = 1.35;                        // 이모지가 폰트 상자를 살짝 넘친다
  const t = document.createElement('canvas');
  t.width = t.height = Math.ceil(EMOJI_CAP * pad);
  const tc = t.getContext('2d');
  tc.font = `${EMOJI_CAP}px ${EMOJI_FONT}`;
  tc.textAlign = 'center';
  tc.textBaseline = 'middle';
  tc.fillText(ch, t.width / 2, t.height / 2);
  const d = size * pad;
  c.drawImage(t, x - d / 2, y - d / 2, d, d);
}

/** 그림 한 장을 (0,0)~(w,h) 에 그린다 */
export function drawScene(level, c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, level.bg[0]);
  g.addColorStop(1, level.bg[1]);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (const it of level.items) fillEmoji(c, it.e, it.x * w, it.y * h, it.s * h);
  c.restore();
}
