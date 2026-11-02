/* Continuous cover choreography. One sharp frame at a time, no pointer tracking. */
(() => {
  'use strict';
  const canvas = document.getElementById('hero');
  const context = canvas.getContext('2d', { alpha: true });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cache = new Map(), pending = new Set(), failed = new Map();
  let queue = [], active = 0, drawn = '', elapsed = 0, settledAt = 0;
  let last = null, leg = 0, legTime = 0;
  let wasScrolling = false;
  let entranceStart = null, entranceMotion = null;
  const entranceEase = t => t <= .8 ? t * t / .8 : 1 - 5 * Math.pow(1 - t, 2);
  // Settle after landing, then breathe at identical turnaround poses.
  // Reversing the original frames closes the loop without a pose cut.
  const choreography = [
    { from: 45, to: 61, duration: 16 / 30 },
    { from: 61, to: 61, duration: 1.0 },
    { from: 61, to: 417, duration: 356 / 30 },
    { from: 417, to: 417, duration: 1.2 },
    { from: 417, to: 61, duration: 356 / 30 },
    { from: 61, to: 61, duration: 1.4 }
  ];
  const scroll = { x: 0, v: 0 };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  // File previews may rewrite each HTML asset to a blob/proxy URL. Use that
  // resolved source rather than constructing a path relative to the iframe.
  const url = n => document.getElementById(`hero-frame-${n}`)?.src
    || `assets/eye-sequence/${String(n).padStart(4, '0')}.webp`;
  // Exact critically damped spring: consistent at 30/60/120 Hz, no overshoot.
  function spring(state, target, frequency, dt) {
    const offset = state.x - target, impulse = state.v + frequency * offset;
    const decay = Math.exp(-frequency * dt);
    state.x = target + (offset + impulse * dt) * decay;
    state.v = (state.v - frequency * impulse * dt) * decay;
    return state.x;
  }
  function pump() {
    while (active < 4 && queue.length) {
      const n = queue.shift(); active++;
      const img = new Image(); img.decoding = 'async'; img.src = url(n);
      img.decode().then(() => {
        cache.set(n, img);
        // Keep the forward pose available as a loading fallback.
        while (cache.size > (settledAt ? 36 : 48)) {
          const oldest = [...cache.keys()].find(frame => frame !== 61);
          cache.delete(oldest);
        }
      }).catch(() => failed.set(n, (failed.get(n) || 0) + 1)).finally(() => {
        pending.delete(n); active--; pump();
      });
    }
  }
  function request(n, urgent = false) {
    if (cache.has(n) || failed.get(n) >= 2) return;
    if (pending.has(n)) {
      // The currently displayed frame takes priority over look-ahead requests.
      const index = queue.indexOf(n);
      if (urgent && index > 0) { queue.splice(index, 1); queue.unshift(n); }
      return;
    }
    pending.add(n); urgent ? queue.unshift(n) : queue.push(n); pump();
  }
  function touch(n) {
    const img = cache.get(n);
    if (img) { cache.delete(n); cache.set(n, img); }
    return img;
  }
  function draw(frame) {
    const n = Math.round(frame);
    request(n, true);
    const img = touch(n);
    if (!img) return false;
    if (drawn !== n) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.globalAlpha = 1;
      context.globalCompositeOperation = 'source-over';
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      drawn = n;
      canvas.dataset.frame = String(n);
    }
    return true;
  }
  function warm(n, a, b, direction = 1) {
    const center = Math.round(n);
    // Read ahead in playback order; decoded frames stay bounded in memory.
    for (let delta = 0; delta <= 20; delta++) {
      const frame = center + delta * direction;
      if (frame >= a && frame <= b) request(frame);
    }
  }

  window.LieuHero = {
    update(now, revealTime) {
      const dt = last === null ? 0 : clamp((now - last) / 1000, 0, .05);
      last = now;
      if (revealTime < 0 || document.hidden) return;
      const scrollTarget = clamp(scrollY / (innerHeight * .9));
      const p = spring(scroll, scrollTarget, 10, dt);
      if (reduced.matches) {
        draw(61); canvas.style.transform = 'translateX(-50%)';
        canvas.style.opacity = String(1 - smooth(0, 1, scrollTarget));
        return;
      }
      if (!settledAt) {
        if (entranceStart === null) {
          entranceStart = now;
          // Compositor-driven translation stays smooth during image decoding
          // and the page's heavier background canvas work.
          if (canvas.animate) entranceMotion = canvas.animate(
            Array.from({ length: 41 }, (_, i) => ({
              offset: i / 40,
              transform: `translate3d(-50%, ${-105 * (1 - entranceEase(i / 40))}%, 0)`
            })),
            { duration: 1600, easing: 'linear', fill: 'both' }
          );
        }
        // Quick descent; turn toward the viewer only once the body is visible.
        // Match source playback to the actual animation clock, even on a slow frame.
        elapsed = (entranceMotion?.currentTime ?? (now - entranceStart)) / 1000;
        const t = clamp(elapsed / 1.6);
        const ease = entranceEase(t);
        // The source is already forward by frame 45; 45–61 is a hold.
        // Finish that turn at landing instead of playing the hold in midair.
        const n = 1 + 44 * Math.pow(clamp((t - .35) / .65), 1.6);
        // Loading must never stop the entrance above the viewport. Advance the
        // timeline independently; prefer the side-facing entrance fallback.
        if (!draw(n) && !drawn && !draw(1)) draw(61);
        warm(n, 1, 61);
        if (!entranceMotion) canvas.style.transform = `translate3d(-50%, ${(-105 * (1 - ease)).toFixed(3)}%, 0)`;
        canvas.style.opacity = String(smooth(0, .16, t) * (1 - smooth(.5, 1, p)));
        canvas.dataset.pose = 'intro';
        if (t === 1) {
          canvas.style.transform = 'translate3d(-50%, 0px, 0)';
          entranceMotion?.cancel(); entranceMotion = null;
          draw(45); settledAt = now;
        }
        return;
      }
      // Stay anchored after landing. Scroll controls gaze and opacity only.
      canvas.style.transform = 'translate3d(-50%, 0.000px, 0)';
      canvas.style.opacity = String(1 - smooth(.48, 1, p));
      if (p > .999 && scrollTarget === 1) return;
      // The downward smiling action belongs only to leaving the cover.
      // Idle playback stops at its forward-facing lead-in, frame 417.
      if (scrollY > 2 || p > .002) {
        wasScrolling = true;
        const frame = 417 + 54 * smooth(0, .48, p);
        draw(frame);
        warm(frame, 417, 471);
        warm(frame, 417, 471, -1);
        canvas.dataset.pose = 'scroll';
        return;
      }
      if (wasScrolling) {
        // Rewinding scroll reaches 417; continue from exactly that idle pose.
        leg = 4; legTime = 0; wasScrolling = false;
      }
      legTime += dt;
      while (legTime >= choreography[leg].duration) {
        legTime -= choreography[leg].duration;
        leg = leg === choreography.length - 1 ? 2 : leg + 1;
      }
      const action = choreography[leg];
      const frame = action.from + (action.to - action.from) * clamp(legTime / action.duration);
      draw(frame);
      const direction = Math.sign(action.to - action.from) || 1;
      warm(frame, 1, 417, direction);
      if (action.from === action.to) {
        const upcoming = choreography[leg === choreography.length - 1 ? 2 : leg + 1];
        warm(upcoming.from, 1, 417, Math.sign(upcoming.to - upcoming.from) || 1);
      }
      canvas.dataset.pose = action.from === action.to ? 'rest' : 'playback';

    }
  };
  request(1, true); request(61, true);
  // Decode the entire entrance during the logo opening, before it moves.
  for (let n = 2; n <= 45; n++) request(n);
})();
