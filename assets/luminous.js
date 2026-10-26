/* Luminous Type : 다크 모드의 "Here's how I came to be." 에 적용.
   글자는 아주 어둡게 깔려 있고, 떠다니는 스포트라이트가 지나가는 글자만 밝아진다. 커서가 있으면 커서를 따라가고, 없으면 천천히 떠다닌다.
   빛 가장자리는 슬레이트 블루 톤(화이트 와이프 그라데이션과 같은 색)으로 풀리고, 지나간 자리는 잠깐 남는다. 클릭하면 전체가 켜지고, 다시 클릭하면 스포트라이트로 돌아간다. */
(() => {
'use strict';
const el = document.getElementById('storyText');
if (!el) return;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const st = document.createElement('style');
st.textContent = '#storyText.lum{color:transparent!important;-webkit-background-clip:text;background-clip:text;background-color:transparent}';
document.head.appendChild(st);

const BASE = .14, RADIUS = 3.2, TRAIL = [[7, .5], [15, .3], [24, .16]];   // 기본 밝기 · 빛 반경(em) · 잔광(프레임 지연, 세기)
const ptr = { x: 0, y: 0, t: -1e9, inside: false };
const L = { x: 0, y: 0, ready: false }, hist = [];
let rev = 0, revT = 0, last = performance.now(), tm = 0;

addEventListener('pointermove', e => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = performance.now(); }, { passive: true });
addEventListener('click', e => {
  if (!el.classList.contains('lum')) return;
  const r = el.getBoundingClientRect(); if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) revT = revT ? 0 : 1;
});

const light = (x, y, R, a) => `radial-gradient(circle ${R.toFixed(0)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px,rgba(252,252,255,${a.toFixed(3)}) 0%,rgba(180,183,200,${(a * .85).toFixed(3)}) 32%,rgba(126,135,173,${(a * .6).toFixed(3)}) 66%,rgba(126,135,173,0) 100%)`;

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(.05, (now - last) / 1000); last = now; tm += dt;
  const dark = scrollY > 11.5 * innerHeight && parseFloat(el.style.opacity || 0) > .01;
  if (!dark) { if (el.classList.contains('lum')) { el.classList.remove('lum'); el.style.backgroundImage = ''; } return; }
  el.classList.add('lum');
  const r = el.getBoundingClientRect(), w = r.width, h = r.height, fs = parseFloat(getComputedStyle(el).fontSize) || 60, R = RADIUS * fs;
  // 빛의 목표 : 커서가 최근에 움직였으면 커서, 아니면 글자 위를 떠다닌다
  const live = now - ptr.t < 2200 && ptr.x >= r.left - fs && ptr.x <= r.right + fs && ptr.y >= r.top - fs && ptr.y <= r.bottom + fs;
  const tx = live ? ptr.x - r.left : w * (.5 + .4 * Math.sin(tm * .42) * Math.cos(tm * .17)), ty = live ? ptr.y - r.top : h * (.5 + .34 * Math.sin(tm * .31 + 1.1));
  if (!L.ready) { L.x = tx; L.y = ty; L.ready = true; }
  const k = 1 - Math.exp(-dt * (live ? 9 : 2.2)); L.x += (tx - L.x) * k; L.y += (ty - L.y) * k;
  hist.unshift([L.x, L.y]); if (hist.length > 40) hist.pop();
  rev += (revT - rev) * (1 - Math.exp(-dt * 5));
  const dim = 1 - rev, layers = [light(L.x, L.y, R, dim)];
  TRAIL.forEach(([lag, a]) => { const p = hist[Math.min(lag, hist.length - 1)]; layers.push(light(p[0], p[1], R * .9, a * dim)); });
  const baseA = BASE + (1 - BASE) * rev;
  layers.push(`linear-gradient(rgba(242,242,246,${baseA.toFixed(3)}),rgba(242,242,246,${baseA.toFixed(3)}))`);
  el.style.backgroundImage = layers.join(',');
}
requestAnimationFrame(tick);
})();
