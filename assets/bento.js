/* LIEU · 분할 그리드 (elastic grid)
   끝 장면의 영상 자리 바로 다음, 부품 뷰(렌더 이미지 틀) 앞에 들어간다. 드라이브의 제품 렌더 루프 영상이 들어간다.
   영상 자리 뒤에서 올라와 화면 전체에 고정되고, 스크롤이 단계의 경계를 넘을 때마다 다음 배치로 스냅된다. 칸은 서로 겹치지 않는다.
   탄성 : 분할 위치는 스프링으로 움직여 튀지 않고 부드럽게 제자리에 선다. 선은 곧게 유지된다. 스크롤에 민감해서, 경계에 닿기 전부터 다음 배치로 넘어가기 시작하고 빠르게 스크롤하면 단계가 연달아 솩솩 바뀐다
   선은 다크모드 그리드처럼 교차점에서 뻗어 나가고칸이 닫힐 때는 선이 말려 들어간다.
   칸이 사라지는 것은 선이 가장자리로 밀려나 그 칸의 폭이 0 이 되는 것이다. 다시 갈라져 나온 칸에는 다른 콘텐츠가 들어간다. 마지막에는 새로 나온 2칸만 남는다.
   마지막 단계의 아래 칸은 실루엣 틀이다 : 이 칸의 위치와 크기를 window.__bentoFrame 으로 내보내면 anatomy-scene.js 가 그 안에 배경과 제품 실루엣을 그린다.
   마지막에 위 칸이 닫히면 이 칸이 화면 전체로 커지고, 그 상태에서 엑스레이가 시작된다. anatomy-scene.js 의 AN 은 이 그리드가 끝나는 지점에서 잡는다 : AN = SCROLL0 + (영상 자리 아래 간격) + HOLD + 여유

   POOL 은 원본 렌더에서 만든 무음 루프와 포스터를 순서대로 배치한다. 출처는 render-scenes/sources.json에 기록한다. */
const HOLD = 11, SCROLL0 = 43.9;   // 화면 높이 배수. HOLD : 화면에 고정된 채 단계가 넘어가는 스크롤 길이. SCROLL0 : 끝 장면의 영상 자리가 올라가기 시작하는 지점

/* 탄성 값 : 감도를 바꾸려면 여기만 고친다 */
const EL = {
  k: 300, c: 36,                   // 분할 위치 스프링 (단단함, 감쇠). 감쇠비 c / (2 * sqrt(k)) 가 1 이면 튀지 않고 부드럽게 선다. 1 보다 낮추면 튄다
  lead: .22,                       // 단계의 경계보다 이만큼 앞서 다음 단계로 넘어간다 (클수록 스크롤에 민감)
  chain: .1, chainT: .24          // 앞 단계가 이만큼 자리 잡거나 이 시간(초)이 지나면 다음 단계로 (빠르게 스크롤하면 연달아 넘어간다)
};

/* 콘텐츠 풀 : 칸이 새로 나올 때마다 하나씩 꺼내 쓴다. */
const sceneAsset = name => /^led[12]$/.test(name) ? name + '-grid-dark' : /^environment/.test(name) ? name + '-silver' : name;
const render = name => ({
  kind: 'video', src: `assets/render-scenes/${sceneAsset(name)}.mp4`,
  poster: `assets/render-scenes/${sceneAsset(name)}.jpg`, background: /^led[12]$/.test(name) ? '#000' : /^environment/.test(name) ? '#fff' : '#eef0f2',
  duration: /^projector[23]$/.test(name) ? 1.8 : null,
  // These source shots meet the ceiling at y=0. Keep that edge attached to
  // the cell boundary instead of exposing a severed pillar in a letterbox gap.
  position: /^(motion|projector|pillar)|^(led4|eyes)$/.test(name) ? 'center top' : 'center center'
});
// Render cells advance after a full clip; the color-swatch clip is intentionally excluded.
const reel = (...names) => ({ ...render(names[0]), playlist: names.map(render) });
const POOL = [
  reel('environment01', 'motion5', 'motion1', 'motion2', 'motion3'),
  { kind: 'quote', lines: ['I was born to bring', 'a little human touch', 'to driverless rides.'], copy: 'intro', background: '#000', dark: true },
  { ...render('eyes'), background: '#10121a', fit: 'contain' },
  reel('led2', 'led1'),
  { kind: 'symbol', background: '#06060a' },
  reel('environment02', 'environment03', 'projector1', 'projector4', 'projector2', 'projector3'),
  { kind: 'quote', lines: ['A warm', 'welcome.'], copy: 'welcome', background: 'radial-gradient(ellipse 110% 90% at 72% 112%, #eaf3ff 0%, #b2c8ff 24%, #86aefc 43%, rgba(134,174,252,0) 76%), radial-gradient(ellipse 95% 85% at -12% 14%, #5269ac 0%, rgba(82,105,172,0) 75%), linear-gradient(155deg, #101728 0%, #23365c 58%, #617fc1 100%)', dark: true },
  reel('led3', 'led4'),
  { kind: 'quote', lines: ['So, I was made to move.'], copy: 'end', background: '#fff', wide: true }
];

/* 분할 위치 [a, yb, xd, yc, xe, strip, exit] : 모두 부모 안에서의 비율. 0 이면 첫째 칸이, 1 이면 둘째 칸이 사라진다 (선이 가장자리로 밀려난다)
   a  : 화면을 왼쪽 · 오른쪽으로 가르는 세로선          yb : 왼쪽을 위 · 아래로 가르는 가로선
   xd : 왼쪽 아랫칸을 좌우로 가르는 세로선              yc : 오른쪽을 위 · 아래로 가르는 가로선
   xe : 오른쪽 윗칸을 좌우로 가르는 세로선
   strip : 아래에서 들어오는 텍스트 띠 높이, exit : 기존 콘텐츠가 위로 빠지는 진행률 */
const KEYS = [
  [1 / 2, 1, 1, 1, 1],                 // 2칸
  [1 / 2, 1 / 2, 1, 1, 1],             // 왼쪽이 위 · 아래로 갈라져 3칸
  [1 / 2, 0, 1, 1, 1],                 // 처음의 왼쪽 위 칸이 밀려나 2칸
  [.55, 0, 1, 1 / 2, 0],              // 천장형 렌더를 넓게 보여준 뒤 원형 디테일 칸을 연다
  [.55, 1 / 2, .5, 1 / 2, 1 / 2],     // 원형 디테일은 세로 띠 대신 거의 정사각형인 칸에 배치
  [.30, 1 / 2, 0, 1 / 2, 0],          // 원형 렌더의 정사각형에 가까운 비율을 유지
  [0, 1 / 2, 0, 1 / 2, 0],             // 왼쪽이 통째로 밀려나 2칸
  [0, 1 / 2, 0, 1 / 2, 0, .22, 0], // 기존 두 칸 아래에 높이 22% 텍스트 띠
  [0, 1 / 2, 0, 1 / 2, 0, .22, 1], // 위 콘텐츠는 위로 나가고, 텍스트 아래 실루엣 진입
  [0, 1 / 2, 0, 1 / 2, 0, 0, 1]    // 텍스트 띠가 위로 닫히며 실루엣이 화면을 채운다
].map(key => key.length === 5 ? [...key, 0, 0] : key);

const root = document.getElementById('bento');
if (root) {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t;
  const e3 = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const NS = 'http://www.w3.org/2000/svg', N = 32;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;   // 움직임 줄이기 : 출렁임 없이 바로 자리 잡는다
  const rects = (P, W, H) => {
    const [a, yb, xd, yc, xe, strip = 0, exit = 0] = P;
    const fullH = H;
    H *= 1 - strip;
    const xa = a * W, y1 = yb * H, y2 = yc * H;
    const result = [
      [0, 0, xa, y1],                                   // 왼쪽 위
      [0, y1, xd * xa, H - y1],                         // 왼쪽 아래 왼쪽
      [xd * xa, y1, xa - xd * xa, H - y1],              // 왼쪽 아래 오른쪽
      [xa, 0, xe * (W - xa), y2],                       // 오른쪽 위 왼쪽
      [xa + xe * (W - xa), 0, (1 - xe) * (W - xa), y2], // 오른쪽 위 오른쪽
      [xa, y2, W - xa, H - y2]                          // 오른쪽 아래
    ];
    if (strip > 0 || exit > 0) {
      const offset = H * exit;
      result.forEach(r => { r[1] -= offset; });
      const textY = H - offset;
      result[0] = [0, textY, W, fullH * strip];
      result[1] = [0, textY + fullH * strip, W, offset];
    }
    return result;
  };
  /* 키마다 어떤 칸이 있는지 : 칸이 다시 나타날 때마다 콘텐츠 번호를 하나씩 올린다 */
  const VIS = KEYS.map(K => rects(K, 1, 1).map(r => r[2] > .02 && r[3] > .02 && r[1] < .98 && r[1] + r[3] > .02)), ID = [0, 1, 2, 3, 4, 5].map(() => []);
  // Assign shots by role, so delaying the round detail's entrance does not
  // shift every subsequent shot to a different cell.
  KEYS.forEach((_, k) => {
    const content = [k < 2 ? 0 : k < 6 ? 6 : 8, k < 5 ? 2 : 9, 3, k < 3 ? 1 : 7, 4, k >= 6 ? 10 : 5];
    ID.forEach((row, s) => { row[k] = VIS[k][s] ? content[s] : -1; });
  });

  const mkS = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const cellsEl = document.createElement('div'), svg = mkS('svg', { class: 'bn-svg', 'aria-hidden': 'true' });
  /* 그리드 구분선 5개 */
  const LN = Array.from({ length: 5 }, () => ({
    path: svg.appendChild(mkS('path', { fill: 'none', stroke: '#fff', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }))
  }));
  root.append(cellsEl, svg);
  const els = [], cur = [], media = [], playing = [], symbols = [], reelPositions = new Map();
  const setPlaying = (i, active) => {
    active = active && !document.hidden && !calm;
    if (playing[i] === active) return;
    playing[i] = active;
    const symbol = symbols[i];
    if (symbol) {
      if (symbol.api) symbol.api.destroy();
      symbol.api = null; symbol.hold = 0;
      if (active && window.LieuMorph) {
        // Match the opening taxi-lamp motion, including its easing and lack of squash.
        // At auto-scroll's .32 viewport/s this cell stays visible for ~19s;
        // the original ~5.4s motion finishes before the next loop begins.
        symbol.api = window.LieuMorph.create(symbol.svg, {
          stiffness: 4, damping: 4.3, squash: 0, timeline: window.LieuMorph.loadTimeline()
        });
        symbol.api.play(0);
      }
    }
    const video = media[i];
    if (!video) return;
    if (active) video.play().catch(() => {});
    else video.pause();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) els.forEach((_, i) => setPlaying(i, false));
  });
  for (let i = 0; i < 6; i++) { const el = document.createElement('div'); el.className = 'bn-cell'; cellsEl.appendChild(el); els.push(el); cur.push(-1); }
  const setContent = (i, id) => {
    if (cur[i] === id) return; cur[i] = id;
    setPlaying(i, false);
    if (media[i]) { media[i].removeAttribute('src'); media[i].load(); }
    media[i] = null;
    if (symbols[i]?.api) symbols[i].api.destroy();
    symbols[i] = null;
    els[i].replaceChildren();
    els[i].style.background = 'transparent';
    els[i].className = 'bn-cell';
    // Leave the final lower cell clear for the live anatomy silhouette.
    if (i === 1 && id === ID[1][KEYS.length - 2]) return;
    // The closing ribbon has a dedicated pillar loop, never the timed reel.
    const c = id === 10 ? render('pillar-detail') : POOL[id % POOL.length];
    els[i].style.background = c.background;
    els[i].classList.add(`bn-${c.kind}`);
    if (c.dark) els[i].classList.add('bn-dark');
    if (c.kind === 'quote') {
      const composition = document.createElement('div');
      composition.className = 'bn-composition' + (c.wide ? ' bn-wide' : '');
      const quote = document.createElement('p'); quote.className = 'bn-quote-text';
      const lines = (c.copy === 'intro' ? window.__ht?.s1 : c.copy === 'welcome' ? window.__ht?.b?.[0] : window.__end?.h ? [window.__end.h] : null) || c.lines;
      lines.forEach(line => { const span = document.createElement('span'); span.textContent = line.replace(/<[^>]*>/g, ''); quote.appendChild(span); });
      composition.append(quote); els[i].appendChild(composition);
      return;
    }
    if (c.kind === 'symbol') {
      const composition = document.createElement('div'); composition.className = 'bn-identity';
      const symbol = mkS('svg', { class: 'bn-symbol-mark', 'aria-hidden': 'true' });
      symbols[i] = { svg: symbol, api: null, hold: 0 };
      if (calm && window.LieuMorph) {
        const mark = window.LieuMorph.create(symbol, { squash: 0 }); mark.setProgress(0, true); mark.destroy();
      }
      composition.append(symbol); els[i].appendChild(composition);
      return;
    }
    const video = document.createElement('video');
    video.muted = true; video.defaultMuted = true; video.loop = !c.playlist;
    video.playsInline = true; video.preload = 'none';
    const clips = c.playlist || [c];
    let clipIndex = reelPositions.get(id) || 0;
    const loadClip = () => {
      const clip = clips[clipIndex];
      video.poster = clip.poster;
      els[i].style.background = clip.background;
      video.style.objectPosition = clip.position || 'center center';
      Object.assign(video.style, { left: '0px', top: '0px', width: '100%', height: '100%' });
      // Environmental shots include floor shadows; don't turn those shadows
      // into a dark letterbox. Keep product bottoms opaque: the projector can reach the frame edge.
      video.style.maskImage = /environment/.test(clip.src)
        ? 'none'
        : /projector|pillar/.test(clip.src) ? 'linear-gradient(to right, transparent 0%, #000 5%, #000 95%, transparent 100%)' : 'none';
      video.style.maskComposite = 'intersect';
      if (!calm) video.src = clip.src;
    };
    loadClip();
    // Match the browser's decoded video color, not the encoder's RGB value:
    // YUV conversion otherwise leaves a visible rectangle around contained shots.
    video.addEventListener('loadeddata', () => {
      if (media[i] !== video || !video.videoWidth || /environment/.test(clips[clipIndex].src)) return;
      try {
        const sample = document.createElement('canvas'); sample.width = sample.height = 1;
        const ctx = sample.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, video.videoWidth - 1, video.videoHeight - 1, 1, 1, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        els[i].style.background = `rgb(${r},${g},${b})`;
      } catch (_) { /* Keep the shot's fallback color if sampling is unavailable. */ }
    });
    const advanceClip = () => {
      if (!c.playlist || media[i] !== video) return;
      clipIndex = (clipIndex + 1) % clips.length;
      reelPositions.set(id, clipIndex);
      loadClip();
      if (playing[i] && !document.hidden && !calm) video.play().catch(() => {});
    };
    video.addEventListener('ended', advanceClip);
    video.addEventListener('timeupdate', () => {
      const limit = clips[clipIndex].duration;
      if (playing[i] && limit && video.currentTime >= limit) advanceClip();
    });
    video.style.objectFit = c.fit || 'contain';

    video.setAttribute('disablepictureinpicture', '');
    els[i].appendChild(video); media[i] = video;
  };

  window.addEventListener('lieu:lang', () => {
    els.forEach((el, i) => { if (el.classList.contains('bn-quote')) cur[i] = -1; });
  });

  /* 상태 : 분할 위치 스프링(P, V), 단계(idx, prev, tgt) */
  const P = KEYS[0].slice(), V = P.map(() => 0);
  let idx = 0, prev = 0, tgt = 0, stepAt = 0, shown = false, last = 0;

  const frame = (now) => {
    requestAnimationFrame(frame);
    const vid = window.__endVid; if (!vid) return;
    const vw = innerWidth, vh = innerHeight, Y = vid.y + vid.h + vh * .1, tm = (now || 0) / 1000, dt = Math.min(.1, Math.max(0, tm - last)); last = tm;
    // The circular detail occupies half the viewport height in both layouts.
    // Match its width to that height rather than assuming a 16:9 browser.
    KEYS[4][0] = clamp(vh / vw, .42, .72);
    KEYS[5][0] = clamp(vh / (2 * vw), .26, .44);
    const T = Y - (scrollY - SCROLL0 * vh);                    // 영상 자리 뒤에서 스크롤과 1:1 로 올라오는 윗변 (고정되기 전)
    const top = Math.max(0, T);                                // 윗변이 0 에 닿으면 그대로 고정된다 (마지막 칸이 화면 전체가 되어 실루엣 장면으로 이어진다)
    const vis = T < vh + 4 && T > -(HOLD + 3) * vh;
    const u = clamp(-T / (HOLD * vh), 0, 1) * (KEYS.length - 1);
    const ul = u + EL.lead;
    if (Math.abs(ul - tgt) > .56) tgt = clamp(Math.round(ul), 0, KEYS.length - 1);   // 경계보다 조금 앞서 다음 단계가 된다 (경계에서 떨리지 않도록 조금 여유를 둔다)
    if (vis !== shown) { shown = vis; root.style.visibility = vis ? 'visible' : 'hidden'; }
    if (!vis) { els.forEach((_, i) => setPlaying(i, false)); idx = prev = tgt; KEYS[tgt].forEach((v, k) => { P[k] = v; V[k] = 0; }); window.__bentoFrame = T < 0 ? { x: 0, y: 0, w: vw, h: vh } : null; return; }   // 화면 밖에서는 바로 맞춰 둔다

    /* 단계 : 한 번에 한 단계씩. 앞 단계가 거의 자리 잡았거나 조금 지나면 다음 단계로 (빠르게 스크롤하면 연달아 넘어간다) */
    const err = Math.max(...KEYS[idx].map((v, k) => Math.abs(v - P[k])));
    if (tgt !== idx && (err < EL.chain || tm - stepAt > EL.chainT)) { prev = idx; idx += Math.sign(tgt - idx); stepAt = tm; }
    if (tgt === idx && err < .004) prev = idx;
    /* 스프링 : 잘게 나눠 적분한다 */
    const K = calm ? 400 : EL.k, C = calm ? 40 : EL.c;
    for (let t = dt; t > 0; t -= .008) {
      const h = Math.min(.008, t);
      for (let k = 0; k < P.length; k++) {
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
      if (w < 2 || h < 2 || y + h <= 0 || y >= vh || id < 0) { st.opacity = '0'; setPlaying(i, false); return; }   // 아직 나오지 않았거나 사라진 칸
      if (i === 1 && id === fid) fr = { x, y: y + top, w, h };
      setContent(i, id);
      const shot = media[i];
      if (shot && shot.videoWidth && shot.videoHeight) {
        const ratio = shot.videoWidth / shot.videoHeight;
        const shotW = Math.min(w, h * ratio), shotH = shotW / ratio;
        const ceiling = shot.style.objectPosition.includes('top');
        Object.assign(shot.style, { width: `${shotW}px`, height: `${shotH}px`, left: `${(w - shotW) / 2}px`, top: `${ceiling ? 0 : (h - shotH) / 2}px` });
      }
      // Start after the opening cell is large enough to see the taxi-lamp pose.
      const ready = !symbols[i] || symbols[i].api || (w >= vw * .15 && h >= vh * .15);
      setPlaying(i, ready && y + top < vh && y + top + h > 0);
      const symbol = symbols[i];
      if (playing[i] && symbol?.api?.done) {
        symbol.hold += dt;
        if (symbol.hold >= .8) { symbol.hold = 0; symbol.api.play(0); }
      }
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
    if (P[5] > .0001 || P[6] > .0001) {
      const strip = P[5], exit = P[6], remaining = vh * (1 - strip);
      const cuts = [remaining * (.5 - exit), remaining * (1 - exit), remaining * (1 - exit) + vh * strip];
      G.forEach((line, i) => {
        const y = cuts[i];
        G[i] = i < cuts.length && y > 1 && y < vh - 1
          ? [0, y, vw, y, .5, false] : [0, 0, 0, 0, 0, false];
      });
    }
    G.forEach(([x1, y1_, x2, y2_, m, one], i) => {
      const L = LN[i], len = Math.hypot(x2 - x1, y2_ - y1_), k = e3(clamp(m / .14)) * clamp(len / 50), show = k > .004;
      L.path.style.display = show ? '' : 'none';
      if (!show) return;
      const s0 = one ? 0 : .5 - k / 2, s1 = one ? k : .5 + k / 2;   // 교차점에서 한쪽으로 (가지 선), 가운데에서 양쪽으로 (첫 선)
      const d = `M${lerp(x1, x2, s0).toFixed(1)} ${lerp(y1_, y2_, s0).toFixed(1)}L${lerp(x1, x2, s1).toFixed(1)} ${lerp(y1_, y2_, s1).toFixed(1)}`;
      L.path.setAttribute('d', d);

    });
  };
  window.Bento = { HOLD, SCROLL0, get state() { return { idx, prev, tgt, P: P.map(v => +v.toFixed(3)) }; }, EL };   // 확인용
  requestAnimationFrame(frame);
}
