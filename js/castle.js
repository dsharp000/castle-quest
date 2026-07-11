// The castle: build/craft menu, defensive walls, arrow towers, drawing.

const castleDef = () => castle.walls * 10;
const castleRight = () => castle.x + castle.w + castle.walls * 18;

const MENU = [
  { n: '🧱 Build Wall', cost: { wood: 5, stone: 5 }, info: 'Slows raiders (+10 def)', act: () => castle.walls++ },
  { n: '🗼 Build Tower', cost: { wood: 3, stone: 8 }, info: 'Auto-shoots arrows at raiders', act: () => castle.towers++ },
  { n: '🏰 Upgrade Keep', cost: { wood: 8, stone: 8, iron: 4 }, info: 'Grow the castle (need lvl 3 to win)', act: () => { castle.keep++; castle.hp = Math.min(castle.maxHp, castle.hp + 20); } },
  { n: '⚔️ Forge Sword', cost: { wood: 2, iron: 4 }, info: '+1 damage', act: () => player.swordLvl++ },
  { n: '🔨 Repair (+30)', cost: { wood: 3, stone: 3 }, info: 'Restore castle HP', act: () => castle.hp = Math.min(castle.maxHp, castle.hp + 30) },
  { n: '❤️ Feast (+HP)', cost: { wood: 2 }, info: 'Heal yourself fully', act: () => player.hp = player.maxHp },
];
var menuSel = 0;

function updateMenu() {
  if (keys.J) { menuSel = (menuSel + MENU.length - 1) % MENU.length; keys.J = false; }
  if (keys.L) { menuSel = (menuSel + MENU.length - 1) % MENU.length; keys.L = false; }
  if (keys.R) { menuSel = (menuSel + 1) % MENU.length; keys.R = false; }
  if (keys.A || keys.E) {
    const m = MENU[menuSel];
    if (Object.entries(m.cost).every(([k, v]) => res[k] >= v)) {
      Object.entries(m.cost).forEach(([k, v]) => res[k] -= v); m.act(); say(`${m.n} ✔`, 90);
    } else say('Not enough materials!', 80);
    keys.A = false; keys.E = false;
  }
}

// Click/tap support for the menu: select+buy a row, or tap outside to close.
cv.addEventListener('click', e => {
  if (!menuOpen) return;
  const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * (W / r.width), my = (e.clientY - r.top) * (H / r.height);
  MENU.forEach((m, i) => { const y = 150 + i * 46; if (my > y - 18 && my < y + 22 && mx > W / 2 - 190 && mx < W / 2 + 190) { menuSel = i; keys.A = true; } });
  if (my < 120 || my > 150 + MENU.length * 46 + 10) menuOpen = false;
});

// Towers auto-fire homing arrows at raiders.
function updateTowers() {
  if (t % 25 === 0 && castle.towers > 0) {
    const targets = raiders.filter(r => r.hp > 0 && r.x < castle.x + 900);
    for (let i = 0; i < Math.min(castle.towers, targets.length); i++)
      arrows.push({ x: castle.x + 120, y: GROUND - 160, tx: targets[i], vx: 0, vy: 0 });
  }
  for (const a of arrows) {
    if (a.tx && a.tx.hp > 0) { const dx = a.tx.x - a.x, dy = (a.tx.y - 25) - a.y, d = Math.hypot(dx, dy); a.vx = dx / d * 6; a.vy = dy / d * 6; }
    a.x += a.vx; a.y += a.vy;
    if (a.tx && a.tx.hp > 0 && Math.hypot(a.tx.x - a.x, a.tx.y - 25 - a.y) < 14) { a.tx.hp--; a.tx.hurt = 8; a.dead = true; puff(a.x, a.y, '#ffd98a', 4); if (a.tx.hp <= 0) killEnemy(a.tx); }
  }
  arrows = arrows.filter(a => !a.dead && a.x < WORLD_W);
}

// ---- drawing ----
function drawCastle() {
  const c = castle, baseY = GROUND;
  const kh = 90 + c.keep * 36;
  // walls extend to the right, one segment each
  for (let i = 0; i < c.walls; i++) { ctx.fillStyle = '#7d7d8a'; ctx.fillRect(c.x + c.w + i * 18, baseY - 46, 16, 46); ctx.fillStyle = '#93939f'; for (let b = 0; b < 3; b++) ctx.fillRect(c.x + c.w + i * 18 + (b % 2) * 8, baseY - 46 + b * 14, 8, 6); ctx.fillRect(c.x + c.w + i * 18, baseY - 54, 7, 8); ctx.fillRect(c.x + c.w + i * 18 + 9, baseY - 54, 7, 8); }
  // keep
  ctx.fillStyle = '#8d8d9a'; ctx.fillRect(c.x, baseY - kh, c.w, kh);
  ctx.fillStyle = '#7a7a88'; for (let r = 0; r < kh / 22; r++) for (let b = 0; b < 5; b++) ctx.fillRect(c.x + 8 + b * 38 + (r % 2) * 14, baseY - kh + 8 + r * 22, 26, 9);
  // battlements
  ctx.fillStyle = '#8d8d9a'; for (let b = 0; b < 6; b++) ctx.fillRect(c.x + b * 36, baseY - kh - 14, 20, 14);
  // door
  ctx.fillStyle = '#4a3018'; ctx.beginPath(); ctx.arc(c.x + c.w / 2, baseY - 28, 26, Math.PI, 0); ctx.fill(); ctx.fillRect(c.x + c.w / 2 - 26, baseY - 28, 52, 28);
  // towers
  for (let i = 0; i < c.towers; i++) { const tx = c.x - 10 + i * (c.w + 10); ctx.fillStyle = '#9d9daa'; ctx.fillRect(tx, baseY - kh - 70, 34, kh + 70); ctx.fillStyle = '#6b4a2b'; ctx.beginPath(); ctx.moveTo(tx - 6, baseY - kh - 70); ctx.lineTo(tx + 17, baseY - kh - 108); ctx.lineTo(tx + 40, baseY - kh - 70); ctx.fill(); ctx.fillStyle = '#2b2140'; ctx.fillRect(tx + 11, baseY - kh - 52, 12, 16); }
  // flag
  ctx.fillStyle = '#6b4a2b'; ctx.fillRect(c.x + c.w / 2 - 2, baseY - kh - 52, 4, 40);
  ctx.fillStyle = '#d64545'; ctx.beginPath(); ctx.moveTo(c.x + c.w / 2 + 2, baseY - kh - 52); ctx.lineTo(c.x + c.w / 2 + 34 + Math.sin(t / 10) * 4, baseY - kh - 44); ctx.lineTo(c.x + c.w / 2 + 2, baseY - kh - 34); ctx.fill();
  ctx.font = '12px sans-serif'; ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'center';
  if (near(player.x, c.x + c.w / 2, 220)) ctx.fillText('Press E / 🏰 to build', c.x + c.w / 2, baseY - kh - 118);
  ctx.fillText(`Keep lvl ${c.keep}`, c.x + c.w / 2, baseY + 16); ctx.textAlign = 'left';
}

function drawArrows() {
  ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 2;
  for (const a of arrows) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x - a.vx * 2, a.y - a.vy * 2); ctx.stroke(); }
}

function drawMenu() {
  ctx.fillStyle = '#000000aa'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2e2438'; ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 4;
  ctx.fillRect(W / 2 - 210, 100, 420, 46 * MENU.length + 80); ctx.strokeRect(W / 2 - 210, 100, 420, 46 * MENU.length + 80);
  ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = '#ffc94d'; ctx.textAlign = 'center';
  ctx.fillText('🏰 CASTLE — build & craft', W / 2, 130);
  MENU.forEach((m, i) => {
    const y = 150 + i * 46, sel = i === menuSel;
    const afford = Object.entries(m.cost).every(([k, v]) => res[k] >= v);
    ctx.fillStyle = sel ? '#7a5230' : '#3a2f4a'; ctx.fillRect(W / 2 - 190, y - 18, 380, 40);
    ctx.fillStyle = afford ? '#fff' : '#999'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(m.n, W / 2 - 178, y);
    ctx.font = '10px sans-serif'; ctx.fillStyle = '#c9b68a'; ctx.fillText(m.info, W / 2 - 178, y + 14);
    ctx.textAlign = 'right'; ctx.font = '12px sans-serif'; ctx.fillStyle = afford ? '#ffe9a8' : '#e5484d';
    ctx.fillText(Object.entries(m.cost).map(([k, v]) => `${v}${{ wood: '🪵', stone: '🪨', iron: '⚙️' }[k]}`).join(' '), W / 2 + 178, y + 6);
  });
  ctx.textAlign = 'center'; ctx.font = '12px sans-serif'; ctx.fillStyle = '#c9b68a';
  ctx.fillText('↑/← → select • J/E buy • tap outside to close', W / 2, 150 + MENU.length * 46 + 30);
  ctx.textAlign = 'left';
}
