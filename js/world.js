// Resource nodes (trees / rocks / iron ore / gold ore), particles, and the
// treasure chest — their spawning, updates, and drawing.

const makeTree = x => ({ x, hp: 3, max: 3, respawn: 0, h: rand(90, 130), sway: Math.random() * 6 });
const makeRock = x => ({ x, hp: 4, max: 4, respawn: 0, s: rand(0.8, 1.2) });
const makeOre  = x => ({ x, hp: 5, max: 5, respawn: 0 });
const makeGold = x => ({ x, hp: 8, max: 8, respawn: 0 }); // slow to crack, always pays exactly 2

// Scatter objects across a band of the world at random gaps. A spec may be a
// single {from,to,gap} or an array of them (castle mid-world → a band on
// each side).
function spawnBand(spec, make) {
  if (Array.isArray(spec)) return spec.flatMap(s => spawnBand(s, make));
  const out = [], to = worldX(spec.to);
  for (let x = spec.from; x < to; x += rand(spec.gap[0], spec.gap[1])) out.push(make(x));
  return out;
}

// ---- particles ----
function puff(x, y, c, n = 6) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: rand(-2, 2), vy: rand(-3, -.5), life: ri(15, 30), c }); }
function pop(x, y, txt) { parts.push({ x, y, vx: 0, vy: -1, life: 50, txt }); }

function updateWorld() {
  // resource respawns
  for (const arr of [trees, rocks, ores, golds]) for (const o of arr) {
    if (o.hp <= 0) { o.respawn--; if (o.respawn <= 0) o.hp = o.max; }
  }
  // particles
  for (const pt of parts) { pt.x += pt.vx; pt.y += pt.vy; pt.vy += pt.txt ? 0 : .15; pt.life--; }
  parts = parts.filter(pt => pt.life > 0);
  // reclaim materials dropped on death
  if (dropBag && near(player.x, dropBag.x, 40)) {
    res.wood += dropBag.wood; res.stone += dropBag.stone; res.iron += dropBag.iron; res.gold += dropBag.gold || 0; res.meat += dropBag.meat || 0;
    pop(dropBag.x, GROUND - 80, `+${dropBag.wood} 🪵 +${dropBag.stone} 🪨 +${dropBag.iron} ⚙️${dropBag.gold ? ` +${dropBag.gold} 🪙` : ''}${dropBag.meat ? ` +${dropBag.meat} 🥩` : ''}`);
    say('🎒 You recovered your dropped materials!', 160);
    sfx.pickup();
    dropBag = null;
  }
  // the legendary sword at the far left edge — one-time +3 on your current damage
  if (relic && !relic.taken && near(player.x, relic.x, 40)) {
    relic.taken = true;
    player.swordLvl += level.relic.bonus;
    say(`🗡️ The LEGENDARY SWORD! +${level.relic.bonus} damage (now ${swordDmg()})`, 220);
    sfx.chest();
  }
  // chest unlocks once the boss is dead
  if (chest && !chest.opened && !troll.alive && near(player.x, chest.x, 40)) {
    chest.opened = true;
    const loot = level.chest.loot;
    for (const k in loot) res[k] += loot[k];
    const lootIcon = { wood: '🪵', stone: '🪨', iron: '⚙️', gold: '🪙' };
    say('🎁 Treasure! ' + Object.keys(loot).map(k => `+${loot[k]} ${lootIcon[k] || k}`).join('  '), 220);
    sfx.chest();
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
  // gold ores — rare, tough, and worth the trip
  for (const o of golds) {
    if (o.hp <= 0) continue;
    ctx.fillStyle = '#7a6a4a'; ctx.beginPath(); ctx.ellipse(o.x, GROUND - 15, 24, 16, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd94d';
    ctx.fillRect(o.x - 10, GROUND - 22, 6, 6); ctx.fillRect(o.x + 4, GROUND - 18, 6, 6); ctx.fillRect(o.x - 2, GROUND - 28, 5, 5);
    if (o.hp < o.max) bar(o.x, GROUND - 46, o.hp / o.max);
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#ffd94d'; ctx.textAlign = 'center'; ctx.fillText('gold', o.x, GROUND + 14); ctx.textAlign = 'left';
  }
  // legendary sword in a stone at the world's left edge
  if (relic && !relic.taken) {
    const bob = Math.sin(t / 12) * 2;
    ctx.fillStyle = '#8a8a95'; ctx.beginPath(); ctx.ellipse(relic.x, GROUND - 8, 22, 12, 0, 0, 7); ctx.fill();
    ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.fillText('🗡️', relic.x, GROUND - 16 + bob);
    ctx.font = '10px sans-serif'; ctx.fillStyle = '#ffd94d'; ctx.fillText(`legendary sword +${level.relic.bonus}`, relic.x, GROUND - 48 + bob);
    ctx.textAlign = 'left';
  }
  // chest
  if (chest) { ctx.font = '30px serif'; ctx.fillText(chest.opened ? '🗃️' : '🎁', chest.x - 15, GROUND - 4); }
  // dropped-loot bag from a knockout
  if (dropBag) {
    const bob = Math.sin(t / 10) * 3;
    ctx.font = '24px serif'; ctx.fillText('💰', dropBag.x - 12, GROUND - 8 + bob);
    ctx.font = '10px sans-serif'; ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'center';
    ctx.fillText('your materials!', dropBag.x, GROUND - 38 + bob); ctx.textAlign = 'left';
  }
}

function drawParticles() {
  for (const pt of parts) {
    if (pt.txt) {
      ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#ffe9a8'; ctx.strokeStyle = '#00000088'; ctx.lineWidth = 3; ctx.textAlign = 'center';
      ctx.strokeText(pt.txt, pt.x, pt.y); ctx.fillText(pt.txt, pt.x, pt.y); ctx.textAlign = 'left';
    } else { ctx.fillStyle = pt.c; ctx.fillRect(pt.x, pt.y, 4, 4); }
  }
}
