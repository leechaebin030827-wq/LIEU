/* LIEU · 자동차 장면
   스크롤하면 "Hey, I'm LIEU" 가 사라지고 자동차가 화면 우측 상단에서 중앙으로 굴러 들어온다.
   카메라는 45° 시점에서 출발해 중앙에 도착하면 오른쪽 옆면(right view)으로 부드럽게 돌아온다.
   재질은 X-ray / Ghost : 반투명 푸른 막 + 가장자리(프레넬)와 모서리(크리즈) 라인이 빛나는 표현.
   흰 배경 위에서 보이도록 '가산' 대신 일반 알파 블렌딩 + 양면 렌더링으로 겹침을 쌓는다. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const cv = document.getElementById('carCv');
if (cv) {
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 400);
  const group = new THREE.Group(); scene.add(group);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (x, a, b) => clamp((x - a) / (b - a));
  const smooth = t => t * t * (3 - 2 * t);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const material = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false, depthTest: false,
    uniforms: { uOpacity: { value: 0 }, uRimPow: { value: 3.0 }, uBase: { value: .02 }, uRim: { value: .36 }, uLine: { value: .5 }, uCrease: { value: 5.5 },
      uColA: { value: new THREE.Color('#D8D8D8') }, uColB: { value: new THREE.Color('#8C8C8C') } },   // 그레이스케일   // 도트 그라데이션과 같은 하늘색 계열
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main() { vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      precision highp float;
      uniform float uOpacity, uRimPow, uBase, uRim, uLine, uCrease; uniform vec3 uColA, uColB;
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 N = normalize(vN), V = normalize(vV);
        float fr = pow(1.0 - abs(dot(N, V)), uRimPow);                 // 가장자리 프레넬 (속은 투명, 둘레는 진하게)
        float crease = clamp(length(fwidth(N)) * uCrease, 0.0, 1.0);   // 모서리 라인 (표면 방향이 급히 바뀌는 곳)
        float a = clamp(uBase + fr * uRim + crease * uLine, 0.0, 1.0) * uOpacity;
        vec3 col = mix(uColA, uColB, clamp(fr * 1.2 + crease, 0.0, 1.0));
        gl_FragColor = vec4(col, a);
      }`
  });
  material.extensions = { derivatives: true };

  let dark = false;
  let model = null, W = 0, H = 0, roofY = .28, floorY = -.17, kkG = 1, storyFont = 124;
  const P = { c: 0, z2: 0, z3: 0, d: 0 };
  let groundY = -.34;
  const FRONT_FLIP = false;               // 모델의 앞이 -X(화면 왼쪽) : 우측 상단에서 중앙(왼쪽 아래)으로 달려올 때 차가 가는 방향을 보도록 그대로 둔다

  /* ── LIEU 장치 : 차 지붕 안쪽 중앙(천장)에 매달린 도넛 + 세로선, 그 아래로 빛이 내려와 바닥에 글씨를 비춘다 ── */
  scene.add(new THREE.AmbientLight(0xffffff, 1.1)); const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(1.5, 3, 2); scene.add(sun);
  const dev = new THREE.Group(); group.add(dev);
  const devMat = material.clone();      // 자동차와 같은 고스트(프레넬 + 모서리선) 셰이더, 색과 농도만 더 진하게
  Object.assign(devMat.uniforms, { uColA: { value: new THREE.Color('#6A6A72') }, uColB: { value: new THREE.Color('#1A1A1E') } });
  devMat.uniforms.uBase.value = .16; devMat.uniforms.uRim.value = .8; devMat.uniforms.uLine.value = .85; devMat.uniforms.uRimPow.value = 2.2;
  devMat.extensions = { derivatives: true };
  const donut = new THREE.Mesh(new THREE.TorusGeometry(.095, .036, 28, 56), devMat); donut.rotation.x = Math.PI / 2;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, .15, 14), devMat);
  dev.add(donut, pole); dev.renderOrder = 4; donut.renderOrder = 4; pole.renderOrder = 4;
  const coneMat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false, depthTest: false, uniforms: { uOp: { value: 0 }, uCol: { value: new THREE.Color('#B9B9C0') } },
    vertexShader: 'attribute float aH; varying float vH; void main(){ vH = aH; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'precision highp float; uniform float uOp; uniform vec3 uCol; varying float vH; void main(){ gl_FragColor = vec4(uCol, uOp * (0.42 * pow(1.0 - vH, 1.3) + 0.04)); }'
  });
  const cone = new THREE.Mesh(new THREE.BufferGeometry(), coneMat); cone.renderOrder = 3; dev.add(cone);
  const textMat = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, opacity: 0 });
  const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(.92, .52), textMat); textPlane.rotation.x = -Math.PI / 2; textPlane.renderOrder = 3; group.add(textPlane);
  // HTML #storyText 와 글자 위치가 정확히 같도록 : 같은 font-family(폴백 포함)를 쓰고, 줄 상자(line-height 1.29) 안에서 기준선이 놓이는 위치를 DOM 에서 직접 잰다 (글꼴마다 달라서 상수로는 안 맞는다)
  const storyFam = () => { const el = document.getElementById('storyText'); return el ? getComputedStyle(el).fontFamily : '"IBM Plex Sans", sans-serif'; };
  const baselineOff = (fs, fam) => {
    const d = document.createElement('div'), m = document.createElement('i');
    d.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;font:500 ${fs}px/1.29 ${fam}`;
    m.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'; d.textContent = '가Hg'; d.appendChild(m); document.body.appendChild(d);
    const off = m.getBoundingClientRect().top - d.getBoundingClientRect().top; d.remove(); return off;
  };
  const drawStory = lines => {
    const cvs = document.createElement('canvas'); cvs.width = 1400; cvs.height = 790; const x = cvs.getContext('2d'), fam = storyFam();
    x.clearRect(0, 0, cvs.width, cvs.height); x.fillStyle = dark ? '#F2F2F6' : '#35353b'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    const ls = (lines && lines.length ? lines : ["Here's how", 'I came to be.']);
    let fs = 124; x.font = `500 ${fs}px ${fam}`; const mw = Math.max(...ls.map(t => x.measureText(t).width)); if (mw > 1300) fs = Math.floor(124 * 1300 / mw); storyFont = fs; x.font = `500 ${fs}px ${fam}`;
    const lh = fs * 1.29, off = baselineOff(fs, fam);
    ls.forEach((t, i) => x.fillText(t, cvs.width / 2, cvs.height / 2 + (i - (ls.length - 1) / 2) * lh - lh / 2 + off));
    const tex = new THREE.CanvasTexture(cvs); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; if (textMat.map) textMat.map.dispose(); textMat.map = tex; textMat.needsUpdate = true;
  };
  drawStory(window.__story);

  /* ── 바닥(지면) 위의 문구 : 위에서 내려다본 평면일 때는 평범한 글씨로 보이다가, 카메라가 옆면으로 내려오면 평면이 기울어지며 원근으로 눕는다 ── */
  const drvMat = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, opacity: 0 });
  const drvPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), drvMat); drvPlane.rotation.order = "YXZ"; drvPlane.rotation.x = -Math.PI / 2; drvPlane.renderOrder = 1; scene.add(drvPlane);
  let drvCW = 2000, drvCH = 600, drvFs = 150;
  const drawDriver = lines => {
    const ls = (lines && lines.length ? lines : ["I'm a new kind of", "<b>'Driver'</b> for robotaxis"]);
    const cvs = document.createElement('canvas'), x = cvs.getContext('2d');
    const fam = '"IBM Plex Sans", "Apple SD Gothic Neo", "Hiragino Sans", "PingFang SC", sans-serif';
    const runs = ls.map(l => l.split(/(<b>.*?<\/b>)/).filter(Boolean).map(t => t.startsWith('<b>') ? { t: t.slice(3, -4), b: true } : { t, b: false }));
    const width = (fs, r) => { let w = 0; r.forEach(q => { x.font = `${q.b ? 600 : 500} ${fs}px ${fam}`; w += x.measureText(q.t).width; }); return w; };
    let fs = 150; const mw = Math.max(...runs.map(r => width(fs, r))); if (mw > 1880) fs = Math.floor(150 * 1880 / mw);
    drvFs = fs; drvCW = 2000; drvCH = Math.ceil(ls.length * fs * 1.34 + 60); cvs.width = drvCW; cvs.height = drvCH;
    x.clearRect(0, 0, drvCW, drvCH); x.textBaseline = 'middle'; x.textAlign = 'left';
    runs.forEach((r, i) => { let px = (drvCW - width(fs, r)) / 2; const y = drvCH / 2 + (i - (ls.length - 1) / 2) * fs * 1.34;
      r.forEach(q => { x.font = `${q.b ? 600 : 500} ${fs}px ${fam}`; x.fillStyle = q.b ? '#9ABEFF' : (dark ? '#F2F2F6' : '#171A18'); x.fillText(q.t, px, y); px += x.measureText(q.t).width; }); });
    const tex = new THREE.CanvasTexture(cvs); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; if (drvMat.map) drvMat.map.dispose(); drvMat.map = tex; drvMat.needsUpdate = true;
  };
  drawDriver(window.__drv);

  new GLTFLoader().load('assets/car.glb?v=2', gltf => {
    // 어떤 모델이 와도 같은 크기·방향으로 맞춘다 : 노드 변환을 굽고 → 긴 축을 X 로 → 길이 1.9 → 가운데 정렬
    gltf.scene.updateMatrixWorld(true);
    const src = gltf.scene.getObjectByProperty('isMesh', true);
    const geo = src.geometry.clone(); geo.applyMatrix4(src.matrixWorld);
    geo.computeBoundingBox(); let bb = geo.boundingBox, sz = bb.getSize(new THREE.Vector3());
    if (sz.z > sz.x) { geo.rotateY(Math.PI / 2); geo.computeBoundingBox(); bb = geo.boundingBox; sz = bb.getSize(new THREE.Vector3()); }
    const k = 1.9 / sz.x, ctr = bb.getCenter(new THREE.Vector3());
    geo.translate(-ctr.x, -ctr.y, -ctr.z); geo.scale(k, k, k);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    geo.computeBoundingBox(); const H = geo.boundingBox.max.y - geo.boundingBox.min.y, kk = H / .6;     // kk : 장치 · 빛의 크기 보정
    model = new THREE.Mesh(geo, material); model.renderOrder = 2;
    if (FRONT_FLIP) model.rotation.y = Math.PI;
    group.add(model); group.updateMatrixWorld(true);
    // 모델 상단 중앙 = 천장 : 위에서 아래로 쏜 광선이 처음 닿는 지붕 높이를 구한다
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 3, 0), new THREE.Vector3(0, -1, 0)); const hit = ray.intersectObject(model)[0];
    roofY = hit ? hit.point.y - .012 : geo.boundingBox.max.y - .02; groundY = geo.boundingBox.min.y - .04;
    floorY = geo.boundingBox.min.y + H * .22;
    const ceil = roofY, dy = ceil - .15 * kk;                               // 도넛 중심 높이
    kkG = kk; dev.scale.setScalar(kk); dev.position.set(0, 0, 0);
    donut.position.set(0, dy / kk, 0); pole.position.set(0, (ceil + dy) / 2 / kk, 0); pole.scale.y = (ceil - dy) / (.15 * kk);
    const ay = (dy - .04 * kk) / kk, by = floorY / kk, bx = .46 * 1, bz = .26;      // 빛의 사각뿔 (꼭짓점 = 장치, 바닥 = 글씨가 비치는 사각형)
    const V = [[0, ay, 0], [-bx, by, -bz], [bx, by, -bz], [bx, by, bz], [-bx, by, bz]], hs = [0, 1, 1, 1, 1];
    const pos = [], hh = []; [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1]].forEach(f => f.forEach(i => { pos.push(...V[i]); hh.push(hs[i]); }));
    cone.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cone.geometry.setAttribute('aH', new THREE.Float32BufferAttribute(hh, 1));
    textPlane.scale.setScalar(kk); textPlane.position.set(0, floorY + .004, 0);
    render();
  }, undefined, err => console.warn('car load failed', err));

  const resize = () => {
    W = innerWidth; H = innerHeight;
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix(); render();
  };
  addEventListener('resize', resize);

  const render = () => {
    if (!model) return;
    const { c, z2, z3, d } = P;
    const vis = (c > .001 || d > .001) && z3 < .995;
    cv.style.visibility = vis ? 'visible' : 'hidden';
    if (!vis) return;
    const aspect = W / H, fov = 30 * Math.PI / 180, tn = Math.tan(fov / 2);
    const D1 = Math.max(4.2, 1.9 / (2 * tn * aspect * .58));             // 차 길이(1.9)가 가로의 약 58% 가 되는 거리
    const D2 = D1 * .42, D3 = (.92 * kkG) / ((aspect < 1 ? .9 : .7) * 2 * tn * aspect);   // 줌인 거리 · 바닥 글씨 사각형이 화면 가로의 70% 가 되는 거리
    const tt = seg(c, 0, .88), travel = 1 - (1 - tt) * (1 - tt) * (1 - tt * .35), turn = easeInOut(seg(c, .08, 1));   // 천천히 굴러와서 중앙에 가까워질수록 감속
    const e2 = easeInOut(z2), e3 = easeInOut(z3);
    // 카메라 상태 : 도착(45° 앞 → 옆면) → 지붕 안쪽 장치로 줌인 → 바닥의 글씨를 위에서 내려다봄
    let az = lerp(-Math.PI / 4, 0, turn), el = lerp(1.57, .06, turn), dist = D1, ty = 0;     // 처음엔 위에서 수직으로 내려다보는 시점(평면이 정면으로 보임) → 도착하며 옆면(right view)
    az = lerp(az, .38, e2); el = lerp(el, .62, e2); dist = lerp(dist, D2, e2); ty = lerp(ty, roofY - .1 - .13 * kkG, e2);   // 카메라 시선을 장치보다 아래로 두어, 도넛이 화면 중앙보다 위쪽에 놓인다
    az = lerp(az, 0, e3); el = lerp(el, 1.55, e3); dist = lerp(dist, D3, e3); ty = lerp(ty, floorY, e3);
    const cx = Math.sin(az) * Math.cos(el), cy = Math.sin(el), cz = Math.cos(az) * Math.cos(el);
    const k = lerp(.12, 1, smooth(seg(c, 0, .5))), dd = dist / k;      // 처음엔 거의 정사영(화각을 좁히고 멀리서 당겨 찍기) → 옆면이 보이지 않는 완전한 평면 top view, 점차 원래 원근으로
    camera.fov = 2 * Math.atan(tn * k) * 180 / Math.PI; camera.updateProjectionMatrix();
    camera.position.set(cx * dd, ty + cy * dd, cz * dd); camera.lookAt(0, ty, 0); camera.updateMatrixWorld();
    // 도착 전 : 우측 상단 바깥 → 중앙 (카메라 기준 화면 위치)
    const hh = D1 * tn, hw = hh * aspect;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    // 주차하듯이 : 우측 가장자리를 따라 내려오다 완만하게 휘어 중앙으로 들어오는 곡선 경로(베지어). 차의 방향은 경로의 접선을 따라 돌고, 도착하면서 정면(옆면)으로 정렬된다
    const bz = (a, b, c2, d2, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c2 + t * t * t * d2; };
    const dbz = (a, b, c2, d2, t) => { const u = 1 - t; return 3 * u * u * (b - a) + 6 * u * t * (c2 - b) + 3 * t * t * (d2 - c2); };
    const X = [hw * 1.05, hw * .95, hw * .5, 0], Y = [hh, hh * .4, 0, 0];
    const ox = bz(...X, travel), oy = bz(...Y, travel);
    const tanA = Math.atan2(dbz(...Y, Math.min(travel, .999)), dbz(...X, Math.min(travel, .999))), noseA = -Math.PI / 2 - (Math.PI / 2 + az);   // 진행 방향(화면) · 차 앞쪽이 가리키는 방향(화면)
    let yaw = tanA - noseA; yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    group.position.copy(right.multiplyScalar(ox)).addScaledVector(up, oy);
    group.scale.setScalar(lerp(.2, 1, easeOut(seg(c, 0, .95))));              // 처음 등장할 때는 작고, 중앙으로 오면서 원래 크기가 된다
    group.rotation.set(0, yaw * (1 - smooth(seg(c, .75, 1))), 0);
    // 투명도
    const carOp = smooth(seg(c, 0, .12)) * (1 - smooth(seg(z3, .55, .95)));
    material.uniforms.uOpacity.value = carOp;
    devMat.uniforms.uOpacity.value = smooth(seg(c, .55, .95)) * (1 - smooth(seg(z3, .7, 1)));
    coneMat.uniforms.uOp.value = smooth(clamp(seg(z2, .72, 1) * .3 + seg(z3, 0, .4) * .7)) * (1 - smooth(seg(z3, .85, 1)));   // 줌인이 끝나가는 시점(장치가 화면 위쪽에 자리 잡을 때)부터 빛이 서서히 나오기 시작한다
    textMat.opacity = smooth(seg(z3, .1, .55)) * (1 - smooth(seg(z3, .94, 1)));
    // 마지막 HTML 글씨가 3D 바닥 글씨와 '같은 글씨'로 겹치도록, 지금 카메라에서 글씨가 화면에서 차지하는 크기를 CSS 변수로 넘긴다 (캔버스 글씨 124px 기준)
    const pxPerWorld = H / (2 * dist * tn);
    document.documentElement.style.setProperty('--storyFs', (storyFont * pxPerWorld * .92 * kkG / 1400).toFixed(2) + 'px');
    // 지면 위 문구 : 크기는 Hey, I'm LIEU 글씨와 같게(처음 위에서 본 화면 기준), 아래에서 밀고 올라오며 나타나고, 카메라가 기울면서 평면이 눕다가 사라진다
    const Fpx = W <= 640 ? clamp(.072 * W, 26, 34) : clamp(.024 * W, 22, 34), pxw0 = H / (2 * (D1 + Math.abs(groundY)) * tn), wpp = (Fpx / drvFs) / pxw0;
    drvPlane.scale.set(drvCW * wpp, drvCH * wpp, 1);
    const dk = (1 - smooth(d)) * Math.min(84, H * .12) / pxw0, azd = lerp(-Math.PI / 4, 0, turn);
    drvPlane.rotation.y = azd;                                                  // 문구는 항상 카메라 방향으로 정렬(처음 top view에서 똑바로 읽힘)
    drvPlane.position.set(Math.sin(azd) * dk, groundY, Math.cos(azd) * dk);
    drvMat.opacity = smooth(d) * (1 - smooth(seg(c, .38, .72)));
    renderer.render(scene, camera);
  };
  // 다크모드 : 배경이 어두워지면 글씨 · 장치 · 차 선의 색을 밝게 바꾼다 (스위치처럼 한 번에)
  const applyDark = () => {
    const u = material.uniforms, d = devMat.uniforms;
    u.uColA.value.set(dark ? '#EDEDF2' : '#D8D8D8'); u.uColB.value.set(dark ? '#9A9AA6' : '#8C8C8C'); u.uBase.value = dark ? .03 : .02; u.uRim.value = dark ? .6 : .36; u.uLine.value = dark ? .75 : .5;
    d.uColA.value.set(dark ? '#F4F4FA' : '#6A6A72'); d.uColB.value.set(dark ? '#A9A9B6' : '#1A1A1E'); d.uBase.value = dark ? .12 : .16; d.uRim.value = dark ? .75 : .8; d.uLine.value = dark ? .9 : .85;
    coneMat.uniforms.uCol.value.set(dark ? '#D8D8E4' : '#B9B9C0');
    drawStory(window.__story); drawDriver(window.__drv);
  };
  window.CarScene = {
    setDark(v) { v = !!v; if (v === dark) return; dark = v; applyDark(); render(); },
    set(c) { P.c = clamp(c); render(); },
    update(c, z2, z3, d) { P.c = clamp(c); P.z2 = clamp(z2); P.z3 = clamp(z3); P.d = clamp(d || 0); render(); },
    setDriver(lines) { window.__drv = lines; drawDriver(lines); render(); },
    setStory(lines) { window.__story = lines; drawStory(lines); render(); }
  };
  resize();
  if (document.fonts) Promise.all([500, 600].map(w => document.fonts.load(`${w} 40px "IBM Plex Sans"`))).then(() => { if (window.__story) drawStory(window.__story); if (window.__drv) drawDriver(window.__drv); render(); }).catch(() => {});
}
