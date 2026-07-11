// The knight: movement, sword swings (gathering + combat), damage, drawing.

const makePlayer = x => ({ x, y: GROUND, vx: 0, vy: 0, g: true, hp: 6, maxHp: 6, face: 1, atkT: 0, atkCd: 0, inv: 0, swordLvl: 1, walk: 0 });
const swordDmg = () => player.swordLvl;

function updatePlayer() {
  const p = player;
  if (!menuOpen) {
    const sp = 2.6;
    if (keys.L) { p.vx = -sp; p.face = -1; p.walk++; }
    else if (keys.R) { p.vx = sp; p.face = 1; p.walk++; }
    else p.vx *= 0.7;
    if (keys.J && p.g) { p.vy = -10.5; p.g = false; }
  } else p.vx = 0;
  p.vy += GRAV; p.x += p.vx; p.y += p.vy;
  p.x = Math.max(30, Math.min(WORLD_W - 30, p.x));
  // ground + platforms
  p.g = false;
  if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.g = true; }
  else for (const pl of platforms) {
    if (p.vy >= 0 && p.x > pl.x - 10 && p.x < pl.x + pl.w + 10 && p.y >= pl.y - 4 && p.y <= pl.y + 14) { p.y = pl.y; p.vy = 0; p.g = true; }
  }
  // attack
  if (p.atkCd > 0) p.atkCd--;
  if (p.atkT > 0) p.atkT--;
  if (p.inv > 0) p.inv--;
  if (keys.A && p.atkCd <= 0 && !menuOpen) { p.atkT = 12; p.atkCd = 22; swing(); }
  // open build menu near the castle
  if (keys.E && near(p.x, castle.x + castle.w / 2, 220) && p.g) { menuOpen = true; keys.E = false; }
}

// One swing hits the first thing in reach: tree, rock, ore, enemy, then boss.
function swing() {
  const p = player, reach = 46, hx = p.x + p.face * reach * 0.6;
  for (const tr of trees) if (tr.hp > 0 && near(hx, tr.x, reach) && p.y > GROUND - 60) { tr.hp--; puff(tr.x, GROUND - 60, '#7ec850'); if (tr.hp <= 0) { tr.respawn = 60 * 20; const n = ri(2, 4); res.wood += n; pop(tr.x, GROUND - 90, `+${n} 🪵`); } return; }
  for (const rk of rocks) if (rk.hp > 0 && near(hx, rk.x, reach) && p.y > GROUND - 60) { rk.hp--; puff(rk.x, GROUND - 20, '#aaa'); if (rk.hp <= 0) { rk.respawn = 60 * 25; const n = ri(2, 3); res.stone += n; pop(rk.x, GROUND - 60, `+${n} 🪨`); } return; }
  for (const o of ores) if (o.hp > 0 && near(hx, o.x, reach) && p.y > GROUND - 60) { o.hp--; puff(o.x, GROUND - 20, '#c9d6ff'); if (o.hp <= 0) { o.respawn = 60 * 30; const n = ri(1, 3); res.iron += n; pop(o.x, GROUND - 60, `+${n} ⚙️`); } return; }
  for (const g of [...goblins, ...raiders]) if (g.hp > 0 && near(hx, g.x, reach) && Math.abs(p.y - g.y) < 60) { g.hp -= swordDmg(); g.hurt = 8; g.x += p.face * 14; puff(g.x, g.y - 30, '#ff8a8a'); if (g.hp <= 0) killEnemy(g); return; }
  if (troll.alive && near(hx, troll.x, reach + 20)) { troll.hp -= swordDmg(); troll.hurt = 8; puff(troll.x, troll.y - 50, '#ff8a8a'); if (troll.hp <= 0) { troll.alive = false; pop(troll.x, GROUND - 120, '💀 TROLL DEFEATED!'); say('🧌 The troll is defeated! Grab the treasure! →', 240); } return; }
}

function hurtPlayer(n) {
  player.hp -= n; player.inv = 70; puff(player.x, player.y - 30, '#ff5b5b', 8);
  if (player.hp <= 0) {
    player.hp = player.maxHp; player.x = castle.x + castle.w + 40; player.y = GROUND; player.inv = 120;
    say('💫 You were knocked out! Back at the castle…', 180);
  }
}

function drawPlayer() {
  const p = player;
  if (p.inv > 0 && Math.floor(t / 2) % 2 === 0) return; // invincibility blink
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.face, 1);
  const step = p.g && Math.abs(p.vx) > .5 ? Math.sin(p.walk / 4) * 4 : 0;
  // legs
  ctx.fillStyle = '#4a3560'; ctx.fillRect(-8, -14, 7, 14 + step * 0.5); ctx.fillRect(2, -14, 7, 14 - step * 0.5);
  // body
  ctx.fillStyle = '#7a1f2b'; ctx.fillRect(-10, -36, 20, 24);
  ctx.fillStyle = '#c9a86a'; ctx.fillRect(-10, -30, 20, 4);
  // head + helmet
  ctx.fillStyle = '#e8c39e'; ctx.fillRect(-8, -52, 16, 16);
  ctx.fillStyle = '#8d8d9a'; ctx.fillRect(-10, -56, 20, 9); ctx.fillRect(-10, -56, 5, 16);
  ctx.fillStyle = '#2b2140'; ctx.fillRect(2, -48, 4, 4);
  // sword (grows with swordLvl)
  const sw = p.atkT > 0;
  ctx.save(); ctx.translate(10, -30); ctx.rotate(sw ? -1.2 + ((12 - p.atkT) / 12) * 2.2 : 0.5);
  ctx.fillStyle = '#d9dde8'; ctx.fillRect(-2, -30 - p.swordLvl * 2, 4, 26 + p.swordLvl * 2);
  ctx.fillStyle = '#b0742a'; ctx.fillRect(-6, -6, 12, 4); ctx.fillRect(-2, -4, 4, 10);
  ctx.restore();
  if (sw) { ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(8, -28, 40, -1.4, 0.6); ctx.stroke(); }
  ctx.restore();
}
