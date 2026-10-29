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
const PRO = { in: [14.6, 15.8], hold: [15.8, 17.4], out: [17.4, 18.5] };   // 프로모션 영상 자리 : 아래에서 올라와(스크롤과 1:1) 가운데에 머물다가 위로 올라가 사라진다. 그 뒤에 휴먼 터치 장면이 이어진다
const T = { end: [39.8, 43.9], show: 13.9, bg: [14.1, 14.5], ball: [18.5, 19.1], hline: [18.8, 19.6], slide: [19.3, 20.9], vline: [21.0, 21.7], settle: [21.7, 22.7], text0: [23.0, 23.6], s: [22.7, 26.1, 29.5], out: [31.7, 39.7] };   // 장면 3개 : I was born… / But a driver… / A warm welcome. · A quick heads-up. · A gentle reminder. (세 문장이 한 장면에 함께). out : 끝 장면 뒤 퇴장 (점이 가운데로 와서 가로선이 줄고, 위로 살짝 떴다가 아래로 떨어지며 라이트 모드로)
const N = 3;
// 허브 위치(화면 비율) · 이미지 칸 · 글 칸 : 데스크톱 / 모바일
const LAY = {
  d: { hub: [[3, 2], [9, 6], [3, 2]], img: [null, null, null], txt: ['BR', 'TL', 'BR'] },
  m: { hub: [[1, 2], [3, 6], [1, 2]], img: [null, null, null], txt: ['BR', 'TL', 'BR'] }
};
const FALLBACK = { s1: ['I was born to bring', 'a little <em>human touch</em>', 'to driverless rides.'], s2a: ['Now, taxis can', 'drive themselves.'], s2b: ['But a driver did', '<em>more than</em> drive.'],
  b: [['A warm', 'welcome.'], ['A quick', 'heads-up.'], ['A gentle', 'reminder.']] };
let TX = window.__ht || FALLBACK;

/* ── DOM ── */
const root = document.createElement('div'); root.id = 'ht';
root.innerHTML = '<div class="ht-probe" style="position:absolute;visibility:hidden;height:0;width:var(--content);display:grid;column-gap:var(--gutter)"></div><div class="ht-bg"></div><div class="ht-cells"></div><svg class="ht-rail" aria-hidden="true"></svg><div class="ht-lt"></div><div class="ht-end"><div class="ht-eh"></div><div class="ht-ep"><i class="hr"></i><div class="tx"></div></div><div class="ht-ep"><i class="hr"></i><div class="tx"></div></div><div class="ht-vid"></div></div>';
document.body.appendChild(root);
const bg = root.querySelector('.ht-bg'), rail = root.querySelector('.ht-rail'), cellsEl = root.querySelector('.ht-cells'), lt = root.querySelector('.ht-lt'), endEl = root.querySelector('.ht-end'), ehEl = endEl.children[0], epA = endEl.children[1], epB = endEl.children[2], vidEl = endEl.children[3]; let endKey = '', ehL = [], aL = [], bL = [], et = 0, endIn = 0;   // et : 끝 장면의 시간 (초). 스크롤은 방아쇠일 뿐, 모션은 시간으로 흐른다 (obys 처럼 stagger + power3.out)
const promo = document.createElement('div'); promo.className = 'ht-promo'; cellsEl.after(promo);   // 16:9 프로모션 영상 자리 (검정)
const mk = (p, n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; };

/* 허브 + 레일 */
// grids03 (obys) 방식 : 화면을 4분할하는 가는 컬럼선이 늘 깔려 있고, 모든 글은 8pt 간격 위에 선다
const gridLines = [1, 2, 3, 1, 2, 3].map(() => mk(rail, 'line', { stroke: 'rgba(242,242,246,.08)', 'stroke-width': 1 }));   // 앞 셋 : 세로 · 뒤 셋 : 가로 (허브는 늘 이 선들의 교차점에 선다)
gridLines.forEach(l => { l.style.display = 'none'; });   // 화면 전체에 깔리던 미세한 그리드 선은 숨긴다 (허브 위치는 여전히 그 교차점 기준)
const defs = mk(rail, 'defs', {});
const grads = [0, 1, 2, 3].map(i => {
  const g = mk(defs, 'linearGradient', { id: 'htg' + i, gradientUnits: 'userSpaceOnUse' });
  [[0, 'rgba(252,252,255,.95)'], [.4, 'rgba(180,183,200,.62)'], [1, 'rgba(126,135,173,0)']].forEach(([o, c]) => mk(g, 'stop', { offset: o, 'stop-color': c }));
  return g;
});
// 광선의 번짐 : 선 아래에 좁은 글로우와 넓은 블룸을 깔아, 선이 또렷하게 잘린 느낌 대신 빛이 번지는 느낌으로 만든다
const bloomF = [['htbl1', 6], ['htbl2', 20]].map(([id, sd]) => { const f = mk(defs, 'filter', { id, filterUnits: 'userSpaceOnUse', x: -80, y: -80, width: 4200, height: 3200 }); mk(f, 'feGaussianBlur', { stdDeviation: sd }); return id; });
const haloA = mk(rail, 'circle', { fill: '#C9D2F2', filter: 'url(#htbl2)', opacity: .16 }), haloB = mk(rail, 'circle', { fill: '#F2F4FF', filter: 'url(#htbl1)', opacity: .28 });
const glowB = [0, 1, 2, 3].map(i => mk(rail, 'line', { stroke: 'url(#htg' + i + ')', 'stroke-width': 10, filter: 'url(#htbl2)', opacity: .09 }));
const glowA = [0, 1, 2, 3].map(i => mk(rail, 'line', { stroke: 'url(#htg' + i + ')', 'stroke-width': 3, filter: 'url(#htbl1)', opacity: .26 }));
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
  el.firstChild.dataset.q = q;
  return { q, el, fill: el.querySelector('.ht-fill'), lbl: el.querySelector('.ht-fl'), lastLbl: '' };
});
// 칸이 채워질 때 허브 모서리에서 퍼져 나가는 방향
const CLIP = { TL: (a) => `inset(${a}% 0 0 ${a}%)`, TR: (a) => `inset(${a}% ${0}% 0 0)`.replace('% 0%', '% 0'), BL: (a) => `inset(0 0 ${a}% ${a}%)`, BR: (a) => `inset(0 ${a}% ${a}% 0)` };
CLIP.TR = a => `inset(${a}% ${a}% 0 0)`;

/* 글 블록 5개 */
const lines = arr => arr.map(l => `<span class="ln"><i>${l}</i></span>`).join('');
const strip = arr => arr.join(' ').replace(/<[^>]+>/g, '');
const wide = s => /[　-鿿가-힯]/.test(s);
const blocks = [0, 1, 2].map(() => { const el = document.createElement('div'); el.className = 'tb'; el.innerHTML = '<div class="h"></div><div class="p"></div><div class="n"></div>'; root.appendChild(el); return { el, h: el.querySelector('.h'), p: el.querySelector('.p'), n: el.querySelector('.n'), fs: 0, w: 0 }; });
function setText(t) {
  TX = t || FALLBACK;
  const H = [TX.s1, TX.s2b, TX.b.map(a => a.join(' '))], P = [null, [strip(TX.s2a)], null];   // 마지막 장면 : 세 문장이 한 블록의 세 줄로 위에서 아래로 함께 뜬다
  blocks.forEach((b, i) => {
    b.h.innerHTML = lines(H[i]); b.p.innerHTML = P[i] ? lines(P[i]) : ''; b.n.textContent = '';
    b.hl = [...b.h.querySelectorAll('.ln i')]; b.pl = [...b.p.querySelectorAll('.ln i')]; b.nl = H[i].length;
    const s = strip(H[i]); b.chars = Math.max(...H[i].map(l => l.replace(/<[^>]+>/g, '').length)); b.fw = wide(s) ? 1.0 : .54;
  });
}
setText(TX);

/* ── 레이아웃 ── */
let vw = 0, vh = 0, mob = false, mg = 24, top = 88, G = 16;
let gcols = 12, gcw = 0, ggap = 16, gleft = 0;
const probe = root.querySelector('.ht-probe');
function metrics() {
  vw = innerWidth; vh = innerHeight; mob = vw < 640; mg = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--margin')) || 24; top = Math.round(Math.max(80, vh * .11) / 8) * 8; G = 16;   // 모든 간격은 8 의 배수 (grid.css --u) rail.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  const cs = getComputedStyle(probe), content = parseFloat(cs.width) || vw - 2 * mg; ggap = parseFloat(cs.columnGap) || 16;
  gcols = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cols')) || 12; gcw = (content - (gcols - 1) * ggap) / gcols; gleft = (vw - content) / 2;
  gridLines.slice(0, 3).forEach((l, i) => { const x = Math.round(gleft + (i + 1) * (gcols / 4) * (gcw + ggap) - ggap / 2) + .5; l.setAttribute('x1', x); l.setAttribute('x2', x); l.setAttribute('y1', 0); l.setAttribute('y2', vh); });
  gridLines.slice(3).forEach((l, i) => { const y = Math.round((i + 1) * 2 * vh / 8 / 16) * 16 + .5; l.setAttribute('y1', y); l.setAttribute('y2', y); l.setAttribute('x1', 0); l.setAttribute('x2', vw); });
}
let LH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lh-head')) || 1.15, LHlang = document.documentElement.lang;   // 제목 행간 : 토큰 배율을 4px 단위로 맞춘다
// 허브는 늘 그리드 선 위에 선다 : x 는 컬럼 사이 거터의 한가운데, y 는 화면을 8등분한 선
const hubPx = h => { const k = mob ? h[0] : Math.round(h[0] * gcols / 12); return [gleft + k * (gcw + ggap) - ggap / 2, Math.round(h[1] * vh / 8 / 16) * 16]; };
metrics(); addEventListener('resize', metrics);
const cell = (hx, hy, q, e) => q === 'TL' ? [0, 0, hx - e, hy - e] : q === 'TR' ? [hx + e, 0, vw - hx - e, hy - e] : q === 'BL' ? [0, hy + e, hx - e, vh - hy - e] : [hx + e, hy + e, vw - hx - e, vh - hy - e];
const quad = (hx, hy, q) => {
  const l = mg, r = vw - mg, b = vh - mg;
  return q === 'TL' ? [l, top, hx - G - l, hy - G - top] : q === 'TR' ? [hx + G, top, r - hx - G, hy - G - top] : q === 'BL' ? [l, hy + G, hx - G - l, b - hy - G] : [hx + G, hy + G, r - hx - G, b - hy - G];
};

/* 이미지 칸의 사진 : 점자(braille) ASCII 텍스처. 장면 번호 → 사진. 칸 크기에 맞춰 한 번만 그리고, 칸이 늘고 줄 때는 cover 로 따라간다. */
const BRAILLE = false;   // true : 점자 ASCII 텍스처로 그린다
const ASC = {};   // 장면에 이미지는 넣지 않는다 (글만)
Object.values(ASC).forEach(a => { a.img = new Image(); a.img.onload = () => { a.key = ''; asciiAll(); }; a.img.src = a.src; a.cv = document.createElement('canvas'); a.cv.className = 'ht-proj'; a.cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block'; });
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function ascii(a, i) {
  const img = a.img; if (!img.complete || !img.naturalWidth) return;
  const L = mob ? LAY.m : LAY.d, hp = hubPx(L.hub[i]), r = cell(hp[0], hp[1], L.img[i], 1), W = Math.max(8, Math.round(r[2])), H = Math.max(8, Math.round(r[3])), dpr = Math.min(devicePixelRatio || 1, 2), key = W + 'x' + H + '@' + dpr;
  if (key === a.key) return; a.key = key;
  if (!BRAILLE) { const cv = a.cv, c = cv.getContext('2d'), k = Math.max(W * dpr / img.naturalWidth, H * dpr / img.naturalHeight), iw = img.naturalWidth * k, ih = img.naturalHeight * k; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); c.drawImage(img, (cv.width - iw) / 2, (cv.height - ih) / 2, iw, ih); return; }   // 효과 없이 사진 그대로 (cover)
  const P = 2, gw = Math.floor(W / (2 * P)) * 2, gh = Math.floor(H / (4 * P)) * 4, off = document.createElement('canvas'); off.width = gw; off.height = gh;
  const o = off.getContext('2d', { willReadFrequently: true }), k = Math.max(gw / img.naturalWidth, gh / img.naturalHeight), iw = img.naturalWidth * k, ih = img.naturalHeight * k;
  o.drawImage(img, (gw - iw) / 2, (gh - ih) / 2, iw, ih);   // cover
  const d = o.getImageData(0, 0, gw, gh).data, cv = a.cv; cv.width = Math.round(gw * P * dpr); cv.height = Math.round(gh * P * dpr);
  const c = cv.getContext('2d'); c.scale(dpr, dpr); c.fillStyle = '#111014'; c.fillRect(0, 0, gw * P, gh * P);
  const ink = '#BDBCC5', path = new Path2D();
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const q = (y * gw + x) * 4, v = clamp(((.299 * d[q] + .587 * d[q + 1] + .114 * d[q + 2]) / 255 - .5) * 1.05 + .5);   // contrast
    if (v > (BAYER[(y & 3) * 4 + (x & 3)] + .5) / 16) path.arc((x + .5) * P, (y + .5) * P, P * (.22 + .14 * v), 0, 6.2832);
    else continue; path.closePath();
  }
  c.fillStyle = ink; c.shadowColor = 'rgba(230,229,236,.08)'; c.shadowBlur = 3; c.fill(path); c.shadowBlur = 0; c.fill(path);   // glow
}
function asciiAll() { for (const i in ASC) ascii(ASC[i], +i); }
addEventListener('resize', () => { for (const i in ASC) ASC[i].key = ''; clearTimeout(asciiAll.t); asciiAll.t = setTimeout(asciiAll, 200); });

/* ── 입력 ── */
const ptr = { x: 0, y: 0, has: false };
addEventListener('pointermove', e => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.has = true; }, { passive: true });
document.addEventListener('pointerleave', () => { ptr.has = false; });

/* ── 루프 ── */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ut = y => { let u = 0; for (let i = 1; i < N; i++) u += eio(seg(y, T.s[i] - .9, T.s[i] + .1)); return u; };
// 모든 장면의 글은 같은 크기 · 같은 정렬 : 가장 좁은 칸에 맞는 크기 하나를 쓴다
const uniFs = () => {
  const L = mob ? LAY.m : LAY.d; let m = mob ? 22 : Math.min(vw * .02, vh * .036);
  blocks.forEach((b, i) => { const h = hubPx(L.hub[i]), g = quad(h[0], h[1], L.txt[i]); m = Math.min(m, g[2] / (b.chars * b.fw), Math.max(g[3] - (i === 1 ? 70 : i >= 2 ? 36 : 0), 40) / (b.nl * LH)); });
  return Math.max(mob ? 20 : 22, m);
};
const LTS = [[0, 92, 102, 142, 0], [.1, 98, 110, 152, .26], [.28, 128, 142, 186, .58], [.48, 166, 178, 212, .8], [.7, 208, 216, 236, .94], [.88, 241, 244, 251, 1], [1, 255, 255, 255, 1]];   // 표지 wipe 와 같은 색 : 다크 → 슬레이트 블루 → 연회청 → 화이트
let fallT = 0;   // 떨어짐은 스크롤이 아니라 시간으로 : 한 번 시작되면 빠르게 쑤욱 떨어지고 곧바로 라이트로 넘어간다
let u = 0, last = performance.now(), tm = 0, hx = 0, hy = 0, vx = 0, vy = 0, init = false, lastCnt = '', lastLbl = '';

function setLines(els, a, dir) {
  const n = els.length;
  for (let k = 0; k < n; k++) { const ra = eo3(clamp(a * (1 + .3 * (n - 1)) - k * .3)); els[k].style.transform = `translateY(${((1 - ra) * 110 * dir).toFixed(2)}%)`; }
}

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(.05, (now - last) / 1000); last = now; tm += dt;
  if (document.documentElement.lang !== LHlang) { LHlang = document.documentElement.lang; LH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lh-head')) || 1.15; blocks.forEach(b => { b.fs = 0; }); }   // 언어가 바뀌면 행간 토큰(한글 130%)을 다시 읽는다
  if (vw !== innerWidth || vh !== innerHeight) metrics();   // 창 크기가 바뀌었는데 resize 이벤트가 오지 않는 경우도 따라간다
  const y = scrollY / (vh || 1);
  if (y < T.show) { if (root.style.visibility !== 'hidden') root.style.visibility = 'hidden'; init = false; return; }
  root.style.visibility = 'visible';
  bg.style.opacity = eio(seg(y, T.bg[0], T.bg[1])).toFixed(3);
  {   // 프로모션 영상 자리 : 16:9, 화면 높이의 74% 안에 들어오는 크기, 가운데 정렬
    const pw = Math.min(vw - 2 * mg, 1400, vh * .74 * 16 / 9), ph = pw * 9 / 16, yc = (vh - ph) / 2, ein = eio(seg(y, PRO.in[0], PRO.in[1])), eout = eio(seg(y, PRO.out[0], PRO.out[1]));
    const py = eout > 0 ? lerp(yc, -ph - 24, eout) : lerp(vh + 24, yc, ein), on = y > PRO.in[0] - .25 && y < PRO.out[1] + .25;
    promo.style.visibility = on ? 'visible' : 'hidden';
    if (on) { promo.style.width = pw.toFixed(1) + 'px'; promo.style.height = ph.toFixed(1) + 'px'; promo.style.transform = `translate3d(${((vw - pw) / 2).toFixed(1)}px,${py.toFixed(1)}px,0)`; }
  }
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
  const P = seg(y, T.out[0], T.out[1]), pIn = eio(seg(P, 0, .25)), pH = eio(seg(P, .25, .45));   // 퇴장 : 중앙으로 · 가로선 줄어듦
  if (P > 0) { const c = hubPx(mob ? [2, 4] : [6, 4]); bx = lerp(bx, c[0], pIn); by = lerp(by, c[1], pIn); }
  if (!init || y < T.s[0]) { hx = bx; hy = by; vx = vy = 0; init = true; }
  else if (reduce) { hx = bx; hy = by; vx = vy = 0; } else {   // 임계 감쇠 스프링 : 튕기지 않고 부드럽게 도착한다. x 와 y 의 속도만 살짝 달라 두 레일이 엇박으로 미끄러진다
    vx += (30 * (bx - hx) - 10.95 * vx) * dt; hx += vx * dt; vy += (24 * (by - hy) - 9.8 * vy) * dt; hy += vy * dt;
  }

  fallT = clamp(fallT + (P >= .66 ? dt / .5 : -dt / .6));
  if (P > .45) {   // 점이 화면 맨 위까지 적당한 속도로 올라갔다가(스크롤), 시간이 되면 아래로 쑤욱 떨어진다
    const top0 = Math.round(vh * .06) + .5, up = eo3(seg(P, .45, .62));
    hx = bx; hy = lerp(lerp(by, top0, up), vh + 48, fallT * fallT); vx = vy = 0;
  }
  // 공 : 처음엔 크게 나타나 움직이다가, 그리드가 자리 잡으면 작은 점이 된다. 레일은 공 둘레의 틈에서 시작해 끝으로 갈수록 옅어진다
  const hubIn = 1, grow = eo3(seg(y, T.ball[0], T.ball[1]));
  const sx = Math.round(hx) + .5, sy = Math.round(hy) + .5;   // 1px 선이 번지지 않도록 픽셀 중앙에 맞춘다
  const gap = lerp(7, 5, settle) * grow, br = lerp(2.2, 1.5, settle) * grow;   // 점은 선 굵기(1px)에 가까운 크기
  hubDot.setAttribute('cx', sx.toFixed(1)); hubDot.setAttribute('cy', sy.toFixed(1)); hubDot.setAttribute('r', br.toFixed(2));
  [[haloA, 5], [haloB, 2.4]].forEach(([h, m]) => { h.setAttribute('cx', sx.toFixed(1)); h.setAttribute('cy', sy.toFixed(1)); h.setAttribute('r', (br * m).toFixed(2)); });
  const edges = [[vw, sy], [sx, vh], [0, sy], [sx, 0]];
  rails.forEach((l, i) => {
    const dx = Math.cos(i * HALF), dy = Math.sin(i * HALF), s0 = [sx + dx * gap, sy + dy * gap], e = edges[i], k = oExp(i % 2 ? seg(y, T.vline[0], T.vline[1]) : seg(y, T.hline[0], T.hline[1])) * (i % 2 ? 1 : 1 - pH);
    if (i === 1 && s0[1] >= vh) { e[0] = s0[0]; e[1] = s0[1]; }   // 점이 화면 아래로 빠지면 아래 레일은 사라진다
    l.setAttribute('x1', s0[0].toFixed(1)); l.setAttribute('y1', s0[1].toFixed(1)); l.setAttribute('x2', lerp(s0[0], e[0], k).toFixed(1)); l.setAttribute('y2', lerp(s0[1], e[1], k).toFixed(1));
    [glowA[i], glowB[i]].forEach(gl => ['x1', 'y1', 'x2', 'y2'].forEach(a => gl.setAttribute(a, l.getAttribute(a))));
    {   // 빔 : 허브에서 바깥으로 흘러가고, 한 번 지나가면 잠시 쉰다
      const ex = lerp(s0[0], e[0], k), ey = lerp(s0[1], e[1], k), len = Math.hypot(ex - s0[0], ey - s0[1]), BL = 460, SP = 68, cyc = (Math.max(len, 1) + BL) / SP + 9;
      const tt = (tm + i * cyc * .29) % cyc, head = tt * SP, tail = head - BL, on = k > .98 && len > 20 ? 1 : 0, pr = clamp(head / (len + BL)), env = Math.pow(Math.sin(Math.PI * pr), 1.4);   // 시작과 끝에서 서서히 나타나고 사라진다
      const px = d => (s0[0] + dx * d).toFixed(1), py = d => (s0[1] + dy * d).toFixed(1), bg = beamG[i];
      bg.setAttribute('x1', px(tail)); bg.setAttribute('y1', py(tail)); bg.setAttribute('x2', px(head)); bg.setAttribute('y2', py(head));
      [beamGlow[i], beamCore[i]].forEach(b => { b.setAttribute('x1', s0[0].toFixed(1)); b.setAttribute('y1', s0[1].toFixed(1)); b.setAttribute('x2', ex.toFixed(1)); b.setAttribute('y2', ey.toFixed(1)); b.style.display = on && pr < 1 ? '' : 'none'; b.style.opacity = (env * (b === beamGlow[i] ? .38 : 1)).toFixed(3); });
    }
    const g = grads[i]; g.setAttribute('x1', s0[0].toFixed(1)); g.setAttribute('y1', s0[1].toFixed(1)); g.setAttribute('x2', e[0].toFixed(1)); g.setAttribute('y2', e[1].toFixed(1));
  });

  // 라이트 모드 : 표지(다크 → 흰색) 전환과 같은 그라데이션이 아래에서부터 쏙 차오른다. 다 밝아지면 그리드 · 선 · 점은 없다
  const wp = seg(fallT, .3, 1), BAND = 135, front = 100 - wp * (100 + BAND);
  lt.style.display = wp > 0 ? 'block' : 'none';
  if (wp > 0) lt.style.background = `linear-gradient(to bottom, rgba(255,255,255,0) ${front.toFixed(2)}%, ${LTS.map(([k, r, g, b2, al]) => `rgba(${r},${g},${b2},${al}) ${(front + k * BAND).toFixed(2)}%`).join(', ')})`;
  {
    // 끝 장면의 한 개의 마진 : 영상 폭이 기준. 낮고 넓은 창에서는 영상이 높이에 눌려 좁아지므로, 제목 + 두 문단이 겹치지 않는 최소 폭을 먼저 확보하고 문단 폭을 그 안에 맞춘다
    const vwF = vw - 2 * gleft, cg = ggap * 1.25, hwS = ehEl.offsetWidth * .72, lhE = Math.max(13, Math.min(15, vw * .0095)) * (LHlang === 'ko' ? 1.52 : 1.42), cwDef = mob ? vwF : 2.6 * gcw + 1.6 * ggap;
    const Hav = vh - (top + 24 + Math.max(epA.offsetHeight, epB.offsetHeight, 6 * lhE) + 56) - gleft, Hv = (mob ? vwF : Math.min(vwF, 1400)) * 9 / 16;   // 영상은 늘 16:9. 폭은 기본 마진 그대로 (높이가 화면보다 커도 스크롤로 올라가므로 괜찮다)
    const Wv = mob ? Hv * 16 / 9 : Math.min(vwF, 1400), M = (vw - Wv) / 2;   // 데스크톱은 콘텐츠 폭 전체 (최대 1400px, 그보다 넓은 화면은 가운데 정렬), 마진은 그리드 기본 마진
    const cw = mob ? cwDef : Math.min(cwDef, Math.max(200, (Wv - hwS - 56 - cg) / 2));
    const E = window.__end;
    if (E && endKey !== E.h + vw + vh + cw) {   // 문단을 실제 줄바꿈 단위로 쪼개 줄마다 마스크 리빌
      endKey = E.h + vw + vh + cw; epA.style.width = epB.style.width = cw.toFixed(0) + 'px';
      ehEl.textContent = E.h;
      [[epA, E.a], [epB, E.b]].forEach(([el, t]) => {
        const tx = el.querySelector('.tx'), cj = wide(t), w = cj ? Array.from(t) : t.split(' ');
        const meas = width => { tx.style.width = width.toFixed(0) + 'px'; tx.innerHTML = w.map(x => `<span>${x}</span>`).join(cj ? '' : ' '); const g = []; let ly = -1; [...tx.children].forEach(c => { if (c.offsetTop !== ly) { ly = c.offsetTop; g.push(''); } g[g.length - 1] += c.textContent + (cj ? '' : ' '); }); return g.map(x => x.trim()); };
        const n = meas(cw).length; let lo = cw * .55, hi = cw; for (let i = 0; i < 9; i++) { const mid = (lo + hi) / 2; if (meas(mid).length <= n) hi = mid; else lo = mid; }   // 줄 수는 그대로, 폭만 좁혀 줄 길이를 고르게 (들쭉날쭉 · 고아 줄 방지)
        tx.innerHTML = lines(meas(hi));
      });
      aL = [...epA.querySelectorAll('.ln i')]; bL = [...epB.querySelectorAll('.ln i')];
    }
    endIn = clamp(endIn + (fallT >= .98 ? dt / .8 : -dt / .4)); const e = eo3(endIn);   // Hey, I'm LIEU 와 같은 등장 : 블러 + 살짝 아래에서 떠오르며 선명해진다 (0.8초, 시간 기반)
    et = y < T.end[0] + 2.3 ? 1.1 + 1.0 * seg(y, T.end[0] + 1.35, T.end[0] + 2.3) : 2.1 + 1.3 * seg(y, T.end[0] + 2.3, T.end[0] + 3.8);   // 제목이 자리를 잡은 뒤 스크롤로 선 · 문단이 (43.85~44.8), 다시 스크롤하면 영상 자리가 (44.8~46.3) 차례로 뜬다
    const eo4 = t => 1 - Math.pow(1 - t, 4), eioc = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, pr = (t0, d, f) => f(clamp((et - t0) / d));
    const mx = eioc(seg(y, T.end[0] + .1, T.end[0] + .7)), mh = eioc(seg(y, T.end[0] + .65, T.end[0] + 1.3));   // 스크롤을 따라 먼저 옆으로 왼쪽으로, 이어서 위로 올라가 붙는다
    const sy = Math.max(0, y - T.end[1]) * vh, sT = sy * 1.25;   // 더 스크롤하면 글자가 먼저 (1.7배 빠르게) 위로 올라가 사라지고, 영상 자리가 뒤따라 올라가 사라진다
    const hw = ehEl.offsetWidth, hh = ehEl.offsetHeight, sc = lerp(1, .72, mh);
    const cx = (vw - hw) / 2, cy = (vh - hh) / 2, tx = M, ty = top + 24;
    ehEl.style.transform = `translate(${lerp(cx, tx, mx).toFixed(1)}px,${(lerp(cy, ty, mh) + (1 - e) * 18 - sT).toFixed(1)}px) scale(${sc.toFixed(3)})`;
    ehEl.style.opacity = e.toFixed(3); ehEl.style.filter = e < 1 ? `blur(${((1 - e) * 10).toFixed(1)}px)` : 'none';
    const py = ty + (mob ? 80 : 3), ax = mob ? M : vw - M - (2 * cw + cg), bx = mob ? M : ax + cw + cg, by2 = mob ? py + epA.offsetHeight + 32 : py;
    epA.style.transform = `translate(${ax.toFixed(1)}px,${(py - sT).toFixed(1)}px)`; epB.style.transform = `translate(${bx.toFixed(1)}px,${(by2 - sT).toFixed(1)}px)`;
    epA.firstChild.style.transform = `scaleX(${pr(1.2, .9, eo3).toFixed(3)})`; epB.firstChild.style.transform = `scaleX(${pr(1.3, .9, eo3).toFixed(3)})`;
    const eoE = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);   // expo out : 처음에 빠르게 솟았다가 끝에서 길게 가라앉는다
    const rl = (els, t0) => els.forEach((l, k) => { const r = pr(t0 + k * .09, 1.35, eoE), o = clamp(r * 2.2); l.style.transform = `translateY(${((1 - r) * 108).toFixed(2)}%)`; l.style.opacity = o.toFixed(3); l.style.filter = r < 1 ? `blur(${((1 - r) * 5).toFixed(1)}px)` : 'none'; });   // 줄마다 마스크 + 블러 + 페이드가 겹쳐 떠오른다
    rl(aL, 1.3); rl(bL, 1.45);
    { const vt = mob ? by2 + epB.offsetHeight + 40 : ty + Math.max(epA.offsetHeight, epB.offsetHeight) + 56, vh2 = Hv, vw2 = Wv, vx = M, r = pr(2.1, 1.3, eioc);   // 16:9 : 남는 높이에 안 들어가면 비율을 지키며 줄이고 가운데 정렬   // 프로모션 영상 자리 (회색)
      vidEl.style.width = vw2.toFixed(0) + 'px'; vidEl.style.height = vh2.toFixed(0) + 'px'; vidEl.style.opacity = (clamp(r * 2) * (1 - eio(seg(sy, vh * .7, vh * 1.15)))).toFixed(3);
      vidEl.style.transform = `translate(${vx.toFixed(1)}px,${(vt + (1 - r) * 48 - sy).toFixed(1)}px)`;
      window.__endVid = { x: vx, y: vt, w: vw2, h: vh2 }; }   // 영상 자리의 (스크롤 전) 위치와 크기 : 다음 장면(렌더 이미지 틀)이 이 자리에 이어 붙는다
  }
  rail.style.opacity = (1 - seg(fallT, .7, .95)).toFixed(3);
  gridLines.forEach(l => { l.style.opacity = (+bg.style.opacity * (1 - seg(fallT, .1, .5))).toFixed(3); });

  // 네 칸 : 허브 위치에 맞춰 늘어나고, 이미지가 있는 장면에서는 허브 모서리에서부터 채워진다
  cells.forEach(c => {
    const r = cell(hx, hy, c.q, 1), w = Math.max(0, r[2]), h = Math.max(0, r[3]);
    let f = 0, bi = -1; for (let i = 0; i < N; i++) if (L.img[i] === c.q) { const v = clamp(1 - Math.abs(u - i) / .55); if (v > f) { f = v; bi = i; } }
    f = eio(f) * hubIn * (1 - pIn);
    c.el.style.transform = `translate3d(${r[0].toFixed(1)}px,${r[1].toFixed(1)}px,0)`; c.el.style.width = w.toFixed(1) + 'px'; c.el.style.height = h.toFixed(1) + 'px';
    const hov = ptr.has && ptr.x >= r[0] && ptr.x <= r[0] + w && ptr.y >= r[1] && ptr.y <= r[1] + h; c.el.classList.toggle('on', hov);
    const showFill = f > .002; c.fill.style.visibility = showFill ? 'visible' : 'hidden';
    if (!showFill) return;
    const as = ASC[bi]; if (c.cv && c.cv !== (as && as.cv)) c.cv.style.display = 'none';
    if (as) { if (!as.key) ascii(as, bi); if (c.cv !== as.cv) { c.fill.prepend(as.cv); c.cv = as.cv; } as.cv.style.display = 'block'; c.fill.style.background = '#111014'; } else c.fill.style.background = '';
    c.fill.style.clipPath = CLIP[c.q]((1 - f) * 100);
    const lbl = ''; if (lbl !== c.lastLbl) { c.lbl.textContent = lbl; c.lastLbl = lbl; }
  });

  // 글 : 허브 모서리에 붙어서, 줄마다 마스크로 올라온다
  const ti = eo3(seg(y, T.text0[0], T.text0[1]));
  blocks.forEach((b, i) => {
    const d = u - i; let a = clamp(1 - Math.abs(d) / .6) * (1 - pIn); if (i === 0) a = Math.min(a, ti);
    if (a <= 0) { b.el.style.visibility = 'hidden'; return; }
    const q = L.txt[i], g = quad(hx, hy, q), fs = uniFs(), w = Math.max(120, g[2]);
    if (Math.abs(fs - b.fs) > .5) { b.fs = fs; b.el.style.setProperty('--fs', fs.toFixed(1) + 'px'); b.el.style.setProperty('--lh', (LHlang === 'ko' ? Math.round(fs * LH) : Math.round(fs * LH / 4) * 4) + 'px'); }
    const up = q === 'TL' || q === 'TR', ax = g[0], ay = up ? hy - G : hy + G;
    b.el.style.visibility = 'visible'; b.el.style.width = w.toFixed(0) + 'px'; b.el.style.textAlign = 'left';
    b.el.style.transform = `translate(${ax.toFixed(1)}px,${ay.toFixed(1)}px) translate(0,${up ? -100 : 0}%)`;
    const dir = (i === 0 && ti < 1) || d < 0 ? 1 : -1;
    setLines(b.hl, a, dir); setLines(b.pl, clamp(a * 1.4 - .4), dir);
    b.n.style.opacity = clamp(a * 1.6 - .6).toFixed(2);
  });
}
requestAnimationFrame(tick);

window.HumanTouch = { setText, T };
})();
