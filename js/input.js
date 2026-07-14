// Keyboard + touch input. Everything reads/writes flags on `keys`:
// L/R = move, J = jump / menu up, A = attack / menu buy, E = build menu.
const keys = {};
const KEYMAP = { ArrowLeft: 'L', a: 'L', ArrowRight: 'R', d: 'R', ArrowUp: 'J', w: 'J', ' ': 'J', j: 'A', x: 'A', z: 'A', e: 'E', Enter: 'E' };

addEventListener('keydown', e => { const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()]; if (k) { keys[k] = true; e.preventDefault(); } });
addEventListener('keyup', e => { const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()]; if (k) keys[k] = false; });

const bindBtn = (id, k) => {
  const el = document.getElementById(id);
  el.addEventListener('touchstart', e => { keys[k] = true; e.preventDefault(); }, { passive: false });
  el.addEventListener('touchend', e => { keys[k] = false; e.preventDefault(); }, { passive: false });
  el.addEventListener('mousedown', () => keys[k] = true);
  el.addEventListener('mouseup', () => keys[k] = false);
};
bindBtn('bL', 'L'); bindBtn('bR', 'R'); bindBtn('bJ', 'J'); bindBtn('bA', 'A'); bindBtn('bE', 'E');

// Scene transitions on any interaction.
cv.addEventListener('pointerdown', () => {
  if (scene === 'title') scene = 'game';
  if (scene === 'win' && enteringName) { // touch devices have no keyboard — offer a dialog
    const n = prompt('Enter your name:', nameBuf);
    if (n !== null) { nameBuf = n; finishNameEntry(); }
    return;
  }
  if (scene === 'over' || scene === 'win') reset();
});
addEventListener('keydown', () => { if (scene === 'title') scene = 'game'; });

// Typing a name for the best-times table on the win screen.
addEventListener('keydown', e => {
  if (!enteringName || scene !== 'win') return;
  if (e.key === 'Enter') finishNameEntry();
  else if (e.key === 'Backspace') nameBuf = nameBuf.slice(0, -1);
  else if (e.key.length === 1 && nameBuf.length < 12) nameBuf += e.key;
  e.preventDefault();
});
