/* LIEU · 분할 그리드 (elastic grid)
   끝 장면의 영상 자리 바로 다음, 부품 뷰(렌더 이미지 틀) 앞에 들어간다. 다른 렌더 사진 · 영상이 들어갈 자리(지금은 비어 있는 칸).
   영상 자리 뒤에서 올라와 화면 전체에 고정되고, 스크롤이 단계의 경계를 넘을 때마다 다음 배치로 스냅된다. 칸은 서로 겹치지 않는다.
   탄성 : 분할 위치는 스프링으로 움직여 튀지 않고 부드럽게 제자리에 선다. 선은 곧게 유지된다. 스크롤에 민감해서, 경계에 닿기 전부터 다음 배치로 넘어가기 시작하고 빠르게 스크롤하면 단계가 연달아 솩솩 바뀐다
   선은 다크모드 그리드처럼 교차점에서 뻗어 나가고칸이 닫힐 때는 선이 말려 들어간다.
   칸이 사라지는 것은 선이 가장자리로 밀려나 그 칸의 폭이 0 이 되는 것이다. 다시 갈라져 나온 칸에는 다른 콘텐츠가 들어간다. 마지막에는 새로 나온 2칸만 남는다.
   마지막 단계의 아래 칸은 실루엣 틀이다 : 이 칸의 위치와 크기를 window.__bentoFrame 으로 내보내면 anatomy-scene.js 가 그 안에 배경과 제품 실루엣을 그린다.
   마지막에 위 칸이 닫히면 이 칸이 화면 전체로 커지고, 그 상태에서 엑스레이가 시작된다. anatomy-scene.js 의 AN 은 이 그리드가 끝나는 지점에서 잡는다 : AN = SCROLL0 + (영상 자리 아래 간격) + HOLD + 여유

   칸에 사진 · 영상을 넣으려면 POOL 의 src 에 파일 경로를 적는다. 예) { k: 'image', src: 'assets/render-01.webp' } (칸이 새로 나올 때마다 순서대로 하나씩 쓰인다) */
const HOLD = 11, SCROLL0 = 46.6;   // 화면 높이 배수. HOLD : 화면에 고정된 채 단계가 넘어가는 스크롤 길이. SCROLL0 : 끝 장면의 영상 자리가 올라가기 시작하는 지점

/* 탄성 값 : 감도를 바꾸려면 여기만 고친다 */
const EL = {
  k: 300, c: 36,                   // 분할 위치 스프링 (단단함, 감쇠). 감쇠비 c / (2 * sqrt(k)) 가 1 이면 튀지 않고 부드럽게 선다. 1 보다 낮추면 튄다
  lead: .22,                       // 단계의 경계보다 이만큼 앞서 다음 단계로 넘어간다 (클수록 스크롤에 민감)
  chain: .1, chainT: .24          // 앞 단계가 이만큼 자리 잡거나 이 시간(초)이 지나면 다음 단계로 (빠르게 스크롤하면 연달아 넘어간다)
};

/* 콘텐츠 풀 : 칸이 새로 나올 때마다 하나씩 꺼내 쓴다. k : 'image' | 'video' */
const POOL = Array.from({ length: 24 }, (_, i) => ({ k: i % 3 === 0 ? 'video' : 'image', src: '' }));

/* 분할 위치 [a, yb, xd, yc, xe] : 모두 부모 안에서의 비율. 0 이면 첫째 칸이, 1 이면 둘째 칸이 사라진다 (선이 가장자리로 밀려난다)
   a  : 화면을 왼쪽 · 오른쪽으로 가르는 세로선          yb : 왼쪽을 위 · 아래로 가르는 가로선
   xd : 왼쪽 아랫칸을 좌우로 가르는 세로선              yc : 오른쪽을 위 · 아래로 가르는 가로선
   xe : 오른쪽 윗칸을 좌우로 가르는 세로선 */
const KEYS = [
  [1 / 2, 1, 1, 1, 1],                 // 2칸
  [1 / 2, 1 / 2, 1, 1, 1],             // 왼쪽이 위 · 아래로 갈라져 3칸
  [1 / 2, 0, 1, 1, 1],                 // 처음의 왼쪽 위 칸이 밀려나 2칸
  [1 / 2, 0, 1 / 2, 1 / 2, 0],         // 왼쪽 아래가 좌우로, 오른쪽이 위 · 아래로 갈라지며 처음의 오른쪽 칸이 밀려난다 : 4칸
  [1 / 3, 1 / 2, 1 / 2, 1 / 2, 1 / 2], // 왼쪽 위와 오른쪽 위가 새로 나와 6칸 (가로선이 화면을 가로질러 한 줄로 맞는다)
  [1 / 3, 1 / 2, 0, 1 / 2, 0],         // 4칸
  [0, 1 / 2, 0, 1 / 2, 0],             // 왼쪽이 통째로 밀려나 2칸
  [1, 1, 1, 1 / 2, 0],                 // 오른쪽이 밀려나고 왼쪽에서 새 칸 하나가 화면 전체로 : 1칸
  [1, 3 / 8, 1, 1 / 2, 0],             // 아래에서 실루엣 틀이 올라온다 (위 3 : 아래 5). 아래 칸이 실루엣 틀
  [1, 0, 1, 1 / 2, 0]                  // 위 칸이 닫히며 실루엣 틀이 화면 전체로 커진다
];

const root = document.getElementById('bento');
if (root) {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t;
  const e3 = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const NS = 'http://www.w3.org/2000/svg', INK = '23,26,24', N = 32;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;   // 움직임 줄이기 : 출렁임 없이 바로 자리 잡는다
  const rects = (P, W, H) => {
    const [a, yb, xd, yc, xe] = P, xa = a * W, y1 = yb * H, y2 = yc * H;
    return [
      [0, 0, xa, y1],                                   // 왼쪽 위
      [0, y1, xd * xa, H - y1],                         // 왼쪽 아래 왼쪽
      [xd * xa, y1, xa - xd * xa, H - y1],              // 왼쪽 아래 오른쪽
      [xa, 0, xe * (W - xa), y2],                       // 오른쪽 위 왼쪽
      [xa + xe * (W - xa), 0, (1 - xe) * (W - xa), y2], // 오른쪽 위 오른쪽
      [xa, y2, W - xa, H - y2]                          // 오른쪽 아래
    ];
  };
  /* 키마다 어떤 칸이 있는지 : 칸이 다시 나타날 때마다 콘텐츠 번호를 하나씩 올린다 */
  const VIS = KEYS.map(K => rects(K, 1, 1).map(r => r[2] > .02 && r[3] > .02)), ID = [0, 1, 2, 3, 4, 5].map(() => []);
  let nextId = 0;
  KEYS.forEach((_, k) => ID.forEach((row, s) => { row[k] = VIS[k][s] ? (k > 0 && VIS[k - 1][s] ? row[k - 1] : nextId++) : -1; }));

  const mkS = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const cellsEl = document.createElement('div'), svg = mkS('svg', { class: 'bn-svg', 'aria-hidden': 'true' });
  /* 선 5개 : 선, 그 위를 흐르는 빛 */
  const LN = Array.from({ length: 5 }, (_, i) => ({
    path: svg.appendChild(mkS('path', { fill: 'none', stroke: `rgba(${INK},.22)`, 'stroke-width': 1 })),
    beam: svg.appendChild(mkS('path', { fill: 'none', stroke: `rgba(${INK},.55)`, 'stroke-width': 1, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '.14 2' })),
    ph: i * 1.7
  }));
  root.append(cellsEl, svg);
  const els = [], cur = [];
  for (let i = 0; i < 6; i++) { const el = document.createElement('div'); el.className = 'bn-cell'; cellsEl.appendChild(el); els.push(el); cur.push(-1); }
  const setContent = (i, id) => {
    if (cur[i] === id) return; cur[i] = id;
    const c = POOL[id % POOL.length];
    els[i].innerHTML = c.src ? (c.k === 'video' ? `<video src="${c.src}" autoplay muted loop playsinline></video>` : `<img src="${c.src}" alt="" draggable="false">`) : '';
  };

  /* 상태 : 분할 위치 스프링(P, V), 단계(idx, prev, tgt) */
  const P = KEYS[0].slice(), V = [0, 0, 0, 0, 0];
  let idx = 0, prev = 0, tgt = 0, stepAt = 0, shown = false, last = 0;

  const frame = (now) => {
    requestAnimationFrame(frame);
    const vid = window.__endVid; if (!vid) return;
    const vw = innerWidth, vh = innerHeight, Y = vid.y + vid.h + vh * .1, tm = (now || 0) / 1000, dt = Math.min(.1, Math.max(0, tm - last)); last = tm;
    const T = Y - (scrollY - SCROLL0 * vh);                    // 영상 자리 뒤에서 스크롤과 1:1 로 올라오는 윗변 (고정되기 전)
    const top = Math.max(0, T);                                // 윗변이 0 에 닿으면 그대로 고정된다 (마지막 칸이 화면 전체가 되어 실루엣 장면으로 이어진다)
    const vis = T < vh + 4 && T > -(HOLD + 3) * vh;
    const u = clamp(-T / (HOLD * vh), 0, 1) * (KEYS.length - 1);
    const ul = u + EL.lead;
    if (Math.abs(ul - tgt) > .56) tgt = clamp(Math.round(ul), 0, KEYS.length - 1);   // 경계보다 조금 앞서 다음 단계가 된다 (경계에서 떨리지 않도록 조금 여유를 둔다)
    if (vis !== shown) { shown = vis; root.style.visibility = vis ? 'visible' : 'hidden'; }
    if (!vis) { idx = prev = tgt; KEYS[tgt].forEach((v, k) => { P[k] = v; V[k] = 0; }); window.__bentoFrame = T < 0 ? { x: 0, y: 0, w: vw, h: vh } : null; return; }   // 화면 밖에서는 바로 맞춰 둔다

    /* 단계 : 한 번에 한 단계씩. 앞 단계가 거의 자리 잡았거나 조금 지나면 다음 단계로 (빠르게 스크롤하면 연달아 넘어간다) */
    const err = Math.max(...KEYS[idx].map((v, k) => Math.abs(v - P[k])));
    if (tgt !== idx && (err < EL.chain || tm - stepAt > EL.chainT)) { prev = idx; idx += Math.sign(tgt - idx); stepAt = tm; }
    if (tgt === idx && err < .004) prev = idx;
    /* 스프링 : 잘게 나눠 적분한다 */
    const K = calm ? 400 : EL.k, C = calm ? 40 : EL.c;
    for (let t = dt; t > 0; t -= .008) {
      const h = Math.min(.008, t);
      for (let k = 0; k < 5; k++) {
        V[k] += (K * (KEYS[idx][k] - P[k]) - C * V[k]) * h; P[k] += V[k] * h;
        if (P[k] < 0 || P[k] > 1) { P[k] = clamp(P[k]); V[k] = 0; }
      }
    }
    const lo = Math.min(prev, idx), hi = Math.max(prev, idx);
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
    root.style.transform = `translate3d(0,${top.toFixed(1)}px,0)`;

    const R = rects(P, vw, vh), [a, yb, xd, yc, xe] = P;
    const fid = ID[1][KEYS.length - 2];   // 마지막 단계의 아래 칸 : 실루엣 틀
    let fr = null;
    els.forEach((el, i) => {
      const [x, y, w, h] = R[i], st = el.style, id = VIS[lo][i] ? ID[i][lo] : ID[i][hi];
      if (w < 2 || h < 2 || id < 0) { st.opacity = '0'; return; }   // 아직 나오지 않았거나 사라진 칸
      if (i === 1 && id === fid) fr = { x, y: y + top, w, h };
      setContent(i, id);
      st.opacity = '1'; st.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; st.width = w.toFixed(1) + 'px'; st.height = h.toFixed(1) + 'px';
    });

    window.__bentoFrame = fr;
    /* 선 : [시작 x, y, 끝 x, y, 열린 정도, 교차점에서 뻗는가] */
    const xa = a * vw, y1 = yb * vh, y2 = yc * vh, xl = xd * xa, xr = xa + xe * (vw - xa), mn = v => Math.min(v, 1 - v);
    const G = [
      [xa, 0, xa, vh, mn(a), false],
      [xa, y1, 0, y1, mn(yb) * clamp(a / .1), true],
      [xl, y1, xl, vh, mn(xd) * clamp(a / .1), true],
      [xa, y2, vw, y2, mn(yc) * clamp((1 - a) / .1), true],
      [xr, y2, xr, 0, mn(xe) * clamp((1 - a) / .1), true]
    ];
    G.forEach(([x1, y1_, x2, y2_, m, one], i) => {
      const L = LN[i], len = Math.hypot(x2 - x1, y2_ - y1_), k = e3(clamp(m / .14)) * clamp(len / 50), show = k > .004;
      L.path.style.display = show ? '' : 'none';
      if (!show) { L.beam.style.display = 'none'; return; }
      const s0 = one ? 0 : .5 - k / 2, s1 = one ? k : .5 + k / 2;   // 교차점에서 한쪽으로 (가지 선), 가운데에서 양쪽으로 (첫 선)
      const d = `M${lerp(x1, x2, s0).toFixed(1)} ${lerp(y1_, y2_, s0).toFixed(1)}L${lerp(x1, x2, s1).toFixed(1)} ${lerp(y1_, y2_, s1).toFixed(1)}`;
      L.path.setAttribute('d', d);
      /* 빛 : 선을 따라 한 번 흐르고 잠시 쉰다 */
      const cyc = 5.2, f = ((tm + L.ph) % cyc) / cyc, on = k > .98 && len > 60 && f < .8, p = f / .8;
      L.beam.style.display = on ? '' : 'none';
      if (on) { L.beam.setAttribute('d', d); L.beam.setAttribute('stroke-dashoffset', (-(p * 1.2 - .14)).toFixed(3)); L.beam.style.opacity = Math.pow(Math.sin(Math.PI * p), 1.4).toFixed(3); }
    });
  };
  window.Bento = { HOLD, SCROLL0, get state() { return { idx, prev, tgt, P: P.map(v => +v.toFixed(3)) }; }, EL };   // 확인용
  requestAnimationFrame(frame);
}
