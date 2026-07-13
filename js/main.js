// Level loading, reset, per-frame update orchestration, and the game loop.

function loadLevel(i) {
  level = LEVELS[i];
  WORLD_W = level.worldW;
  GROUND = level.groundY;
}

function reset() {
  loadLevel(0);
  scene = 'game'; t = 0; wave = 0; menuOpen = false;
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
  if (castle.keep >= goal.keep && castle.walls >= goal.walls && castle.towers >= goal.towers && !troll.alive) { scene = 'win'; sfx.win(); }
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
