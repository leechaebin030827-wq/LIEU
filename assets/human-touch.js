/* 휴먼 터치 장면. 스크롤 위치(화면 높이 단위 y)가 '몇 번째 장면인가(u)'를 정하고, u 는 스프링으로 따라간다.
   허브(유기적인 덩어리)와 십자 레일이 장면마다 다른 자리로 옮겨 가며 화면을 네 칸으로 나누고,
   큰 칸에는 이미지 자리(선 프레임), 옆 칸에는 글이 놓인다. 이미지는 허브에서 자라나고 허브로 접힌다. */
(() => {
'use strict';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (x, a, b) => clamp((x - a) / (b - a));
const eo3 = t => 1 - Math.pow(1 - t, 3);
const oBack = (t, c = 1.9) => 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2), oExp = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const lerp = (a, b, t) => a + (b - a) * t;
const NS = 'http://www.w3.org/2000/svg', HALF = Math.PI / 2;

// 도입 : 파란 공이 나타나 가로선 위를 오가다가 가운데로 오고, 거기서 세로선이 뻗어 그리드가 생긴 뒤 첫 칸 위치로 자리 잡는다
const T = { show: 13.9, bg: [14.1, 14.5], ball: [14.4, 15.0], hline: [14.7, 15.5], slide: [15.2, 16.8], vline: [16.9, 17.6], settle: [17.6, 18.6], text0: [18.9, 19.5], s: [18.6, 22.0, 25.4, 28.8, 32.2] };
const N = 5;
// 허브 위치(화면 비율) · 이미지 칸 · 글 칸 : 데스크톱 / 모바일
const LAY = {
  d: { hub: [[3, 3], [9, 5], [3, 3], [9, 5], [6, 3]], img: [null, null, 'BR', 'TL', 'BL'], txt: ['BR', 'TL', 'TR', 'BL', 'TR'] },
  m: { hub: [[1, 3], [3, 5], [1, 3], [3, 5], [1, 5]], img: [null, null, 'BR', 'TL', 'TR'], txt: ['BR', 'TL', 'TR', 'BL', 'BR'] }
};
const FALLBACK = { s1: ['I was born to bring', 'a little <em>human touch</em>', 'to driverless rides.'], s2a: ['Now, taxis can', 'drive themselves.'], s2b: ['But a driver did', '<em>more than</em> drive.'],
  b: [['A warm', 'welcome.'], ['A quick', 'heads-up.'], ['A gentle', 'reminder.']] };
let TX = window.__ht || FALLBACK;

/* ── DOM ── */
const root = document.createElement('div'); root.id = 'ht';
root.innerHTML = '<div class="ht-probe" style="position:absolute;visibility:hidden;height:0;width:var(--content);display:grid;column-gap:var(--gutter)"></div><div class="ht-bg"></div><div class="ht-cells"></div><svg class="ht-rail" aria-hidden="true"></svg>';
document.body.appendChild(root);
const bg = root.querySelector('.ht-bg'), rail = root.querySelector('.ht-rail'), cellsEl = root.querySelector('.ht-cells');
const mk = (p, n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; };

/* 허브 + 레일 */
// grids03 (obys) 방식 : 화면을 4분할하는 가는 컬럼선이 늘 깔려 있고, 모든 글은 14px 베이스라인 위에 선다
const gridLines = [1, 2, 3].map(() => mk(rail, 'line', { stroke: 'rgba(242,242,246,.08)', 'stroke-width': 1 }));
const defs = mk(rail, 'defs', {});
const grads = [0, 1, 2, 3].map(i => {
  const g = mk(defs, 'linearGradient', { id: 'htg' + i, gradientUnits: 'userSpaceOnUse' });
  [[0, 'rgba(252,252,255,.95)'], [.4, 'rgba(180,183,200,.62)'], [1, 'rgba(126,135,173,0)']].forEach(([o, c]) => mk(g, 'stop', { offset: o, 'stop-color': c }));
  return g;
});
const rails = [0, 1, 2, 3].map(i => mk(rail, 'line', { stroke: 'url(#htg' + i + ')', 'stroke-width': 1, 'stroke-linecap': 'butt' }));
// 빔 : 레일 위를 지나가는 빛. 꼬리는 사라지고 머리는 밝다 (색은 Luminous Type 과 같은 슬레이트 화이트 그라데이션)
const blur = mk(defs, 'filter', { id: 'htblur', filterUnits: 'userSpaceOnUse', x: -60, y: -60, width: 4000, height: 3000 }); mk(blur, 'feGaussianBlur', { stdDeviation: 5 });
const beamG = [0, 1, 2, 3].map(i => {
  const g = mk(defs, 'linearGradient', { id: 'htbm' + i, gradientUnits: 'userSpaceOnUse' });
  [[0, 'rgba(126,135,173,0)'], [.3, 'rgba(140,148,182,.08)'], [.65, 'rgba(160,168,198,.2)'], [.93, 'rgba(232,235,246,.38)'], [1, 'rgba(232,235,246,0)']].forEach(([o, c]) => mk(g, 'stop', { offset: o, 'stop-color': c }));
  return g;
});
const beamGlow = [0, 1, 2, 3].map(i => mk(rail, 'line', { stroke: 'url(#htbm' + i + ')', 'stroke-width': 4, filter: 'url(#htblur)', opacity: .38 }));
const beamCore = [0, 1, 2, 3].map(i => mk(rail, 'line', { stroke: 'url(#htbm' + i + ')', 'stroke-width': 1.2, 'stroke-linecap': 'round' }));
const hubDot = mk(rail, 'circle', { fill: '#EEF0F8' });

/* 엘라스틱 그리드의 네 칸 : 허브가 움직이면 칸들이 같이 늘어나고 줄어든다. 이미지는 칸을 허브 모서리에서부터 채운다. */
const QS = ['TL', 'TR', 'BL', 'BR'];
const cells = QS.map(q => {
  const el = document.createElement('div'); el.className = 'ht-cell'; el.innerHTML = '<div class="ht-fill"><span class="ht-fl"></span></div>'; cellsEl.appendChild(el);
  return { q, el, fill: el.querySelector('.ht-fill'), lbl: el.querySelector('.ht-fl'), lastLbl: '' };
});
// 칸이 채워질 때 허브 모서리에서 퍼져 나가는 방향
const CLIP = { TL: (a) => `inset(${a}% 0 0 ${a}%)`, TR: (a) => `inset(${a}% ${0}% 0 0)`.replace('% 0%', '% 0'), BL: (a) => `inset(0 0 ${a}% ${a}%)`, BR: (a) => `inset(0 ${a}% ${a}% 0)` };
CLIP.TR = a => `inset(${a}% ${a}% 0 0)`;

/* 글 블록 5개 */
const lines = arr => arr.map(l => `<span class="ln"><i>${l}</i></span>`).join('');
const strip = arr => arr.join(' ').replace(/<[^>]+>/g, '');
const wide = s => /[　-鿿가-힯]/.test(s);
const blocks = [0, 1, 2, 3, 4].map(() => { const el = document.createElement('div'); el.className = 'tb'; el.innerHTML = '<div class="h"></div><div class="p"></div><div class="n"></div>'; root.appendChild(el); return { el, h: el.querySelector('.h'), p: el.querySelector('.p'), n: el.querySelector('.n'), fs: 0, w: 0 }; });
function setText(t) {
  TX = t || FALLBACK;
  const H = [TX.s1, TX.s2b, ...TX.b.map(a => [a.join(' ')])], P = [null, [strip(TX.s2a)], null, null, null];
  blocks.forEach((b, i) => {
    b.h.innerHTML = lines(H[i]); b.p.innerHTML = P[i] ? lines(P[i]) : ''; b.n.textContent = '';
    b.hl = [...b.h.querySelectorAll('.ln i')]; b.pl = [...b.p.querySelectorAll('.ln i')]; b.nl = H[i].length;
    const s = strip(H[i]); b.chars = Math.max(...H[i].map(l => l.replace(/<[^>]+>/g, '').length)); b.fw = wide(s) ? 1.0 : .54;
  });
}
setText(TX);

/* ── 레이아웃 ── */
let vw = 0, vh = 0, mob = false, mg = 24, top = 90, G = 18;
let gcols = 12, gcw = 0, ggap = 16, gleft = 0;
const probe = root.querySelector('.ht-probe');
function metrics() {
  vw = innerWidth; vh = innerHeight; mob = vw < 640; mg = Math.max(20, Math.min(56, vw * .04)); top = Math.max(84, vh * .11); G = 14; rail.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  const cs = getComputedStyle(probe), content = parseFloat(cs.width) || vw - 2 * mg; ggap = parseFloat(cs.columnGap) || 16;
  gcols = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cols')) || 12; gcw = (content - (gcols - 1) * ggap) / gcols; gleft = (vw - content) / 2;
  gridLines.forEach((l, i) => { const x = Math.round(gleft + (i + 1) * (gcols / 4) * (gcw + ggap) - ggap / 2) + .5; l.setAttribute('x1', x); l.setAttribute('x2', x); l.setAttribute('y1', 0); l.setAttribute('y2', vh); });
}
// 허브는 늘 그리드 선 위에 선다 : x 는 컬럼 사이 거터의 한가운데, y 는 화면을 8등분한 선
const hubPx = h => { const k = mob ? h[0] : Math.round(h[0] * gcols / 12); return [gleft + k * (gcw + ggap) - ggap / 2, Math.round(h[1] * vh / 8 / 14) * 14]; };
metrics(); addEventListener('resize', metrics);
const cell = (hx, hy, q, e) => q === 'TL' ? [0, 0, hx - e, hy - e] : q === 'TR' ? [hx + e, 0, vw - hx - e, hy - e] : q === 'BL' ? [0, hy + e, hx - e, vh - hy - e] : [hx + e, hy + e, vw - hx - e, vh - hy - e];
const quad = (hx, hy, q) => {
  const l = mg, r = vw - mg, b = vh - mg;
  return q === 'TL' ? [l, top, hx - G - l, hy - G - top] : q === 'TR' ? [hx + G, top, r - hx - G, hy - G - top] : q === 'BL' ? [l, hy + G, hx - G - l, b - hy - G] : [hx + G, hy + G, r - hx - G, b - hy - G];
};

/* ── 입력 ── */
const ptr = { x: 0, y: 0, has: false };
addEventListener('pointermove', e => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.has = true; }, { passive: true });
document.addEventListener('pointerleave', () => { ptr.has = false; });

/* ── 루프 ── */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ut = y => { let u = 0; for (let i = 1; i < N; i++) u += eio(seg(y, T.s[i] - .9, T.s[i] + .1)); return u; };
let u = 0, last = performance.now(), tm = 0, hx = 0, hy = 0, vx = 0, vy = 0, init = false, lastCnt = '', lastLbl = '';

function setLines(els, a, dir) {
  const n = els.length;
  for (let k = 0; k < n; k++) { const ra = eo3(clamp(a * (1 + .3 * (n - 1)) - k * .3)); els[k].style.transform = `translateY(${((1 - ra) * 110 * dir).toFixed(2)}%)`; }
}

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(.05, (now - last) / 1000); last = now; tm += dt;
  const y = scrollY / (vh || 1);
  if (y < T.show) { if (root.style.visibility !== 'hidden') root.style.visibility = 'hidden'; init = false; return; }
  root.style.visibility = 'visible';
  bg.style.opacity = eio(seg(y, T.bg[0], T.bg[1])).toFixed(3);
  rail.style.setProperty('--gl', bg.style.opacity); gridLines.forEach(l => { l.style.opacity = bg.style.opacity; });

  // 장면 위치 u (가볍게 따라감). 탄성은 아래 허브 스프링이 맡는다
  const tgt = ut(y);
  if (reduce || !init) u = tgt; else u += (tgt - u) * (1 - Math.exp(-dt * 9));
  const L = mob ? LAY.m : LAY.d, i0 = clamp(Math.floor(u), 0, N - 2), t = u - i0;
  const pa = hubPx(L.hub[i0]), pb = hubPx(L.hub[i0 + 1]);
  let bx = lerp(pa[0], pb[0], t), by = lerp(pa[1], pb[1], t);
  const settle = eio(seg(y, T.settle[0], T.settle[1]));
  if (y < T.s[0]) {   // 도입 구간 : 공이 가로선 위를 왼쪽에서 오른쪽, 다시 가운데로 미끄러진다
    const p2 = seg(y, T.slide[0], T.slide[1]), sx0 = p2 < .5 ? lerp(.16, .84, eio(p2 * 2)) : lerp(.84, .5, eio((p2 - .5) * 2));
    const cx0 = p2 > 0 ? sx0 * vw : .16 * vw, cy0 = vh * .5;
    bx = lerp(cx0, pa[0], settle); by = lerp(cy0, pa[1], settle);
  }
  if (!init || y < T.s[0]) { hx = bx; hy = by; vx = vy = 0; init = true; }
  else if (reduce) { hx = bx; hy = by; vx = vy = 0; } else {   // 임계 감쇠 스프링 : 튕기지 않고 부드럽게 도착한다. x 와 y 의 속도만 살짝 달라 두 레일이 엇박으로 미끄러진다
    vx += (30 * (bx - hx) - 10.95 * vx) * dt; hx += vx * dt; vy += (24 * (by - hy) - 9.8 * vy) * dt; hy += vy * dt;
  }

  // 공 : 처음엔 크게 나타나 움직이다가, 그리드가 자리 잡으면 작은 점이 된다. 레일은 공 둘레의 틈에서 시작해 끝으로 갈수록 옅어진다
  const hubIn = 1, grow = eo3(seg(y, T.ball[0], T.ball[1]));
  const sx = Math.round(hx) + .5, sy = Math.round(hy) + .5;   // 1px 선이 번지지 않도록 픽셀 중앙에 맞춘다
  const gap = lerp(7, 5, settle) * grow, br = lerp(2.2, 1.5, settle) * grow;   // 점은 선 굵기(1px)에 가까운 크기
  hubDot.setAttribute('cx', sx.toFixed(1)); hubDot.setAttribute('cy', sy.toFixed(1)); hubDot.setAttribute('r', br.toFixed(2));
  const edges = [[vw, sy], [sx, vh], [0, sy], [sx, 0]];
  rails.forEach((l, i) => {
    const dx = Math.cos(i * HALF), dy = Math.sin(i * HALF), s0 = [sx + dx * gap, sy + dy * gap], e = edges[i], k = oExp(i % 2 ? seg(y, T.vline[0], T.vline[1]) : seg(y, T.hline[0], T.hline[1]));
    l.setAttribute('x1', s0[0].toFixed(1)); l.setAttribute('y1', s0[1].toFixed(1)); l.setAttribute('x2', lerp(s0[0], e[0], k).toFixed(1)); l.setAttribute('y2', lerp(s0[1], e[1], k).toFixed(1));
    {   // 빔 : 허브에서 바깥으로 흘러가고, 한 번 지나가면 잠시 쉰다
      const ex = lerp(s0[0], e[0], k), ey = lerp(s0[1], e[1], k), len = Math.hypot(ex - s0[0], ey - s0[1]), BL = 460, SP = 68, cyc = (Math.max(len, 1) + BL) / SP + 9;
      const tt = (tm + i * cyc * .29) % cyc, head = tt * SP, tail = head - BL, on = k > .98 && len > 20 ? 1 : 0, pr = clamp(head / (len + BL)), env = Math.pow(Math.sin(Math.PI * pr), 1.4);   // 시작과 끝에서 서서히 나타나고 사라진다
      const px = d => (s0[0] + dx * d).toFixed(1), py = d => (s0[1] + dy * d).toFixed(1), bg = beamG[i];
      bg.setAttribute('x1', px(tail)); bg.setAttribute('y1', py(tail)); bg.setAttribute('x2', px(head)); bg.setAttribute('y2', py(head));
      [beamGlow[i], beamCore[i]].forEach(b => { b.setAttribute('x1', s0[0].toFixed(1)); b.setAttribute('y1', s0[1].toFixed(1)); b.setAttribute('x2', ex.toFixed(1)); b.setAttribute('y2', ey.toFixed(1)); b.style.display = on && pr < 1 ? '' : 'none'; b.style.opacity = (env * (b === beamGlow[i] ? .38 : 1)).toFixed(3); });
    }
    const g = grads[i]; g.setAttribute('x1', s0[0].toFixed(1)); g.setAttribute('y1', s0[1].toFixed(1)); g.setAttribute('x2', e[0].toFixed(1)); g.setAttribute('y2', e[1].toFixed(1));
  });

  // 네 칸 : 허브 위치에 맞춰 늘어나고, 이미지가 있는 장면에서는 허브 모서리에서부터 채워진다
  cells.forEach(c => {
    const r = cell(hx, hy, c.q, 1), w = Math.max(0, r[2]), h = Math.max(0, r[3]);
    let f = 0, bi = -1; for (let i = 0; i < N; i++) if (L.img[i] === c.q) { const v = clamp(1 - Math.abs(u - i) / .55); if (v > f) { f = v; bi = i; } }
    f = eio(f) * hubIn;
    c.el.style.transform = `translate3d(${r[0].toFixed(1)}px,${r[1].toFixed(1)}px,0)`; c.el.style.width = w.toFixed(1) + 'px'; c.el.style.height = h.toFixed(1) + 'px';
    const hov = ptr.has && ptr.x >= r[0] && ptr.x <= r[0] + w && ptr.y >= r[1] && ptr.y <= r[1] + h; c.el.classList.toggle('on', hov);
    const showFill = f > .002; c.fill.style.visibility = showFill ? 'visible' : 'hidden';
    if (!showFill) return;
    c.fill.style.clipPath = CLIP[c.q]((1 - f) * 100);
    const lbl = ''; if (lbl !== c.lastLbl) { c.lbl.textContent = lbl; c.lastLbl = lbl; }
  });

  // 글 : 허브 모서리에 붙어서, 줄마다 마스크로 올라온다
  const ti = eo3(seg(y, T.text0[0], T.text0[1]));
  blocks.forEach((b, i) => {
    const d = u - i; let a = clamp(1 - Math.abs(d) / .6); if (i === 0) a = Math.min(a, ti);
    if (a <= 0) { b.el.style.visibility = 'hidden'; return; }
    const q = L.txt[i], g = quad(hx, hy, q), base = mob ? (i ? 22 : 26) : i < 2 ? Math.min(vw * (i ? .02 : .026), vh * (i ? .036 : .046)) : Math.min(vw * .018, vh * .032);
    const lim = Math.max(g[3] - (i === 1 ? 70 : i >= 2 ? 36 : 0), 40) / (b.nl * 1.1);
    const fs = Math.max(mob ? 20 : 22, Math.min(base, g[2] / (b.chars * b.fw), lim)), w = Math.max(120, g[2]);
    if (Math.abs(fs - b.fs) > .5) { b.fs = fs; b.el.style.setProperty('--fs', fs.toFixed(1) + 'px'); b.el.style.setProperty('--lh', (Math.ceil(fs * 1.1 / 14) * 14) + 'px'); }
    const right = q === 'TL' || q === 'BL', up = q === 'TL' || q === 'TR', ax = right ? hx - G : hx + G, ay = up ? hy - G : hy + G;
    b.el.style.visibility = 'visible'; b.el.style.width = w.toFixed(0) + 'px'; b.el.style.textAlign = right ? 'right' : 'left';
    b.el.style.transform = `translate(${ax.toFixed(1)}px,${ay.toFixed(1)}px) translate(${right ? -100 : 0}%,${up ? -100 : 0}%)`;
    const dir = (i === 0 && ti < 1) || d < 0 ? 1 : -1;
    setLines(b.hl, a, dir); setLines(b.pl, clamp(a * 1.4 - .4), dir);
    b.n.style.opacity = clamp(a * 1.6 - .6).toFixed(2);
  });
}
requestAnimationFrame(tick);

window.HumanTouch = { setText };
})();
