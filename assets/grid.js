/* LIEU grid overlay — G : 컬럼 표시 · Shift+G : 8pt 베이스라인 · ?grid 로 시작하면 처음부터 표시 */
(() => {
  const ov = document.createElement('div');
  ov.id = 'grid-overlay';
  ov.innerHTML = '<div class="base"></div><div class="container grid cols"></div>';
  document.body.appendChild(ov);
  const cols = ov.querySelector('.cols');

  const build = () => {
    const n = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cols'), 10) || 12;
    if (cols.children.length !== n) cols.replaceChildren(...Array.from({ length: n }, () => document.createElement('i')));
  };
  build();
  addEventListener('resize', build);

  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea,[contenteditable]')) return;
    if (e.key.toLowerCase() !== 'g' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.shiftKey) ov.classList.toggle('base-on'); else ov.classList.toggle('on');
  });
  if (/[?&]grid\b/.test(location.search)) ov.classList.add('on');
})();
