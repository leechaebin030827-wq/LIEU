/* LIEU · 해부 장면의 렌더 품질 (Premium Industrial Design Product Rendering)
   anatomy-scene.js 의 형상 · 계층 · 위치 · 분해 애니메이션 · 카메라는 건드리지 않고, 조명 · 환경 · 재질 값 · 톤매핑 · AO · 디버그 패널만 맡는다.

   현재 구조 분석 (개선 전)
   - three r160 (importmap) · WebGLRenderer(alpha, antialias) · 후처리 없음 · outputColorSpace = sRGB (기본) · ColorManagement 켜짐 · 톤매핑 없음
   - 조명 : RoomEnvironment(IBL) + HemisphereLight + DirectionalLight 가 겹쳐 있었다 (IBL 과 반구광이 같은 역할을 중복)
   - 재질 : GLB 는 회색 한 장짜리 재질 4개(텍스처 0개) → 부품별 재질을 이름으로 따로 준다. 외장에 라벤더 틴트가 있어 전체가 푸르게 보였다
   - 엑스레이 고스트(ShaderMaterial)는 톤매핑 대상이 아니다 (후처리의 OutputPass 를 거치면 아주 약간 달라질 수 있다)

   개선 후 (mode = 'after')
   - 환경 : 소프트박스(키 · 필 · 상단 림 · 뒷면) + 바닥 반사판으로 만든 스튜디오 IBL (HDRI 파일 대신 코드로 생성, 회전 · 강도 조절)
   - 조명 : IBL 중심. 키 · 필 디렉셔널은 약하게만. 반구광 제거
   - 톤매핑 : ACESFilmic 노출 1.1 기본 (AgX · Linear 등으로 바꿔 비교 가능, r160 에는 Neutral 이 없다). 노출 조절. 후처리를 쓸 때는 OutputPass 가 한 번만 적용한다
   - AO : GTAO (후처리, MSAA 4x 렌더 타깃) — 분해 이후 솔리드 구간에서만, 흐려진(비선택) 부품은 AO 계산에서 뺀다
   - 재질 : 화이트 바디(뉴트럴 새틴) · 플라스틱 · 금속 · 다크 기계 부품을 이름 기반으로 구분
   - 디버그 패널 : ?gui 를 붙이거나 G 키 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const LS_KEY = 'lieu-anatomy-look-v2';
export const DEFAULTS = {
  mode: 'after', envIntensity: 1.0, envRotation: 30, exposure: 1.1, toneMapping: 'ACESFilmic',
  keyIntensity: .8, fillIntensity: .3, roughnessScale: 1, metalnessScale: 1, aoStrength: .8, aoRadius: .03, bodyColor: '#E8E8E8'
};
const TONE = { None: THREE.NoToneMapping, Linear: THREE.LinearToneMapping, Reinhard: THREE.ReinhardToneMapping, Cineon: THREE.CineonToneMapping, ACESFilmic: THREE.ACESFilmicToneMapping, AgX: THREE.AgXToneMapping };

export function createLook(renderer, scene, camera) {
  const params = { ...DEFAULTS };
  try { Object.assign(params, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch (e) { /* 저장값이 없거나 깨졌으면 기본값 */ }
  if (!(params.toneMapping in TONE)) params.toneMapping = DEFAULTS.toneMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);

  /* ── 환경 : 이전(RoomEnvironment) · 새 스튜디오 ── */
  const roomEnv = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  let studioEnv = null;
  const makeStudio = deg => {
    const sc = new THREE.Scene(), root = new THREE.Group(); root.rotation.y = THREE.MathUtils.degToRad(deg); sc.add(root);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, toneMapped: false })), pos = dome.geometry.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const t = (pos.getY(i) / 40 + 1) / 2, v = THREE.MathUtils.lerp(.035, .3, t * t * (3 - 2 * t)); col.set([v, v, v], i * 3); }   // 아래는 어둡고 위로 갈수록 밝은 뉴트럴 그라데이션
    dome.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3)); root.add(dome);
    const box = (w, h, x, y, z, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(k), side: THREE.DoubleSide, toneMapped: false })); m.position.set(x, y, z); m.lookAt(0, 0, 0); root.add(m); };
    box(9, 6, -7, 8, 7, 9);        // 키 : 왼쪽 위 앞의 넓은 소프트박스
    box(7, 7, 9, 3, 5, 2.4);       // 필 : 오른쪽
    box(14, 2.5, 0, 9, -6, 7);     // 림 : 위쪽 뒤의 긴 스트립
    box(8, 5, 0, 3, -11, 1.4);     // 뒷면
    box(30, 30, 0, -6, 0, .55);     // 바닥 반사판 : 아랫면에 부드러운 바운스
    return pmrem.fromScene(sc, .03).texture;
  };
  const rebuildStudio = () => { const old = studioEnv; studioEnv = makeStudio(params.envRotation); if (old) old.dispose(); };
  rebuildStudio();

  /* ── 조명 : 이전(반구광 + 태양) · 새(키 + 필) ── */
  const hemi = new THREE.HemisphereLight(0xffffff, 0xb4b4b4, .45), sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(.7, 1, .9);
  const key = new THREE.DirectionalLight(0xffffff, params.keyIntensity); key.position.set(-.6, 1, .8);
  const fill = new THREE.DirectionalLight(0xffffff, params.fillIntensity); fill.position.set(.9, .3, .4);
  scene.add(hemi, sun, key, fill);

  /* ── 재질 규칙 (이름 기반) ── */
  const mats = [];   // after 재질 (조절 대상)
  const reg = (m, r, mt) => { m.userData.base = { r: r ?? m.roughness, m: mt ?? m.metalness }; mats.push(m); return m; };
  const phys = o => new THREE.MeshPhysicalMaterial(o);
  const AFTER = {};
  const afterFor = (g, o, hooks = {}) => {
    const chain = []; for (let q = o; q && q !== g.pivot; q = q.parent) chain.push(q.name); const c = chain.join('|'), has = (...k) => k.some(x => c.includes(x));
    let key2, make;
    const body = () => reg(phys({ color: params.bodyColor, roughness: .44, metalness: 0, specularIntensity: .55, side: THREE.DoubleSide }));   // 뉴트럴 화이트 새틴 : 푸르지도 따뜻하지도 않다
    const plastic = (c, r = .5) => () => reg(phys({ color: c, roughness: r, metalness: 0, specularIntensity: .5 }));
    const metal = (c, r, m = 1) => () => reg(phys({ color: c, roughness: r, metalness: m }));
    if (g.name === 'shellTop' || g.name === 'shellLow') { key2 = 'body'; make = body; }
    else if (g.name === 'eyes') { key2 = 'body'; make = body; }
    else if (g.name === 'pillar') {
      if (has('기둥')) { key2 = 'pillar'; make = () => { const m = reg(phys({ color: '#DDDDDD', roughness: .36, metalness: .55, transparent: true })); hooks.addFade && hooks.addFade(m); return m; }; }
      else if (has('샤프트', '브라켓')) { key2 = 'steel'; make = metal('#CACACA', .3); }
      else { key2 = 'dark'; make = metal('#575757', .5, .2); }   // 다크 기계 부품 : 검게 뭉개지지 않게 밝기를 올려 구조가 보이게
    }
    else if (g.name === 'light') { if (has('LED_부착부')) { key2 = 'flange'; make = metal('#D5D5D5', .3, .9); } else { key2 = 'cup'; make = metal('#C3C3C3', .36, .9); } }
    else if (g.name === 'projector') { key2 = 'proj'; make = metal('#515151', .42, .35); }
    else if (g.name === 'drive') { if (has('베어링_기어', 'HORN', 'PHS', 'BTS2', 'IDLE')) { key2 = 'steel'; make = metal('#CACACA', .3); } else { key2 = 'dark'; make = metal('#575757', .5, .2); } }
    else if (g.name === 'ring') { key2 = 'ring'; make = plastic('#E2E2E2', .5); }
    else if (g.name === 'bearing') { if (has('베어링_중부')) { key2 = 'cage'; make = plastic('#C8C8C8', .55); } else { key2 = 'bearing'; make = plastic('#E0E0E0', .52); } }
    else { key2 = 'other'; make = plastic('#CFCFCF'); }
    const kk = g.name + ':' + key2;   // 투명도를 부품(묶음)마다 다르게 쓰므로 재질은 묶음별
    return AFTER[kk] || (AFTER[kk] = make());
  };
  const bodyMats = () => Object.keys(AFTER).filter(k => k.endsWith(':body')).map(k => AFTER[k]);

  /* ── 적용 ── */
  const listeners = [];
  const apply = () => {
    const after = params.mode === 'after';
    renderer.toneMapping = after ? TONE[params.toneMapping] : THREE.NoToneMapping;
    renderer.toneMappingExposure = after ? params.exposure : 1;
    scene.environment = after ? studioEnv : roomEnv;
    hemi.visible = sun.visible = !after; key.visible = fill.visible = after;
    key.intensity = params.keyIntensity; fill.intensity = params.fillIntensity;
    mats.forEach(m => { m.envMapIntensity = params.envIntensity; m.roughness = THREE.MathUtils.clamp(m.userData.base.r * params.roughnessScale, .03, 1); m.metalness = THREE.MathUtils.clamp(m.userData.base.m * params.metalnessScale, 0, 1); });
    bodyMats().forEach(m => m.color.set(params.bodyColor));
    listeners.forEach(f => f(params.mode));
  };

  /* ── 후처리 : 분해 이후 솔리드 구간에서만 (GTAO AO + OutputPass 가 톤매핑 · sRGB 를 한 번만 적용) ── */
  let composer = null, gtao = null, composerLoading = false, W = 1, H = 1, DPR = 1, hooks = { hide() {}, show() {} };
  const buildComposer = async () => {
    if (composer || composerLoading) return; composerLoading = true;
    try {
      const [{ EffectComposer }, { RenderPass }, { GTAOPass }, { OutputPass }] = await Promise.all([import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'), import('three/addons/postprocessing/GTAOPass.js'), import('three/addons/postprocessing/OutputPass.js')]);
      const rt = new THREE.WebGLRenderTarget(W * DPR, H * DPR, { type: THREE.HalfFloatType, samples: 4 });   // MSAA : 가장자리 안티앨리어싱
      composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(W * DPR, H * DPR);
      composer.addPass(new RenderPass(scene, camera));
      gtao = new GTAOPass(scene, camera, W * DPR, H * DPR); gtao.output = GTAOPass.OUTPUT.Default;
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 16 });
      const orig = gtao.render.bind(gtao); gtao.render = (...a) => { hooks.hide(); orig(...a); hooks.show(); };   // 흐린 부품 · 엑스레이 고스트는 AO 계산에서 뺀다
      composer.addPass(gtao); composer.addPass(new OutputPass());
    } catch (e) { console.warn('anatomy-look: 후처리를 불러오지 못해 AO 없이 그립니다', e); composer = null; }
  };
  const render = (sMix, h) => {
    hooks = h || hooks;
    const ao = params.mode === 'after' && params.aoStrength > .01 && sMix > .02;
    if (ao && !composer) buildComposer();
    if (!ao || !composer) { renderer.render(scene, camera); return; }
    gtao.blendIntensity = params.aoStrength * Math.min(1, sMix);
    gtao.updateGtaoMaterial({ radius: params.aoRadius, distanceExponent: 1, thickness: 1, scale: 1, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
    composer.render();
  };
  const resize = (w, h, dpr) => { W = w; H = h; DPR = dpr; if (composer) { composer.setSize(w * dpr, h * dpr); gtao.setSize(w * dpr, h * dpr); } };

  /* ── 디버그 GUI ── */
  let gui = null;
  const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(params)); } catch (e) { /* 저장 불가 환경 */ } };
  const showGui = async on => {
    if (!on) { if (gui) gui.hide(); return; }
    if (gui) { gui.show(); return; }
    const { default: GUI } = await import('three/addons/libs/lil-gui.module.min.js');
    gui = new GUI({ title: 'LIEU Render Debug' });
    const ch = () => { apply(); save(); };
    gui.add(params, 'mode', { 'After (new)': 'after', 'Before (old)': 'before' }).name('Before / After').onChange(ch);
    const env = gui.addFolder('Environment');
    env.add(params, 'envIntensity', 0, 3, .01).name('HDRI intensity').onChange(ch);
    env.add(params, 'envRotation', 0, 360, 1).name('HDRI rotation').onFinishChange(() => { rebuildStudio(); ch(); }).onChange(() => { /* 드래그 중에는 부담이 커서 놓을 때 다시 만든다 */ });
    const tone = gui.addFolder('Tone / Exposure');
    tone.add(params, 'toneMapping', Object.keys(TONE)).name('Tone mapping').onChange(ch);
    tone.add(params, 'exposure', .2, 2.5, .01).name('Exposure').onChange(ch);
    const lights = gui.addFolder('Lights');
    lights.add(params, 'keyIntensity', 0, 3, .01).name('Key light').onChange(ch);
    lights.add(params, 'fillIntensity', 0, 3, .01).name('Fill light').onChange(ch);
    const mat = gui.addFolder('Materials');
    mat.add(params, 'roughnessScale', .3, 2, .01).name('Roughness x').onChange(ch);
    mat.add(params, 'metalnessScale', 0, 1.5, .01).name('Metalness x').onChange(ch);
    mat.addColor(params, 'bodyColor').name('Body color').onChange(ch);
    const ao = gui.addFolder('Ambient Occlusion');
    ao.add(params, 'aoStrength', 0, 1.5, .01).name('AO strength').onChange(save);
    ao.add(params, 'aoRadius', .005, .12, .001).name('AO radius').onChange(save);
    const io = { 'Copy JSON': () => { const t = JSON.stringify(params, null, 2); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(() => window.prompt('JSON', t)); },
      'Save JSON file': () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(params, null, 2)], { type: 'application/json' })); a.download = 'lieu-render-settings.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); },
      'Paste JSON': () => { const t = window.prompt('JSON 설정값을 붙여 넣으세요'); if (!t) return; try { Object.assign(params, JSON.parse(t)); rebuildStudio(); gui.controllersRecursive().forEach(c => c.updateDisplay()); ch(); } catch (e) { alert('JSON 을 읽지 못했습니다'); } },
      'Reset': () => { Object.assign(params, DEFAULTS); rebuildStudio(); gui.controllersRecursive().forEach(c => c.updateDisplay()); ch(); } };
    Object.keys(io).forEach(k => gui.add(io, k));
  };
  addEventListener('keydown', e => { if (e.key === 'g' || e.key === 'G') { if (/input|textarea|select/i.test((e.target && e.target.tagName) || '')) return; showGui(!(gui && !gui._hidden)); } });
  if (/[?&]gui\b/.test(location.search)) showGui(true);

  return { params, afterFor, apply, render, resize, onMode: f => listeners.push(f), showGui };
}
