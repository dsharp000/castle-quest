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
  drawVillager();
  drawEnemies();
  drawSlimes();
  drawArrows();
  drawPlayer();
  drawParticles();
  ctx.restore();                          // ---- screen space ----
  drawHUD();
  if (menuOpen) (menuMode === 'trade' ? drawTradeMenu : drawMenu)();
  if (msgT > 0) {
    ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#00000099';
    const w2 = ctx.measureText(msg).width + 30; ctx.fillRect(W / 2 - w2 / 2, 66, w2, 30);
    ctx.fillStyle = '#ffe9a8'; ctx.fillText(msg, W / 2, 86); ctx.textAlign = 'left';
  }
}

// A little heap of gold nuggets, centered at (x,y) — the inventory's "gold".
function goldPile(x, y, s) {
  s = s || 1; ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.ellipse(0, 5, 11, 4, 0, 0, 2 * Math.PI); ctx.fill(); // shadowed base
  ctx.fillStyle = '#ffd23f'; // stacked nuggets
  for (const n of [[-6, 2], [0, 3], [6, 2], [-3, -2], [3, -2], [0, -6]]) { ctx.beginPath(); ctx.arc(n[0], n[1], 3.4, 0, 2 * Math.PI); ctx.fill(); }
  ctx.fillStyle = '#fff3b0'; // glints
  for (const n of [[-6, 2], [0, 3], [6, 2], [-3, -2], [3, -2], [0, -6]]) { ctx.beginPath(); ctx.arc(n[0] - 1, n[1] - 1, 1.1, 0, 2 * Math.PI); ctx.fill(); }
  ctx.restore();
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
  // gold shows as a drawn heap of nuggets instead of a coin emoji
  const inv1 = `🪵 ${res.wood}   🪨 ${res.stone}   ⚙️ ${res.iron}   `;
  ctx.fillText(inv1, 16, 48);
  const gx = 16 + ctx.measureText(inv1).width;
  goldPile(gx + 9, 42);
  ctx.fillText(`${res.gold}${res.meat ? `   🥩 ${res.meat}/${MAX_MEAT}` : ''}   ⚔️ dmg ${swordDmg()}   🌀 ${player.tpCd > 0 ? Math.ceil(player.tpCd / 60) + 's' : 'ready (U)'}`, gx + 22, 48);
  // castle hp + raid countdown
  ctx.textAlign = 'right';
  ctx.fillText(`🏰 ${Math.max(0, Math.ceil(castle.hp))}/${castle.maxHp}`, W - 16, 30);
  const rs = Math.ceil(raidTimer / 60);
  ctx.fillStyle = rs <= 10 ? '#ff8a8a' : '#ffe9a8';
  ctx.fillText(rs <= 10 ? `⚠️ RAID IN ${rs}s!` : `next raid: ${rs}s`, W - 16, 48);
  ctx.textAlign = 'left';
  // goal line
  const goal = level.goal;
  const castleGoal = `Keep lvl ${goal.keep} (${castle.keep}/${goal.keep}) • ${goal.walls} walls (${castle.walls}/${goal.walls}) • ${goal.towers} towers (${castle.towers}/${goal.towers})`;
  let bossGoal;
  if (level.tame) { // Level 5: build → summon dragon → beat it → tame it with meat
    if (!troll.arrived) bossGoal = 'finish the castle to summon the 🐉 dragon';
    else if (!troll.subdued) bossGoal = 'beat the 🐉 FIRE DRAGON! ❌';
    else if (!troll.tamed) bossGoal = `tame the 🐉 with meat (${res.meat}/${level.tame.meat} 🥩) — walk up to it`;
    else bossGoal = 'dragon TAMED ✔️';
  } else {
    bossGoal = `defeat the troll ${troll.alive ? '❌' : '✔️'}`;
  }
  ctx.font = '11px sans-serif'; ctx.fillStyle = '#c9b68a';
  ctx.fillText(`GOAL: ${castleGoal} • ${bossGoal}`, 16, H - 10);
  ctx.textAlign = 'right'; ctx.fillText(muted ? '🔇 M' : '🔊 M', W - 16, H - 10); ctx.textAlign = 'left';
  // power-mode banner (flashing, so you know the cheat is on)
  if (godMode) {
    ctx.textAlign = 'center'; ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = Math.floor(t / 15) % 2 ? '#ffd23f' : '#fff';
    ctx.fillText(kingMode ? '👑 KING MODE — one-shot + invincible (admin)' : '⚡ POWER MODE — invincible + fast (press P to stop)', W / 2, H - 28);
    ctx.textAlign = 'left';
  }
}

function drawCountdown() {
  ctx.fillStyle = '#14101f99'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  const n = Math.ceil(countdown / 60);
  const pop = 1 + 0.25 * (1 - (countdown % 60) / 60); // grows a touch each second
  ctx.save(); ctx.translate(W / 2, H / 2 - 10); ctx.scale(pop, pop);
  ctx.font = 'bold 120px sans-serif'; ctx.fillStyle = '#ffc94d'; ctx.fillText(n, 0, 40);
  ctx.restore();
  ctx.font = 'bold 24px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('GET READY!', W / 2, H / 2 - 90);
  ctx.font = '14px sans-serif'; ctx.fillStyle = '#f3e5c3'; ctx.fillText('gather up — enemies arrive when the count hits zero', W / 2, H / 2 + 96);
  ctx.textAlign = 'left';
}

function drawPause() {
  ctx.fillStyle = '#14101fcc'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = '54px serif'; ctx.fillText('⏸', W / 2, H / 2 - 44);
  ctx.font = 'bold 30px sans-serif'; ctx.fillStyle = '#ffc94d'; ctx.fillText('PAUSED', W / 2, H / 2 + 6);
  ctx.font = '14px sans-serif'; ctx.fillStyle = '#f3e5c3'; ctx.fillText(`⏱ ${fmtTime(runTime)} — timer and enemies are frozen`, W / 2, H / 2 + 36);
  ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('press Y to resume • Q to quit to the menu', W / 2, H / 2 + 68);
  ctx.textAlign = 'left';
}

// Level-select card geometry — shared with the tap handler in input.js.
function titleCard(i) {
  const gap = 20, w = Math.min(330, (W - 40 - gap * (LEVELS.length - 1)) / LEVELS.length), total = LEVELS.length * (w + gap) - gap;
  return { x: W / 2 - total / 2 + i * (w + gap), y: 296, w, h: 92 };
}
// "Clear this level's times" button geometry — shared with input.js. Top-right,
// out of the way; it wipes the CURRENTLY SELECTED level's best-times table.
function clearTimesBtn() { return { x: W - 208, y: 16, w: 192, h: 28 }; }
// 👑 King Mode (admin) button + its "delete ALL times" button (top-left, shared with input.js).
function kingBtn() { return { x: 16, y: 16, w: 158, h: 28 }; }
function wipeAllBtn() { return { x: 16, y: 50, w: 158, h: 26 }; } // only shown/active while King Mode is on
// ⚔️ "Fight the Raging Troll" toggle — only shown/active once unlocked and Level 1 is selected.
function rageBtn() { return { x: W / 2 - 150, y: 420, w: 300, h: 26 }; }

function drawTitle() {
  ctx.fillStyle = '#1a1430'; ctx.fillRect(0, 0, W, H);
  ctx.font = '58px serif'; ctx.textAlign = 'center'; ctx.fillText('🏰', W / 2, 115);
  ctx.font = 'bold 42px sans-serif'; ctx.fillStyle = '#ffc94d'; ctx.fillText('CASTLE QUEST', W / 2, 168);
  ctx.font = '13px sans-serif'; ctx.fillStyle = '#f3e5c3';
  ['Venture out ⬅️➡️ chop trees 🌲 mine rocks 🪨 iron ⚙️ and gold 💰 — goblins 👺 drop loot!',
   'Your castle stands mid-world: build walls & towers — raids can strike from EITHER side!',
   'Claim the legendary sword 🗡️ far west… slay the troll 🧌 far east… finish your castle!'].forEach((s, i) => ctx.fillText(s, W / 2, 200 + i * 22));
  ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#c9b68a'; ctx.fillText('— CHOOSE YOUR QUEST —', W / 2, 284);
  LEVELS.forEach((lv, i) => {
    // A quest you haven't earned yet draws greyed-out and padlocked; 👑 King
    // Mode opens every card (those beyond your progress get a crown corner).
    const c = titleCard(i), sel = i === selLevel, locked = !isUnlocked(i), skip = !locked && i >= unlockedCount;
    ctx.fillStyle = locked ? '#1e1a2a' : sel ? '#3a2f4a' : '#241d33'; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = locked ? (sel ? '#7a6a4a' : '#332a44') : sel ? '#ffc94d' : '#4a3a5a';
    ctx.lineWidth = sel ? 3 : 2; ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.font = LEVELS.length > 4 ? 'bold 15px sans-serif' : 'bold 17px sans-serif'; // names have to fit the narrower cards
    ctx.fillStyle = locked ? '#6a6078' : sel ? '#ffc94d' : '#c9b68a';
    ctx.fillText(`${i + 1}. ${lv.name}`, c.x + c.w / 2, c.y + 28);
    ctx.font = '12px sans-serif'; ctx.fillStyle = locked ? '#5a5068' : '#e8b640'; ctx.fillText(lv.tag || '', c.x + c.w / 2, c.y + 50);
    const b = levelBest(i);
    ctx.fillStyle = locked ? '#8a7a9a' : '#f3e5c3';
    ctx.fillText(locked ? `🔒 beat Level ${i} to unlock`
      : b ? `🏆 best: ${fmtTime(b.time)} — ${b.name || 'Knight'}` : 'no times yet — be the first!', c.x + c.w / 2, c.y + 72);
    if (skip) { // 👑 corner badge: a quest only King Mode is letting you into
      ctx.font = '15px serif'; ctx.textAlign = 'right';
      ctx.fillText('👑', c.x + c.w - 6, c.y + 18); ctx.textAlign = 'center';
    }
    if (i === 0 && rageUnlocked()) { // Level 1 gained the Raging Troll challenge
      ctx.font = '15px serif'; ctx.textAlign = 'right'; ctx.fillStyle = rageMode ? '#ff6a3a' : '#ffd23f';
      ctx.fillText('⚔️', c.x + c.w - 6, c.y + 18); ctx.textAlign = 'center';
    }
  });
  // 👑 King Mode (admin) button — top-left; when on, reveals a "delete ALL times" button
  const kb = kingBtn();
  ctx.fillStyle = kingMode ? '#4a3a12' : '#241d33'; ctx.fillRect(kb.x, kb.y, kb.w, kb.h);
  ctx.strokeStyle = kingMode ? '#ffd23f' : '#4a3a5a'; ctx.lineWidth = 2; ctx.strokeRect(kb.x, kb.y, kb.w, kb.h);
  ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = kingMode ? '#ffd23f' : '#c9b68a'; ctx.textAlign = 'center';
  ctx.fillText(kingMode ? '👑 KING MODE: ON' : '👑 King Mode', kb.x + kb.w / 2, kb.y + 19);
  if (kingMode) {
    const wb = wipeAllBtn();
    ctx.fillStyle = '#3a1420'; ctx.fillRect(wb.x, wb.y, wb.w, wb.h);
    ctx.strokeStyle = '#c0455a'; ctx.lineWidth = 2; ctx.strokeRect(wb.x, wb.y, wb.w, wb.h);
    ctx.font = '12px sans-serif'; ctx.fillStyle = '#e8a0a8'; ctx.fillText('🗑️ Delete ALL times', wb.x + wb.w / 2, wb.y + 18);
  }
  ctx.textAlign = 'left';
  // clear-times button (acts on the highlighted level)
  const cb = clearTimesBtn(), hasTimes = !!levelBest(selLevel);
  ctx.fillStyle = hasTimes ? '#3a2333' : '#241d33';
  ctx.fillRect(cb.x, cb.y, cb.w, cb.h);
  ctx.strokeStyle = hasTimes ? '#8a4a5a' : '#3a3048'; ctx.lineWidth = 2; ctx.strokeRect(cb.x, cb.y, cb.w, cb.h);
  ctx.font = '12px sans-serif'; ctx.fillStyle = hasTimes ? '#e8a0a8' : '#6a6078'; ctx.textAlign = 'center';
  ctx.fillText("🗑️ Clear this level's times", cb.x + cb.w / 2, cb.y + 19);
  ctx.textAlign = 'left';
  // carried meat survives quitting — show it so players know it's safe
  if (carriedMeat > 0) {
    ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#ffcf9a'; ctx.textAlign = 'center';
    ctx.fillText(`🥩 Raw meat in your pack: ${carriedMeat}/${MAX_MEAT} — kept even when you quit`, W / 2, 400);
    ctx.textAlign = 'left';
  }
  // ⚔️ Raging Troll: a SECRET until unlocked — nothing is shown while locked.
  // Once every enemy is maxed, reveal it: a hint elsewhere, a toggle on Level 1.
  if (rageUnlocked()) {
    ctx.textAlign = 'center'; ctx.font = 'bold 13px sans-serif';
    if (selLevel !== 0) {
      ctx.fillStyle = Math.floor(t / 20) % 2 ? '#ff6a3a' : '#ffd23f';
      ctx.fillText('⚔️ RAGING TROLL UNLOCKED — pick Level 1 to fight it!', W / 2, 438);
    } else {
      const rb = rageBtn();
      ctx.fillStyle = rageMode ? '#5a1410' : '#241d33'; ctx.fillRect(rb.x, rb.y, rb.w, rb.h);
      ctx.strokeStyle = rageMode ? '#ff6a3a' : '#8a4a3a'; ctx.lineWidth = 2; ctx.strokeRect(rb.x, rb.y, rb.w, rb.h);
      ctx.fillStyle = rageMode ? '#ffd23f' : '#e8a0a8';
      ctx.fillText(rageMode ? '⚔️ RAGING TROLL: ON — Level 1 boss is furious!' : '⚔️ Fight the Raging Troll on Level 1: OFF', rb.x + rb.w / 2, rb.y + 17);
    }
    ctx.textAlign = 'left';
  }
  ctx.font = 'bold 16px sans-serif';
  if (!isUnlocked(selLevel)) { // picking a locked quest explains itself; flashes white if you tried to start it
    ctx.fillStyle = titleDeny > 0 && Math.floor(t / 8) % 2 ? '#fff' : '#e5484d';
    ctx.fillText(`🔒 Level ${selLevel + 1} is locked — beat Level ${selLevel} first!`, W / 2, H - 42);
  } else {
    ctx.fillStyle = Math.floor(t / 30) % 2 ? '#ffc94d' : '#fff';
    ctx.fillText('←/→ or tap a card to choose • any other key (or tap it again) to start', W / 2, H - 42);
  }
  if (titleDeny > 0) titleDeny--;
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
  if (justUnlocked >= 0) {
    ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = Math.floor(t / 20) % 2 ? '#7ee787' : '#ffc94d';
    ctx.fillText(`🔓 NEW QUEST UNLOCKED — Level ${justUnlocked + 1}: ${LEVELS[justUnlocked].name}`, W / 2, 172);
  }
  if (lastRun) {
    ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(`⏱ Your time: ${fmtTime(lastRun.time)}${lastRun.rank === 0 ? '  🏆 NEW BEST!' : ''}`, W / 2, 192);
    if (lastRun.cheated) {
      ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#ff9a5b';
      ctx.fillText('⚡ Power/King mode was used — practice run: no scoreboard time, no new level unlocked', W / 2, 214);
    }
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
