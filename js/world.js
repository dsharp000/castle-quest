// Resource nodes (trees / rocks / iron ore), particles, and the treasure
// chest — their spawning, updates, and drawing.

const makeTree = x => ({ x, hp: 3, max: 3, respawn: 0, h: rand(90, 130), sway: Math.random() * 6 });
const makeRock = x => ({ x, hp: 4, max: 4, respawn: 0, s: rand(0.8, 1.2) });
const makeOre  = x => ({ x, hp: 5, max: 5, respawn: 0 });

// Scatter objects across a band of the world at random gaps.
function spawnBand(spec, make) {
  const out = [], to = worldX(spec.to);
  for (let x = spec.from; x < to; x += rand(spec.gap[0], spec.gap[1])) out.push(make(x));
  return out;
}

// ---- particles ----
function puff(x, y, c, n = 6) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: rand(-2, 2), vy: rand(-3, -.5), life: ri(15, 30), c }); }
function pop(x, y, txt) { parts.push({ x, y, vx: 0, vy: -1, life: 50, txt }); }

function updateWorld() {
  // resource respawns
  for (const arr of [trees, rocks, ores]) for (const o of arr) {
    if (o.hp <= 0) { o.respawn--; if (o.respawn <= 0) o.hp = o.max; }
  }
  // particles
  for (const pt of parts) { pt.x += pt.vx; pt.y += pt.vy; pt.vy += pt.txt ? 0 : .15; pt.life--; }
  parts = parts.filter(pt => pt.life > 0);
  // chest unlocks once the boss is dead
  if (chest && !chest.opened && !troll.alive && near(player.x, chest.x, 40)) {
    chest.opened = true;
    const loot = level.chest.loot;
    for (const k in loot) res[k] += loot[k];
    say(`🎁 Treasure! +${loot.wood} wood, +${loot.stone} stone, +${loot.iron} iron`, 220);
  }
}

// ---- drawing (called inside the world-space transform in render.js) ----
function drawWorld() {
  // trees
  for (const tr of trees) {
    if (tr.hp <= 0) { ctx.fillStyle = '#5a3d20'; ctx.fillRect(tr.x - 7, GROUND - 16, 14, 16); continue; }
    const sway = Math.sin(t / 20 + tr.sway) * 3;
    ctx.fillStyle = '#5a3d20'; ctx.fillRect(tr.x - 8, GROUND - tr.h * 0.45, 16, tr.h * 0.45);
    ctx.fillStyle = tr.hp < tr.max ? '#4e8a3a' : '#3f7a30';
    ctx.beginPath(); ctx.moveTo(tr.x - 42 + sway, GROUND - tr.h * 0.35); ctx.lineTo(tr.x + sway, GROUND - tr.h); ctx.lineTo(tr.x + 42 + sway, GROUND - tr.h * 0.35); ctx.fill();
    ctx.beginPath(); ctx.moveTo(tr.x - 34 + sway, GROUND - tr.h * 0.55); ctx.lineTo(tr.x + sway, GROUND - tr.h * 1.15); ctx.lineTo(tr.x + 34 + sway, GROUND - tr.h * 0.55); ctx.fill();
    if (tr.hp < tr.max) bar(tr.x, GROUND - tr.h * 1.2, tr.hp / tr.max);
  }
  // rocks
  for (const rk of rocks) {
    if (rk.hp <= 0) continue;
    ctx.fillStyle = '#8a8a95'; ctx.beginPath(); ctx.ellipse(rk.x, GROUND - 14 * rk.s, 26 * rk.s, 16 * rk.s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#a0a0ac'; ctx.beginPath(); ctx.ellipse(rk.x - 8, GROUND - 20 * rk.s, 10 * rk.s, 7 * rk.s, 0, 0, 7); ctx.fill();
    if (rk.hp < rk.max) bar(rk.x, GROUND - 46, rk.hp / rk.max);
  }
  // iron ores
  for (const o of ores) {
    if (o.hp <= 0) continue;
    ctx.fillStyle = '#6a6a78'; ctx.beginPath(); ctx.ellipse(o.x, GROUND - 15, 24, 16, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#cfd8ff';
    ctx.fillRect(o.x - 10, GROUND - 22, 6, 6); ctx.fillRect(o.x + 4, GROUND - 18, 6, 6); ctx.fillRect(o.x - 2, GROUND - 28, 5, 5);
    if (o.hp < o.max) bar(o.x, GROUND - 46, o.hp / o.max);
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#cfd8ff'; ctx.textAlign = 'center'; ctx.fillText('iron', o.x, GROUND + 14); ctx.textAlign = 'left';
  }
  // chest
  if (chest) { ctx.font = '30px serif'; ctx.fillText(chest.opened ? '🗃️' : '🎁', chest.x - 15, GROUND - 4); }
}

function drawParticles() {
  for (const pt of parts) {
    if (pt.txt) {
      ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#ffe9a8'; ctx.strokeStyle = '#00000088'; ctx.lineWidth = 3; ctx.textAlign = 'center';
      ctx.strokeText(pt.txt, pt.x, pt.y); ctx.fillText(pt.txt, pt.x, pt.y); ctx.textAlign = 'left';
    } else { ctx.fillStyle = pt.c; ctx.fillRect(pt.x, pt.y, 4, 4); }
  }
}
