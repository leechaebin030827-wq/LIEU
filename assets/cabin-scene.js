/* LIEU · 끝 장면의 16:9 칸 : 차 안쪽 3D
   첫 장면의 실루엣과 같은 표현 : 흐르는 그라데이션 바탕(Grainient) 위에 완전한 검정 실루엣.
   칸이 화면에 보일 때만 그리고, 천천히 돌면서 마우스를 따라 살짝 기운다. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { addScenarioActors } from './scenario-actors.js?v=8';
import { loadSourceRobot } from './scenario-robot.js?v=4';
import { createGrainient } from './grainient.js?v=1';

export function createCabinScene(slot, { editable = true, interaction = false, progress = () => 0, director = null } = {}) {
if (!slot) return;
  slot.style.background = '#161616'; slot.style.overflow = 'hidden';
  const gr = document.createElement('div'); gr.style.cssText = 'position:absolute;inset:0'; slot.appendChild(gr);
  const grain = createGrainient(gr, { colors: ['#161616', '#444444', '#8a8a8a', '#d6d6d6'], angle: 55, flow: .6, silk: .3, grainAmount: .012, grainSize: 1, speed: 1, contrast: 1.05, interactive: true, stir: 1, clickSwirl: true, intro: false });
  const cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none'; slot.appendChild(cv);
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(26, 16 / 9, .02, 20), pivot = new THREE.Group(); scene.add(pivot);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = 1;
  const key = new THREE.DirectionalLight(0xffffff, .8); key.position.set(-.6, 1, .8); scene.add(key);
  const sil = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, toneMapped: false });   // 완전한 검정 실루엣 (조명 없음)
  const draco = new DRACOLoader(); draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
  let ready = false, actors = null, robot = null, signals = null, cabinCenter = new THREE.Vector3();
  new GLTFLoader().setDRACOLoader(draco).load('assets/cabin.glb?v=4', g => {
    g.scene.traverse(o => { if (o.isMesh) o.material = sil; });
    const box = new THREE.Box3().setFromObject(g.scene), c = box.getCenter(new THREE.Vector3());
    g.scene.position.sub(c); pivot.add(g.scene); cabinCenter.copy(c);
    if (interaction) {
      const dev = g.scene.getObjectByName('dev');
      if(dev) dev.removeFromParent();
      loadSourceRobot(pivot,c,sil).then(value=>{robot=value;}).catch(error=>console.error('LIEU source model',error));
      const people = new THREE.Group(); people.position.copy(g.scene.position);pivot.add(people);
      actors = addScenarioActors(people, sil);
      if(director) signals=director.createSignals(pivot,c);
    }
    ready = true;
  });
  /* ── 구도 : V 키로 편집 모드. 드래그 = 회전, Shift + 드래그 = 이동, 휠 또는 + - = 확대, Enter = 저장, R = 처음으로, Esc = 취소.
        저장한 구도는 이 브라우저에 남고, 그 구도 둘레에서 아주 천천히 숨 쉬듯 움직인다 ── */
  const LS = 'lieu-cabin-cam', DEF = { az: 1.15, el: .3, d: 1.3, px: 0, py: 0 };
  let cam = { ...DEF }; try { Object.assign(cam, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) { /* 저장값 없음 */ }
  let edit = false, backup = null; const pose = { ...cam };
  const hud = document.createElement('div'); hud.style.cssText = 'position:absolute;left:12px;bottom:12px;padding:8px 10px;border-radius:4px;background:rgba(0,0,0,.6);color:#fff;font:11px/1.5 var(--font-ui,system-ui);display:none;pointer-events:none;white-space:pre'; slot.appendChild(hud);
  const info = () => hud.textContent = `구도 편집 중\n드래그 회전 · Shift+드래그 이동 · 휠 / + - 확대\nEnter 저장 · R 처음으로 · Esc 취소\naz ${cam.az.toFixed(2)}  el ${cam.el.toFixed(2)}  d ${cam.d.toFixed(2)}  x ${cam.px.toFixed(3)}  y ${cam.py.toFixed(3)}`;
  const setEdit = on => { edit = on; hud.style.display = on ? 'block' : 'none'; slot.style.pointerEvents = on ? 'auto' : ''; slot.style.cursor = on ? 'grab' : ''; if (on) { backup = { ...cam }; info(); } };
  window.__cabinCam = () => JSON.stringify(cam);
  addEventListener('keydown', e => {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (!editable) return;
    if (!edit) { if (e.key === 'v' || e.key === 'V') setEdit(true); return; }
    if (e.key === 'Enter') { try { localStorage.setItem(LS, JSON.stringify(cam)); } catch (x) { /* 저장 못 해도 계속 */ } console.log('cabin cam', JSON.stringify(cam)); setEdit(false); }
    else if (e.key === 'Escape') { cam = backup; setEdit(false); }
    else if (e.key === 'r' || e.key === 'R') { cam = { ...DEF }; info(); }
    else if (e.key === '+' || e.key === '=') { cam.d *= .94; info(); } else if (e.key === '-') { cam.d *= 1.06; info(); }
    else return; e.preventDefault();
  });
  let drag = null;
  slot.addEventListener('pointerdown', e => { if (!edit) return; drag = { x: e.clientX, y: e.clientY, pan: e.shiftKey }; slot.setPointerCapture(e.pointerId); slot.style.cursor = 'grabbing'; });
  slot.addEventListener('pointermove', e => {
    if (!edit || !drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (drag.pan) { cam.px -= dx * cam.d * .0011; cam.py += dy * cam.d * .0011; } else { cam.az -= dx * .006; cam.el = Math.max(-1.2, Math.min(1.45, cam.el + dy * .006)); }
    info();
  });
  slot.addEventListener('pointerup', () => { drag = null; if (edit) slot.style.cursor = 'grab'; });
  addEventListener('wheel', e => { if (!edit || !slot.contains(e.target)) return; e.preventDefault(); e.stopImmediatePropagation(); cam.d *= Math.exp(e.deltaY * .001); info(); }, { passive: false, capture: true });
  let w = 0, h = 0, t0 = performance.now(), vis = true;
  const tick = now => {
    requestAnimationFrame(tick);
    const o = +slot.style.opacity, r = slot.getBoundingClientRect(), on = o > .01 && r.bottom > 0 && r.top < innerHeight;
    if (on !== vis) { vis = on; grain.setVisible(on); }
    if (!ready || !on) return;
    const nw = Math.round(r.width), nh = Math.round(r.height);
    if (nw !== w || nh !== h) { w = nw; h = nh; renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    const t = (now - t0) / 1000, k = edit ? 0 : 1;   // 편집 중에는 멈춘다
    const L = (a, b) => a + (b - a) * .18;
    pose.az = L(pose.az, cam.az); pose.el = L(pose.el, cam.el); pose.d = L(pose.d, cam.d); pose.px = L(pose.px, cam.px); pose.py = L(pose.py, cam.py);
    const az = pose.az + Math.sin(t * .31) * .035 * k, el = pose.el + Math.sin(t * .23 + 1.3) * .012 * k, d = pose.d * (1 + Math.sin(t * .17 + .6) * .01 * k);   // 아주 느리고 작게 : 숨 쉬듯
    camera.position.set(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d); camera.lookAt(0, -.02, 0);
    camera.translateX(pose.px); camera.translateY(pose.py);   // 이동 : 보는 방향은 그대로 두고 화면 안에서 밀기
    if(actors){
      if(director){
        const state=director.scenarioState(progress());actors.update(progress(),state);
        if(robot) robot.update(state,director.sample);
        if(signals)signals.update(state);
        director.directCamera(camera,cabinCenter,state,(progress()-1.6)/1.4);
      }else{actors.update(progress());}
    }
    renderer.render(scene, camera);
  };
  requestAnimationFrame(tick);
}

createCabinScene(window.HumanTouch && window.HumanTouch.vidEl);
