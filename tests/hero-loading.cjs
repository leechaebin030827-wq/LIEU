// Run: node tests/hero-loading.cjs
// Slow sequence downloads must not trap LIEU above the viewport.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function checkEntrance(preview = false, stalled = true, compositor = false) {
  let clock = 0, animationCalls = 0, animationCancelled = false;
  const rendered = [];
  const canvas = {
    width: 1280, height: 720, style: {}, dataset: {},
    getContext: () => ({
      clearRect() { this.drawCount = 0; },
      drawImage(image) {
        assert.equal(this.globalAlpha, 1, 'frames must not be crossfaded');
        assert.equal(this.globalCompositeOperation, 'source-over');
        assert.equal(++this.drawCount, 1, 'only one frame per canvas clear');
        if (canvas.dataset.pose === 'playback') rendered.push(image.src);
      }
    }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 562.5 })
  };
  if (compositor) canvas.animate = (keyframes, options) => {
    animationCalls++;
    assert.equal(options.duration, 1600);
    assert.equal(keyframes[0].transform, 'translate3d(-50%, -105%, 0)');
    assert.equal(keyframes.at(-1).transform, 'translate3d(-50%, 0%, 0)');
    const start = clock;
    return {
      get currentTime() { return Math.min(1600, clock - start); },
      cancel() { animationCancelled = true; }
    };
  };
  const environment = {
    document: {
      hidden: false,
      getElementById: id => id === 'hero' ? canvas
        : preview ? { src: `blob:preview-${id}` } : null,
      addEventListener() {}
    },
    matchMedia: () => ({ matches: false }),
    addEventListener(name) { assert.notEqual(name, 'pointermove', 'playback must not track the mouse'); },
    innerWidth: 1000, innerHeight: 800, scrollY: 0,
    Image: class {
      decode() {
        // Forward poster arrives, but sequence requests remain pending.
        if (preview) assert(this.src.startsWith('blob:preview-hero-frame-'), 'use rewritten preview URLs');
        const front = preview ? this.src.endsWith('frame-61') : this.src.endsWith('/0061.webp');
        return !stalled || front ? Promise.resolve() : new Promise(() => {});
      }
    }
  };
  environment.window = environment;
  const source = fs.readFileSync(path.join(__dirname, '../assets/hero-eyes.js'), 'utf8');
  vm.runInNewContext(source, environment);
  for (let frame = 0; frame < (stalled ? 250 : 2400); frame++) {
    const now = frame * 1000 / 60;
    clock = now;
    environment.LieuHero.update(now, now / 1000);
    await new Promise(setImmediate);
  }
  if (stalled) assert.equal(canvas.dataset.frame, '61');
  else {
    assert(rendered.some(src => src.endsWith('/0062.webp')), 'restore even-numbered frames');
    assert(rendered.some(src => src.endsWith('/0417.webp')), 'play through the idle endpoint');
    const end = rendered.findIndex(src => src.endsWith('/0417.webp'));
    assert(rendered.slice(end + 1).some(src => src.endsWith('/0061.webp')), 'return continuously to the forward pose');
    const ids = rendered.map(src => Number(src.match(/(\d+)\.webp$/)[1]));
    assert(ids.every(id => id <= 417), 'idle must never play the downward smile');
    for (let i = 1; i < ids.length; i++) assert(Math.abs(ids[i] - ids[i - 1]) <= 1, 'no pose cuts at loop boundaries');
    let before = Number(canvas.dataset.frame);
    environment.scrollY = 180;
    let scrollSeen = false;
    for (let i = 2400; i < 2460; i++) {
      environment.LieuHero.update(i * 1000 / 60, i / 60);
      await new Promise(setImmediate);
      const after = Number(canvas.dataset.frame);
      if (after >= 417) scrollSeen = true;
      if (scrollSeen) assert(after >= 417 && after <= 471, 'scroll uses only its own clip');
      assert.equal(canvas.dataset.pose, 'scroll');
      const y = Number(canvas.style.transform.match(/,\s*(-?[\d.]+)px/)[1]);
      assert.equal(y, 0, 'scroll must not move the hero up or down');
      before = after;
    }
    assert(scrollSeen, 'scroll clip must load and play');
    environment.scrollY = 0;
    for (let i = 2460; i < 2700; i++) {
      environment.LieuHero.update(i * 1000 / 60, i / 60);
      await new Promise(setImmediate);
    }
  }
  assert(['playback', 'rest'].includes(canvas.dataset.pose), 'entrance must finish despite stalled downloads');
  assert.equal(canvas.style.opacity, '1');
  assert.equal(canvas.style.transform, 'translate3d(-50%, 0.000px, 0)');
  if (compositor) {
    assert.equal(animationCalls, 1);
    assert(animationCancelled, 'handoff to scrolling must release the entrance animation');
  }
  console.log(`PASS: ${preview ? 'rewritten file-preview URLs' : 'relative URLs'} produce a visible hero despite stalled downloads`);
}
async function main() {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const name of fs.readdirSync(path.join(root, 'assets/eye-sequence')).filter(name => name.endsWith('.webp'))) {
    assert(html.includes(`id="hero-frame-${Number(name.slice(0, 4))}" src="assets/eye-sequence/${name}"`), `missing static reference: ${name}`);
  }
  await checkEntrance();
  await checkEntrance(true);
  await checkEntrance(false, false);
  await checkEntrance(false, false, true);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
