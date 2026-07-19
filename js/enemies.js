// Goblins (roaming + raiders) and the troll boss: AI, raids, drops, drawing.

const newGob = x => { const hp = level.goblinHp || 3; return { x, y: GROUND, vx: 0, hp, max: hp, face: -1, home: x, state: 'patrol', dir: Math.random() < .5 ? 1 : -1, hurt: 0, atkCd: 0 }; };
const newTroll = spec => ({ x: worldX(spec.x), y: GROUND, hp: spec.hp, max: spec.hp, dmg: spec.dmg || 2, c1: spec.c1, c2: spec.c2, shape: spec.shape, name: spec.name, face: -1, atkT: 0, alive: true, hurt: 0 });

function updateGoblins() {
  const p = player;
  for (const g of goblins) {
    if (g.hp <= 0) continue;
    if (g.hurt > 0) g.hurt--;
    if (g.atkCd > 0) g.atkCd--;
    const dx = p.x - g.x;
    if (Math.abs(dx) < 170 && Math.abs(p.y - g.y) < 80) g.state = 'chase';
    else if (Math.abs(dx) > 320) g.state = 'patrol';
    if (g.state === 'chase') { g.vx = Math.sign(dx) * 1.3; g.face = Math.sign(dx); }
    else { g.vx = g.dir * 0.6; g.face = g.dir; if (Math.abs(g.x - g.home) > 120) g.dir *= -1; }
    g.x += g.vx;
    if (Math.abs(dx) < 26 && Math.abs(p.y - g.y) < 50 && g.atkCd <= 0 && p.inv <= 0) { hurtPlayer(1); g.atkCd = 50; }
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
  if (!troll.alive) return;
  if (troll.hurt > 0) troll.hurt--;
  const dx = player.x - troll.x;
  if (Math.abs(dx) < 200) {
    troll.x += Math.sign(dx) * 0.7; troll.face = Math.sign(dx);
    if (Math.abs(dx) < 40 && troll.atkT <= 0 && player.inv <= 0) { hurtPlayer(troll.dmg); troll.atkT = 70; }
  }
  if (troll.atkT > 0) troll.atkT--;
}

function updateRaiders() {
  const p = player;
  if (!menuOpen) raidTimer--;
  if (raidTimer <= 0) { wave++; spawnRaid(); raidTimer = 60 * (level.raids.firstDelaySec + wave * level.raids.extraDelayPerWaveSec); }
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

function spawnRaid() {
  const n = Math.min(level.raids.baseCount + wave, level.raids.maxCount);
  say(`⚠️ RAID! ${n} goblins are attacking the castle!`, 220);
  sfx.raidHorn();
  // the raid horn also makes the villager rethink their prices
  if (villager) { villager.trades = rollTrades(); pop(villager.x, villager.y - 74, '🤝 new trades!'); }
  const hp = 3 + Math.floor(wave / 2) + (level.raids.hpBonus || 0);
  for (let i = 0; i < n; i++) {
    const fromLeft = Math.random() < .5; // which side each raider strikes from stays a surprise
    const d = rand(40, 300) + Math.floor(i / 2) * 50;
    raiders.push({ x: fromLeft ? d : WORLD_W - d, y: GROUND, hp, max: hp, face: fromLeft ? 1 : -1, hurt: 0, atkCd: 0, raider: true });
  }
}

function killEnemy(g) {
  sfx.kill();
  const iron = ri(1, 2), wood = ri(0, 2);
  res.iron += iron; if (wood) res.wood += wood;
  pop(g.x, g.y - 50, `+${iron} ⚙️${wood ? ` +${wood} 🪵` : ''}`);
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

function drawTroll() {
  const tr = troll; ctx.save(); ctx.translate(tr.x, tr.y); ctx.scale(tr.face, 1);
  if (tr.hurt > 0) ctx.globalAlpha = 0.6;
  const bob = Math.sin(t / 7) * 3;
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
  } else {
    ctx.fillStyle = tr.c1 || '#5a6b4a'; ctx.fillRect(-24, -70 + bob, 48, 58);
    ctx.fillStyle = tr.c2 || '#6b7c5a'; ctx.fillRect(-18, -95 + bob, 36, 28);
    ctx.fillStyle = '#e5484d'; ctx.fillRect(4, -88 + bob, 7, 7);
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-22, -12, 14, 12); ctx.fillRect(8, -12, 14, 12);
    ctx.fillStyle = '#7a5230'; ctx.fillRect(22, -80 + bob, 10, 50);
  }
  ctx.globalAlpha = 1; ctx.restore();
  bar(tr.x, tr.y - 108, tr.hp / tr.max);
  ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = '#ffc94d'; ctx.textAlign = 'center'; ctx.fillText(tr.name, tr.x, tr.y - 114); ctx.textAlign = 'left';
}

function drawEnemies() {
  for (const gb of [...goblins, ...raiders]) if (gb.hp > 0) drawGob(gb);
  if (troll.alive) drawTroll();
}
