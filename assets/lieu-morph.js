/* LIEU · symbol morph
   택시 갓등이 선 하나를 통과해 제품(도넛 + 기둥)이 되는 하나의 연속 동작.

   설계
   - 몸통은 "림(rim) 기준 볼 모양" 하나로 통일한다. 갓등은 볼을 림 위로 뒤집은 것(σ = -1)이고,
     σ 가 -1 → 0 → +1 로 변하면 얇은 띠(선 위)를 지나 아래로 자라난다. → 경로가 꼬이거나 깨지지 않는다.
   - 림의 높이(y_r)는 띠가 선에 닿은 뒤 내려가며 선에서 바로 떨어진다.
   - 레일(선)은 먼저 가로로 완전히 좁아져 점이 된 다음에야 세로로 자란다.
   - 모든 값은 속도가 이어지는 Hermite 곡선, 진행은 스프링 하나.
   좌표계: 레일 y = 2.5, x 중심 = 123.5, viewBox "-10 -90 266 220"                       */
(() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ── 디자이너가 만든 8개 프레임(FRAME 좌표)을 그대로 키프레임으로 쓴다 ───────────────────────────────
     프레임 좌표 → 엔진 좌표 : 선(레일) 폭 125 → 246 (S 배), 선 중심 y 42.5 → 2.5
     F1~F3 갓등(선 위) · F4~F5 선에 매달린 볼(오목한 필렛) · F6 떨어진 볼 · F7 선이 점이 됨 · F8 기둥
     몸통 한 덩어리 = 34개 숫자 : [M, C, L, C, L, C, L, C, L]  (아래/위 둥글림 · 옆면 · 필렛이 모두 같은 구조라 서로 보간된다) */
  const S = 246 / 125, BASE = 5 * S;                                         // BASE : 선 굵기 (엔진 단위)
  const fx = (x, cx) => 123.5 + (x - cx) * S, ey = y => 2.5 + (y - 42.5) * S;
  const prof = (pts, cx, rimF, sg) => pts.map((v, i) => (i % 2 ? sg * (v - rimF) * S : fx(v, cx)));   // sg=-1 : 갓등(위로 솟음) · +1 : 볼(아래로)
  const D = (x, y) => [x, y, x, y, x, y];
  const F1 = prof([25.0664, 7.71777, 26.1262, 3.19687, 30.1583, 0, 34.8018, 0, 90.1982, 0, 94.8417, 0, 98.8738, 3.19687, 99.9336, 7.71777, 107.5, 40, ...D(107.5, 40), 17.5, 40, ...D(17.5, 40), 25.0664, 7.71777], 62.5, 40, -1);
  const F2 = prof([196.267, 12.7178, 197.326, 8.19687, 201.359, 5.00022, 206.002, 5, 261.398, 5, 266.042, 5.00022, 270.074, 8.19687, 271.134, 12.7178, 275.719, 32.282, 276.779, 36.8032, 280.812, 40, 285.455, 40, 181.945, 40, 186.589, 40, 190.621, 36.8032, 191.681, 32.282, 196.267, 12.7178], 233.7, 40, -1);
  const F3 = prof([367.467, 22.7178, 368.527, 18.1969, 372.559, 15.0002, 377.202, 15, 432.599, 15, 437.242, 15.0002, 441.274, 18.1969, 442.334, 22.7178, 443.896, 26.9403, 446.8, 34.7892, 454.285, 40, 462.654, 40, 347.147, 40, 355.516, 40, 363, 34.7892, 365.904, 26.9403, 367.467, 22.7178], 404.9, 40, -1);
  const F4 = prof([538.24, 67.1387, 539.572, 71.2695, 543.417, 74.0693, 547.758, 74.0693, 604.443, 74.0693, 608.784, 74.0693, 612.629, 71.2695, 613.961, 67.1387, 616.63, 58.8614, 619.295, 50.5997, 626.984, 45, 635.665, 45, 516.536, 45, 525.217, 45, 532.906, 50.5997, 535.571, 58.8614, 538.24, 67.1387], 576.1, 45, 1);
  const F5 = prof([708.122, 65.5239, 709.846, 72.1271, 715.811, 76.7349, 722.636, 76.7349, 782.751, 76.7349, 789.576, 76.7349, 795.54, 72.1271, 797.265, 65.5239, 801.648, 48.7372, 802.223, 46.5361, 804.211, 45.0005, 806.486, 45.0005, 698.901, 45.0005, 701.176, 45.0005, 703.164, 46.5361, 703.738, 48.7372, 708.122, 65.5239], 752.69, 45.0005, 1);
  const F6 = prof([862.556, 71.002, 864.363, 77.4892, 870.272, 81.9775, 877.006, 81.9775, 937.508, 81.9775, 944.242, 81.9775, 950.151, 77.4892, 951.958, 71.002, 953.724, 64.6602, 955.499, 58.2867, 950.707, 51.9776, 944.091, 51.9775, 870.423, 51.9775, 863.807, 51.9776, 859.015, 58.2867, 860.79, 64.6602, 862.556, 71.002], 907.257, 51.9775, 1);
  // 두리번 : 갓등이 위로 늘어나며 왼쪽으로 기울었다(A) → 오른쪽으로 기울었다(B) → 똑바로(F1) → 낮아지며(F2) 잠수
  const LA = prof([12.6152, 8.16129, 13.5996, 2.90256, 18.5485, -0.649922, 23.8457, 0.0997685, 78.8516, 7.88688, 82.9351, 8.46498, 86.2454, 11.4906, 87.1865, 15.506, 94.0956, 44.9867, 94.6254, 47.2474, 96.6418, 48.8459, 98.9637, 48.8459, 2.5, 48.8459, 3.94946, 48.8459, 5.19328, 47.8133, 5.45995, 46.3885, 12.6152, 8.16129], 62.5, 48.8459, -1);
  const LB = prof([197.813, 15.506, 198.755, 11.4906, 202.065, 8.46498, 206.148, 7.88688, 261.154, 0.0997685, 266.452, -0.649922, 271.4, 2.90256, 272.385, 8.16129, 279.54, 46.3885, 279.807, 47.8133, 281.051, 48.8459, 282.5, 48.8459, 186.036, 48.8459, 188.358, 48.8459, 190.375, 47.2474, 190.904, 44.9867, 197.813, 15.506], 222.5, 48.8459, -1);
  // 쭉 늘어남 : 똑바로 선 채로 위로 길어지는 갓등 (높이 51)
  const FT = prof([687.869, 8.19238, 688.742, 3.44643, 692.879, 0.000102037, 697.704, 0, 752.296, 0, 757.121, 0.000101026, 761.258, 3.44643, 762.131, 8.19238, 770, 51, ...D(770, 51), 680, 51, ...D(680, 51), 687.869, 8.19238], 724.5, 51, -1);
  const FT_ = FT.map((v, i) => lerp(F1[i], v, .62));                                // 선에 들어가기 전 높이는 낮춰서 (원래 프레임의 62%만큼만 솟는다)
  const FTo = FT.map((v, i) => lerp(F1[i], v, .8));                                  // 뽀잉 : 살짝 더 솟았다가 제 높이로 돌아온다
  const PASS = F3.map((v, i) => lerp(v, F4[i], .5));                          // 선 위의 얇은 띠 (σ=0) — 갓등이 선을 통과하는 순간
  // 키프레임 : 똑바로(F1) → 왼쪽 기웃(LA) → 오른쪽 기웃(LB) → 똑바로 → 쭉 늘어남(FT) → 낮아짐(F2, F3) → 선 통과(PASS) → 매달림(F4, F5) → 분리(F6)
  const BODY = [F1, LA, LA, LB, LB, F1, FTo, FT_, F2, F3, PASS, F4, F5, F6, F6];
  const SIGMA = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 1, 1, 1, 1];
  const RIM = [ey(40), ey(40), ey(40), ey(40), ey(40), ey(40), ey(40), ey(40), ey(40), ey(40), 2.5, ey(45), ey(45.0005), ey(53.9775) + 1.3, ey(53.9775) + 1.3];   // +1.3 : 밑단을 파묻는 보정(1.3)을 상쇄해 간격이 정확히 11.4가 되게   // 최종 볼 위치 : 세로선 아래 끝과의 간격 11.4 (이전 9.4 → 2 더 벌어짐)
  const BODY_TAU = [0, .5, .7, 1.2, 1.4, 1.9, 2.2, 2.5, 3.0, 3.6, 4.3, 5.1, 5.22, 5.9, 7.3];   // 쏙 구간(3.6~5.9)은 눈에 보이는 이동량에 비례해 간격을 잡았다 → 같은 속도로 일정하게 내려간다

  /* ── 선(레일) : [폭, 높이, 중심 y] — 선(125×5) → 점(5×5, y 19.2) → 기둥(5×38, 중심 23.58 · 위 끝은 그대로, 아래 끝이 2 짧아짐). 끝은 모두 둥글다 ── */
  const RAIL = [[246, BASE, 2.5], [246, BASE, 2.5], [BASE, BASE, ey(19.2158)], [BASE, BASE, ey(19.2158)], [BASE, 38 * S, ey(23.581)]];
  const ROUND = [1, 1, 1, 1, 1];
  const STUB = [[123.5, 83.5, 123.5, 83.5], [123.5, 83.5, 123.5, 83.5], [123.5, 83.5, 123.5, 83.5], [123.5, 83.5, 123.5, 83.5], [123.5, 83.5, 123.5, 83.5]];   // 아래 기둥 없음
  const RAIL_TAU = [0, 4.7, 5.9, 5.95, 7.3];   // 선은 볼이 분리되는 동안(5.2~5.9) 짧아져 점이 되고, 점에서 기둥이 자란다                                       // 볼이 떨어진 뒤에 선이 점이 되고, 점에서 기둥이 자란다
  const TT = 7.3;
  /* ── 구간별 모션 타임라인 : 한 개의 속도 그래프가 아니라 7개 구간이 각자 '시간 · 속도 곡선'을 가진다 ── */
  const PHASE_TAU = [0, 1.9, 2.5, 3.6, 5.1, 5.9, 6.0, 7.3];
  const DEFAULT_TL = { ph: [
    { n: '두리번', d: 2.364, p: [0.333, 0.114, 0.667, 0.544] },
    { n: '쭉 늘어남', d: 0.5, p: [0.333, 0.306, 0.667, 0.267] },
    { n: '낮아짐', d: 0.273, p: [0.333, 0.218, 0.667, 0.545] },
    { n: '잠수', d: 0.273, p: [0.333, 0.333, 0.667, 0.667] },
    { n: '매달림 · 분리', d: 0.214, p: [0.333, 0.49, 0.667, 0.824] },
    { n: '선 → 점', d: 0.045, p: [0.333, 0.3, 0.667, 0.667] },
    { n: '세로선', d: 0.909, p: [0.333, 0.513, 0.667, 1.0] }], spin: 1.818 };   // 전체 1.1배 빠르게 · 느긋한 두리번 → 뽀잉 → 쏙!(빠르게) → 분리·선 짧아짐(조금 차분하게) → 세로선
  const copyTL = tl => ({ ph: tl.ph.map(x => ({ n: x.n, d: x.d, p: x.p.slice() })), spin: tl.spin });
  const loadTimeline = () => { try { const j = JSON.parse(localStorage.getItem('lieu-timeline')); if (j && j.ph && j.ph.length === DEFAULT_TL.ph.length && j.ph.every((x, i) => x.d > 0 && x.p && x.p.length === 4)) { j.ph.forEach((x, i) => { x.n = DEFAULT_TL.ph[i].n; }); j.spin = j.spin > 0 ? j.spin : DEFAULT_TL.spin; return j; } } catch (e) {} return copyTL(DEFAULT_TL); };
  const timelineTotal = tl => tl.ph.reduce((a, x) => a + x.d, 0);

  /* ── 속도가 이어지는 Hermite 곡선 ── */
  const TENSION = .55;
  const curve = (keys, taus) => {
    const arr = Array.isArray(keys[0]), K = keys.map(k => (arr ? k : [k])), n = K[0].length, last = K.length - 1;
    // 단조 3차 보간 (Fritsch–Carlson) : 키 사이에서 넘치거나 출렁이지 않고, 속도가 끊기지 않는다
    const M = K.map((_, i) => K[0].map((_, c) => {
      if (i === 0 || i === last) return 0;
      const h0 = taus[i] - taus[i - 1], h1 = taus[i + 1] - taus[i], d0 = (K[i][c] - K[i - 1][c]) / h0, d1 = (K[i + 1][c] - K[i][c]) / h1;
      if (d0 * d1 <= 0) return 0;
      const m = (d0 * h1 + d1 * h0) / (h0 + h1), cap = 3 * Math.min(Math.abs(d0), Math.abs(d1));   // 양쪽 기울기의 가중 평균 : 조임 없이 이어지고, 넘치지 않게만 제한
      return Math.sign(m) * Math.min(Math.abs(m), cap);
    }));
    return tau => {
      const t = clamp(tau, taus[0] - .12, taus[last] + .12), out = new Array(n);
      if (t < taus[0] || t > taus[last]) {                         // 범위 밖: 마지막 속도로 외삽 (젤리 오버슈트)
        const e = t < taus[0] ? 0 : last, d = t - taus[e];
        for (let c = 0; c < n; c++) out[c] = K[e][c] + M[e][c] * d;
      } else {
        let i = 0; while (i < last - 1 && t > taus[i + 1]) i++;
        const h = taus[i + 1] - taus[i], x = (t - taus[i]) / h, x2 = x * x, x3 = x2 * x;
        const h00 = 2 * x3 - 3 * x2 + 1, h10 = x3 - 2 * x2 + x, h01 = -2 * x3 + 3 * x2, h11 = x3 - x2;
        for (let c = 0; c < n; c++) out[c] = h00 * K[i][c] + h10 * h * M[i][c] + h01 * K[i + 1][c] + h11 * h * M[i + 1][c];
      }
      return arr ? out : out[0];
    };
  };
  const cBody = curve(BODY, BODY_TAU), cSigma = curve(SIGMA, BODY_TAU), cRim = curve(RIM, BODY_TAU);
  const cRail = curve(RAIL, RAIL_TAU), cStub = curve(STUB, RAIL_TAU), cRound = curve(ROUND, RAIL_TAU);
  // 카메라 : 모양을 매 순간 따라가면 선이 화면에서 같이 출렁여 '걸리는' 느낌이 난다 → 처음 모양의 가운데에서 완성 모양의 가운데까지 아주 완만하게 한 번만 이동한다
  const camBox = tau => { const rim = cRim(tau), sg = cSigma(tau), b = cBody(tau), L = cRail(tau), depth = Math.max(b[7], b[9]), y2 = rim + sg * depth;
    return (Math.min(rim, y2, L[2] - L[1] / 2) + Math.max(rim, y2, L[2] + L[1] / 2)) / 2; };
  const CAM_A = camBox(0), CAM_B = camBox(7.3);
  const camOf = tau => { const x = clamp(tau / 7.3); return CAM_A + (CAM_B - CAM_A) * (x * x * x * (x * (x * 6 - 15) + 10)); };

  const f2 = v => (+v).toFixed(2);
  const bodyPath = (p, rim, sg) => {
    const X = i => f2(p[i]), Y = i => f2(rim + sg * p[i]);
    const C = i => `${X(i)} ${Y(i + 1)} ${X(i + 2)} ${Y(i + 3)} ${X(i + 4)} ${Y(i + 5)}`.replace(/(\S+) (\S+) (\S+) (\S+) (\S+) (\S+)/, '$1 $2 $3 $4 $5 $6');
    return `M${X(0)} ${Y(1)}C${C(2)}L${X(8)} ${Y(9)}C${C(10)}L${X(16)} ${Y(17)}C${C(18)}L${X(24)} ${Y(25)}C${C(26)}L${X(32)} ${Y(33)}Z`;
  };

  /* ── 속도 그래프 : 시간 → 진행도 cubic-bezier (CSS 와 같은 규격). 저장된 값은 logo-morph.html 의 그래프 편집기와 공유 ── */
  const bezier = (x1, y1, x2, y2) => {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
    return x => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x; for (let i = 0; i < 8; i++) { const e = X(t) - x; if (Math.abs(e) < 1e-5) break; const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
      let lo = 0, hi = 1; if (t < 0 || t > 1 || Math.abs(X(t) - x) > 1e-4) { t = x; for (let i = 0; i < 24; i++) { if (X(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; } }
      return Y(t);
    };
  };

  function create(svg, opt = {}) {
    const o = Object.assign({ stiffness: 4.6, damping: 3.2, stroke: BASE, squash: .07, timeline: null }, opt);
    let tl = o.timeline ? copyTL(o.timeline) : null, tlE = null;
    const buildTL = () => { tlE = tl ? tl.ph.map(x => bezier(...x.p)) : null; }; buildTL();
    const tauAt = el => { let acc = 0; for (let i = 0; i < tl.ph.length; i++) { const d = tl.ph[i].d; if (el < acc + d) return PHASE_TAU[i] + (PHASE_TAU[i + 1] - PHASE_TAU[i]) * tlE[i]((el - acc) / d); acc += d; } return TT; };
    svg.setAttribute('viewBox', '-10 -90 266 220');
    svg.innerHTML = '<g class="cam"><g class="body-g"><path class="body" fill="currentColor"/></g><rect class="rail" fill="currentColor"/><line class="stub" stroke="currentColor" stroke-linecap="round"/></g>';
    const cam = svg.querySelector('.cam'), bodyG = svg.querySelector('.body-g'), body = svg.querySelector('.body'),
      rail = svg.querySelector('.rail'), stub = svg.querySelector('.stub');
    stub.setAttribute('stroke-width', o.stroke);
    const st = { u: 0, v: 0, target: 0, sq: 0, raf: 0, last: 0, chain: false, timer: 0, run: null, t: null, w: null, sp: null };
    const railTau = tau => tau;

    const draw = () => {
      const tau = st.u * TT, rim = cRim(tau), sg = cSigma(tau);
      body.setAttribute('d', bodyPath(cBody(tau), rim - sg * 1.3, sg));   // 몸통 밑단을 선 속으로 1.3 파묻어 겹친다 (맞닿은 곳의 가는 줄이 생기지 않게 · 모양은 그대로)
      // 레일
      const tr = railTau(tau), L = cRail(tr), grow = o.stroke - BASE, rw = Math.max(o.stroke, L[0] + grow), rh = Math.max(o.stroke, L[1] + grow), rr = Math.min(rw, rh) / 2 * clamp(cRound(tr));
      rail.setAttribute('x', f2(123.5 - rw / 2)); rail.setAttribute('y', f2(L[2] - rh / 2)); rail.setAttribute('width', f2(rw)); rail.setAttribute('height', f2(rh)); rail.setAttribute('rx', f2(rr)); rail.setAttribute('ry', f2(rr));
      const S = cStub(tr); stub.setAttribute('x1', f2(S[0])); stub.setAttribute('y1', f2(S[1])); stub.setAttribute('x2', f2(S[2])); stub.setAttribute('y2', f2(S[3]));
      stub.style.opacity = clamp(Math.hypot(S[2] - S[0], S[3] - S[1]) / 3);
      // 젤리 (속도에 따라 늘어나고 납작해짐) — 몸통 중심 기준
      const cy = rim + sg * 30, sx = 1 + o.squash * st.sq, sy = 1 - o.squash * st.sq;
      // ③ 완성 후 : 도넛(볼)이 제자리에서 한 바퀴 회전하는 듯 폭이 줄었다 커지고 살짝 기운다 (기둥은 그대로)
      let spin = '';
      if (st.sp != null) { const e = st.sp < .5 ? 4 * st.sp * st.sp * st.sp : 1 - Math.pow(-2 * st.sp + 2, 3) / 2, a = 2 * Math.PI * e, env = Math.sin(Math.PI * st.sp);
        // 입체가 축을 살짝 기울인 채 한 바퀴 도는 실루엣 : 좌우로 갸우뚱(roll) + 위아래 두께가 숨 쉬듯(pitch), 폭은 거의 그대로. 시작과 끝은 부드럽게 정면으로 돌아온다
        spin = ` translate(0 ${f2(11 * Math.sin(Math.PI * e))}) rotate(${f2(6 * Math.sin(a) * env)}) scale(${(1 - .03 * (1 - Math.cos(a)) / 2 * env).toFixed(4)} ${(1 + .09 * Math.sin(a + 1.1) * env).toFixed(4)})`; }
      bodyG.setAttribute('transform', `translate(123.5 ${f2(cy)})${spin} scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(-123.5 ${f2(-cy)})`);
      cam.setAttribute('transform', `translate(0 ${f2(-camOf(tau, tr))})`);
    };

    const tick = now => {
      st.raf = requestAnimationFrame(tick);
      if (st.run) {                                                // 그래프(시간 곡선) 모드 : 진행도를 곡선이 직접 정한다
        if (st.run.t0 == null) st.run.t0 = now;
        if (st.run.back) {                                          // 되감기 : 현재 모양에서 갓등 모양까지 부드럽게 돌아간 뒤 처음부터 다시 재생
          const p = clamp((now - st.run.t0) / 450), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          st.t = st.w = st.sp = null; st.u = st.run.u0 * (1 - e); st.v = 0; st.sq = 0; st.target = st.u; draw();
          if (p >= 1) st.run = { t0: null };
          return;
        }
        const el = (now - st.run.t0) / 1000, total = timelineTotal(tl);
        st.u = tauAt(Math.min(el, total)) / TT; st.v = 0; st.sq = 0; st.target = st.u; st.w = null;
        st.sp = el > total ? clamp((el - total) / tl.spin) : null;               // 마지막 : 완성된 도넛이 한 바퀴 도는 듯
        draw();
        if (el >= total + tl.spin) { st.u = st.target = 1; st.run = null; st.sp = null; draw(); cancelAnimationFrame(st.raf); st.raf = 0; }
        return;
      }
      const dt = Math.min(.05, Math.max(.001, (now - st.last) / 1000 || .016)); st.last = now;
      const steps = 4, h = dt / steps;
      for (let i = 0; i < steps; i++) {
        if (st.chain && st.u < .06) { st.target = 1; st.chain = false; }
        const a = o.stiffness * (st.target - st.u) - o.damping * st.v;
        st.v += a * h; st.u += st.v * h;
      }
      st.sq += (Math.tanh(st.v * 1.1) - st.sq) * (1 - Math.exp(-dt * 14));
      draw();
      if (!st.chain && Math.abs(st.target - st.u) < .0004 && Math.abs(st.v) < .003 && Math.abs(st.sq) < .004) {
        st.u = st.target; st.v = 0; st.sq = 0; draw(); cancelAnimationFrame(st.raf); st.raf = 0;
      }
    };
    const wake = () => { if (!st.raf) { st.last = performance.now(); st.raf = requestAnimationFrame(tick); } };

    const api = {
      goTo(s) { st.run = null; st.t = st.w = st.sp = null; st.chain = false; st.target = clamp(s, 0, 1); wake(); return api; },
      setProgress(s, immediate = false) { st.run = null; st.t = st.w = st.sp = null; st.chain = false; st.target = clamp(s, 0, 1); if (immediate) { st.u = st.target; st.v = 0; st.sq = 0; draw(); } else wake(); return api; },
      play(delay = 350) { clearTimeout(st.timer); st.run = null; st.t = st.w = st.sp = null; st.chain = false; st.u = 0; st.v = 0; st.sq = 0; st.target = 0; draw(); st.timer = setTimeout(() => { if (tl) st.run = { t0: null }; else st.target = 1; wake(); }, delay); return api; },
      replay() { clearTimeout(st.timer); if (tl) { st.v = 0; st.sq = 0; st.run = st.u > .02 ? { t0: null, back: true, u0: st.u } : { t0: null }; if (!st.run.back) { st.u = 0; st.target = 0; draw(); } wake(); return api; } st.chain = true; st.target = 0; wake(); return api; },
      setTimeline(t) { tl = copyTL(t); buildTL(); return api; },
      stop() { clearTimeout(st.timer); st.chain = false; st.run = null; },
      /* 현재 모양의 가장 아래 y (viewBox 좌표, 카메라 이동 반영) — 아래에 붙는 글자가 같이 내려오도록 */
      extents() {
        const tau = st.u * TT, tr = railTau(tau), rim = cRim(tau), sg = cSigma(tau), b = cBody(tau); let mx = 0;
        for (let i = 1; i < 34; i += 2) mx = Math.max(mx, b[i]);
        const S = cStub(tr), stubB = Math.hypot(S[2] - S[0], S[3] - S[1]) > 3 ? Math.max(S[1], S[3]) + o.stroke / 2 : -1e9;
        return { bottom: Math.max(rim + Math.max(0, sg) * mx, stubB) - camOf(tau, tr) };
      },
      /* 세로선(기둥)이 점에서 자라는 정도 0→1 — 이 값에 맞춰 LIEU 를 내려보내면 시작과 끝이 정확히 같다 */
      get pole() { const L = cRail(railTau(st.u * TT)); return clamp((L[1] - BASE) / (38 * S - BASE)); },
      get done() { return !st.run && st.u >= .999; },
      get progress() { return st.u; },
      destroy() { clearTimeout(st.timer); cancelAnimationFrame(st.raf); }
    };
    draw();
    return api;
  }
  window.LieuMorph = { create, bezier, loadTimeline, DEFAULT_TL, copyTL, timelineTotal, PHASE_TAU, TT };
})();
