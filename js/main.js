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
var bestTimes = []; // the CURRENT level's table — swapped by loadLevel()
const levelBest = i => (allTimes[i] || [])[0]; // for the title-screen cards
const lastName = () => (typeof localStorage !== 'undefined' && localStorage.getItem('cq-name')) || '';
function persistTimes() {
  allTimes[levelIdx] = bestTimes;
  if (typeof localStorage !== 'undefined') localStorage.setItem('cq-times-v2', JSON.stringify(allTimes));
}
function saveTime(frames) {
  bestTimes.push({ time: frames, date: new Date().toLocaleDateString(), name: lastName() || 'Knight' });
  bestTimes.sort((a, b) => a.time - b.time);
  bestTimes = bestTimes.slice(0, 5);
  persistTimes();
  return bestTimes.findIndex(e => e.time === frames); // rank in the table, or -1 if it didn't make top 5
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
  scene = 'game'; t = 0; wave = 0; menuOpen = false; menuMode = 'build'; runTime = 0; lastRun = null; enteringName = false; paused = false;
  countdown = 60 * 3; // "Get ready!" — nothing moves or spawns until it hits 0
  player = makePlayer(level.playerStart);
  res = { wood: 0, stone: 0, iron: 0, gold: 0 };
  castle = { x: level.castle.x, w: level.castle.w, hp: level.castle.hp, maxHp: level.castle.hp, walls: 0, towers: 0, keep: 1 };
  raidTimer = 60 * level.raids.firstDelaySec; respawnWait = 0;
  raiders = []; arrows = []; parts = [];
  villager = newVillager();
  platforms = level.platforms.map(p => ({ ...p }));
  trees = spawnBand(level.bands.trees, makeTree);
  rocks = spawnBand(level.bands.rocks, makeRock);
  ores = spawnBand(level.bands.ores, makeOre);
  golds = spawnBand(level.bands.gold, makeGold);
  goblins = []; // roaming goblins spawn when the countdown ends
  troll = newTroll(level.boss);
  chest = { x: worldX(level.chest.x), opened: false };
  relic = { x: worldX(level.relic.x), taken: false };
  dropBag = null;
}

function update() {
  if (countdown > 0) {
    // "Get ready" freeze: no movement, spawns, raids, or run-clock yet
    if (--countdown === 0) { goblins = spawnBand(level.bands.goblins, newGob); sfx.win(); }
    return;
  }
  runTime++;
  if (msgT > 0) msgT--;
  updatePlayer();
  updateGoblins();
  updateTroll();
  updateRaiders();
  updateVillager();
  updateTowers();
  updateWorld();
  // lose / win
  if (castle.hp <= 0) { scene = 'over'; sfx.lose(); }
  const goal = level.goal;
  if (castle.keep >= goal.keep && castle.walls >= goal.walls && castle.towers >= goal.towers && !troll.alive) {
    scene = 'win'; sfx.win();
    lastRun = { time: runTime, rank: saveTime(runTime) };
    if (lastRun.rank >= 0) { enteringName = true; nameBuf = lastName(); }
  }
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
  else if (scene === 'title') drawTitle();
  else drawEnd(scene === 'win');
  requestAnimationFrame(loop);
}
loop();
