// The villager: a friendly NPC who lives outside the castle walls. Wanders
// peacefully and flees for the castle door when raiders close in — but the
// raiders are faster and never give up the chase, so once hunted the villager
// cannot get away (5 hits, no healing). Death is permanent — the next
// villager only appears when a new quest starts (reset()).
// While alive they also run a gold-for-goods trade stand (T near them opens
// it); their 3 offers reroll every time a raid starts.

const VILLAGER_NAMES = ['Pip', 'Miri', 'Odo', 'Greta', 'Finn', 'Tilly'];
const newVillager = () => ({
  x: castleRight() + rand(30, 150), y: GROUND, hp: 5, max: 5,
  face: 1, dir: 1, state: 'wander', pauseT: 0, hurt: 0, giftT: 0,
  name: VILLAGER_NAMES[ri(0, VILLAGER_NAMES.length - 1)],
  trades: rollTrades(),
});

// ---- trading (gold 🪙 is the only coin the villager takes) ----
function rollTrades() {
  const pool = [
    () => { const g = ri(1, 2); return { label: `+${g * 4} 🪵 wood`, gold: g, act: () => res.wood += g * 4 }; },
    () => { const g = ri(1, 2); return { label: `+${g * 4} 🪨 stone`, gold: g, act: () => res.stone += g * 4 }; },
    () => { const g = ri(2, 3); return { label: `+${g * 2} ⚙️ iron`, gold: g, act: () => res.iron += g * 2 }; },
    () => ({ label: '+2 ❤️ hearts', gold: 3, act: () => player.hp = Math.min(player.maxHp, player.hp + 2) }),
    () => ({ label: '+25 🏰 castle repair', gold: 4, act: () => castle.hp = Math.min(castle.maxHp, castle.hp + 25) }),
    () => ({ label: '+1 ⚔️ sword damage', gold: 6, act: () => player.swordLvl++ }),
  ];
  const picks = [];
  while (picks.length < 3) { const i = ri(0, pool.length - 1); if (!picks.includes(i)) picks.push(i); }
  return picks.map(i => pool[i]());
}

var tradeSel = 0;
// Trading only works up close — the Look button opens this menu from afar,
// but purchases are blocked unless the knight is standing by the trader.
const inTradeRange = () => !!villager && near(player.x, villager.x, 140);
function updateTradeMenu() {
  if (!villager) { menuOpen = false; return; } // the trader is gone…
  const trades = villager.trades;
  if (keys.J) { tradeSel = (tradeSel + trades.length - 1) % trades.length; keys.J = false; }
  if (keys.L) { tradeSel = (tradeSel + trades.length - 1) % trades.length; keys.L = false; }
  if (keys.R) { tradeSel = (tradeSel + 1) % trades.length; keys.R = false; }
  if (keys.A || keys.E || keys.T) {
    if (!inTradeRange()) { say('👁 Too far to trade — stand by the trader!', 90); sfx.deny(); }
    else {
      const tr = trades[tradeSel];
      if (res.gold >= tr.gold) { res.gold -= tr.gold; tr.act(); say(`🤝 Traded ${tr.gold} 🪙 for ${tr.label}`, 100); sfx.build(); }
      else { say(`🧑‍🌾 ${villager.name} wants ${tr.gold} 🪙 for that!`, 80); sfx.deny(); }
    }
    keys.A = false; keys.E = false; keys.T = false;
  }
}

// Click/tap support, mirroring the build menu: tap a row to buy, outside to close.
cv.addEventListener('click', e => {
  if (!menuOpen || menuMode !== 'trade' || !villager) return;
  const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * (W / r.width), my = (e.clientY - r.top) * (H / r.height);
  villager.trades.forEach((tr, i) => { const y = 150 + i * 46; if (my > y - 18 && my < y + 22 && mx > W / 2 - 190 && mx < W / 2 + 190) { tradeSel = i; keys.A = true; } });
  if (my < 120 || my > 150 + villager.trades.length * 46 + 10) menuOpen = false;
});

const villagerDoor = () => castle.x + castle.w / 2;

function updateVillager() {
  if (!villager) return; // a slain villager stays dead for the rest of the run
  const v = villager;
  if (v.hurt > 0) v.hurt--;
  v.giftT++;
  const threat = raiders.some(r => r.hp > 0 && Math.abs(r.x - v.x) < 300);
  if (threat) {
    // panic! run for the castle door — but fear makes them stumble, and at
    // the door there is nowhere left to run
    v.state = near(v.x, villagerDoor(), 12) ? 'cower' : 'flee';
    if (v.state === 'flee') {
      if (v.pauseT > 0) v.pauseT--;
      else if (t % 90 === 0 && Math.random() < .35) v.pauseT = 30;
      else { v.x += Math.sign(villagerDoor() - v.x) * 1.15; v.face = Math.sign(villagerDoor() - v.x); }
    }
  } else {
    v.state = 'wander';
    const lo = castleRight() + 20, hi = castleRight() + 170;
    if (v.pauseT > 0) v.pauseT--;
    else {
      v.x += v.dir * 0.5; v.face = v.dir;
      if (v.x < lo) v.dir = 1;
      if (v.x > hi) v.dir = -1;
      if (t % 120 === 0 && Math.random() < .4) v.pauseT = ri(40, 90);
    }
    // a thank-you gift for the knight who keeps them safe
    if (v.giftT > 60 * 40 && near(player.x, v.x, 60) && Math.abs(player.y - v.y) < 60) {
      v.giftT = 0;
      const [k, n, ic] = [['wood', 2, '🪵'], ['stone', 2, '🪨'], ['iron', 1, '⚙️']][ri(0, 2)];
      res[k] += n; pop(v.x, v.y - 60, `+${n} ${ic}`); sfx.pickup();
      say(`🧑‍🌾 ${v.name}: "For you, brave knight!"`, 120);
    }
  }
  // raiders cut down a villager they catch
  for (const r of raiders) {
    if (r.hp > 0 && Math.abs(r.x - v.x) < 24 && r.atkCd <= 0) {
      r.atkCd = 55; v.hp--; v.hurt = 12; sfx.hit(); puff(v.x, v.y - 30, '#ff6b5b', 5);
      if (v.hp <= 0) {
        puff(v.x, v.y - 25, '#e8b98a', 12);
        say(`💔 ${v.name} the villager was slain — they are gone for good…`, 220); sfx.hurt();
        villager = null;
        return;
      }
    }
  }
}

// ---- drawing ----
function drawVillager() {
  if (!villager) return;
  const v = villager;
  const tremble = v.state === 'cower' ? Math.sin(t) * 1.2 : 0;
  ctx.save(); ctx.translate(v.x + tremble, v.y); ctx.scale(v.face || 1, 1);
  if (v.hurt > 0) ctx.globalAlpha = 0.6;
  const bob = v.pauseT > 0 || v.state === 'cower' ? 0 : Math.sin(t / 4 + 2) * 2;
  ctx.fillStyle = '#7a5230'; ctx.fillRect(-8, -28 + bob, 16, 20);   // tunic
  ctx.fillStyle = '#e8b98a'; ctx.fillRect(-7, -42 + bob, 14, 14);   // head
  ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-7, -45 + bob, 14, 5);    // hair
  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(2, -37 + bob, 3, 3);      // eye
  ctx.fillStyle = '#4a3018'; ctx.fillRect(-7, -8, 5, 8); ctx.fillRect(2, -8, 5, 8);
  ctx.globalAlpha = 1; ctx.restore();
  if (v.hp < v.max) bar(v.x, v.y - 54, v.hp / v.max);
  ctx.font = '10px sans-serif'; ctx.fillStyle = '#c9e8a8'; ctx.textAlign = 'center';
  ctx.fillText(v.name, v.x, v.y - 58);
  if (v.state !== 'wander') { ctx.font = '12px sans-serif'; ctx.fillText(v.state === 'cower' ? '😱' : '❗', v.x, v.y - 72); }
  else if (near(player.x, v.x, 140)) { ctx.font = '11px sans-serif'; ctx.fillStyle = '#ffe9a8'; ctx.fillText('Press T / 🤝 to trade', v.x, v.y - 74); }
  ctx.textAlign = 'left';
}

function drawTradeMenu() {
  if (!villager) return;
  const trades = villager.trades;
  ctx.fillStyle = '#000000aa'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2e2438'; ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 4;
  ctx.fillRect(W / 2 - 210, 100, 420, 46 * trades.length + 80); ctx.strokeRect(W / 2 - 210, 100, 420, 46 * trades.length + 80);
  const close = inTradeRange();
  ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = close ? '#ffc94d' : '#8fb3e0'; ctx.textAlign = 'center';
  ctx.fillText(close ? `🤝 ${villager.name}'s trades — you have ${res.gold} 🪙`
    : `👁 ${villager.name}'s trades from afar — you have ${res.gold} 🪙`, W / 2, 130);
  trades.forEach((tr, i) => {
    const y = 150 + i * 46, sel = i === tradeSel, afford = res.gold >= tr.gold;
    ctx.fillStyle = sel ? '#7a5230' : '#3a2f4a'; ctx.fillRect(W / 2 - 190, y - 18, 380, 40);
    ctx.fillStyle = afford ? '#fff' : '#999'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(tr.label, W / 2 - 178, y + 4);
    ctx.textAlign = 'right'; ctx.font = '12px sans-serif'; ctx.fillStyle = afford ? '#ffe9a8' : '#e5484d';
    ctx.fillText(`${tr.gold} 🪙`, W / 2 + 178, y + 6);
  });
  ctx.textAlign = 'center'; ctx.font = '12px sans-serif'; ctx.fillStyle = '#c9b68a';
  ctx.fillText(close ? '↑/← → select • J/E buy • L peeks builds • tap outside to close'
    : '👁 look only — get closer to trade • L peeks builds • tap outside to close', W / 2, 150 + trades.length * 46 + 30);
  ctx.textAlign = 'left';
}
