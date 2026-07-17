// Background, HUD, health bars, title/end screens, and draw orchestration.
// Entity-specific drawing lives with each entity's module.

function cam() { return Math.max(0, Math.min(WORLD_W - W, player.x - W / 2)); }

function bar(x, y, f) {
  ctx.fillStyle = '#00000088'; ctx.fillRect(x - 18, y, 36, 5);
  ctx.fillStyle = f > .5 ? '#5cb85c' : '#e8b640'; ctx.fillRect(x - 18, y, 36 * f, 5);
}

function drawBackground(cx) {
  const th = level.theme || {}; // per-level palette; defaults = forest
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, th.sky0 || '#241b3d'); g.addColorStop(.6, th.sky1 || '#4a3568'); g.addColorStop(.61, th.deep0 || '#2e4423'); g.addColorStop(1, th.deep1 || '#22331a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.font = '26px serif'; ctx.fillText('🌕', W - 70 - cx * 0.02, 60);
  ctx.font = '12px serif'; ctx.fillText('✦', 120 - cx * 0.03, 50); ctx.fillText('✦', 420 - cx * 0.03, 90); ctx.fillText('✦', 700 - cx * 0.03, 40);
  // far hills
  ctx.fillStyle = th.hills || '#332a52';
  for (let i = 0; i < 8; i++) { const hx = ((i * 520 - cx * 0.25) % (W + 600)) - 300; ctx.beginPath(); ctx.ellipse(hx, H * 0.62, 260, 110, 0, Math.PI, 0); ctx.fill(); }
  // far tree silhouettes
  ctx.fillStyle = th.far || '#2a2244';
  for (let i = 0; i < 20; i++) { const hx = ((i * 230 - cx * 0.5) % (W + 300)) - 150; ctx.beginPath(); ctx.moveTo(hx, 310); ctx.lineTo(hx + 26, 190); ctx.lineTo(hx + 52, 310); ctx.fill(); }
  // ground
  ctx.fillStyle = th.ground || '#3d5a2e'; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = th.edge || '#2e4423'; ctx.fillRect(0, GROUND, W, 8);
  ctx.fillStyle = th.tufts || '#4a6b38';
  for (let i = 0; i < 30; i++) { const gx = ((i * 160 - cx) % (W + 200)) - 100; ctx.fillRect(gx, GROUND + (i * 7 % 40) + 12, 14, 3); }
}

function draw() {
  const cx = cam();
  drawBackground(cx);
  ctx.save(); ctx.translate(-cx, 0);      // ---- world space ----
  drawCastle();
  for (const pl of platforms) { ctx.fillStyle = '#6b4a2b'; ctx.fillRect(pl.x, pl.y, pl.w, 12); ctx.fillStyle = '#5cb85c'; ctx.fillRect(pl.x, pl.y, pl.w, 4); }
  drawWorld();
  drawEnemies();
  drawArrows();
  drawPlayer();
  drawParticles();
  ctx.restore();                          // ---- screen space ----
  drawHUD();
  if (menuOpen) drawMenu();
  if (msgT > 0) {
    ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#00000099';
    const w2 = ctx.measureText(msg).width + 30; ctx.fillRect(W / 2 - w2 / 2, 66, w2, 30);
    ctx.fillStyle = '#ffe9a8'; ctx.fillText(msg, W / 2, 86); ctx.textAlign = 'left';
  }
}

function drawHUD() {
  ctx.fillStyle = '#00000077'; ctx.fillRect(8, 8, W - 16, 46);
  ctx.font = '16px sans-serif';
  let hearts = ''; for (let i = 0; i < player.maxHp; i++) hearts += i < player.hp ? '❤️' : '🖤';
  ctx.fillText(hearts, 16, 30);
  // speedrun timer
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`⏱ ${fmtTime(runTime)}`, W / 2, 30); ctx.textAlign = 'left';
  ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`🪵 ${res.wood}   🪨 ${res.stone}   ⚙️ ${res.iron}   ⚔️ dmg ${swordDmg()}   🌀 ${player.tpCd > 0 ? Math.ceil(player.tpCd / 60) + 's' : 'ready (U)'}`, 16, 48);
  // castle hp + raid countdown
  ctx.textAlign = 'right';
  ctx.fillText(`🏰 ${Math.max(0, Math.ceil(castle.hp))}/${castle.maxHp}`, W - 16, 30);
  const rs = Math.ceil(raidTimer / 60);
  ctx.fillStyle = rs <= 10 ? '#ff8a8a' : '#ffe9a8';
  ctx.fillText(rs <= 10 ? `⚠️ RAID IN ${rs}s!` : `next raid: ${rs}s`, W - 16, 48);
  ctx.textAlign = 'left';
  // goal line
  const goal = level.goal;
  ctx.font = '11px sans-serif'; ctx.fillStyle = '#c9b68a';
  ctx.fillText(`GOAL: Keep lvl ${goal.keep} (${castle.keep}/${goal.keep}) • ${goal.walls} walls (${castle.walls}/${goal.walls}) • ${goal.towers} towers (${castle.towers}/${goal.towers}) • defeat the troll ${troll.alive ? '❌' : '✔️'}`, 16, H - 10);
  ctx.textAlign = 'right'; ctx.fillText(muted ? '🔇 M' : '🔊 M', W - 16, H - 10); ctx.textAlign = 'left';
}

function drawPause() {
  ctx.fillStyle = '#14101fcc'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = '54px serif'; ctx.fillText('⏸', W / 2, H / 2 - 44);
  ctx.font = 'bold 30px sans-serif'; ctx.fillStyle = '#ffc94d'; ctx.fillText('PAUSED', W / 2, H / 2 + 6);
  ctx.font = '14px sans-serif'; ctx.fillStyle = '#f3e5c3'; ctx.fillText(`⏱ ${fmtTime(runTime)} — timer and enemies are frozen`, W / 2, H / 2 + 36);
  ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('press Y to resume', W / 2, H / 2 + 68);
  ctx.textAlign = 'left';
}

// Level-select card geometry — shared with the tap handler in input.js.
function titleCard(i) {
  const w = 330, gap = 20, total = LEVELS.length * (w + gap) - gap;
  return { x: W / 2 - total / 2 + i * (w + gap), y: 296, w, h: 92 };
}

function drawTitle() {
  ctx.fillStyle = '#1a1430'; ctx.fillRect(0, 0, W, H);
  ctx.font = '58px serif'; ctx.textAlign = 'center'; ctx.fillText('🏰', W / 2, 115);
  ctx.font = 'bold 42px sans-serif'; ctx.fillStyle = '#ffc94d'; ctx.fillText('CASTLE QUEST', W / 2, 168);
  ctx.font = '13px sans-serif'; ctx.fillStyle = '#f3e5c3';
  ['Venture out ➡️ chop trees 🌲 mine rocks 🪨 and iron ⚙️ — goblins 👺 drop loot!',
   'Return to your castle to build walls, towers & forge your sword',
   'Defend against raids… defeat the troll 🧌 and complete your castle!'].forEach((s, i) => ctx.fillText(s, W / 2, 200 + i * 22));
  ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#c9b68a'; ctx.fillText('— CHOOSE YOUR QUEST —', W / 2, 284);
  LEVELS.forEach((lv, i) => {
    const c = titleCard(i), sel = i === selLevel;
    ctx.fillStyle = sel ? '#3a2f4a' : '#241d33'; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = sel ? '#ffc94d' : '#4a3a5a'; ctx.lineWidth = sel ? 3 : 2; ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.font = 'bold 17px sans-serif'; ctx.fillStyle = sel ? '#ffc94d' : '#c9b68a';
    ctx.fillText(`${i + 1}. ${lv.name}`, c.x + c.w / 2, c.y + 28);
    ctx.font = '12px sans-serif'; ctx.fillStyle = '#e8b640'; ctx.fillText(lv.tag || '', c.x + c.w / 2, c.y + 50);
    const b = levelBest(i);
    ctx.fillStyle = '#f3e5c3';
    ctx.fillText(b ? `🏆 best: ${fmtTime(b.time)} — ${b.name || 'Knight'}` : 'no times yet — be the first!', c.x + c.w / 2, c.y + 72);
  });
  ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = Math.floor(t / 30) % 2 ? '#ffc94d' : '#fff';
  ctx.fillText('←/→ or tap a card to choose • any other key (or tap it again) to start', W / 2, H - 42);
  ctx.textAlign = 'left';
}

function drawEnd(win) {
  ctx.fillStyle = '#1a1430ee'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  if (!win) {
    ctx.font = '70px serif'; ctx.fillText('💀', W / 2, 180);
    ctx.font = 'bold 36px sans-serif'; ctx.fillStyle = '#e5484d'; ctx.fillText('THE CASTLE HAS FALLEN', W / 2, 240);
    ctx.font = '16px sans-serif'; ctx.fillStyle = '#f3e5c3'; ctx.fillText('The raiders broke through… rebuild and try again!', W / 2, 280);
    ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('— tap or click to play again —', W / 2, 330);
    ctx.textAlign = 'left'; return;
  }
  ctx.font = '54px serif'; ctx.fillText('👑', W / 2, 105);
  ctx.font = 'bold 32px sans-serif'; ctx.fillStyle = '#ffc94d'; ctx.fillText('YOUR CASTLE IS COMPLETE!', W / 2, 150);
  if (lastRun) {
    ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(`⏱ Your time: ${fmtTime(lastRun.time)}${lastRun.rank === 0 ? '  🏆 NEW BEST!' : ''}`, W / 2, 192);
  }
  if (enteringName) {
    ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText('⌨️ Type your name, then press Enter — or tap the screen to type', W / 2, 218);
  }
  ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#c9b68a'; ctx.fillText(`— BEST TIMES: ${level.name.toUpperCase()} —`, W / 2, 242);
  bestTimes.forEach((e, i) => {
    const isNew = lastRun && i === lastRun.rank;
    const nm = isNew && enteringName ? nameBuf + (Math.floor(t / 30) % 2 ? '_' : ' ') : (e.name || 'Knight');
    ctx.font = isNew ? 'bold 16px sans-serif' : '14px sans-serif';
    ctx.fillStyle = isNew ? '#ffc94d' : '#f3e5c3';
    ctx.fillText(`${isNew ? '→ ' : ''}${i + 1}.  ${nm} — ${fmtTime(e.time)}   (${e.date})`, W / 2, 268 + i * 24);
  });
  if (!enteringName) { ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('— tap or click to play again —', W / 2, H - 40); }
  ctx.textAlign = 'left';
}
