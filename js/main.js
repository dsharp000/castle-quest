// Level loading, reset, per-frame update orchestration, the game loop,
// and the speedrun best-times table (persisted in localStorage).

var bestTimes = (() => {
  try { return (typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem('cq-times'))) || []; }
  catch (e) { return []; }
})();
function saveTime(frames) {
  bestTimes.push({ time: frames, date: new Date().toLocaleDateString() });
  bestTimes.sort((a, b) => a.time - b.time);
  bestTimes = bestTimes.slice(0, 5);
  if (typeof localStorage !== 'undefined') localStorage.setItem('cq-times', JSON.stringify(bestTimes));
  return bestTimes.findIndex(e => e.time === frames); // rank in the table, or -1 if it didn't make top 5
}

function loadLevel(i) {
  level = LEVELS[i];
  WORLD_W = level.worldW;
  GROUND = level.groundY;
}

function reset() {
  loadLevel(0);
  scene = 'game'; t = 0; wave = 0; menuOpen = false; runTime = 0; lastRun = null;
  player = makePlayer(level.playerStart);
  res = { wood: 0, stone: 0, iron: 0 };
  castle = { x: level.castle.x, w: level.castle.w, hp: level.castle.hp, maxHp: level.castle.hp, walls: 0, towers: 0, keep: 1 };
  raidTimer = 60 * level.raids.firstDelaySec;
  raiders = []; arrows = []; parts = [];
  platforms = level.platforms.map(p => ({ ...p }));
  trees = spawnBand(level.bands.trees, makeTree);
  rocks = spawnBand(level.bands.rocks, makeRock);
  ores = spawnBand(level.bands.ores, makeOre);
  goblins = spawnBand(level.bands.goblins, newGob);
  troll = newTroll(level.boss);
  chest = { x: worldX(level.chest.x), opened: false };
  dropBag = null;
}

function update() {
  runTime++;
  if (msgT > 0) msgT--;
  updatePlayer();
  updateGoblins();
  updateTroll();
  updateRaiders();
  updateTowers();
  updateWorld();
  // lose / win
  if (castle.hp <= 0) { scene = 'over'; sfx.lose(); }
  const goal = level.goal;
  if (castle.keep >= goal.keep && castle.walls >= goal.walls && castle.towers >= goal.towers && !troll.alive) { scene = 'win'; sfx.win(); lastRun = { time: runTime, rank: saveTime(runTime) }; }
}

reset(); scene = 'title';
function loop() {
  t++;
  if (scene === 'game') { if (menuOpen) updateMenu(); update(); draw(); }
  else if (scene === 'title') drawTitle();
  else drawEnd(scene === 'win');
  requestAnimationFrame(loop);
}
loop();
