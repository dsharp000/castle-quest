// Keyboard + touch input. Everything reads/writes flags on `keys`:
// L/R = move, J = jump / menu up, A = attack / menu buy, E = build menu,
// T = trade with the villager, U = teleport home, LK = look (peek menus from afar).
const keys = {};
const KEYMAP = { ArrowLeft: 'L', a: 'L', ArrowRight: 'R', d: 'R', ArrowUp: 'J', w: 'J', ' ': 'J', j: 'A', x: 'A', z: 'A', e: 'E', Enter: 'E', u: 'U', t: 'T', l: 'LK' };

addEventListener('keydown', e => { const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()]; if (k) { keys[k] = true; e.preventDefault(); } });
addEventListener('keyup', e => { const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()]; if (k) keys[k] = false; });

const bindBtn = (id, k) => {
  const el = document.getElementById(id);
  el.addEventListener('touchstart', e => { keys[k] = true; e.preventDefault(); }, { passive: false });
  el.addEventListener('touchend', e => { keys[k] = false; e.preventDefault(); }, { passive: false });
  el.addEventListener('mousedown', () => keys[k] = true);
  el.addEventListener('mouseup', () => keys[k] = false);
};
bindBtn('bL', 'L'); bindBtn('bR', 'R'); bindBtn('bJ', 'J'); bindBtn('bA', 'A'); bindBtn('bE', 'E'); bindBtn('bT', 'U'); bindBtn('bTr', 'T'); bindBtn('bLk', 'LK');

// Scene transitions on any interaction.
cv.addEventListener('pointerdown', e => {
  if (scene === 'title') { // tap an unselected card to pick it; anything else starts
    const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * (W / r.width), my = (e.clientY - r.top) * (H / r.height);
    for (let i = 0; i < LEVELS.length; i++) {
      const c = titleCard(i);
      if (i !== selLevel && mx > c.x && mx < c.x + c.w && my > c.y && my < c.y + c.h) { selLevel = i; loadLevel(i); return; }
    }
    reset(); return;
  }
  if (scene === 'win' && enteringName) { // touch devices have no keyboard — offer a dialog
    const n = prompt('Enter your name:', nameBuf);
    if (n !== null) { nameBuf = n; finishNameEntry(); }
    return;
  }
  if (scene === 'over' || scene === 'win') reset();
});
// Title screen keys: ←/→ pick a level, 1..9 jump straight in, anything else starts.
// (M is left alone so muting doesn't launch the game.)
addEventListener('keydown', e => {
  if (scene !== 'title') return;
  const k = e.key.toLowerCase(), d = parseInt(k, 10);
  if (k === 'arrowleft' || k === 'a') { selLevel = (selLevel + LEVELS.length - 1) % LEVELS.length; loadLevel(selLevel); }
  else if (k === 'arrowright' || k === 'd') { selLevel = (selLevel + 1) % LEVELS.length; loadLevel(selLevel); }
  else if (d >= 1 && d <= LEVELS.length) { selLevel = d - 1; reset(); }
  else if (k !== 'm') reset();
});

// Y toggles pause (freezes timer, enemies, player — everything).
const togglePause = () => { if (scene === 'game') paused = !paused; };
addEventListener('keydown', e => { if (e.key === 'y' || e.key === 'Y') togglePause(); });

// P toggles "power mode": invincible + super fast (a cheat/fun mode). Stays on
// until toggled off. ⚡ touch button mirrors it.
const togglePower = () => { if (scene === 'game') { godMode = !godMode; say(godMode ? '⚡ POWER MODE ON — invincible + fast!' : '⚡ power mode off', 120); } };
addEventListener('keydown', e => { if (e.key === 'p' || e.key === 'P') togglePower(); });
(() => { const b = document.getElementById('bPow'); if (b) b.addEventListener('click', togglePower); })();

// Q quits the current run back to the title screen (abandons the run).
const quitToTitle = () => {
  if (scene === 'game' || scene === 'over' || scene === 'win') { scene = 'title'; paused = false; menuOpen = false; }
};
addEventListener('keydown', e => { if ((e.key === 'q' || e.key === 'Q') && !enteringName) quitToTitle(); });
(() => { const b = document.getElementById('bP'); if (b) b.addEventListener('click', togglePause); })();

// Typing a name for the best-times table on the win screen.
addEventListener('keydown', e => {
  if (!enteringName || scene !== 'win') return;
  if (e.key === 'Enter') finishNameEntry();
  else if (e.key === 'Backspace') nameBuf = nameBuf.slice(0, -1);
  else if (e.key.length === 1 && nameBuf.length < 12) nameBuf += e.key;
  e.preventDefault();
});
