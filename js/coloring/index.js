/* ============================================================
   coloring/index.js — 색칠하기 액티비티
   ------------------------------------------------------------
   레이어 구조 (CSS 로 겹쳐 둔 3장의 캔버스. GPU 가 합성해서 빠르다)

     c-lines   ③ 밑그림 선            ← 항상 맨 위. 선 밖으로 칠해도 선은 산다
     c-stroke  ② 지금 그리는 중인 한 획
     c-paint   ① 완성된 그림
     .paper    ⓪ 종이 배경

   기록/되돌리기
     paint = baseline(캔버스) + recs[](획 목록) 이라는 등식을 유지한다.
     되돌리기 = recs 하나 빼고 다시 재생. 획마다 난수 시드를 저장해 두어
     다시 재생해도 크레용 결까지 똑같이 나온다.
     recs 가 MAX_RECS 를 넘으면 오래된 것부터 baseline 에 구워 넣는다.

   좌표는 전부 0~1 정규화로 저장한다 → 화면을 돌리거나 창 크기가 바뀌어도
   같은 그림이 그대로 재생된다.
   ============================================================ */

import { attachPen, rng } from '../core/pen.js';
import { BRUSHES, TOOL_ORDER, SPECIAL, STICKERS, stampText } from './brushes.js';
import { PAGES, drawPage } from './pages.js';
import { floodFill, alphaMask, hexToRgba } from './fill.js';
import { sfx } from '../core/audio.js';
import { works, drafts } from '../core/store.js';

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const MAX_RECS = 24;
const SIZES = [0.010, 0.022, 0.042];      // 캔버스 가로폭 대비 붓 굵기
const SIZE_DOT = [12, 22, 34];            // 굵기 버튼 안 동그라미 지름(px)

const COLORS = [
  '#ff4d4d','#ff7a3d','#ffb02e','#ffe14d','#b7e04a','#4fd06b','#46cfe0','#4a90ff','#7b5bff','#ff6fb5',
  '#e03131','#e8590c','#f08c00','#f2c400','#74b816','#22a04a','#1c9bb5','#2b6ee8','#5b3fd4','#e34d95',
  '#8b2f2f','#a34a12','#a06a00','#7a6a00','#4d7a12','#157a37','#12707f','#1c4aa0','#3d2a91','#a03566',
  '#ffd6c9','#ffe6b3','#fff6bf','#e6f5c2','#c9f0d6','#c9eef7','#cfe0ff','#ded0ff','#ffd6ea','#f7e0c8',
  '#ffffff','#d9d9d9','#a6a6a6','#6b6b6b','#333333','#000000','#8b5a2b','#c68642','#5a3b1a','#2f4f2f'
];

const widthFor = (b, base, p) => {
  const [lo, hi] = b.width;
  return base * (lo + (hi - lo) * Math.max(0, Math.min(1, p)));
};

export function initColoring({ toast, goHome }) {
  const $ = (id) => document.getElementById(id);

  const paper   = $('paper');
  const cPaint  = $('c-paint');
  const cStroke = $('c-stroke');
  const cLines  = $('c-lines');
  const pctx = cPaint.getContext('2d');
  const sctx = cStroke.getContext('2d');
  const lctx = cLines.getContext('2d', { willReadFrequently: true });

  const bcan = document.createElement('canvas');       // baseline
  const bctx = bcan.getContext('2d');

  let W = 0, H = 0;
  let mask = null;                                     // 밑그림 알파 (물감통 벽)
  let page = PAGES[0];
  let tool = 'crayon';
  let color = '#ff4d4d';
  let sizeIdx = 1;
  let sticker = '⭐';
  let recent = JSON.parse(localStorage.getItem('recentColors') || '[]');

  let recs = [];
  let redo = [];
  let cur = null;                                      // 진행 중인 획
  let saveTimer = 0;

  /* ── 레이아웃 ─────────────────────────────────────────── */
  let needDraft = false;

  /** 밑그림 다시 그리기 + 물감통 벽 재계산 + 화면 재생 */
  function refreshPage() {
    if (!W || !H) return;
    drawPage(page, lctx, W, H);
    mask = alphaMask(lctx, W, H);
    replay();
  }

  function layout() {
    const st = $('stage').getBoundingClientRect();
    if (!st.width || !st.height) return;              // 아직 화면에 안 붙었다
    const AR = 1000 / 700;
    let w = st.width - 28, h = st.height - 28;
    if (w / h > AR) w = h * AR; else h = w / AR;
    w = Math.max(80, Math.floor(w)); h = Math.max(56, Math.floor(h));
    paper.style.width = w + 'px';
    paper.style.height = h + 'px';

    const nW = Math.round(w * DPR), nH = Math.round(h * DPR);
    if (nW === W && nH === H) return;

    // 화면 회전 등으로 크기가 바뀌면 baseline 을 새 크기로 늘려 옮긴다.
    // 획(recs)은 0~1 정규화라 그대로 다시 재생하면 된다.
    let old = null;
    if (W && H) {
      old = document.createElement('canvas');
      old.width = W; old.height = H;
      old.getContext('2d').drawImage(bcan, 0, 0);
    }
    W = nW; H = nH;
    for (const cv of [cPaint, cStroke, cLines, bcan]) { cv.width = W; cv.height = H; }
    if (old) bctx.drawImage(old, 0, 0, W, H);

    refreshPage();
    if (needDraft) { needDraft = false; loadDraft(); }
  }

  /* ── 기록 재생 ────────────────────────────────────────── */
  function renderRec(rec, dctx) {
    if (rec.k === 'f') {
      floodFill(dctx, mask, W, H, rec.x * W, rec.y * H, hexToRgba(rec.c));
      return;
    }
    if (rec.k === 't') {
      stampText(dctx, rec.e, rec.x * W, rec.y * H, rec.z * W, rec.r);
      return;
    }
    const b = BRUSHES[rec.b];
    if (!b) return;
    const st = { color: rec.c, seed: rec.seed, rnd: rng(rec.seed), base: rec.z * W };
    b.init?.(st);
    const target = b.direct ? dctx : sctx;
    if (!b.direct) sctx.clearRect(0, 0, W, H);

    let prev = null;
    const n = rec.pts.length / 3;
    for (let i = 0; i < n; i++) {
      const q = { x: rec.pts[i * 3] * W, y: rec.pts[i * 3 + 1] * H, p: rec.pts[i * 3 + 2] };
      q.w = widthFor(b, st.base, q.p);
      b.seg(target, prev || { ...q, x: q.x - 0.01 }, q, st);
      prev = q;
    }
    if (!b.direct) {
      dctx.save();
      dctx.globalAlpha = b.alpha;
      dctx.globalCompositeOperation = b.blend;
      dctx.drawImage(cStroke, 0, 0);
      dctx.restore();
      sctx.clearRect(0, 0, W, H);
    }
  }

  function replay() {
    if (!W || !H) return;
    pctx.clearRect(0, 0, W, H);
    pctx.drawImage(bcan, 0, 0);
    for (const r of recs) renderRec(r, pctx);
    sctx.clearRect(0, 0, W, H);
    resetStrokeLayerStyle();
    updateButtons();
  }

  function pushRec(rec) {
    recs.push(rec);
    redo.length = 0;
    while (recs.length > MAX_RECS) renderRec(recs.shift(), bctx);   // 오래된 획을 구워 넣기
    updateButtons();
    scheduleAutosave();
  }

  /* ── 그리기 ───────────────────────────────────────────── */
  function resetStrokeLayerStyle() {
    cStroke.style.opacity = '1';
    cStroke.style.mixBlendMode = 'normal';
  }

  function onStart(pt) {
    if (tool === 'fill')    { doFill(pt); return; }
    if (tool === 'sticker') { doSticker(pt); return; }

    const b = BRUSHES[tool];
    if (!b) return;
    const seed = (Math.random() * 1e9) | 0;
    cur = {
      b,
      rec: { k: 's', b: tool, c: color, z: SIZES[sizeIdx], seed, pts: [] },
      st:  { color, seed, rnd: rng(seed), base: SIZES[sizeIdx] * W },
      prev: null, sm: null
    };
    b.init?.(cur.st);
    if (!b.direct) {
      sctx.clearRect(0, 0, W, H);
      cStroke.style.opacity = String(b.alpha);
      cStroke.style.mixBlendMode = b.blend === 'multiply' ? 'multiply' : 'normal';
    }
    addPoint(pt, true);
  }

  function addPoint(pt, first) {
    const c = cur;
    if (!c) return;
    // 손떨림 제거용 지수평활. 값이 크면 반응이 빠르고 작으면 부드럽다
    if (!c.sm) c.sm = { x: pt.x, y: pt.y };
    else { c.sm.x += (pt.x - c.sm.x) * 0.55; c.sm.y += (pt.y - c.sm.y) * 0.55; }

    const q = { x: c.sm.x, y: c.sm.y, p: pt.p };
    if (!first && c.prev &&
        Math.hypot(q.x - c.prev.x, q.y - c.prev.y) < (c.b.step ?? 1.2) * DPR) return;

    q.w = widthFor(c.b, c.st.base, q.p);
    const target = c.b.direct ? pctx : sctx;
    c.b.seg(target, c.prev || { ...q, x: q.x - 0.01 }, q, c.st);
    c.rec.pts.push(q.x / W, q.y / H, q.p);
    c.prev = q;
  }

  function onEnd() {
    const c = cur;
    if (!c) return;
    cur = null;
    if (!c.rec.pts.length) { sctx.clearRect(0, 0, W, H); resetStrokeLayerStyle(); return; }
    if (!c.b.direct) {
      pctx.save();
      pctx.globalAlpha = c.b.alpha;
      pctx.globalCompositeOperation = c.b.blend;
      pctx.drawImage(cStroke, 0, 0);
      pctx.restore();
      sctx.clearRect(0, 0, W, H);
    }
    resetStrokeLayerStyle();
    pushRec(c.rec);
  }

  function doFill(pt) {
    if (!mask) return;
    if (floodFill(pctx, mask, W, H, pt.x, pt.y, hexToRgba(color))) {
      pushRec({ k: 'f', c: color, x: pt.x / W, y: pt.y / H });
      sfx.fill();
    }
  }

  function doSticker(pt) {
    const rec = {
      k: 't', e: sticker, x: pt.x / W, y: pt.y / H,
      z: SIZES[sizeIdx] * 3.6, r: (Math.random() - 0.5) * 0.5
    };
    renderRec(rec, pctx);
    pushRec(rec);
    sfx.sticker();
  }

  attachPen(paper, {
    getSize: () => [W, H],
    onStart,
    onMove: (pts) => { if (cur) for (const p of pts) addPoint(p, false); },
    onEnd
  });

  /* ── 되돌리기 / 지우기 ────────────────────────────────── */
  function undo() { if (recs.length) { redo.push(recs.pop()); replay(); sfx.undo(); scheduleAutosave(); } }
  function redoOne() { if (redo.length) { const r = redo.pop(); renderRec(r, pctx); recs.push(r); updateButtons(); sfx.tap(); scheduleAutosave(); } }

  function clearAll() {
    recs = []; redo = [];
    bctx.clearRect(0, 0, W, H);
    replay();
    sfx.clear();
    drafts.del(page.id).catch(() => {});
    toast('깨끗해졌어요!');
  }

  function updateButtons() {
    $('btn-undo').disabled = !recs.length;
    $('btn-redo').disabled = !redo.length;
  }

  /* ── 자동 저장 / 불러오기 ─────────────────────────────── */
  function scheduleAutosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      cPaint.toBlob(b => { if (b) drafts.put(page.id, b).catch(() => {}); }, 'image/png');
    }, 1500);
  }

  async function loadDraft() {
    try {
      const d = await drafts.get(page.id);
      if (!d?.blob) return;
      const img = await createImageBitmap(d.blob);
      bctx.clearRect(0, 0, W, H);
      bctx.drawImage(img, 0, 0, W, H);
      img.close?.();
      recs = []; redo = [];
      replay();
    } catch { /* 초안이 없거나 깨졌으면 그냥 빈 종이 */ }
  }

  /* ── 완성작 저장 ──────────────────────────────────────── */
  function exportCanvas() {
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const o = out.getContext('2d');
    o.fillStyle = '#fffdf7';
    o.fillRect(0, 0, W, H);
    o.drawImage(cPaint, 0, 0);
    o.drawImage(cLines, 0, 0);
    return out;
  }

  function saveWork() {
    exportCanvas().toBlob(async (blob) => {
      if (!blob) return;
      try { await works.add(blob, page.id); sfx.save(); toast('내 그림에 저장했어요! 🖼️'); }
      catch { toast('저장하지 못했어요'); }
    }, 'image/png');
  }

  /* ── 도구 트레이 ──────────────────────────────────────── */
  function buildTools() {
    const strip = $('tool-strip');
    strip.innerHTML = '';
    for (const id of TOOL_ORDER) {
      const meta = BRUSHES[id] || SPECIAL[id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tool' + (id === tool ? ' is-on' : '');
      b.dataset.tool = id;
      b.innerHTML = `<span class="ico">${meta.ico}</span><span class="lbl">${meta.label}</span>`;
      b.addEventListener('click', () => selectTool(id));
      strip.appendChild(b);
    }
  }

  function selectTool(id) {
    tool = id;
    for (const el of document.querySelectorAll('.tool'))
      el.classList.toggle('is-on', el.dataset.tool === id);
    updateSwatchButton();
    sfx.tool();
    if (id === 'sticker') openPopover();          // 스티커는 무엇을 찍을지 먼저 고른다
  }

  function buildSizes() {
    const strip = $('size-strip');
    strip.innerHTML = '';
    SIZE_DOT.forEach((d, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'size' + (i === sizeIdx ? ' is-on' : '');
      b.innerHTML = `<i style="width:${d}px;height:${d}px"></i>`;
      b.addEventListener('click', () => {
        sizeIdx = i; sfx.tap();
        for (const el of strip.children) el.classList.remove('is-on');
        b.classList.add('is-on');
      });
      strip.appendChild(b);
    });
  }

  /* ── 색 / 스티커 고르기 ───────────────────────────────── */
  function updateSwatchButton() {
    const dotEl = $('current-swatch');
    if (tool === 'sticker') {
      dotEl.style.background = 'transparent';
      dotEl.style.boxShadow = 'none';
      dotEl.textContent = sticker;
      dotEl.style.font = '34px/46px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
      dotEl.style.textAlign = 'center';
    } else {
      dotEl.textContent = '';
      dotEl.style.background = color;
      dotEl.style.boxShadow = '0 0 0 3px #fff,0 2px 6px rgba(0,0,0,.2)';
    }
  }

  function openPopover() {
    const grid = $('palette-grid');
    const row = $('recent-colors');
    grid.innerHTML = '';
    row.innerHTML = '';

    if (tool === 'sticker') {
      grid.style.gridTemplateColumns = 'repeat(10,1fr)';
      for (const s of STICKERS) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sw' + (s === sticker ? ' is-on' : '');
        b.style.background = '#f6efe2';
        b.style.font = '26px/46px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
        b.textContent = s;
        b.addEventListener('click', () => {
          sticker = s; updateSwatchButton(); sfx.sticker(); closePopover();
        });
        grid.appendChild(b);
      }
    } else {
      grid.style.gridTemplateColumns = 'repeat(10,1fr)';
      for (const c of COLORS) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sw' + (c === color ? ' is-on' : '');
        b.style.background = c;
        b.addEventListener('click', () => { pickColor(c); closePopover(); });
        grid.appendChild(b);
      }
      for (const c of recent.slice(0, 4)) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sw';
        b.style.background = c;
        b.addEventListener('click', () => { pickColor(c); closePopover(); });
        row.appendChild(b);
      }
    }
    $('popover-color').hidden = false;
  }

  const closePopover = () => { $('popover-color').hidden = true; };

  function pickColor(c) {
    color = c;
    if (tool === 'eraser') selectTool('crayon');   // 색을 골랐다는 건 다시 그리겠다는 뜻
    recent = [c, ...recent.filter(x => x !== c)].slice(0, 8);
    localStorage.setItem('recentColors', JSON.stringify(recent));
    updateSwatchButton();
    sfx.tap();
  }

  /* ── 그림 고르기 ──────────────────────────────────────── */
  function buildPageSheet() {
    const grid = $('page-grid');
    grid.innerHTML = '';
    for (const p of PAGES) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'page-card';
      const cv = document.createElement('canvas');
      cv.width = 300; cv.height = 210;
      drawPage(p, cv.getContext('2d'), 300, 210);
      const nm = document.createElement('div');
      nm.className = 'name'; nm.textContent = p.name;
      card.append(cv, nm);
      card.addEventListener('click', () => { $('sheet-pages').hidden = true; openPage(p.id); });
      grid.appendChild(card);
    }
  }

  async function openPage(id) {
    page = PAGES.find(x => x.id === id) || PAGES[0];
    localStorage.setItem('lastPage', page.id);
    recs = []; redo = [];
    if (W && H) {
      bctx.clearRect(0, 0, W, H);
      refreshPage();                    // 크기는 그대로여도 밑그림은 바뀌었다
      await loadDraft();
    } else {
      // 아직 크기를 모를 때: ResizeObserver 가 크기를 잡는 순간 이어서 처리된다
      needDraft = true;
      layout();
    }
  }

  /* ── 아래쪽 버튼 ──────────────────────────────────────── */
  $('btn-undo').addEventListener('click', undo);
  $('btn-redo').addEventListener('click', redoOne);
  $('btn-save').addEventListener('click', saveWork);
  $('btn-home').addEventListener('click', () => { clearTimeout(saveTimer); scheduleAutosaveNow(); goHome(); });
  $('btn-next').addEventListener('click', () => { buildPageSheet(); $('sheet-pages').hidden = false; sfx.tap(); });
  $('btn-pages-close').addEventListener('click', () => { $('sheet-pages').hidden = true; });
  $('btn-color').addEventListener('click', () => { openPopover(); sfx.tap(); });
  $('btn-color-close').addEventListener('click', closePopover);
  $('popover-color').addEventListener('click', (e) => { if (e.target.id === 'popover-color') closePopover(); });
  $('sheet-pages').addEventListener('click', (e) => { if (e.target.id === 'sheet-pages') $('sheet-pages').hidden = true; });

  function scheduleAutosaveNow() {
    cPaint.toBlob(b => { if (b) drafts.put(page.id, b).catch(() => {}); }, 'image/png');
  }

  /* 전체 지우기는 2초 길게 누르기 — 아이가 실수로 다 날리는 걸 막는 잠금장치 */
  (function holdToClear() {
    const btn = $('btn-clear');
    const fill = btn.querySelector('.hold-fill');
    let t0 = 0, raf = 0;
    const HOLD = 2000;
    const stop = () => { cancelAnimationFrame(raf); raf = 0; fill.style.height = '0%'; };
    const tick = () => {
      const r = Math.min(1, (performance.now() - t0) / HOLD);
      fill.style.height = (r * 100) + '%';
      if (r >= 1) { stop(); clearAll(); return; }
      raf = requestAnimationFrame(tick);
    };
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); t0 = performance.now(); tick(); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(ev, stop);
  })();

  // 화면 전환·회전·창 크기 변경을 한꺼번에 잡는다.
  // (requestAnimationFrame 에 의존하면 탭이 백그라운드일 때 초기화가 멈춘다)
  if (window.ResizeObserver) new ResizeObserver(layout).observe($('stage'));
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 250));

  buildTools(); buildSizes(); updateSwatchButton();

  return {
    /** 색칠 화면을 열 때 호출 */
    enter(pageId) {
      openPage(pageId || localStorage.getItem('lastPage') || PAGES[0].id);
    }
  };
}
