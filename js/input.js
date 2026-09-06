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
  if (scene === 'cutscene') { endCutscene(); return; } // tap to skip the finale
  if (scene === 'title') { // tap an unselected card to pick it; anything else starts
    const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * (W / r.width), my = (e.clientY - r.top) * (H / r.height);
    const inBtn = b => mx > b.x && mx < b.x + b.w && my > b.y && my < b.y + b.h;
    // 👑 King Mode (admin): code-gated on the way in; toggles off on the way out
    if (inBtn(kingBtn())) { toggleKingMode(); return; }
    // 👑 delete ALL times (only while King Mode is on)
    if (kingMode && inBtn(wipeAllBtn())) {
      if (typeof confirm !== 'function' || confirm('👑 Delete ALL best times for EVERY level?')) { clearAllTimes(); sfx.build(); }
      return;
    }
    // ⚔️ toggle the Raging Troll on Level 1 (only once unlocked and Level 1 is selected)
    if (rageUnlocked() && selLevel === 0 && inBtn(rageBtn())) { rageMode = !rageMode; sfx.build(); return; }
    // 🗑️ clear-times button — wipes the highlighted level's best times (confirmed)
    const cb = clearTimesBtn();
    if (mx > cb.x && mx < cb.x + cb.w && my > cb.y && my < cb.y + cb.h) {
      const nm = LEVELS[selLevel].name;
      const ok = typeof confirm !== 'function' || !levelBest(selLevel) || confirm(`Clear all best times for "${nm}"?`);
      if (ok && levelBest(selLevel)) { clearTimes(selLevel); sfx.build(); }
      return; // never starts the game
    }
    for (let i = 0; i < LEVELS.length; i++) {
      const c = titleCard(i);
      if (i !== selLevel && mx > c.x && mx < c.x + c.w && my > c.y && my < c.y + c.h) { selLevel = i; loadLevel(i); return; }
    }
    startSelected(); return; // locked quests just flash a warning
  }
  if (scene === 'win' && enteringName) { // touch devices have no keyboard — offer a dialog
    const n = prompt('Enter your name:', nameBuf);
    if (n !== null) { nameBuf = n; finishNameEntry(); }
    return;
  }
  if (scene === 'over' || scene === 'win') reset();
});
// Title screen keys: ←/→ pick a level (locked ones included, so you can see
// what's coming), 1..9 jump straight in, anything else starts the selection.
// (M is left alone so muting doesn't launch the game.)
addEventListener('keydown', e => {
  if (scene !== 'title') return;
  const k = e.key.toLowerCase(), d = parseInt(k, 10);
  if (k === 'arrowleft' || k === 'a') { selLevel = (selLevel + LEVELS.length - 1) % LEVELS.length; loadLevel(selLevel); }
  else if (k === 'arrowright' || k === 'd') { selLevel = (selLevel + 1) % LEVELS.length; loadLevel(selLevel); }
  else if (d >= 1 && d <= LEVELS.length) { selLevel = d - 1; loadLevel(selLevel); startSelected(); }
  else if (k === 'c') previewCutscene(); // PREVIEW: watch the volcano ride-off finale
  else if (k !== 'm') startSelected();
});

// Any key (except mute) skips the ride-off finale straight to the win screen.
addEventListener('keydown', e => { if (scene === 'cutscene' && e.key.toLowerCase() !== 'm') endCutscene(); });

// Y toggles pause (freezes timer, enemies, player — everything).
const togglePause = () => { if (scene === 'game') paused = !paused; };
addEventListener('keydown', e => { if (e.key === 'y' || e.key === 'Y') togglePause(); });

// P toggles "power mode": invincible + super fast (a cheat/fun mode). It's
// PASSWORD-LOCKED: every time you turn it on you must enter the password.
// Turning it off re-locks it, so it must be re-entered to use again.
// ⚡ touch button mirrors it.
const POWER_PASSWORD = '1624';
var powerUnlocked = false; // true only between a correct password and the next toggle-off
function tryPowerPassword(input) {
  if (String(input).trim() === POWER_PASSWORD) { powerUnlocked = true; return true; }
  return false;
}
const togglePower = () => {
  if (scene !== 'game') return;
  if (godMode) { godMode = false; powerUnlocked = false; say('⚡ power mode off — password needed to use it again', 140); return; }
  if (!powerUnlocked) {
    const ans = typeof prompt === 'function' ? prompt('🔒 Power mode is locked. Enter the password:') : null;
    if (ans === null) return; // cancelled or unavailable
    if (!tryPowerPassword(ans)) { say('🔒 Wrong password — power mode stays locked.', 140); sfx.deny(); return; }
  }
  godMode = true; say('⚡ POWER MODE ON — invincible + fast!', 120);
};
addEventListener('keydown', e => { if (e.key === 'p' || e.key === 'P') togglePower(); });

// 👑 King Mode (admin) — title-screen button. Entering requires the code 1624;
// while on you get a pre-built castle, one-shot power mode, meat-free taming,
// and the "delete ALL times" button. Clicking it again turns admin off.
function toggleKingMode() {
  if (kingMode) { kingMode = false; godMode = false; powerUnlocked = false; sfx.deny(); return; }
  const ans = typeof prompt === 'function' ? prompt('👑 Enter the King’s code to unlock admin:') : null;
  if (ans === null) return; // cancelled or unavailable
  if (String(ans).trim() !== POWER_PASSWORD) { sfx.deny(); return; } // wrong code
  kingMode = true; powerUnlocked = true; godMode = true; sfx.chest();
}
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
