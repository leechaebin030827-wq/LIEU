/* 색 조절 패널 — C 키로 열고 닫는다 (?colors 로 시작하면 처음부터 열림). 고른 색은 이 브라우저에 저장된다. */
(() => {
  const KEY = 'lieu-colors';
  const FIELDS = [['bodyA', '차체 밝은 쪽'], ['bodyB', '차체 진한 쪽'], ['devA', '장치 밝은 쪽'], ['devB', '장치 진한 쪽']];
  let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  const wait = fn => { const t = setInterval(() => { if (window.CarScene && window.CarScene.getColors) { clearInterval(t); fn(window.CarScene); } }, 100); };
  wait(cs => {
    const base = JSON.parse(JSON.stringify(cs.getColors()));
    if (saved) cs.setColors(saved);
    const cur = cs.getColors();
    const el = document.createElement('div'); el.id = 'colorPanel';
    el.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:100000;display:none;width:232px;padding:14px 16px;background:rgba(20,22,30,.86);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:#F2F2F6;font:12px/1.4 "Hero",Helvetica,Arial,sans-serif;border-radius:12px;user-select:none';
    let h = '<div style="display:flex;justify-content:space-between;margin-bottom:10px"><b style="font-weight:400;letter-spacing:.08em">COLORS · C</b><span id="cpReset" style="cursor:pointer;opacity:.7">reset</span></div>';
    for (const m of ['light', 'dark']) { h += `<div style="opacity:.5;margin:8px 0 4px">${m === 'light' ? '라이트' : '다크'}</div>`; for (const [k, n] of FIELDS) h += `<label style="display:flex;align-items:center;justify-content:space-between;margin:3px 0"><span style="flex:1">${n}</span><input type="text" data-t data-m="${m}" data-k="${k}" value="${cur[m][k]}" maxlength="7" spellcheck="false" style="width:64px;margin-right:6px;padding:2px 4px;border:1px solid rgba(255,255,255,.2);border-radius:4px;background:rgba(0,0,0,.3);color:inherit;font:inherit;user-select:text"><input type="color" data-m="${m}" data-k="${k}" value="${cur[m][k]}" style="width:36px;height:22px;border:0;padding:0;background:none"></label>`; }
    const st = document.createElement('style'); st.textContent = 'html.cur #colorPanel,html.cur #colorPanel *{cursor:auto!important}#colorPanel input[type=color]{cursor:pointer!important}'; document.head.appendChild(st);   // 패널 위에서는 기본 커서를 보여 준다
    el.innerHTML = h; document.body.appendChild(el);
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cs.getColors())); } catch (e) {} };
    const sync = (m, k, v) => el.querySelectorAll(`input[data-m="${m}"][data-k="${k}"]`).forEach(i => { if (i.value.toLowerCase() !== v.toLowerCase()) i.value = v; });
    el.addEventListener('input', e => {
      const i = e.target; if (!i.dataset.m) return; let v = i.value.trim(); if (i.dataset.t) { if (v[0] !== '#') v = '#' + v; if (!/^#[0-9a-f]{6}$/i.test(v)) return; }
      sync(i.dataset.m, i.dataset.k, v); cs.setColors({ [i.dataset.m]: { [i.dataset.k]: v } }); save();
    });
    el.querySelector('#cpReset').onclick = () => { cs.setColors(base); try { localStorage.removeItem(KEY); } catch (e) {} el.querySelectorAll('input[data-m]').forEach(i => { i.value = base[i.dataset.m][i.dataset.k]; }); };
    addEventListener('keydown', e => { if (e.key.toLowerCase() !== 'c' || e.metaKey || e.ctrlKey || e.altKey || (e.target.closest && e.target.closest('input,textarea'))) return; el.style.display = el.style.display === 'none' ? 'block' : 'none'; });
    if (/[?&]colors\b/.test(location.search)) el.style.display = 'block';
  });
})();
