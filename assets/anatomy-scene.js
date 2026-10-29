/* LIEU · 제품 해부 장면
   끝 장면(영상 자리) 다음. 스크롤을 따라 :
     1) 제품이 나타난다 (외장이 닫힌 모습)
     2) 엑스레이 스캔 : 위에서 아래로 스캔선이 내려가며 외장이 투명해지고 내부 구조가 드러난다
     3) 분해 : 부품이 위아래 · 옆으로 흩어진다
     4) 부품 소개 : 하나씩 카메라가 다가가고, 나머지는 흐려지고, 글이 뜬다 (Yaw 장면에서는 모터 · 피니언 · 링 기어가 다시 맞물려 돈다)
   표현은 자동차 장면과 같은 엑스레이 (프레넬 가장자리 + 모서리 선). 기어비는 실물 확인 전이라 MOCK. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { createGrainient } from './grainient.js?v=1';   // React Bits Grainient 를 바닐라로 옮긴 것 : 틀의 배경 그라데이션
import { createLook } from './anatomy-look.js?v=4';   // 조명 · 환경 · 재질 값 · 톤매핑 · AO · 디버그 패널 (형상과 분해 연출은 건드리지 않는다)

const cv = document.getElementById('anatCv'), ui = document.getElementById('anat');
if (cv && ui) {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t, seg = (x, a, b) => clamp((x - a) / (b - a));
  const sm = t => t * t * (3 - 2 * t), eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), eo3 = t => 1 - Math.pow(1 - t, 3);
  let AN = 58.5; const DIMC = new THREE.Color(0x7d8794);   // 화면 높이 배수 : 렌더 이미지 틀이 올라와 자리 잡는 장면의 기준점. 끝 장면(48.1) 뒤에 벤토 그리드 구간(1.4)이 들어가서 그만큼 뒤로 밀렸다 (assets/bento.js)
  const TL = { zoom: [-.35, .45], scan: [.45, 3.0], rot: [3.6, 4.8], explode: [6.0, 8.4], parts: 8.6, len: 2.4 };   // 틀이 화면을 채우는 동안(-.35~.45) 모델도 같이 커진다(zoom) → 꽉 차면 그 크기에서 바로 엑스레이 스캔 + 라이트 모드 → 비스듬히 돌아옴 → 분해 → 부품 소개   // AN 기준 상대 위치 (화면 높이 배수)
  const MOCK_NP = 17, MOCK_NR = 118;   // 기어비 : 형상에서 센 값, 실물 확인 전 (MOCK)

  /* ── 부품 묶음 : 노드 이름 조각 → 묶음. off 는 분해할 때 움직이는 거리 (mm). 어느 묶음에도 안 든 것은 'pillar' 로 간다. ── */
  const GROUPS = {
    shellTop: { keys: ['루_상부'], off: [0, 135, 0] },
    bearing: { keys: ['베어링_상부', '베어링_중부'], off: [0, 78, 0] },
    drive: { keys: ['베어링_기어', 'XL,XC-330'], off: [-120, 70, 0] },
    ring: { keys: ['베어링_하부'], off: [0, 0, 0] },
    shellLow: { keys: ['루_하부'], off: [0, -78, 0] },
    eyes: { keys: ['눈_LED_가이드', 'Body154'], off: [120, -34, 0] },
    light: { keys: ['LED_부착부', 'Body7'], off: [0, -150, 0] },
    projector: { keys: ['Miniray_Beam'], off: [0, -205, 0] },
    pillar: { keys: ['기둥'], off: [0, 70, 0], rest: true }
  };
  const HIDE = ['KeyStudio'];   // 눈 LED 매트릭스 보드 2장 : 보여주지 않는다
  const SHELL_KEYS = [];   // 솔리드 3D 는 보여주지 않는다 : 닫힌 모습은 렌더 사진이 맡고, 3D 는 엑스레이로만 나타난다   // 닫힌 모습에서 겉으로 보이는 외장 (스캔선 아래는 이 solid 로 보인다)

  /* ── 소개할 부품 7개 : 카메라 각도(az: +X 에서 +Z 쪽, el: 위) · 글 위치 · 문구 (초안) ── */
  /* 이야기 순서 : 모터가 피니언을 돌리고 → 링 기어가 느리게 돌고 → 베어링이 받치고 → 그래서 외장 아래쪽이 돌고 → 눈이 좌우를 본다. 그 뒤로 빛 · 투사 · 기둥.
     groups : 또렷하게 보이는 부품 · re : 이 장면에서 다시 맞물려 제자리로 돌아오는 부품 · assist : 흐리게 같이 보이는 부품(가중치) */
  const PARTS = [
    { id: 'drive', groups: ['drive'], az: 205, el: 28, k: 2.1, b: 1.15 },
    { id: 'ring', groups: ['ring', 'drive'], re: ['ring', 'drive'], az: 205, el: 30, k: 2.4, b: 1.15 },
    { id: 'bearing', groups: ['bearing'], az: 125, el: 26, k: 2.4, b: 1.0 },
    { id: 'lower', groups: ['shellLow', 'ring'], re: ['shellLow', 'ring'], az: 35, el: 22, k: 2.7, b: 1.0 },
    { id: 'eyes', groups: ['eyes'], re: ['eyes', 'shellLow', 'ring'], assist: { shellLow: .45, ring: .25 }, az: 18, el: 8, k: 2.6, b: 1.0 },
    { id: 'light', groups: ['light'], az: 58, el: 16, k: 2.2, b: 1.2 },
    { id: 'projector', groups: ['projector'], az: 70, el: 8, k: 2.1, b: 1.2 },
    { id: 'pillar', groups: ['pillar'], az: 330, el: 10, k: 2.8, b: 1.3 }
  ];
  const COPY = {
    en: {
      _k: 'How LIEU looks around',
      drive: ['Motor', 'It starts with a small motor. It spins a pinion, a tiny gear, and that tiny turn is where every movement begins.'],
      ring: ['Ring gear', 'The pinion meets a large ring gear. The turn slows down and gains strength, so the ring can move the whole lower half.'],
      bearing: ['Bearing', 'A three-layer bearing carries the ring, so the turn stays smooth and quiet.'],
      lower: ['Lower half', 'As the ring turns, the lower half of the shell turns with it. The upper half stays still.'],
      eyes: ['Eyes', 'And the eyes go along. They look left, then right, toward whoever needs to be noticed.'],
      light: ['Light', 'A ring of light around the column shows what LIEU is doing, through color and motion.'],
      projector: ['Projection', 'A compact projector puts guidance on the floor, right where a passenger is already looking.'],
      pillar: ['Column and tilt', 'A central column holds everything together and carries the tilt axis, leaning the whole head forward or back.']
    },
    ko: {
      _k: 'LIEU가 고개를 돌리는 방법',
      drive: ['모터', '시작은 작은 모터예요. 모터가 피니언이라는 작은 기어를 돌리고, 모든 움직임은 이 작은 회전에서 출발해요.'],
      ring: ['링 기어', '피니언이 큰 링 기어와 맞물려요. 회전은 느려지고 힘은 커져서, 링이 아래쪽 전체를 움직일 수 있어요.'],
      bearing: ['베어링', '3단 베어링이 링을 받쳐서, 회전이 부드럽고 조용하게 이어져요.'],
      lower: ['아래쪽 외장', '링이 돌면 외장의 아래쪽이 함께 돌아요. 위쪽은 가만히 있고요.'],
      eyes: ['눈', '그래서 눈도 함께 움직여요. 왼쪽, 그리고 오른쪽으로, 알아봐 줘야 할 사람을 향해 바라봐요.'],
      light: ['빛', '기둥을 두른 빛의 링이 색과 움직임으로 지금 LIEU가 무엇을 하는지 알려줘요.'],
      projector: ['투사', '작은 프로젝터가 승객이 이미 바라보는 바닥 위에 안내를 비춰줘요.'],
      pillar: ['기둥과 틸트', '가운데 기둥이 모든 것을 붙잡고, 틸트 축으로 머리 전체를 앞뒤로 기울여요.']
    }
  };
  const CAP = { en: ['X-ray scan', 'Structure', 'Exploded view'], ko: ['엑스레이 스캔', '내부 구조', '분해'] };
  const lang = () => ((document.documentElement.lang || 'en').slice(0, 2) in COPY ? (document.documentElement.lang || 'en').slice(0, 2) : 'en');

  /* ── 렌더러 · 카메라 · 조명 ── */
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .02, 20);
  const look = createLook(renderer, scene, camera);
  look.onMode(mode => { for (const g of Object.values(G)) g.solidMeshes.forEach(m => { m.material = mode === 'after' ? m.userData.mAfter : m.userData.mBefore; }); });   // Before / After 비교 : 재질만 바꾼다

  /* ── 재질 : 스캔선 아래는 solid(닫힌 외장), 위는 엑스레이(고스트) ── */
  const SCAN_GLOW = false;   // true : 스캔선에 파란 원판 · 테두리 · 둘레 빛을 보인다 (지금은 끔)
  const uScan = { value: 1 };                                      // 스캔선의 월드 높이(m). 아래 solid · 위 엑스레이
  const scanPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1);   // y < 스캔선 만 남긴다
  const SLATE = new THREE.Color('#888888'), INK = new THREE.Color('#191919'), ACCENT = new THREE.Color('#262626'), BAND = new THREE.Color('#606060');
  const vert = `varying vec3 vN; varying vec3 vV; varying float vWy;
    void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vWy = (modelMatrix * vec4(position, 1.0)).y; gl_Position = projectionMatrix * mv; }`;
  const frag = `precision highp float;
    uniform vec3 uCol, uBand; uniform float uGlow, uOpacity, uBase, uRim, uLine, uCrease, uRimPow, uScanY, uEmph, uF0, uF1;
    varying vec3 vN; varying vec3 vV; varying float vWy;
    void main(){
      if (vWy < uScanY) discard;                                    // 아직 스캔 전 : 닫힌 외장 뒤에 숨어 있다
      vec3 N = normalize(vN), V = normalize(vV);
      float fr = pow(1.0 - abs(dot(N, V)), uRimPow);                // 가장자리 프레넬
      float cr = clamp(length(fwidth(N)) * uCrease, 0.0, 1.0);      // 모서리 선
      float a = (uBase + uRim * fr + uLine * cr) * (1.0 + uEmph * 0.9);
      float band = uGlow * exp(-pow((vWy - uScanY) / 0.0035, 2.0)) * 0.7 * step(uScanY, 0.2);   // 스캔선 둘레가 파랗게 빛난다
      vec3 col = mix(uCol, uBand, clamp(band, 0.0, 1.0));
      a = clamp(a + band * 0.85, 0.0, 1.0) * uOpacity * (1.0 - smoothstep(uF0, uF1, vWy));
      gl_FragColor = vec4(col, a);
    }`;
  /* 기둥 solid : 위로 갈수록 서서히 사라진다 (고스트와 같은 높이 범위) */
  const pillarFade = { f0: { value: .05 }, f1: { value: .13 } };
  const addFade = m => {
    m.onBeforeCompile = sh => {
      sh.uniforms.uF0 = pillarFade.f0; sh.uniforms.uF1 = pillarFade.f1;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWyF;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWyF = (modelMatrix * vec4(transformed, 1.0)).y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWyF; uniform float uF0, uF1;').replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a *= 1.0 - smoothstep(uF0, uF1, vWyF);');
    };
  };
  const ghostMat = (o = {}) => new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, vertexShader: vert, fragmentShader: frag,
    uniforms: { uCol: { value: SLATE.clone() }, uBand: { value: BAND }, uOpacity: { value: 1 }, uGlow: { value: SCAN_GLOW ? 1 : 0 }, uBase: { value: o.base ?? .02 }, uRim: { value: o.rim ?? .4 }, uLine: { value: o.line ?? .55 },
      uCrease: { value: o.crease ?? 5.5 }, uRimPow: { value: o.rimPow ?? 2.6 }, uEmph: { value: 0 }, uScanY: uScan, uF0: { value: o.f0 ?? 9 }, uF1: { value: o.f1 ?? 10 } }
  });

  /* ── 솔리드 재질 : 렌더 사진에서 뽑은 색. 외장은 위(윗 테두리)가 짙고 옆 · 아래가 연한 라벤더, 기둥 · 렌즈는 금속. 부품마다 실제 재질에 가깝게 ── */
  const SOLID = true;   // false : 분해 이후에도 엑스레이로만 보인다
  const shellMat = (top, side, under) => {
    const m = new THREE.MeshPhysicalMaterial({ color: side, roughness: .52, metalness: 0, clearcoat: .3, clearcoatRoughness: .45, side: THREE.DoubleSide });
    m.onBeforeCompile = sh => {
      sh.uniforms.uTop = { value: new THREE.Color(top) }; sh.uniforms.uSide = { value: new THREE.Color(side) }; sh.uniforms.uUnder = { value: new THREE.Color(under) };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWNy;').replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvWNy = normalize(mat3(modelMatrix) * objectNormal).y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWNy; uniform vec3 uTop, uSide, uUnder;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(uSide, uTop, smoothstep(.12, .8, vWNy)); diffuseColor.rgb = mix(diffuseColor.rgb, uUnder, smoothstep(-.25, -.75, vWNy));');
    };
    return m;
  };
  const metal = (c, r = .3, m = 1) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: m });
  const matte = (c, r = .55) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: 0 });
  const SOLIDS = {};
  const solidFor = (g, o) => {
    const chain = []; for (let q = o; q && q !== g.pivot; q = q.parent) chain.push(q.name); const c = chain.join('|'), has = (...k) => k.some(x => c.includes(x));
    let key, make;
    if (g.name === 'shellTop' || g.name === 'shellLow') { key = 'shell'; make = () => shellMat('#9D9D9D', '#D1D1D1', '#C4C4C4'); }
    else if (g.name === 'eyes') {
      if (has('눈_LED_가이드')) { key = 'eyeGuide'; make = () => shellMat('#C3C3C3', '#DADADA', '#CFCFCF'); }
      else { key = 'shell'; make = () => shellMat('#9D9D9D', '#D1D1D1', '#C4C4C4'); }
    }
    else if (g.name === 'pillar') {
      if (has('기둥')) { key = 'pillar'; make = () => { const m = new THREE.MeshPhysicalMaterial({ color: '#B3B3B3', roughness: .4, metalness: .45, clearcoat: .35, clearcoatRoughness: .35, transparent: true }); addFade(m); return m; }; }
      else if (has('샤프트', '브라켓')) { key = 'steel'; make = () => metal('#C7C7C7', .3); }
      else { key = 'dark'; make = () => metal('#2D2D2D', .5, .25); }
    }
    else if (g.name === 'light') { if (has('LED_부착부')) { key = 'flange'; make = () => metal('#D4D4D4', .28, .85); } else { key = 'cup'; make = () => metal('#9D9D9D', .32, .85); } }
    else if (g.name === 'projector') { key = 'proj'; make = () => metal('#2E2E2E', .45, .4); }
    else if (g.name === 'drive') { if (has('베어링_기어', 'HORN', 'PHS', 'BTS2', 'IDLE')) { key = 'steel'; make = () => metal('#CDCDCD', .28); } else { key = 'dark'; make = () => metal('#2D2D2D', .5, .25); } }
    else if (g.name === 'ring') { key = 'ring'; make = () => matte('#E4E7F0', .55); }
    else if (g.name === 'bearing') { if (has('베어링_중부')) { key = 'cage'; make = () => matte('#BFC6D8', .5); } else { key = 'bearing'; make = () => matte('#E3E6EF', .55); } }
    else { key = 'other'; make = () => matte('#C8CCD8'); }
    const kk = g.name + ':' + key;   // 재질은 묶음마다 따로 (투명도를 부품별로 다르게 쓰므로)
    return SOLIDS[kk] || (SOLIDS[kk] = make());
  };

  /* 도입의 검은 실루엣 : 같은 형상을 검게 그린다. 스캔선 아래만 남아서, 스캔이 지나가는 만큼 엑스레이로 바뀐다 */
  const silMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, clippingPlanes: [scanPlane], toneMapped: false }), silMeshes = [];   // 실루엣은 하이라이트 없이 순수한 검정. 형태는 외곽선만으로 읽힌다
  let silOn = null;
  const spinRoot = new THREE.Group(); scene.add(spinRoot);   // 모델 전체를 한 번에 돌리기 위한 루트 (분해 연출의 묶음들은 모두 이 안에 있다)

  /* 스캔선 : 얇은 원판 + 테두리 */
  const scanDisc = new THREE.Mesh(new THREE.CircleGeometry(.165, 72), new THREE.MeshBasicMaterial({ color: BAND, transparent: true, opacity: .07, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
  const scanRing = new THREE.Mesh(new THREE.RingGeometry(.1636, .165, 96), new THREE.MeshBasicMaterial({ color: BAND, transparent: true, opacity: .8, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
  [scanDisc, scanRing].forEach(m => { m.rotation.x = -Math.PI / 2; m.renderOrder = 10; m.visible = false; scene.add(m); });

  /* ── 모델 ── */
  const G = {};   // name → { pivot, off, ghost, solids, box }
  let ready = false, loading = false, poses = null;
  const isAnc = (a, b) => { for (let p = b.parent; p; p = p.parent) if (p === a) return true; return false; };
  const match = (o, k) => (k.startsWith('Body') ? o.name === k : o.name.includes(k));
  const topNodes = (root, key) => { const out = []; root.traverse(o => { if (match(o, key) && !out.some(f => isAnc(f, o))) out.push(o); }); return out; };

  const build = gltf => {
    const model = gltf.scene; scene.add(model); model.updateMatrixWorld(true);
    HIDE.forEach(k => topNodes(model, k).forEach(n => n.parent && n.parent.remove(n)));   // 보여주지 않을 부품은 모델에서 뺀다
    const used = new Set();
    for (const [name, def] of Object.entries(GROUPS)) {
      const pivot = new THREE.Group(); pivot.name = name; spinRoot.add(pivot);
      def.keys.forEach(k => topNodes(model, k).forEach(n => { if (!used.has(n)) { pivot.attach(n); used.add(n); } }));
      G[name] = { name, pivot, off: new THREE.Vector3(...def.off).multiplyScalar(.001), ghost: ghostMat(name === 'pillar' ? { f0: .05, f1: .13, base: .015, rim: .3, line: .45 } : {}), solids: [], solidMeshes: [], solidMats: [], rotors: {} };
    }
    [...model.children].forEach(c => { let has = false; c.traverse(o => { if (o.isMesh) has = true; }); if (has) G.pillar.pivot.attach(c); });   // 남은 부품(모터 더미, 샤프트 등)은 기둥 묶음으로
    for (const g of Object.values(G)) {
      g.pivot.traverse(o => { if (!o.isMesh || o.userData.anat) return;
        let top = o; while (top.parent && top.parent !== g.pivot) top = top.parent;
        if (SHELL_KEYS.some(k => top.name.includes(k) || o.name.includes(k))) {   // 외장 : solid + 엑스레이 두 겹
          const sm0 = o.material.clone(); if (sm0.color) sm0.color.lerp(new THREE.Color(g.name === 'pillar' ? '#8F9BC0' : '#B7C0DE'), .75); sm0.side = THREE.DoubleSide; sm0.clippingPlanes = [scanPlane]; sm0.transparent = true; if (g.name === 'pillar' && top.name.includes('기둥')) addFade(sm0); o.material = sm0; g.solids.push(sm0);
          const gh = new THREE.Mesh(o.geometry, g.ghost); gh.userData.anat = true; gh.renderOrder = 5; o.add(gh);
        } else o.material = g.ghost;
        o.renderOrder = o.material === g.ghost ? 5 : 0;
        { const sil = new THREE.Mesh(o.geometry, silMat); sil.userData.anat = true; sil.visible = false; o.add(sil); silMeshes.push(sil); }
        if (SOLID) { const sm1 = solidFor(g, o), sol = new THREE.Mesh(o.geometry, sm1); sol.userData.anat = true; sol.visible = false; o.add(sol); g.solidMeshes.push(sol); if (!g.solidMats.includes(sm1)) g.solidMats.push(sm1);
          const am = look.afterFor(g, o, { addFade }); sol.userData.mBefore = sm1; sol.userData.mAfter = am; sol.material = look.params.mode === 'after' ? am : sm1; if (!g.solidMats.includes(am)) g.solidMats.push(am); }
      });
    }
    // 돌아가는 부품 (Yaw 장면) : 피니언 · 링 기어
    G.drive.pinion = topNodes(G.drive.pivot, '베어링_기어')[0]; G.ring.ringNode = topNodes(G.ring.pivot, '베어링_하부')[0];
    // 위치 : 분해된 상태 / 닫힌 상태의 박스 → 카메라 자세
    const boxOf = (names, ex) => { const b = new THREE.Box3(); names.forEach(n => { G[n].pivot.position.copy(G[n].off).multiplyScalar(ex); }); scene.updateMatrixWorld(true); names.forEach(n => b.union(new THREE.Box3().setFromObject(G[n].pivot))); return b; };
    const all = Object.keys(G);
    const bAssembled = boxOf(all.filter(n => n !== 'pillar'), 0), bExploded = (() => { all.forEach(n => G[n].pivot.position.copy(G[n].off)); scene.updateMatrixWorld(true); const b = new THREE.Box3(); all.forEach(n => { if (n !== 'pillar') b.union(new THREE.Box3().setFromObject(G[n].pivot)); }); return b; })();
    const pose = (box, az, el, k, side) => { const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3()); return { c, dist: clamp(Math.max(s.x, s.y, s.z) * k, .26, 1.5), az, el, side }; };
    poses = { asm: pose(bAssembled, 32, 17, 2.7), exp: pose(bExploded, 38, 14, 2.6), parts: PARTS.map(p => {
      const re = p.re || [], names = [...new Set([...p.groups, ...re])];
      all.forEach(n => G[n].pivot.position.copy(G[n].off).multiplyScalar(1)); names.forEach(n => G[n].pivot.position.copy(G[n].off).multiplyScalar(re.includes(n) ? 0 : 1));
      scene.updateMatrixWorld(true); const b = new THREE.Box3(); names.forEach(n => b.union(new THREE.Box3().setFromObject(G[n].pivot)));
      if (names.includes('pillar')) b.max.y = Math.min(b.max.y, G.pillar.off.y + .17);   // 기둥은 천장까지 280mm 로 길어서, 소개할 때는 아랫부분만 잡는다
      const o = pose(b, p.az, p.el, p.k, 'left'); o.b = p.b; return o;
    }) };
    all.forEach(n => G[n].pivot.position.set(0, 0, 0));
    // 스캔 범위 : 닫힌 외장의 위 끝 → 아래 끝(조명 · 프로젝터까지)
    pillarTop = new THREE.Box3().setFromObject(G.pillar.pivot).max.y; scanBot = bAssembled.min.y - .004;   // 렌즈 아래까지
    look.apply(); ready = true; fitScanTop();
  };
  let scanTop = .06, scanBot = -.07, pillarTop = .28;
  /* 스캔은 도입 화면의 맨 위(잘린 기둥의 보이는 끝)에서 시작한다 : 그 높이를 카메라로 거꾸로 찾는다 */
  const fitScanTop = () => {
    if (!ready) return;
    place(heroPose()); camera.updateMatrixWorld(true);
    let lo = -.2, hi = .6; for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (new THREE.Vector3(0, m, 0).project(camera).y > 1) hi = m; else lo = m; }
    scanTop = Math.min(pillarTop, lo + .004);
  };

  /* ── 로드 : 장면에 가까워지면 (약 7화면 전) 미리 받는다 ── */
  const draco = new DRACOLoader(); draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
  const load = () => { if (loading) return; loading = true; const l = new GLTFLoader(); l.setDRACOLoader(draco); l.load('assets/lieu-anatomy.glb?v=1', build, undefined, e => { console.warn('anatomy glb', e); }); };

  /* ── 도입 사진 : 사진(정면을 보는 제품)에서 같은 구도의 3D 로 이어진다. 파일이 없으면 3D 만으로 시작한다 ── */
  const heroImg = null, heroOk = false;   // 도입은 사진이 아니라 GLB 의 검은 실루엣. heroRect 는 구도(비율)를 계산하는 용도로만 쓴다
  const bgEl = document.getElementById('anatBg'), gr = bgEl && bgEl.querySelector('.an-gr');
  const grain = gr ? createGrainient(gr, { colors: ['#161616', '#444444', '#8a8a8a', '#d6d6d6'], angle: 55, flow: .6, silk: .3, grainAmount: .012, grainSize: 1, speed: 1, contrast: 1.05, interactive: true, stir: 1, clickSwirl: true, intro: false }) : null;   // 배경 : 흐르는 실크 그라데이션 + 그레인 (포인터로 휘저을 수 있다)
  const heroRect = () => {   // 사진을 화면에 contain 으로 앉힌 사각형
    const iw = heroOk ? heroImg.naturalWidth : 1410, ih = heroOk ? heroImg.naturalHeight : 2000;
    if (mob) { const sc = Math.min(vw / iw, vh / ih), w = iw * sc, h = ih * sc; return { x: (vw - w) / 2, y: (vh - h) / 2, w, h }; }   // 모바일 : 사진 전체가 화면에 들어온다
    const w = vw * HERO.widthFrac, h = w * ih / iw;   // 데스크톱 : 도넛이 화면 폭의 약 69%. 렌즈 끝이 화면 아래쪽(92.8%)에 오고, 기둥은 위가 잘린다
    return { x: (vw - w) / 2, y: vh * HERO.lensAt - HERO.lensFrac * h, w, h };
  };
  const HERO = { az: -12, el: -6, donutW: .26, donutY: .742, cy: .01, widthFrac: .51, lensAt: .8, lensFrac: .9385, zoom0: .4 };   // 도착 : 도넛 폭 약 50% · 렌즈 끝 80%. 시작(zoom0) : 도착의 40% 크기 (도넛 폭 약 20%)   // zoom0 : 처음 크기(멀리 있을 때)   // 사진 속 도넛 : 사진 폭을 꽉 채우고, 높이의 72% 지점에 있다. 아래에서 올려다본 각도
  const heroPose = (k = 1) => {   // k : 사진이 천장(화면 맨 위)을 기준으로 줄어든 정도. 3D 카메라도 같은 줌을 따라가 사진과 어긋나지 않는다
    const r = heroRect(), viewH = HERO.donutW * vh / (r.w * .98) / k, dist = viewH / (2 * Math.tan(THREE.MathUtils.degToRad(15)));
    return { c: new THREE.Vector3(0, HERO.cy, 0), dist, az: HERO.az, el: HERO.el, side: 'left', shift: 0, shiftY: (k * (r.y + HERO.donutY * r.h) / vh - .5) * viewH };
  };
  let fillK = 0, spT = 0;   // spT : 엑스레이 · 라이트 모드 전환 (한 번에 스냅된다)
     // 틀이 화면을 채운 정도 (0 ~ 1)
  const zoomK = () => lerp(HERO.zoom0, 1, sm(seg(fillK, .5, 1)));   // 틀이 커지는 만큼 제품도 자연스럽게 커진다

  /* ── 글 : 지금 부품 하나만, 오른쪽에 번호 · 제목 · 한두 줄 ── */
  const cap = ui.querySelector('.an-cap'), box = ui.querySelector('.an-box'), nEl = ui.querySelector('.an-n'), hEl = ui.querySelector('.an-h'), pEl = ui.querySelector('.an-p');
  let shownPart = -1, shownLang = '';
  const setCopy = (i, L) => { const c = COPY[L][PARTS[i].id]; nEl.textContent = `${String(i + 1).padStart(2, '0')} / ${String(PARTS.length).padStart(2, '0')}`; hEl.textContent = c[0]; pEl.textContent = c[1]; shownPart = i; shownLang = L; };

  /* ── 크기 ── */
  let vw = 0, vh = 0, mob = false, mg = 24;
  const resize = () => { vw = innerWidth; vh = innerHeight; mob = vw < 640; mg = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--margin')) || 24; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(vw, vh, false); look.resize(vw, vh, Math.min(devicePixelRatio || 1, 2)); camera.aspect = vw / vh; camera.updateProjectionMatrix(); };
  addEventListener('resize', () => { resize(); fitScanTop(); }); resize();

  /* ── 카메라 ── */
  const angLerp = (a, b, t) => a + (((b - a + 540) % 360) - 180) * t;
  const mixPose = (A, B, t) => ({ c: A.c.clone().lerp(B.c, t), dist: lerp(A.dist, B.dist, t), az: angLerp(A.az, B.az, t), el: lerp(A.el, B.el, t), side: t < .5 ? A.side : B.side, shift: lerp(A.shift || 0, B.shift || 0, t), shiftY: lerp(A.shiftY || 0, B.shiftY || 0, t), ms: lerp(A.ms || 0, B.ms || 0, t) });
  const place = P => {
    const az = THREE.MathUtils.degToRad(P.az), el = THREE.MathUtils.degToRad(P.el);
    const dir = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
    const fwd = dir.clone().negate(), right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    const s = (P.shift || 0) * P.dist * .2, t = P.c.clone();
    if (mob) t.addScaledVector(up, -(P.ms || 0) * P.dist * .075); else t.addScaledVector(right, -s);   // 모바일 : 글이 아래에 오므로 부품은 늘 위쪽에 앉는다
    if (P.shiftY) t.addScaledVector(up, P.shiftY);   // 도입 구도 : 도넛이 화면 중앙보다 아래에 앉는다   // 글이 왼쪽이면 부품은 오른쪽으로 (shift +1), 글이 오른쪽이면 부품은 왼쪽으로 (shift -1)
    camera.position.copy(t).addScaledVector(dir, P.dist * (camera.aspect < 1 ? Math.max(1, .75 / camera.aspect) : 1)); camera.lookAt(t);   // 세로 화면은 폭에 맞춰 멀리서 본다
  };

  /* ── 프레임 ── */
  let tS = -9, last = performance.now(), activeNow = false;
  const frame = now => {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (innerWidth !== vw || innerHeight !== vh) { resize(); fitScanTop(); }   // 창 크기가 바뀌었는데 resize 이벤트가 오지 않는 경우도 따라간다
    const ev = window.__endVid, bn = window.Bento;   // 그리드가 끝나는 지점에서 장면의 기준점을 잡는다 : 끝 장면 영상 자리 + HOLD + 여유
    if (ev) AN = (bn ? bn.SCROLL0 : 46.6) + (ev.y + ev.h + innerHeight * .1) / innerHeight + (bn ? bn.HOLD : 10) + .6;
    const y = scrollY / (innerHeight || 1), t = typeof window.__anatTS === 'number' ? window.__anatTS : y - AN;   // __anatTS : 디버그용으로 장면 진행값을 고정한다
    if ((y > AN - 8 || typeof window.__anatTS === 'number') && !loading) load();
    const on = t > -3.6 && ready;   // 끝 장면의 영상 자리가 올라가기 시작할 때부터 렌더 이미지 틀이 아래에서 올라온다
    if (on !== activeNow) { activeNow = on; cv.style.visibility = ui.style.visibility = on ? 'visible' : 'hidden'; if (!on && bgEl) { bgEl.style.visibility = 'hidden'; if (grain) grain.setVisible(false); } }
    if (!on) return;
    tS = tS < -8 ? t : tS + (t - tS) * (1 - Math.exp(-dt * 9));   // 스크롤이 급해도 한 박자 부드럽게 따라간다
    const ts = tS, bf = window.__bentoFrame;   // bf : 그리드의 마지막 칸(실루엣 틀)의 위치와 크기
    fillK = bf ? clamp(bf.w * bf.h / (vw * vh)) : 0;
    spT += ((ts > TL.scan[0] ? 1 : 0) - spT) * (1 - Math.exp(-dt * 34));   // 틀이 꽉 차는 순간 스캔선이 훑는 대신 배경이 라이트로 바뀌며 곧바로 엑스레이가 된다 (약 0.1초)
    const N = PARTS.length, ap = 1, sp = spT, ex = eio(seg(ts, TL.explode[0], TL.explode[1]));
    const p = (ts - TL.parts) / TL.len - .5;   // 부품 i 의 한가운데가 p = i
    const fm = sm(seg(p, -.75, -.25)) * (1 - sm(seg(p, N - 1 + .2, N - 1 + .8)));   // 집중 모드 (나머지 부품이 흐려지는 정도)
    cv.style.opacity = '1';   // 스캔선 위쪽만 그려지므로 스캔 전에는 아무것도 보이지 않는다

    // 스캔선
    const scanning = false;
    uScan.value = sp < .5 ? 1 : -1;   // 스캔선은 훑지 않는다 : 닫힌 실루엣이거나, 엑스레이가 통째로 드러나 있거나
    scanPlane.constant = uScan.value;
    scanDisc.visible = scanRing.visible = scanning && SCAN_GLOW; scanDisc.position.y = scanRing.position.y = uScan.value;

    // 부품별 가중치 · 위치 · 재질
    const sMix = SOLID ? sm(seg(ts, TL.explode[0] - .2, TL.explode[0] + 1.0)) : 0;   // 엑스레이 구조 → 솔리드 : 분해가 시작될 때 바뀐다
    const gw = {}, rw = {}; Object.keys(G).forEach(n => { gw[n] = 0; rw[n] = 0; });
    PARTS.forEach((pt, i) => {
      const w = 1 - sm(seg(Math.abs(p - i), .25, .6)), wr = 1 - sm(seg(Math.abs(p - i), .15, .5));
      pt.groups.forEach(n => { gw[n] = Math.max(gw[n], w); }); Object.entries(pt.assist || {}).forEach(([n, v]) => { gw[n] = Math.max(gw[n], w * v); });
      (pt.re || []).forEach(n => { rw[n] = Math.max(rw[n], wr); });   // 이 장면에서 제자리로 돌아와 맞물리는 정도
    });
    // 회전 : 링이 ±30° 로 왔다 갔다 하고, 피니언은 기어비만큼 더 많이 돌아 그 움직임을 만든다 (원인 → 결과). 눈이 정면을 볼 때(p = 4) 가운데에서 좌우로 훑는다
    const amp = 30 * sm(seg(p, -.6, -.2)) * (1 - sm(seg(p, 5.0, 5.5))), thd = amp * Math.sin(2.2 * (p - 4)), th = THREE.MathUtils.degToRad(thd), pin = -thd * MOCK_NR / MOCK_NP, Y = new THREE.Vector3(0, 1, 0);
    // 도입 : 스크롤을 내리면 도넛 부분만(기둥 · 빛 · 투사는 그대로) 위아래 축으로 두 바퀴 빙글 돈다. 끝에서 처음 각도와 같아져 엑스레이 구도와 맞는다
    const dTilt = THREE.MathUtils.degToRad(11 * Math.sin(Math.PI * sm(seg(ts, -3, .45)))), dSpin = THREE.MathUtils.degToRad(720 * sm(seg(ts, -3, .45))),   // 돌면서 살짝 기울어지는 세차 운동(시작과 끝은 0) : 검은 실루엣의 외곽선이 변해서 도는 것이 보인다
      DONUT = new Set(['shellTop', 'shellLow', 'ring', 'eyes', 'bearing', 'drive']);
    for (const [n, g] of Object.entries(G)) {
      const ee = ex * (1 - rw[n]), turns = n === 'ring' || n === 'shellLow' || n === 'eyes';
      g.pivot.position.copy(g.off).multiplyScalar(ee); if (turns) g.pivot.position.applyAxisAngle(Y, th); g.pivot.rotation.y = (turns ? th : 0) + (DONUT.has(n) ? dSpin : 0); g.pivot.rotation.z = DONUT.has(n) ? dTilt : 0;
      const op = lerp(1, lerp(.42, 1, gw[n]), fm), emph = fm * gw[n];
      if (n === 'pillar') { const pk = sm(seg(ts, TL.rot[0] + .4, TL.rot[1] + .6)); g.ghost.uniforms.uF0.value = lerp(lerp(.32, .05, pk), .2, emph); g.ghost.uniforms.uF1.value = lerp(lerp(.42, .13, pk), .3, emph);   // 도입에서는 기둥이 끝까지 보이고, 돌아온 뒤 위로 갈수록 사라진다
       pillarFade.f0.value = g.ghost.uniforms.uF0.value; pillarFade.f1.value = g.ghost.uniforms.uF1.value; }   // 기둥을 소개할 때는 더 위까지 보인다
      const so = sMix * lerp(1, lerp(.5, 1, gw[n]), fm), dk = fm * (1 - gw[n]) * .45;   // 흐려진 부품도 흰 바탕에서 보이도록 투명도를 높이고 살짝 어둡게 물들인다   // 솔리드 투명도 : 지금 부품이 아니면 흐려진다
      const focus = gw[n] > .5 || fm < .05;   // 지금 부품 : 가장 나중에 그려서 흐린 부품들에 가려지지 않는다
      g.solidMats.forEach(mm => { if (mm.color) { (mm.userData.c0 ||= mm.color.clone()); mm.color.copy(mm.userData.c0).lerp(DIMC, dk); } mm.opacity = so; mm.transparent = true; mm.depthWrite = focus; }); g.solidMeshes.forEach(mm => { mm.visible = so > .01; mm.renderOrder = focus ? 10 : 1; });
      g.ghost.uniforms.uOpacity.value = op * ap * (1 - sMix) * sm(seg(sp, .4, 1)); g.ghost.uniforms.uEmph.value = emph; g.ghost.uniforms.uCol.value.copy(SLATE).lerp(ACCENT, Math.min(1, emph * 1.15));
      g.solids.forEach(m => { m.opacity = op * ap; });
    }
    if (G.drive.pinion) G.drive.pinion.rotation.y = THREE.MathUtils.degToRad(pin);

    // 카메라 : 닫힌 모습 → 분해 전체 → 부품 → 전체
    let P;
    const tUrn = sm(seg(ts, 0, TL.explode[1]));
    const asm = { ...poses.asm, az: angLerp(32, 78, sm(seg(ts, TL.rot[1], TL.explode[0]))) };   // 닫힌 모습은 천천히 돌려 보여준다
    P = ts < TL.rot[1] ? mixPose(heroPose(zoomK()), { ...poses.asm, az: 32 }, eio(seg(ts, TL.rot[0], TL.rot[1]))) : mixPose(asm, poses.exp, eio(seg(ts, TL.explode[0], TL.explode[1])));
    if (ts > TL.explode[0]) P.az = angLerp(78, poses.exp.az, eio(seg(ts, TL.explode[0], TL.explode[1])));
    if (p > -.5) {
      const idx = clamp(Math.floor(p), -1, N), fr = p - Math.floor(p), bt = sm(seg(fr, .25, .75));
      const from = idx < 0 ? poses.exp : idx >= N ? poses.exp : poses.parts[idx], to = idx + 1 >= N ? poses.exp : poses.parts[idx + 1];
      const pe = q => ({ ...q, shift: -(q.b || 1), ms: 1 });   // 부품 자세 : 왼쪽으로 밀려서 가장자리에서 잘린다
      const a0 = idx < 0 ? { ...poses.exp, shift: 0 } : pe(from);
      const a1 = idx + 1 >= N ? { ...poses.exp, shift: 0 } : pe(to);
      if (idx < 0) P = mixPose({ ...poses.exp, shift: 0 }, { ...a1, ms: 1 }, sm(seg(p, -.5, 0)));
      else if (p > N - 1 + .25) P = mixPose(pe(poses.parts[N - 1]), { ...poses.exp, shift: 0 }, sm(seg(p, N - 1 + .25, N - 1 + .9)));
      else P = mixPose(a0, a1, bt);
      if (p > -.4 && p < N - .6) P.az += (p - Math.round(p)) * 22;   // 머무는 동안에도 천천히 돌아간다
    }
    place(P);
    camera.updateMatrixWorld(true);
    // 실루엣 틀 : 그리드의 마지막 칸이다. 배경과 제품은 이 칸 안에만 그려지고, 칸이 화면 전체로 커지면 그대로 꽉 찬다
    const fx = bf ? bf.x : 0, fy = bf ? bf.y : 0, fw = bf ? bf.w : 0, fh = bf ? bf.h : 0, full = !!bf && fw >= vw - 1 && fh >= vh - 1;
    const clip = !bf ? 'inset(100% 0 0 0)' : full ? 'none' : `inset(${fy.toFixed(1)}px ${(vw - fx - fw).toFixed(1)}px ${(vh - fy - fh).toFixed(1)}px ${fx.toFixed(1)}px)`;
    // 제품은 칸의 윗면(천장)에 매달려 칸의 가운데에서 따라간다 (칸이 화면을 채우면 0)
    if (bf && !full) camera.setViewOffset(vw, vh, -(fx + fw / 2 - vw / 2), -fy, vw, vh); else camera.clearViewOffset();
    const sil = sp < .5 && sMix < .01;
    if (sil !== silOn) { silOn = sil; silMeshes.forEach(m => { m.visible = sil; }); }
    cv.style.clipPath = clip; cv.style.filter = 'none';   // 실루엣 둘레의 부드러운 글로우 (스캔이 시작되면 끈다)
    if (bgEl) { const go = 1 - sm(seg(sp, .4, 1)); if (grain) grain.setVisible(go > .003); gr.style.opacity = go.toFixed(3); bgEl.style.clipPath = clip; bgEl.style.visibility = go > .003 ? 'visible' : 'hidden'; }   // 파란 그라데이션은 스캔이 시작되면 흰색으로 풀린다   // 엑스레이가 시작되면 파란 바탕이 곧바로(딱) 빠지고 흰 라이트 모드가 된다
    let hid = [];   // AO 계산에서 뺄 것 : 흐려진(비선택) 부품은 부모(고스트 메시)째로 숨긴다
    look.render(sMix, {
      hide() { hid = []; for (const g of Object.values(G)) g.solidMeshes.forEach(sol => { const o = sol.parent; hid.push([o, o.visible]); if (!sol.visible || sol.material.opacity < .6) o.visible = false; }); },
      show() { hid.forEach(([o, v]) => { o.visible = v; }); hid = []; }
    });

    // 글 · 캡션
    const L = lang();
    const ci = ts < TL.scan[0] ? -1 : ts < TL.scan[1] ? 0 : ts < TL.explode[0] ? 1 : ts < TL.parts - .4 ? 2 : -1;
    const capA = ci < 0 ? 0 : Math.min(seg(ts, TL.scan[0] - .2, TL.scan[0] + .2), 1 - seg(ts, TL.parts - .7, TL.parts - .4));
    cap.style.opacity = capA.toFixed(3);
    if (ci >= 0) cap.innerHTML = `<span>${CAP[L === 'ko' ? 'ko' : 'en'][ci]}</span>${ci === 0 ? `<b>${Math.round(sp * 100)}%</b>` : ''}`;
    const i = clamp(Math.round(p), 0, N - 1), a = p < -.6 || p > N - .4 ? 0 : 1 - sm(seg(Math.abs(p - i), .22, .48));   // a : 지금 부품이 또렷한 정도
    if (a > 0 && (i !== shownPart || L !== shownLang)) setCopy(i, L);
    box.style.opacity = a.toFixed(3); box.style.transform = `translateY(calc(-50% + ${((1 - a) * 22).toFixed(1)}px))`; box.style.filter = a < 1 ? `blur(${((1 - a) * 6).toFixed(1)}px)` : 'none';
  };
  requestAnimationFrame(frame);
  window.Anatomy = { get AN() { return AN; }, TL, HERO, look, get ready() { return ready; } };
}
