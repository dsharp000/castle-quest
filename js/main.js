// Level loading, reset, per-frame update orchestration, the game loop,
// and the speedrun best-times table (persisted in localStorage).

// Each level keeps its own best-times table: allTimes[levelIdx] = [...entries].
// Times saved before level 2 existed (old 'cq-times' key) migrate into slot 0.
var allTimes = (() => {
  try {
    if (typeof localStorage === 'undefined') return [];
    const v2 = JSON.parse(localStorage.getItem('cq-times-v2'));
    if (v2) return v2;
    const v1 = JSON.parse(localStorage.getItem('cq-times'));
    return v1 ? [v1] : [];
  } catch (e) { return []; }
})();
// Raw meat is a TRANSFERRED inventory: unlike wood/stone/iron/gold (which are
// level-local and reset each run), meat carries from level to level and is
// saved to localStorage, so it's kept for good — only a death spends it (it
// drops into the reclaimable bag with everything else). `res.meat` mirrors this
// stash during play; update() syncs any change back here.
var carriedMeat = (() => {
  try { return typeof localStorage === 'undefined' ? 0 : (parseInt(localStorage.getItem('cq-meat'), 10) || 0); }
  catch (e) { return 0; }
})();
function persistMeat() {
  if (typeof localStorage !== 'undefined') localStorage.setItem('cq-meat', String(carriedMeat));
}

// ---- level progression: the quests are beaten IN ORDER ----
// `unlockedCount` levels are playable (index < unlockedCount); Level 1 always
// is. Winning level i opens level i+1 and the unlock is permanent, so every
// level you've reached stays open to replay. 👑 King Mode ignores the gate
// entirely — admin can skip straight to any level.
var unlockedCount = (() => {
  try {
    if (typeof localStorage === 'undefined') return 1;
    const saved = parseInt(localStorage.getItem('cq-unlocked'), 10);
    if (saved) return Math.max(1, saved);
    // First run under the gate: a best time on level i proves you already beat it.
    let n = 1;
    allTimes.forEach((tbl, i) => { if (tbl && tbl.length) n = Math.max(n, i + 2); });
    return n;
  } catch (e) { return 1; }
})();
const isUnlocked = i => kingMode || i < unlockedCount;
// Open the first `n` levels (clamped to what exists). Returns true if that was new.
function unlockThrough(n) {
  n = Math.min(n, LEVELS.length);
  if (n <= unlockedCount) return false;
  unlockedCount = n;
  if (typeof localStorage !== 'undefined') localStorage.setItem('cq-unlocked', String(unlockedCount));
  return true;
}
// Title-screen "go": a locked quest refuses and flashes why.
function startSelected() {
  if (!isUnlocked(selLevel)) { titleDeny = 180; sfx.deny(); return false; }
  reset();
  return true;
}

// ---- Raging Troll challenge: a persistent kill tally by enemy type. Defeat 10
// of EVERY type — goblins, raiders, sand-vipers, AND each of the five bosses —
// to unlock a buffed "Raging Troll" you can fight on Level 1 (rageMode toggle).
const RAGE_TYPES = ['goblin', 'raider', 'snake', 'boss0', 'boss1', 'boss2', 'boss3', 'boss4'];
const RAGE_GOAL = 10;
var kills = (() => {
  try { return typeof localStorage === 'undefined' ? {} : (JSON.parse(localStorage.getItem('cq-kills')) || {}); }
  catch (e) { return {}; }
})();
function recordKill(type) {
  kills[type] = (kills[type] || 0) + 1;
  if (typeof localStorage !== 'undefined') localStorage.setItem('cq-kills', JSON.stringify(kills));
}
const rageUnlocked = () => RAGE_TYPES.every(k => (kills[k] || 0) >= RAGE_GOAL);
const rageProgress = () => RAGE_TYPES.filter(k => (kills[k] || 0) >= RAGE_GOAL).length; // types maxed so far

var bestTimes = []; // the CURRENT level's table — swapped by loadLevel()
const levelBest = i => (allTimes[i] || [])[0]; // for the title-screen cards
const lastName = () => (typeof localStorage !== 'undefined' && localStorage.getItem('cq-name')) || '';
function persistTimes() {
  allTimes[levelIdx] = bestTimes;
  if (typeof localStorage !== 'undefined') localStorage.setItem('cq-times-v2', JSON.stringify(allTimes));
}
// Wipe one level's best-times table (the title-screen 🗑️ button). Level-specific
// so clearing one leaderboard never touches another; persists immediately.
function clearTimes(i) {
  allTimes[i] = [];
  if (i === levelIdx) bestTimes = allTimes[i];
  if (typeof localStorage !== 'undefined') localStorage.setItem('cq-times-v2', JSON.stringify(allTimes));
}
// Wipe EVERY level's best times (👑 King Mode admin button).
function clearAllTimes() {
  allTimes = []; bestTimes = [];
  if (typeof localStorage !== 'undefined') localStorage.removeItem('cq-times-v2');
}
function saveTime(frames) {
  bestTimes.push({ time: frames, date: new Date().toLocaleDateString(), name: lastName() || 'Knight' });
  bestTimes.sort((a, b) => a.time - b.time);
  bestTimes = bestTimes.slice(0, 5);
  persistTimes();
  return bestTimes.findIndex(e => e.time === frames); // rank in the table, or -1 if it didn't make top 5
}
// Finish a run: record the time and show the win screen (with name entry if it
// made the table). Called directly on most levels; on the volcano it runs after
// the ride-off cutscene, with the time captured at the moment of victory.
function winRun(frames) {
  scene = 'win'; sfx.win();
  // An honest win opens the next quest for good. Power/King-mode runs are
  // practice: progression ignores them exactly like the scoreboard does
  // (King Mode can jump to any level anyway).
  justUnlocked = !cheated && levelIdx + 1 < LEVELS.length && unlockThrough(levelIdx + 2) ? levelIdx + 1 : -1;
  if (cheated) { lastRun = { time: frames, rank: -1, cheated: true }; return; } // practice run — not saved
  lastRun = { time: frames, rank: saveTime(frames) };
  if (lastRun.rank >= 0) { enteringName = true; nameBuf = lastName(); }
}

// Called when the player confirms their name on the win screen.
function finishNameEntry() {
  const name = (nameBuf.trim() || 'Knight').slice(0, 12);
  if (lastRun && lastRun.rank >= 0 && bestTimes[lastRun.rank]) bestTimes[lastRun.rank].name = name;
  persistTimes();
  if (typeof localStorage !== 'undefined') localStorage.setItem('cq-name', name);
  enteringName = false;
}

function loadLevel(i) {
  levelIdx = i;
  level = LEVELS[i];
  WORLD_W = level.worldW;
  GROUND = level.groundY;
  bestTimes = allTimes[i] || [];
}

function reset() {
  loadLevel(selLevel);
  scene = 'game'; t = 0; wave = 0; menuOpen = false; menuMode = 'build'; runTime = 0; lastRun = null; enteringName = false; paused = false; cheated = false; justUnlocked = -1;
  countdown = 60 * 3; // "Get ready!" — nothing moves or spawns until it hits 0
  player = makePlayer(level.playerStart);
  res = { wood: 0, stone: 0, iron: 0, gold: 0, meat: carriedMeat }; // meat carries over
  castle = { x: level.castle.x, w: level.castle.w, hp: level.castle.hp, maxHp: level.castle.hp, walls: 0, towers: 0, keep: 1 };
  if (kingMode) { // 👑 admin: start with the castle already built to goal and powered up
    castle.keep = level.goal.keep; castle.walls = level.goal.walls; castle.towers = level.goal.towers;
    godMode = true;
  }
  raidTimer = 60 * level.raids.firstDelaySec; respawnWait = 0;
  raiders = []; arrows = []; parts = []; slimes = [];
  embers = []; emberTimer = (level.embers ? Math.round(60 * level.embers.everySec) : 0);
  villager = newVillager();
  platforms = level.platforms.map(p => ({ ...p }));
  trees = spawnBand(level.bands.trees, makeTree);
  rocks = spawnBand(level.bands.rocks, makeRock);
  ores = spawnBand(level.bands.ores, makeOre);
  golds = spawnBand(level.bands.gold, makeGold);
  goblins = []; // roaming goblins spawn when the countdown ends
  troll = newTroll(level.boss);
  if (levelIdx === 0 && rageMode && rageUnlocked()) { // the unlocked Level 1 challenge boss
    troll.raging = true; troll.max = troll.hp = 48; troll.dmg = 4;
    troll.name = '🔥 RAGING TROLL'; troll.c1 = '#7a1f14'; troll.c2 = '#9a3020';
  }
  chest = { x: worldX(level.chest.x), opened: false };
  relic = { x: worldX(level.relic.x), taken: false };
  dropBag = null;
}

function update() {
  if (countdown > 0) {
    // "Get ready" freeze: no movement, spawns, raids, or run-clock yet
    if (--countdown === 0) {
      goblins = spawnBand(level.bands.goblins, newGob);
      if (level.bands.snakes) goblins = goblins.concat(spawnBand(level.bands.snakes, newSnake));
      sfx.win();
      // Tame levels need meat you can only bring from earlier levels — warn up front
      if (level.tame && res.meat < level.tame.meat)
        say(`🥩 Bring ${level.tame.meat} raw meat to tame the dragon — you have ${res.meat}. Farm sand-vipers on Level 3!`, 340);
    }
    return;
  }
  runTime++;
  if (godMode || kingMode) cheated = true; // a run touched by power/King mode never sets a record
  if (msgT > 0) msgT--;
  updatePlayer();
  updateGoblins();
  updateTroll();
  updateRaiders();
  updateSlimes();
  updateVillager();
  updateTowers();
  updateWorld();
  // lose / win
  if (castle.hp <= 0) { scene = 'over'; sfx.lose(); }
  const goal = level.goal;
  const built = castle.keep >= goal.keep && castle.walls >= goal.walls && castle.towers >= goal.towers;
  // An `afterGoal` boss stays away until the castle is finished, then descends.
  if (built && level.boss.afterGoal && !troll.arrived) {
    troll.arrived = true; troll.alive = true; troll.x = worldX(level.boss.x);
    say('🌋 The mountain ERUPTS — the 🐉 FIRE DRAGON descends! Beat it, then tame it!', 340);
    sfx.raidHorn();
  }
  // Win: tame levels win by taming the boss; the rest by "castle built + boss defeated".
  if (level.tame ? troll.tamed : (built && !troll.alive)) {
    if (level.tame) startCutscene(runTime); // ride the dragon off into the smoke, then the win screen
    else winRun(runTime);
  }
  // bank any change to your meat into the transferred inventory
  if (res.meat !== carriedMeat) { carriedMeat = res.meat; persistMeat(); }
}

reset(); scene = 'title';
function loop() {
  t++;
  if (scene === 'game') {
    if (!paused) { if (menuOpen) (menuMode === 'trade' ? updateTradeMenu : updateMenu)(); update(); }
    draw();
    if (countdown > 0) drawCountdown();
    if (paused) drawPause();
  }
  else if (scene === 'cutscene') { updateCutscene(); drawCutscene(); }
  else if (scene === 'title') drawTitle();
  else drawEnd(scene === 'win');
  requestAnimationFrame(loop);
}
loop();
