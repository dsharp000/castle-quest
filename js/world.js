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

// ---- volcanic embers: a falling-lava hazard (only where level.embers is set).
// Molten drops rain in from above near the player — you see them coming and
// must dodge; a direct hit or a landing splash burns for level.embers.dmg. ----
function burstEmber(e) {
  const by = Math.min(e.y, GROUND) - 6;
  puff(e.x, by, '#ff8a1e', 9); puff(e.x, by, '#ffd23a', 5);
  e.dead = true;
}
function updateEmbers() {
  const cfg = level.embers; if (!cfg) return;
  if (--emberTimer <= 0) {
    emberTimer = Math.round(60 * cfg.everySec);
    const n = ri(cfg.count[0], cfg.count[1]);
    for (let i = 0; i < n; i++) {
      // rain down near the player (clamped to the world) so dodging matters
      const x = Math.max(60, Math.min(WORLD_W - 60, player.x + rand(-400, 400)));
      embers.push({ x, y: -30, vy: rand(3.4, 5) });
    }
  }
  for (const e of embers) {
    if (e.dead) continue;
    e.y += e.vy; e.vy += GRAV * 0.4;
    // direct mid-air hit
    if (player.inv <= 0 && near(player.x, e.x, 15) && Math.abs((player.y - 28) - e.y) < 26) {
      hurtPlayer(cfg.dmg); burstEmber(e); continue;
    }
    // landed: burst, and splash-burn a knight standing on the ground nearby
    if (e.y >= GROUND) {
      burstEmber(e);
      if (player.inv <= 0 && near(player.x, e.x, 30) && player.y > GROUND - 70) hurtPlayer(cfg.dmg);
    }
  }
  embers = embers.filter(e => !e.dead);
}

function drawEmbers() {
  for (const e of embers) {
    ctx.globalAlpha = 0.4; ctx.fillStyle = '#ff7a1e'; // trailing flame tail
    ctx.beginPath(); ctx.moveTo(e.x - 4, e.y); ctx.lineTo(e.x + 4, e.y); ctx.lineTo(e.x, e.y - 16); ctx.fill();
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#ff5a00'; // outer glow
    ctx.beginPath(); ctx.arc(e.x, e.y, 12, 0, 7); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#ffb02e'; // molten core
    ctx.beginPath(); ctx.arc(e.x, e.y, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff0b0'; // hot highlight
    ctx.beginPath(); ctx.arc(e.x - 2, e.y - 2, 3, 0, 7); ctx.fill();
  }
}

function updateWorld() {
  updateEmbers();
  // resource respawns
  for (const arr of [trees, rocks, ores, golds]) for (const o of arr) {
    if (o.hp <= 0) { o.respawn--; if (o.respawn <= 0) o.hp = o.max; }
  }
  // particles
  for (const pt of parts) { pt.x += pt.vx; pt.y += pt.vy; pt.vy += pt.txt ? 0 : .15; pt.life--; }
  parts = parts.filter(pt => pt.life > 0);
  // reclaim materials dropped on death
  if (dropBag && near(player.x, dropBag.x, 40)) {
    res.wood += dropBag.wood; res.stone += dropBag.stone; res.iron += dropBag.iron; res.gold += dropBag.gold || 0;
    res.meat = Math.min(MAX_MEAT, res.meat + (dropBag.meat || 0)); // meat stays capped
    pop(dropBag.x, GROUND - 80, `+${dropBag.wood} 🪵 +${dropBag.stone} 🪨 +${dropBag.iron} ⚙️${dropBag.gold ? ` +${dropBag.gold} 💰` : ''}${dropBag.meat ? ` +${dropBag.meat} 🥩` : ''}`);
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
  // tame the beaten dragon (tame levels only): feed it a full pack of raw meat → win
  if (level.tame && troll.subdued && !troll.tamed && near(player.x, troll.x, 70)) {
    if (res.meat >= level.tame.meat || kingMode) { // 👑 admin tames with no meat
      res.meat = Math.max(0, res.meat - level.tame.meat); troll.tamed = true;
      pop(troll.x, GROUND - 130, '🐉❤️ TAMED!');
      say(`🐉 You fed the dragon ${level.tame.meat} 🥩 and TAMED it! The volcano is yours!`, 340);
      sfx.chest();
    } else if (t % 90 === 0) {
      say(`🥩 You need ${level.tame.meat} raw meat to tame the dragon — you have ${res.meat}.`, 90);
      sfx.deny();
    }
  }
  // chest unlocks once the boss is down (defeated, or subdued on a tame level)
  if (chest && !chest.opened && (!troll.alive || troll.subdued) && near(player.x, chest.x, 40)) {
    chest.opened = true;
    const loot = level.chest.loot;
    for (const k in loot) res[k] += loot[k];
    const lootIcon = { wood: '🪵', stone: '🪨', iron: '⚙️', gold: '💰' };
    say('🎁 Treasure! ' + Object.keys(loot).map(k => `+${loot[k]} ${lootIcon[k] || k}`).join('  '), 220);
    sfx.chest();
  }
}

// ---- drawing (called inside the world-space transform in render.js) ----
function drawWorld() {
  // trees — colors come from the level theme (default forest green/brown)
  const th = level.theme || {}, trunkC = th.treeTrunk || '#5a3d20', leafC = th.treeLeaf || '#3f7a30', leafHurtC = th.treeLeafHurt || '#4e8a3a';
  for (const tr of trees) {
    if (tr.hp <= 0) { ctx.fillStyle = trunkC; ctx.fillRect(tr.x - 7, GROUND - 16, 14, 16); continue; }
    const sway = Math.sin(t / 20 + tr.sway) * 3;
    ctx.fillStyle = trunkC; ctx.fillRect(tr.x - 8, GROUND - tr.h * 0.45, 16, tr.h * 0.45);
    ctx.fillStyle = tr.hp < tr.max ? leafHurtC : leafC;
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
  drawEmbers();
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
