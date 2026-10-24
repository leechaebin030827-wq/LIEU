/* LIEU · RippleGrid (React Bits RippleGrid 셰이더 이식 — 바닐라 JS)
   presence(0..1) 는 외부(스크롤)에서 주입한다. 격자 원점은 화면 중앙이며 cellSize 의 배수에 선이 놓인다. */
(() => {
  const MAX = 12;
  const VERT = `#version 300 es
in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;
  const FRAG = `#version 300 es
precision highp float;
uniform vec2 uView;
uniform float uRatio;
uniform float uCell;
uniform float uLineWidth;
uniform float uGlow;
uniform float uTilt;
uniform float uFocal;
uniform vec2 uTurn;
uniform vec2 uShift;
uniform vec4 uRipples[12];
uniform int uRippleCount;
uniform float uWaveLength;
uniform float uWaveSpeed;
uniform float uStrength;
uniform vec3 uPointer;
uniform vec3 uColor;
uniform vec3 uInk;
uniform float uPresence;
uniform float uReveal;
uniform float uFade;
uniform float uOpacity;
uniform float uLightMode;
uniform int uVariant;
out vec4 outColor;
float smootherstep(float edge, float x) { float t = clamp(x / max(edge, 0.0001), 0.0, 1.0); return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
  vec2 css = gl_FragCoord.xy / uRatio;
  vec2 screen = vec2(css.x - uView.x * 0.5, uView.y * 0.5 - css.y);
  vec2 plane = screen;
  float horizon = 1.0;
  if (uTilt > 0.0001) {
    float depth = uFocal + screen.y * tan(uTilt);
    horizon = smoothstep(0.0, uFocal * 0.35, depth);
    float scale = uFocal / max(depth, 0.001);
    plane = vec2(screen.x * scale, screen.y * scale / cos(uTilt));
  }
  vec2 push = vec2(0.0);
  float lift = 0.0;
  for (int i = 0; i < 12; i++) {
    if (i >= uRippleCount) break;
    vec4 ripple = uRipples[i];
    vec2 delta = plane - ripple.xy;
    float dist = length(delta);
    float x = (dist - ripple.z * uWaveSpeed) / uWaveLength;
    float packet = exp(-x * x * 1.8);
    float spread = 1.0 / (1.0 + dist / (uWaveLength * 5.0));
    float calm = smoothstep(0.0, uWaveLength * 0.9, dist);
    float wave = sin(x * 6.28318) * packet * spread * calm * ripple.w;
    push += (dist > 0.001 ? delta / dist : vec2(0.0)) * wave;
    lift += wave;
  }
  vec2 bent = plane + push * uStrength * uCell * 0.22;
  vec2 grid = mat2(uTurn.x, uTurn.y, -uTurn.y, uTurn.x) * (bent - uShift) / uCell;
  vec2 fw = max(fwidth(grid), vec2(0.00001));
  vec2 offset = abs(fract(grid - 0.5) - 0.5);
  vec2 dist = offset / fw;
  float width = max(uLineWidth * uRatio, 1.0);
  float thin = min(uLineWidth * uRatio, 1.0);
  float shape = 0.0;
  float edge = min(dist.x, dist.y);
  if (uVariant == 1) {
    edge = length(dist);
    shape = (1.0 - smoothstep(width * 1.7 - 0.5, width * 1.7 + 0.5, edge)) * thin * 1.8;
  } else if (uVariant == 2) {
    float arm = 0.16;
    vec2 cover = (1.0 - smoothstep(width * 0.5 - 0.5, width * 0.5 + 0.5, dist)) * thin;
    vec2 reach = 1.0 - smoothstep(arm - fw * 0.5, arm + fw * 0.5, offset);
    shape = max(cover.x * reach.y, cover.y * reach.x);
    edge = max(min(dist.x, dist.y), length(max(offset - arm, 0.0) / fw));
  } else {
    vec2 cover = (1.0 - smoothstep(width * 0.5 - 0.5, width * 0.5 + 0.5, dist)) * thin;
    shape = max(cover.x, cover.y);
  }
  float halo = exp(-edge / (uRatio * 2.4)) * uGlow;
  float far = 1.0 - smoothstep(0.18, 0.5, max(fw.x, fw.y));
  vec2 toPointer = (plane - uPointer.xy) / (uCell * 3.2);
  float near = uPointer.z * exp(-dot(toPointer, toPointer));
  float shine = max(1.0 + lift * 3.4 * uStrength, 0.25) * (1.0 + near * 1.6);
  float radius = length(plane);
  float reveal = 1.0 - smoothstep(uReveal - uCell * 12.0, uReveal, radius);
  vec2 uv = gl_FragCoord.xy / (uView * uRatio);
  float edgeFade = uFade * 0.5;
  float mask = smootherstep(edgeFade, uv.x) * smootherstep(edgeFade, 1.0 - uv.x) * smootherstep(edgeFade, uv.y) * smootherstep(edgeFade, 1.0 - uv.y);
  mask *= horizon * far * reveal * uPresence * uOpacity;
  float level = (shape * 0.26 + halo * 0.1) * shine * mask;
  float dither = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  if (uLightMode > 0.5) {
    float alpha = clamp(level * 1.2 + dither, 0.0, 1.0);
    outColor = vec4(uInk * alpha, alpha);
  } else {
    float alpha = clamp(level + dither, 0.0, 1.0);
    vec3 color = mix(uColor, vec3(1.0), clamp(level - 0.7, 0.0, 1.0));
    outColor = vec4(color * alpha, alpha);
  }
}
`;
  const opt = { ink: [.42, .44, .47], cell: 14, lineWidth: .5, glow: .12, strength: .4, speed: .85, size: 3.2, interval: 2.6, fade: .7, opacity: .2, auto: false, pointer: false };
  const S = { ok: false, gl: null, u: {}, canvas: null, clock: 0, nextAuto: .4, glow: 0, ripples: [], pointer: { x: 0, y: 0, inside: false, px: 0, py: 0, travel: 0 }, view: { w: 1, h: 1, r: 1 }, cell: 48 };
  const packed = new Float32Array(MAX * 4);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const api = {
    get ok() { return S.ok; },
    get cell() { return S.cell; },
    init(canvas, o = {}) {
      Object.assign(opt, o); S.canvas = canvas;
      const gl = S.gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
      if (!gl) return false;
      const sh = (t, src) => { const x = gl.createShader(t); gl.shaderSource(x, src); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(x)); return x; };
      const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.bindAttribLocation(p, 0, 'aPosition'); gl.linkProgram(p); gl.useProgram(p);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      ['uView', 'uRatio', 'uCell', 'uLineWidth', 'uGlow', 'uTilt', 'uFocal', 'uTurn', 'uShift', 'uRipples', 'uRippleCount', 'uWaveLength', 'uWaveSpeed', 'uStrength', 'uPointer', 'uColor', 'uInk', 'uPresence', 'uReveal', 'uFade', 'uOpacity', 'uLightMode', 'uVariant'].forEach(n => (S.u[n] = gl.getUniformLocation(p, n)));
      addEventListener('pointermove', e => {
        if (!opt.pointer || e.pointerType === 'touch') return;
        const q = S.pointer, x = e.clientX - S.view.w / 2, y = e.clientY - S.view.h / 2;
        q.inside = true; const step = Math.hypot(x - q.px, y - q.py); q.px = x; q.py = y;
        if (!reduce && S.presence > .3 && step < S.cell * 6) { q.travel += step; if (q.travel > S.cell * 1.6) { q.travel = 0; spawn(x, y, .3); } }
      }, { passive: true });
      addEventListener('pointerdown', e => { if (opt.pointer && !reduce && S.presence > .3) spawn(e.clientX - S.view.w / 2, e.clientY - S.view.h / 2, 1.0); }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => { S.pointer.inside = false; });
      S.ok = true; return true;
    },
    /* o: { dt, presence(0..1), cell } */
    draw(o) {
      if (!S.ok) return;
      const gl = S.gl, u = S.u, c = S.canvas;
      const ratio = Math.min(2, devicePixelRatio || 1), w = innerWidth, h = innerHeight;
      if (c.width !== Math.round(w * ratio) || c.height !== Math.round(h * ratio)) { c.width = Math.round(w * ratio); c.height = Math.round(h * ratio); }
      S.view.w = w; S.view.h = h; S.view.r = c.width / w; S.cell = o.cell || opt.cell; S.presence = o.presence;
      const pres = o.presence; const eased = pres * pres * (3 - 2 * pres);
      if (pres <= .001) { gl.viewport(0, 0, c.width, c.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); return; }
      if (!reduce) S.clock += o.dt;
      if (opt.auto && !reduce && pres > .2 && S.clock >= S.nextAuto) { spawn(0, 0, 1); S.nextAuto = S.clock + opt.interval; }
      const life = 9 / opt.speed; while (S.ripples.length && S.clock - S.ripples[0].born > life) S.ripples.shift();
      const eng = S.pointer.inside && !reduce ? 1 : 0; S.glow += (eng - S.glow) * (1 - Math.exp(-o.dt * (eng ? 6 : 2.5)));
      let n = 0;
      for (let i = S.ripples.length - 1; i >= 0 && n < MAX; i--) { const r = S.ripples[i], age = S.clock - r.born; packed[n * 4] = r.x; packed[n * 4 + 1] = r.y; packed[n * 4 + 2] = age; packed[n * 4 + 3] = r.s * Math.exp(-age * .55); n++; }
      const diag = Math.hypot(w, h);
      gl.viewport(0, 0, c.width, c.height);
      gl.uniform2f(u.uView, w, h); gl.uniform1f(u.uRatio, S.view.r); gl.uniform1f(u.uCell, S.cell);
      gl.uniform1f(u.uLineWidth, opt.lineWidth); gl.uniform1f(u.uGlow, opt.glow); gl.uniform1f(u.uTilt, 0); gl.uniform1f(u.uFocal, h * 1.15); gl.uniform2f(u.uTurn, 1, 0); gl.uniform2f(u.uShift, o.shiftX || 0, o.shiftY || 0);
      gl.uniform4fv(u.uRipples, packed); gl.uniform1i(u.uRippleCount, n);
      gl.uniform1f(u.uWaveLength, S.cell * 2.4 * opt.size); gl.uniform1f(u.uWaveSpeed, 240 * opt.speed); gl.uniform1f(u.uStrength, opt.strength);
      gl.uniform3f(u.uPointer, S.pointer.px, S.pointer.py, S.glow);
      gl.uniform3fv(u.uColor, opt.ink); gl.uniform3fv(u.uInk, opt.ink);
      gl.uniform1f(u.uPresence, eased); gl.uniform1f(u.uReveal, pres < 1 ? eased * diag * 1.4 + S.cell * 4 : 1e6);
      gl.uniform1f(u.uFade, opt.fade); gl.uniform1f(u.uOpacity, opt.opacity); gl.uniform1f(u.uLightMode, 1); gl.uniform1i(u.uVariant, 0);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    ripple(x = 0, y = 0, s = 1) { spawn(x, y, s); }
  };
  function spawn(x, y, s) { S.ripples.push({ x, y, born: S.clock, s }); if (S.ripples.length > MAX) S.ripples.shift(); }
  window.RippleGrid = api;
})();
