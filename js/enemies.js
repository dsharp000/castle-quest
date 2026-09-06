// Goblins (roaming + raiders) and the troll boss: AI, raids, drops, drawing.

const newGob = x => { const hp = level.goblinHp || 3; return { x, y: GROUND, vx: 0, hp, max: hp, face: -1, home: x, state: 'patrol', dir: Math.random() < .5 ? 1 : -1, hurt: 0, atkCd: 0 }; };
// A fast desert sand-viper. Roams like a goblin but sprints when it spots you,
// and every 4th bite is venomous — 2 hearts instead of 1. `atkN` counts bites.
const newSnake = x => { const hp = level.snakeHp || 3; return { x, y: GROUND, vx: 0, hp, max: hp, face: -1, home: x, state: 'patrol', dir: Math.random() < .5 ? 1 : -1, hurt: 0, atkCd: 0, kind: 'snake', atkN: 0 }; };
// `afterGoal` bosses stay away (alive:false, arrived:false) until the castle is
// finished — main.js summons them. `subdued` = beaten but not yet killed/removed
// (used by tame levels, where you tame it instead of finishing it off).
const newTroll = spec => ({ x: worldX(spec.x), y: GROUND, hp: spec.hp, max: spec.hp, dmg: spec.dmg || 2, c1: spec.c1, c2: spec.c2, shape: spec.shape, name: spec.name, face: -1, atkT: 0, alive: !spec.afterGoal, arrived: !spec.afterGoal, subdued: false, tamed: false, hurt: 0 });

// Cave slime (Level 4): oozes in as a baby every few raids and EATS everything
// it touches — enemies, resource nodes, and bites of the knight — growing one
// `size` each meal. Bigger = more hp, more damage… but slower. Derived stats:
const slimeR   = s => 12 + s.size * 5;                       // radius (visual + reach)
const slimeSpd = s => Math.max(0.35, 1.5 - s.size * 0.16);   // crawl speed — slows as it grows
const slimeDmg = s => Math.min(5, s.size);                   // bite damage — baby 1 → up to 5
const slimeMax = s => 3 + s.size * 2;                        // hp cap by size
const newSlime = x => { const o = { x, y: GROUND, face: 1, kind: 'slime', size: 1, hurt: 0, atkCd: 0 }; o.max = slimeMax(o); o.hp = o.max; return o; };
function slimeGrow(s) {
  if (s.size < ((level.slime && level.slime.maxSize) || 8)) s.size++;
  s.max = slimeMax(s); s.hp = s.max; // a meal heals it to its new (larger) cap
  puff(s.x, s.y - slimeR(s), '#8ee06a', 8);
}

function updateGoblins() {
  const p = player;
  for (const g of goblins) {
    if (g.hp <= 0) continue;
    if (g.hurt > 0) g.hurt--;
    if (g.atkCd > 0) g.atkCd--;
    const snake = g.kind === 'snake';
    const dx = p.x - g.x;
    if (Math.abs(dx) < (snake ? 240 : 170) && Math.abs(p.y - g.y) < 80) g.state = 'chase';
    else if (Math.abs(dx) > (snake ? 420 : 320)) g.state = 'patrol';
    if (g.state === 'chase') { g.vx = Math.sign(dx) * (snake ? 2.5 : 1.3); g.face = Math.sign(dx); }
    else { g.vx = g.dir * (snake ? 1.1 : 0.6); g.face = g.dir; if (Math.abs(g.x - g.home) > 120) g.dir *= -1; }
    g.x += g.vx;
    if (Math.abs(dx) < 26 && Math.abs(p.y - g.y) < 50 && g.atkCd <= 0 && p.inv <= 0) {
      if (snake) {
        // every 4th strike is a venomous bite worth 2 hearts; the rest do 1
        const venom = (++g.atkN) % 4 === 0;
        hurtPlayer(venom ? 2 : 1); g.atkCd = 34;
        if (venom) { pop(g.x, g.y - 46, '🐍 VENOM! −2'); sfx.deny(); }
      } else { hurtPlayer(1); g.atkCd = 50; }
    }
  }
  // keep the forest populated — but cleared areas stay cleared until the
  // player returns near the castle wall (120px) or a minute passes (hidden timer)
  goblins = goblins.filter(g => g.hp > 0);
  if (goblins.length < level.goblinMinAlive) {
    respawnWait++;
    if ((near(p.x, castleRight(), 120) || respawnWait >= 60 * 60) && t % 300 === 0) {
      const zs = [].concat(level.goblinRespawnZone), z = zs[ri(0, zs.length - 1)];
      goblins.push(newGob(rand(z.from, worldX(z.to))));
    }
  } else respawnWait = 0;
}

function updateTroll() {
  if (!troll.alive || troll.subdued) return; // not arrived, gone, or beaten & waiting to be tamed
  if (troll.hurt > 0) troll.hurt--;
  const dx = player.x - troll.x;
  // the Raging Troll hunts from farther, moves faster, and hits faster the more
  // hurt it is (rage climbs from 0 → 1 as its hp drops).
  const rage = troll.raging ? 1 - troll.hp / troll.max : 0;
  const range = troll.raging ? 340 : 200;
  const spd = troll.raging ? 1.5 + rage * 0.9 : 0.7;
  const atkGap = troll.raging ? Math.round(60 - rage * 30) : 70;
  if (Math.abs(dx) < range) {
    troll.x += Math.sign(dx) * spd; troll.face = Math.sign(dx);
    if (Math.abs(dx) < 44 && troll.atkT <= 0 && player.inv <= 0) { hurtPlayer(troll.dmg); troll.atkT = atkGap; }
  }
  if (troll.atkT > 0) troll.atkT--;
}

function updateRaiders() {
  const p = player;
  if (!menuOpen) raidTimer--;
  if (raidTimer <= 0) {
    wave++; spawnRaid(); raidTimer = 60 * (level.raids.firstDelaySec + wave * level.raids.extraDelayPerWaveSec);
    // a baby slime oozes in from a cave wall every few raids (Level 4 only)
    if (level.slime && wave % (level.slime.everyRaids || 6) === 0) {
      slimes.push(newSlime(Math.random() < .5 ? 150 : WORLD_W - 150));
      say('🟢 A baby slime oozes out of the cave wall…', 200);
    }
  }
  for (const r of raiders) {
    if (r.hp <= 0) continue;
    if (r.hurt > 0) r.hurt--;
    const dx = p.x - r.x;
    if (r.turned && Math.abs(dx) > 320) r.turned = false; // lost the player — rejoin the raid
    if (r.turned) { r.x += Math.sign(dx) * 1.2; r.face = Math.sign(dx) || -1; }
    // a villager draws the raiders before the castle does — no hiding place
    else if (villager && Math.abs(villager.x - r.x) < 300) {
      const vdx = villager.x - r.x;
      if (Math.abs(vdx) > 16) { r.x += Math.sign(vdx) * 1.25; r.face = Math.sign(vdx); }
    }
    else {
      // approach whichever face of the castle is nearer and bash it
      const mid = castle.x + castle.w / 2;
      const target = r.x > mid ? castleRight() + 10 : castle.x - 10;
      if (Math.abs(r.x - target) > 2) { r.x += Math.sign(target - r.x) * 1.1; r.face = Math.sign(target - r.x); }
      else if (t % 20 === 0) { castle.hp -= Math.max(1, 3 - Math.floor(castleDef() / 20)); puff(r.x > mid ? castle.x + castle.w : castle.x, GROUND - 40, '#ff6b5b', 4); }
    }
    if (Math.abs(dx) < 24 && Math.abs(p.y - r.y) < 50 && r.atkCd <= 0 && p.inv <= 0) { hurtPlayer(1); r.atkCd = 55; }
    if (r.atkCd > 0) r.atkCd--;
  }
  raiders = raiders.filter(r => r.hp > 0);
}

function updateSlimes() {
  const p = player;
  for (const s of slimes) {
    if (s.hp <= 0) continue;
    if (s.hurt > 0) s.hurt--;
    if (s.atkCd > 0) s.atkCd--;
    const r = slimeR(s);
    // crawl toward the nearest meal: the knight or any goblin/raider
    let tx = p.x, td = Math.abs(p.x - s.x);
    for (const e of [...goblins, ...raiders]) if (e.hp > 0) { const d = Math.abs(e.x - s.x); if (d < td) { td = d; tx = e.x; } }
    const dir = Math.sign(tx - s.x) || 1;
    s.x += dir * slimeSpd(s); s.face = dir;
    // eat any enemy it overlaps → grow
    for (const e of [...goblins, ...raiders]) if (e.hp > 0 && Math.abs(e.x - s.x) < r) { e.hp = 0; slimeGrow(s); pop(s.x, s.y - r - 8, '😋 nom!'); }
    // eat resource nodes it overlaps → grow (they respawn as usual)
    for (const arr of [trees, rocks, ores, golds]) for (const o of arr) if (o.hp > 0 && Math.abs(o.x - s.x) < r) { o.hp = 0; o.respawn = 60 * 25; slimeGrow(s); }
    // bite the knight on contact → damage scaled by size, and grow
    if (Math.abs(p.x - s.x) < r + 10 && Math.abs(p.y - s.y) < 60 && s.atkCd <= 0 && p.inv <= 0) { hurtPlayer(slimeDmg(s)); s.atkCd = 45; slimeGrow(s); }
  }
  slimes = slimes.filter(s => s.hp > 0);
}

function drawSlimes() {
  for (const s of slimes) {
    if (s.hp <= 0) continue;
    const r = slimeR(s), wob = Math.sin(t / 6 + s.x) * (r * 0.08);
    ctx.save(); ctx.translate(s.x, GROUND);
    ctx.globalAlpha = 0.85; ctx.fillStyle = s.hurt > 0 ? '#c8f0a0' : '#6ab04c'; // gelatinous dome
    ctx.beginPath(); ctx.ellipse(0, -r * 0.6 + wob, r, r * 0.8 - wob, 0, 0, 2 * Math.PI); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#4e8a3a'; ctx.beginPath(); ctx.ellipse(0, -2, r * 0.95, r * 0.28, 0, 0, 2 * Math.PI); ctx.fill(); // base
    ctx.fillStyle = '#bdf09a99'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.85, r * 0.28, r * 0.2, 0, 0, 2 * Math.PI); ctx.fill(); // sheen
    const ex = s.face * r * 0.25; // eyes look the way it's heading
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 5, -r * 0.7, 3.2, 0, 2 * Math.PI); ctx.arc(ex + 5, -r * 0.7, 3.2, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#1c2a10'; ctx.beginPath(); ctx.arc(ex - 5 + s.face, -r * 0.7, 1.6, 0, 2 * Math.PI); ctx.arc(ex + 5 + s.face, -r * 0.7, 1.6, 0, 2 * Math.PI); ctx.fill();
    ctx.restore();
    if (s.hp < s.max) bar(s.x, GROUND - r * 1.4 - 6, s.hp / s.max);
  }
}

function spawnRaid() {
  const n = Math.min(level.raids.baseCount + wave, level.raids.maxCount);
  say(`⚠️ RAID! ${n} goblins are attacking the castle!`, 220);
  sfx.raidHorn();
  // the raid horn also makes the villager rethink their prices
  if (villager) { villager.trades = rollTrades(); pop(villager.x, villager.y - 74, '🤝 new trades!'); }
  const hp = 3 + Math.floor(wave / 2) + (level.raids.hpBonus || 0);
  const fromLeft = Math.random() < .5; // the WHOLE raid strikes from one side — chosen here, never announced
  for (let i = 0; i < n; i++) {
    const d = rand(40, 300) + Math.floor(i / 2) * 50;
    raiders.push({ x: fromLeft ? d : WORLD_W - d, y: GROUND, hp, max: hp, face: fromLeft ? 1 : -1, hurt: 0, atkCd: 0, raider: true });
  }
}

function killEnemy(g) {
  sfx.kill();
  recordKill(g.kind === 'snake' ? 'snake' : g.raider ? 'raider' : 'goblin'); // Raging Troll tally

  const iron = ri(1, 2), wood = ri(0, 2);
  res.iron += iron; if (wood) res.wood += wood;
  // sand-vipers also drop raw meat — a keeper resource for later (kept for the
  // whole run, only lost if you die; it rides in `res` like wood/stone/iron/gold)
  let extra = '';
  if (g.kind === 'snake') {
    const meat = Math.min(ri(1, 2), MAX_MEAT - res.meat); // capped — pack only holds MAX_MEAT
    if (meat > 0) { res.meat += meat; extra = ` +${meat} 🥩`; }
    else extra = ' (🥩 pack full)';
  }
  pop(g.x, g.y - 50, `+${iron} ⚙️${wood ? ` +${wood} 🪵` : ''}${extra}`);
  puff(g.x, g.y - 25, '#ffd98a', 10);
}

// ---- drawing ----
function drawGob(g) {
  ctx.save(); ctx.translate(g.x, g.y); ctx.scale(g.face || 1, 1);
  if (g.hurt > 0) ctx.globalAlpha = 0.6;
  ctx.fillStyle = g.raider ? '#8a4a1f' : '#4a7a2a';
  const bob = Math.sin(t / 3 + g.x) * 2;
  ctx.fillRect(-9, -30 + bob, 18, 22);
  ctx.fillStyle = g.raider ? '#a35a25' : '#5c9435'; ctx.fillRect(-8, -44 + bob, 16, 15);
  ctx.fillStyle = '#e5484d'; ctx.fillRect(2, -40 + bob, 4, 4);
  ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-8, -8, 6, 8); ctx.fillRect(2, -8, 6, 8);
  ctx.fillStyle = '#999'; ctx.fillRect(9, -32 + bob, 3, 14);
  ctx.globalAlpha = 1; ctx.restore();
  if (g.hp < g.max) bar(g.x, g.y - 56, g.hp / g.max);
  if (g.raider) { ctx.font = '10px sans-serif'; ctx.fillStyle = '#ff9a9a'; ctx.textAlign = 'center'; ctx.fillText('raider', g.x, g.y - 60); ctx.textAlign = 'left'; }
}

function drawSnakeMob(g) {
  ctx.save(); ctx.translate(g.x, g.y); ctx.scale(g.face || 1, 1);
  if (g.hurt > 0) ctx.globalAlpha = 0.6;
  // a low, ground-hugging body: a trail of shrinking banded coils behind a head.
  // Olive-green so it stands out against the desert sand (not camouflaged).
  for (let i = 7; i >= 0; i--) {
    const r = 8 - i * 0.7, sx = -4 - i * 6.5, sy = -6 - Math.sin(t / 4 + i * 0.8 + g.x) * 3;
    ctx.fillStyle = i % 2 ? '#6f9a3e' : '#3f5a1c'; // green scales with darker bands
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, 2 * Math.PI); ctx.fill();
  }
  const wig = Math.sin(t / 4 + g.x) * 2;
  ctx.fillStyle = '#6f9a3e'; ctx.beginPath(); ctx.ellipse(9, -12 + wig, 11, 7, 0, 0, 2 * Math.PI); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(13, -15 + wig, 3, 3); // slit eye
  if (Math.abs(player.x - g.x) < 70 && Math.floor(t / 8) % 2) { // tongue flick when you're near
    ctx.strokeStyle = '#e5484d'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(19, -12 + wig); ctx.lineTo(27, -9 + wig); ctx.moveTo(19, -12 + wig); ctx.lineTo(27, -15 + wig); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.restore();
  if (g.hp < g.max) bar(g.x, g.y - 32, g.hp / g.max);
}

// The fire-dragon body, drawn in a local frame (origin = feet, facing +x). Shared
// by the boss (drawTroll) and the ride-off cutscene so the two look identical.
// opt: { bob, wf (wing-flap offset), flame }. Returns local-space anchor points
// (saddle where a rider sits, and the mouth) for the cutscene to place the knight.
function drawDragonBody(c1, c2, opt) {
  opt = opt || {};
  const bob = opt.bob != null ? opt.bob : Math.sin(t / 7) * 3;
  const wf = opt.wf != null ? opt.wf : Math.sin(t / 8) * 8;
  const flame = opt.flame != null ? opt.flame : true;
  const dark = '#4d1210';
  // ---- far wing (behind everything): finger-bones + scalloped membrane ----
  const bones = [[-72, -104 - wf], [-58, -120 - wf], [-38, -122 - wf], [-18, -110 - wf * .6]];
  ctx.fillStyle = c2; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(-12, -46 + bob); ctx.lineTo(-6, -94 + bob - wf * .4);
  bones.forEach(b => ctx.lineTo(b[0], b[1] + bob));
  ctx.quadraticCurveTo(-34, -78 + bob, -22, -66 + bob);
  ctx.quadraticCurveTo(-34, -60 + bob, -18, -50 + bob); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.75; // finger struts
  bones.forEach(b => { ctx.beginPath(); ctx.moveTo(-8, -90 + bob - wf * .4); ctx.lineTo(b[0], b[1] + bob); ctx.stroke(); });
  ctx.globalAlpha = 1;
  // ---- spaded tail curling out behind, tapering to an arrow tip ----
  for (let i = 7; i >= 1; i--) {
    const r = 6 + i * 2, sy = -14 + bob - Math.sin(t / 10 + i) * 2;
    ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(-38 - i * 8, sy, r, r * 0.82, 0, 0, 2 * Math.PI); ctx.fill();
  }
  const tx0 = -38 - 8 * 8, ty0 = -14 + bob;
  ctx.fillStyle = c2; ctx.beginPath();
  ctx.moveTo(tx0 + 8, ty0 - 3); ctx.lineTo(tx0 - 12, ty0 - 12); ctx.lineTo(tx0 - 4, ty0); ctx.lineTo(tx0 - 12, ty0 + 12); ctx.closePath(); ctx.fill();
  // ---- body + belly plates ----
  ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(-6, -30 + bob, 36, 24, 0, 0, 2 * Math.PI); ctx.fill();
  ctx.fillStyle = c2; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(-2, -20 + bob, 26, 15, 0, 0, 2 * Math.PI); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-2 + i * 10, -9 + bob); ctx.lineTo(-2 + i * 10, -2 + bob); ctx.stroke(); }
  // ---- clawed legs ----
  ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(-22, -18 + bob, 12, 15, 0, 0, 2 * Math.PI); ctx.fill(); // haunch
  ctx.fillStyle = c1; ctx.fillRect(-30, -10 + bob, 13, 12);
  ctx.fillStyle = c1; ctx.fillRect(6, -14 + bob, 9, 16); // front leg reaching down
  ctx.fillStyle = '#f4d9a0'; // claws on both feet
  for (const cx2 of [-31, -26, -21, 3, 8, 13]) { ctx.beginPath(); ctx.moveTo(cx2, 2 + bob); ctx.lineTo(cx2 + 2, 8 + bob); ctx.lineTo(cx2 + 4, 2 + bob); ctx.fill(); }
  // ---- S-curved neck of shrinking scales up to the head ----
  const neck = [];
  for (let i = 0; i <= 6; i++) {
    const nx = 8 + i * 5 + Math.sin(i * 0.5) * 3, ny = -46 - i * 12 + bob;
    neck.push([nx, ny]);
    ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(nx, ny, 14 - i * 1.3, 13 - i * 1.2, 0, 0, 2 * Math.PI); ctx.fill();
  }
  ctx.fillStyle = c2; // dorsal spines up the neck + a few along the back
  for (let i = 1; i < neck.length; i++) { const [nx, ny] = neck[i]; ctx.beginPath(); ctx.moveTo(nx - 10, ny - 1); ctx.lineTo(nx - 20, ny - 9); ctx.lineTo(nx - 7, ny + 4); ctx.fill(); }
  for (const bx of [-24, -14, -4]) { ctx.beginPath(); ctx.moveTo(bx, -50 + bob); ctx.lineTo(bx - 4, -64 + bob); ctx.lineTo(bx + 6, -50 + bob); ctx.fill(); }
  // ---- head: skull, snout, open fanged jaw, swept horns ----
  const hx = neck[6][0] + 8, hy = neck[6][1] - 4;
  ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(hx, hy, 16, 12, 0, 0, 2 * Math.PI); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 4, hy - 7); ctx.lineTo(hx + 34, hy - 4); ctx.lineTo(hx + 30, hy + 2); ctx.lineTo(hx + 6, hy + 3); ctx.closePath(); ctx.fill(); // upper snout
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(hx + 6, hy + 4); ctx.lineTo(hx + 30, hy + 6); ctx.lineTo(hx + 8, hy + 11); ctx.closePath(); ctx.fill(); // lower jaw
  ctx.fillStyle = '#fff4d6'; // teeth
  for (const tx of [hx + 14, hx + 20, hx + 26]) { ctx.beginPath(); ctx.moveTo(tx, hy + 2); ctx.lineTo(tx + 2, hy + 6); ctx.lineTo(tx + 4, hy + 2); ctx.fill(); }
  ctx.fillStyle = c2; // two swept-back horns
  ctx.beginPath(); ctx.moveTo(hx - 6, hy - 8); ctx.lineTo(hx - 22, hy - 22); ctx.lineTo(hx - 4, hy - 12); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx - 1, hy - 9); ctx.lineTo(hx - 13, hy - 26); ctx.lineTo(hx + 3, hy - 11); ctx.fill();
  ctx.fillStyle = dark; ctx.fillRect(hx - 2, hy - 6, 10, 3); // brow ridge
  ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(hx + 5, hy - 1, 3.6, 0, 2 * Math.PI); ctx.fill(); // eye
  ctx.fillStyle = '#1c0a08'; ctx.beginPath(); ctx.ellipse(hx + 6, hy - 1, 1.4, 2.4, 0, 0, 2 * Math.PI); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(hx + 30, hy - 2, 1.6, 0, 2 * Math.PI); ctx.fill(); // nostril
  // ---- breathed flame: layered yellow → orange → white-hot core ----
  if (flame && Math.floor(t / 8) % 2) {
    const mx = hx + 32, my = hy + 3;
    ctx.fillStyle = '#ffd23a'; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(mx, my - 6); ctx.lineTo(mx + 34, my - 10); ctx.lineTo(mx + 26, my); ctx.lineTo(mx + 42, my + 5); ctx.lineTo(mx + 24, my + 6); ctx.lineTo(mx + 32, my + 13); ctx.lineTo(mx, my + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff6a1e';
    ctx.beginPath(); ctx.moveTo(mx, my - 2); ctx.lineTo(mx + 22, my - 3); ctx.lineTo(mx + 16, my + 2); ctx.lineTo(mx + 26, my + 6); ctx.lineTo(mx, my + 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff0b0';
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 11, my - 1); ctx.lineTo(mx + 5, my + 3); ctx.fill();
    ctx.globalAlpha = 1;
  }
  return { sadX: -6, sadY: -52 + bob, mouthX: hx + 30, mouthY: hy + 2 };
}

function drawTroll() {
  const tr = troll; ctx.save(); ctx.translate(tr.x, tr.y); ctx.scale(tr.face, 1);
  if (tr.hurt > 0) ctx.globalAlpha = 0.6;
  const bob = Math.sin(t / 7) * 3;
  if (tr.raging) { // pulsing fury aura, angrier as it's worn down
    const rr = 50 + Math.sin(t / 5) * 6 + (1 - tr.hp / tr.max) * 12;
    ctx.fillStyle = Math.floor(t / 6) % 2 ? '#ff3a1e44' : '#ff6a2e33';
    ctx.beginPath(); ctx.arc(0, -42, rr, 0, 2 * Math.PI); ctx.fill();
  }
  if (tr.shape === 'snake') {
    // tapering segments slither behind a raised neck; head faces the player
    for (let i = 11; i >= 0; i--) {
      const raise = Math.max(0, 5 - i), r = 15 - i * 0.6;
      const sy = -14 - raise * 13 + (raise ? bob * raise / 5 : Math.sin(t / 8 + i * 0.9) * 4);
      ctx.fillStyle = tr.c1 || '#e3d7b4'; ctx.beginPath(); ctx.arc(10 - i * 8.5, sy, r, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = tr.c2 || '#b9915f'; ctx.beginPath(); ctx.arc(10 - i * 8.5, sy - r * 0.55, r * 0.35, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.fillStyle = tr.c2 || '#b9915f'; ctx.beginPath(); ctx.ellipse(22, -82 + bob, 20, 12, 0, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#e5484d'; ctx.fillRect(29, -88 + bob, 6, 6);
    if (Math.floor(t / 16) % 2) {
      ctx.strokeStyle = '#e5484d'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(42, -82 + bob); ctx.lineTo(55, -76 + bob); ctx.moveTo(42, -82 + bob); ctx.lineTo(55, -88 + bob); ctx.stroke();
    }
  } else if (tr.shape === 'salamander') {
    // a big, low, four-legged cave amphibian — dark body with glowing spots,
    // feathery gills, a broad grinning head. c1 = body, c2 = spots/gills.
    const c1 = tr.c1 || '#43372f', c2 = tr.c2 || '#e8892b';
    // tail: a tapering trail of coils curling up behind
    for (let i = 5; i >= 1; i--) {
      const r = 6 + i * 1.8, sy = -14 + bob - i * 1.5 + Math.sin(t / 9 + i) * 2;
      ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(-30 - i * 9, sy, r, r * 0.72, 0, 0, 2 * Math.PI); ctx.fill();
    }
    // four stubby legs splayed on the floor
    ctx.fillStyle = c1;
    ctx.fillRect(-28, -10, 10, 12); ctx.fillRect(-16, -8, 10, 12);
    ctx.fillRect(6, -8, 10, 12); ctx.fillRect(18, -10, 10, 12);
    // long low body
    ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(-2, -22 + bob, 38, 19, 0, 0, 2 * Math.PI); ctx.fill();
    // glowing back spots
    ctx.fillStyle = c2;
    for (const sx of [-24, -8, 8, 22]) { ctx.beginPath(); ctx.ellipse(sx, -32 + bob, 6, 4.5, 0, 0, 2 * Math.PI); ctx.fill(); }
    // broad head at the front
    ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(34, -25 + bob, 21, 16, 0, 0, 2 * Math.PI); ctx.fill();
    // feathery gill frills
    ctx.strokeStyle = c2; ctx.lineWidth = 3;
    for (const gy of [-36, -27, -18]) { ctx.beginPath(); ctx.moveTo(22, gy + bob); ctx.lineTo(10, gy - 3 + bob); ctx.stroke(); }
    // wide grin
    ctx.strokeStyle = '#1c1208'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(28, -17 + bob); ctx.lineTo(52, -19 + bob); ctx.stroke();
    // eye
    ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(40, -31 + bob, 4.5, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#1c1208'; ctx.beginPath(); ctx.arc(41, -31 + bob, 2, 0, 2 * Math.PI); ctx.fill();
  } else if (tr.shape === 'dragon') {
    drawDragonBody(tr.c1 || '#8a1f18', tr.c2 || '#f0761e', { bob }); // shared art (see drawDragonBody)
  } else {
    ctx.fillStyle = tr.c1 || '#5a6b4a'; ctx.fillRect(-24, -70 + bob, 48, 58);
    ctx.fillStyle = tr.c2 || '#6b7c5a'; ctx.fillRect(-18, -95 + bob, 36, 28);
    ctx.fillStyle = '#e5484d'; ctx.fillRect(4, -88 + bob, 7, 7);
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-22, -12, 14, 12); ctx.fillRect(8, -12, 14, 12);
    ctx.fillStyle = '#7a5230'; ctx.fillRect(22, -80 + bob, 10, 50);
  }
  ctx.globalAlpha = 1; ctx.restore();
  const labelY = tr.shape === 'dragon' ? 162 : 108; // the reared dragon is taller — lift its bar/name clear of the horns
  bar(tr.x, tr.y - labelY, tr.hp / tr.max);
  ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = '#ffc94d'; ctx.textAlign = 'center'; ctx.fillText(tr.name, tr.x, tr.y - labelY - 6); ctx.textAlign = 'left';
}

function drawEnemies() {
  for (const gb of [...goblins, ...raiders]) if (gb.hp > 0) (gb.kind === 'snake' ? drawSnakeMob : drawGob)(gb);
  if (troll.alive) drawTroll();
}
