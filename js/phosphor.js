/* PHOSPHOR interactions — optional. Only needed for screen-recorded animations.
   Static PNG export doesn't need this file. */

/* E3 · type-on: <el data-type data-speed="40" data-cursor>text</el> */
function typeOn(el) {
  const text = el.textContent;
  const speed = parseInt(el.dataset.speed || '40', 10);
  const useCursor = 'cursor' in el.dataset;
  el.textContent = '';
  if (useCursor) {
    el.insertAdjacentHTML('beforeend',
      '<span class="tw-text"></span><span class="cursor is-on"></span>');
  } else {
    el.insertAdjacentHTML('beforeend', '<span class="tw-text"></span><span class="cursor" style="display:none"></span>');
  }
  const target = el.querySelector('.tw-text');
  let i = 0;
  (function tick() {
    if (i <= text.length) {
      target.textContent = text.slice(0, i++);
      setTimeout(tick, speed + Math.random() * speed * 0.5); // human jitter
    } else if (!useCursor) {
      el.querySelector('.cursor').style.display = 'none';
    }
  })();
}

/* E2 · progress bar: <el class="progress" data-pct="64"> — renders ▓▓░░ blocks */
function progressBar(el) {
  const pct = parseInt(el.dataset.pct || '64', 10);
  const total = parseInt(el.dataset.blocks || '10', 10);
  const filled = Math.round(total * pct / 100);
  el.innerHTML =
    `<span class="bar-fill">${'▓'.repeat(filled)}</span>` +
    `<span class="bar-rest">${'░'.repeat(total - filled)}</span>` +
    ` ${pct}%`;
}

document.querySelectorAll('[data-type]').forEach(typeOn);
document.querySelectorAll('.progress[data-pct]').forEach(progressBar);
