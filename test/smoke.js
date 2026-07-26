// Headless smoke test using macOS JavaScriptCore (no Node needed).
// Run from the repo root:  osascript -l JavaScript test/smoke.js
// Stubs the DOM/canvas, loads the game scripts in index.html order, then
// simulates frames and asserts the core mechanics still work.
ObjC.import('Foundation');

// ---- DOM / canvas stubs ----
var noop = function () {};
var ctxStub = new Proxy({}, {
  get: function (o, k) {
    if (k === 'measureText') return function () { return { width: 10 }; };
    if (k === 'createLinearGradient') return function () { return { addColorStop: noop }; };
    return noop;
  },
  set: function () { return true; },
});
var document = {
  getElementById: function () {
    return { width: 900, height: 500, getContext: function () { return ctxStub; },
      addEventListener: noop,
      getBoundingClientRect: function () { return { left: 0, top: 0, width: 900, height: 500 }; } };
  },
};
var addEventListener = noop;
var rafCb = null;
var requestAnimationFrame = function (cb) { rafCb = cb; };

// ---- load the game (same order as index.html) ----
var read = function (p) { return $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null).js; };
var base = $.NSFileManager.defaultManager.currentDirectoryPath.js;
// JavaScriptCore drops top-level const/let bindings between eval() calls,
// so rewrite them to var when loading (test harness only — files are unchanged).
['js/config.js', 'levels/level1.js', 'levels/level2.js', 'levels/level3.js', 'levels/level4.js', 'js/input.js', 'js/audio.js', 'js/world.js',
 'js/player.js', 'js/enemies.js', 'js/castle.js', 'js/villager.js', 'js/render.js', 'js/main.js']
  .forEach(function (f) { (1, eval)(read(base + '/' + f).replace(/\b(const|let)\s+/g, 'var ')); });

// ---- helpers ----
var frame = function (n) { for (var i = 0; i < (n || 1); i++) rafCb(); };
var fails = 0;
var check = function (name, cond) {
  console.log((cond ? 'ok   - ' : 'FAIL - ') + name);
  if (!cond) fails++;
};

// ---- the tests ----
// Levels open with a 3-second "GET READY" freeze: nothing moves or spawns.
scene = 'game';
check('level opens with a ~3s countdown, no goblins yet', countdown === 180 && goblins.length === 0);
var cd0 = player.x;
keys.R = true; frame(60); keys.R = false;
check('player and run-clock are frozen during the countdown', player.x === cd0 && runTime === 0 && goblins.length === 0);
frame(120);
check('countdown ends → enemies spawn and play begins', countdown === 0 && goblins.length > 0);
// From here on, skip the countdown after each reset so the rest of the
// suite exercises live play (the freeze itself is covered above).
var realReset = reset;
reset = function () {
  realReset(); countdown = 0;
  goblins = spawnBand(level.bands.goblins, newGob);
  if (level.bands.snakes) goblins = goblins.concat(spawnBand(level.bands.snakes, newSnake));
};

check('world spawned', trees.length > 0 && rocks.length > 0 && ores.length > 0 && goblins.length > 0);

scene = 'game';
var x0 = player.x;
keys.R = true; frame(60); keys.R = false;
check('player moves right', player.x > x0 + 50);

var tr = trees[0], hp0 = tr.hp;
player.x = tr.x - 20; player.y = GROUND; player.face = 1;
keys.A = true; frame(30); keys.A = false;
check('sword chops tree', tr.hp < hp0);

raidTimer = 1; frame(2);
check('raid spawns raiders', wave === 1 && raiders.length > 0);
// sides are random per raider — sample a bunch of raids to see both used
for (var s = 0; s < 8; s++) spawnRaid();
check('raids can strike either side', raiders.some(function (r) { return r.x < castle.x; }) && raiders.some(function (r) { return r.x > castle.x + castle.w; }));
raiders = raiders.slice(0, 3); // keep just the first raid for the next checks

res.wood = 99; res.stone = 99; res.iron = 99;
player.x = castle.x + castle.w / 2; player.y = GROUND; // stand at the castle to build
menuOpen = true; menuMode = 'build'; menuSel = 0; keys.A = true; frame(1);
menuOpen = false; keys.A = false;
check('menu purchase builds wall', castle.walls === 1);

// ---- Look (L): peek at builds/trades from afar, but can't buy until close ----
reset();
res.wood = 99; res.stone = 99; res.iron = 99; res.gold = 99;
player.x = 40; player.y = GROUND; // far from both the castle and the trader
keys.LK = true; frame(1); keys.LK = false;
check('Look opens the build menu from far away', menuOpen && menuMode === 'build');
var walls0 = castle.walls;
menuSel = 0; keys.A = true; frame(1); keys.A = false;
check('cannot build while looking from afar', castle.walls === walls0 && menuOpen);
keys.LK = true; frame(1); keys.LK = false;
check('Look toggles over to the trade menu', menuMode === 'trade' && menuOpen);
var gold0 = res.gold;
keys.A = true; frame(1); keys.A = false;
check('cannot trade while looking from afar', res.gold === gold0);
keys.LK = true; frame(1); keys.LK = false;
check('Look again closes the menu', !menuOpen);
player.x = castle.x + castle.w / 2; player.y = GROUND; // now stand at the castle
keys.LK = true; frame(1); keys.LK = false;
menuSel = 0; keys.A = true; frame(1); keys.A = false;
check('can build once standing at the castle', castle.walls === walls0 + 1);
menuOpen = false; keys.A = false;

castle.towers = 1;
raiders.forEach(function (r) { r.x = castle.x + 500; });
frame(30);
check('tower fires arrows', arrows.length > 0 || raiders.length === 0);

// clear distractions so the swing reaches the troll, then kill it
trees = []; rocks = []; ores = []; goblins = []; raiders = [];
troll.hp = 1;
player.x = troll.x - 30; player.y = GROUND; player.face = 1;
keys.A = true; frame(30); keys.A = false;
check('troll can be defeated', !troll.alive);

var wood0 = res.wood;
player.x = chest.x; frame(1);
check('chest opens with loot', chest.opened && res.wood > wood0);

castle.keep = 3; castle.walls = 2; castle.towers = 2; frame(1);
check('win condition triggers', scene === 'win');
check('run time recorded in best times', lastRun && lastRun.time > 0 && lastRun.rank === 0 && bestTimes.length === 1 && bestTimes[0].time === lastRun.time);
check('name entry starts after a table run', enteringName === true);
nameBuf = 'Sir Dave'; finishNameEntry();
check('confirmed name lands on the entry', bestTimes[0].name === 'Sir Dave' && enteringName === false);

reset(); castle.hp = 0; frame(1);
check('lose condition triggers', scene === 'over');

reset();
check('reset restores world', scene === 'game' && trees.length > 0 && castle.hp === castle.maxHp);

res.wood = 5; res.stone = 3; res.iron = 2; player.swordLvl = 4;
player.x = 2000; player.y = GROUND;
hurtPlayer(player.hp);
check('death drops materials and breaks sword',
  res.wood === 0 && player.swordLvl === 1 && dropBag && dropBag.wood === 5 && dropBag.x === 2000);
player.x = dropBag.x; frame(1);
check('drop bag can be reclaimed', res.wood === 5 && res.stone === 3 && res.iron === 2 && dropBag === null);

reset();
var tr2 = trees[0], gob = newGob(tr2.x);
goblins.push(gob);
player.x = tr2.x - 20; player.y = GROUND; player.face = 1;
keys.A = true; frame(1); keys.A = false;
check('enemy is hit before resources', gob.hp === 2 && tr2.hp === 3);

reset();
player.x = 3000; player.y = GROUND;
keys.U = true; frame(1); keys.U = false;
check('teleport returns player to castle', Math.abs(player.x - (castle.x + castle.w + 40)) < 5 && player.tpCd > 0);
player.x = 3000;
keys.U = true; frame(1); keys.U = false;
check('teleport blocked during cooldown', player.x === 3000);

reset();
raidTimer = 1; frame(2);
goblins = []; // keep goblins out of sword reach for this check
var rd1 = raiders[0], rd2 = raiders[1];
// space them out: far enough apart that a swing only reaches one, close
// enough that the first stays within chase range (320) during both hits
rd1.x = 2000; rd2.x = 2150; raiders.slice(2).forEach(function (r) { r.x = 3800; });
rd1.face = -1; rd2.face = -1; // spawn side (and facing) is random now — pin it so the back-attack is deterministic
player.x = 2040; player.y = GROUND; player.face = -1;
keys.A = true; frame(1); keys.A = false;
check('back-attacked raider turns on the player', rd1.turned === true);
player.x = 2190; player.face = -1; player.atkCd = 0;
keys.A = true; frame(1); keys.A = false;
check('only one raider turns at a time', rd2.hp < rd2.max && !rd2.turned);

reset();
goblins.forEach(function (g) { g.hp = 0; });
player.x = 3000; player.y = GROUND;
frame(600);
check('goblins stay dead while player is far away', goblins.length === 0);
player.x = castleRight() + 40;
frame(301);
check('goblins respawn near the castle wall', goblins.length > 0);
goblins.forEach(function (g) { g.hp = 0; });
player.x = 3000;
respawnWait = 60 * 60; frame(301);
check('goblins respawn after the hidden minute timer', goblins.length > 0);

// ---- level 2: own world, tougher enemies, own goal, separate best times ----
selLevel = 1; reset();
check('level 2 loads with its own world', level === LEVELS[1] && WORLD_W === LEVELS[1].worldW && trees.length > 0);
check('level 2 goblins are tougher', goblins[0].hp === 4 && goblins[0].max === 4);
raidTimer = 1; frame(2);
check('level 2 raiders get bonus hp', raiders.length > 0 && raiders[0].hp === 4 && raiders[0].max === 4);
check('level 2 best-times table starts empty', bestTimes.length === 0);
trees = []; rocks = []; ores = []; goblins = []; raiders = [];
troll.hp = 1; player.x = troll.x - 30; player.y = GROUND; player.face = 1;
keys.A = true; frame(30); keys.A = false;
check('level 2 troll can be defeated', !troll.alive);
castle.keep = 3; castle.walls = 2; castle.towers = 2; frame(1);
check('level 1 goal is not enough on level 2', scene === 'game');
castle.keep = 4; castle.walls = 3; castle.towers = 3; frame(1);
check('level 2 win uses its own goal', scene === 'win');
check('time saved to level 2 table only', bestTimes.length === 1 && allTimes[1] === bestTimes && allTimes[0].length === 1 && allTimes[0][0] !== bestTimes[0]);
enteringName = false;
selLevel = 0; reset();
check('level 1 keeps its own best times', level === LEVELS[0] && bestTimes.length === 1 && bestTimes[0].name === 'Sir Dave');

// ---- level 3: Deserted Desert — sand snake boss, gold in the chest ----
selLevel = 2; reset();
check('level 3 loads with its own world', level === LEVELS[2] && WORLD_W === LEVELS[2].worldW && trees.length > 0);
check('level 3 goblins are tougher', goblins[0].hp === 4 && goblins[0].max === 4);
check('level 3 boss is the sand snake', troll.name.indexOf('SAND SNAKE') >= 0 && troll.c1 === '#e3d7b4' && troll.shape === 'snake');
trees = []; rocks = []; ores = []; goblins = []; raiders = [];
troll.hp = 1; player.x = troll.x - 30; player.y = GROUND; player.face = 1;
keys.A = true; frame(30); keys.A = false;
check('level 3 boss can be defeated', !troll.alive);
var gold0 = res.gold;
player.x = chest.x; frame(1);
check('level 3 chest pays out gold too', chest.opened && res.gold === gold0 + 4 && res.iron >= 10);
castle.keep = 4; castle.walls = 3; castle.towers = 3; frame(1);
check('level 2 goal is not enough on level 3', scene === 'game');
castle.keep = 5; castle.walls = 5; castle.towers = 4; frame(1);
check('level 3 win uses its own goal', scene === 'win');
enteringName = false;
var lastCard = titleCard(LEVELS.length - 1);
check('title cards all fit on screen', titleCard(0).x >= 0 && lastCard.x + lastCard.w <= W);

// ---- level 4: Cavernous Cave — giant salamander boss ----
selLevel = 3; reset();
check('level 4 loads with its own world', level === LEVELS[3] && WORLD_W === LEVELS[3].worldW && trees.length > 0);
check('level 4 goblins are Hard-tier (4 hp)', goblins[0].hp === 4 && goblins[0].max === 4);
check('level 4 is tagged Hard', level.tag.indexOf('⭐⭐ ') === 0);
check('level 4 boss is the giant salamander', troll.name.indexOf('SALAMANDER') >= 0 && troll.shape === 'salamander');
trees = []; rocks = []; ores = []; goblins = []; raiders = [];
troll.hp = 1; player.x = troll.x - 30; player.y = GROUND; player.face = 1;
keys.A = true; frame(30); keys.A = false;
check('level 4 boss can be defeated', !troll.alive);
castle.keep = 5; castle.walls = 5; castle.towers = 3; frame(1);
check('an unmet goal keeps level 4 going', scene === 'game');
castle.keep = 5; castle.walls = 5; castle.towers = 4; frame(1);
check('level 4 win uses its own goal', scene === 'win');
enteringName = false;

// ---- level 3: fast sand-viper snakes with a venomous every-4th bite ----
selLevel = 2; reset();
var mob = goblins.find(function (g) { return g.kind === 'snake'; });
var gmob = goblins.find(function (g) { return !g.kind; });
check('level 3 spawns sand-viper snakes (3 hp)', !!mob && mob.max === 3);
// a chasing snake outruns a chasing goblin
player.x = 1000; player.y = GROUND; player.inv = 999; // stay in range, take no damage
mob.x = gmob.x = 1120; mob.y = gmob.y = GROUND; mob.state = gmob.state = 'chase';
var sx0 = mob.x, gx0 = gmob.x; updateGoblins();
check('snakes move faster than goblins', Math.abs(mob.x - sx0) > Math.abs(gmob.x - gx0) + 0.5);
// bite pattern: 1, 1, 1, then a venomous 2
selLevel = 2; reset();
var sk = goblins.find(function (g) { return g.kind === 'snake'; });
goblins = [sk]; // isolate one snake so only it can hit the knight
player.maxHp = 20; player.hp = 20; player.x = 1000; player.y = GROUND;
sk.x = 1006; sk.y = GROUND; sk.atkN = 0;
var dmg = [];
for (var b = 0; b < 4; b++) { var hp0 = player.hp; sk.atkCd = 0; player.inv = 0; updateGoblins(); dmg.push(hp0 - player.hp); }
check('every 4th snake bite deals 2 hearts (1,1,1,2)', dmg.join(',') === '1,1,1,2');
// snakes drop raw meat (a keeper resource); goblins do not
selLevel = 2; reset();
res.meat = 0;
killEnemy(goblins.find(function (g) { return g.kind === 'snake'; }));
check('killing a snake drops raw meat', res.meat >= 1);
var meat0 = res.meat, ironBefore = res.iron;
killEnemy(goblins.find(function (g) { return !g.kind; }));
check('killing a goblin drops no meat', res.meat === meat0 && res.iron > ironBefore);
// meat is kept for the run but dropped (and reclaimable) on death
player.x = 1500; player.y = GROUND; hurtPlayer(player.hp);
check('death drops your meat into the bag', res.meat === 0 && dropBag && dropBag.meat === meat0);
player.x = dropBag.x; frame(1);
check('reclaiming the bag restores your meat', res.meat === meat0 && dropBag === null);

// ---- meat is a TRANSFERRED inventory: it carries between levels ----
carriedMeat = 0; // clean slate for the transfer checks
selLevel = 2; reset();
killEnemy(goblins.find(function (g) { return g.kind === 'snake'; }));
var carried = res.meat; // 1 or 2
frame(1); // update() banks res.meat into carriedMeat
check('meat banks into the transfer inventory', carried >= 1 && carriedMeat === carried);
selLevel = 0; reset(); // switch to a different level (Forest — no snakes)
check('meat carries over into the next level', res.meat === carried);
check('wood/stone/iron/gold do NOT transfer', res.wood === 0 && res.stone === 0 && res.iron === 0 && res.gold === 0);
// dying still spends it: it drops on the level you fell, so leaving loses it
player.x = 700; player.y = GROUND; hurtPlayer(player.hp); frame(1);
check('a death empties the transfer inventory', carriedMeat === 0);
selLevel = 1; reset();
check('the next level then starts with no meat', res.meat === 0);
carriedMeat = 0; persistMeat(); // leave a clean slate for the remaining tests

// ---- quitting a level (without beating it) keeps your meat ----
carriedMeat = 0;
selLevel = 2; reset();
killEnemy(goblins.find(function (g) { return g.kind === 'snake'; }));
var keptOnQuit = res.meat; frame(1);
quitToTitle();
check('quitting to the title keeps your meat', scene === 'title' && carriedMeat === keptOnQuit && keptOnQuit >= 1);
selLevel = 2; reset();
check('the meat is still there on the next run', res.meat === keptOnQuit);

// ---- raw meat is capped at MAX_MEAT (10) ----
carriedMeat = 0; selLevel = 2; reset(); res.meat = 0;
var guard = 0;
while (res.meat < MAX_MEAT && guard++ < 200) killEnemy(goblins.find(function (g) { return g.kind === 'snake'; }));
var atCap = res.meat;
killEnemy(goblins.find(function (g) { return g.kind === 'snake'; })); // one more at the cap
check('meat never exceeds the cap of 10', MAX_MEAT === 10 && atCap === 10 && res.meat === 10);
// the drop bag can't push you over the cap either
res.meat = 8; dropBag = { x: player.x, wood: 0, stone: 0, iron: 0, gold: 0, meat: 6 };
player.x = dropBag.x; player.y = GROUND; frame(1);
check('reclaiming a bag stays within the cap', res.meat === 10);
carriedMeat = 0; persistMeat();

reset();
paused = true;
var rt0 = runTime, rd0 = raidTimer, px0 = player.x;
keys.R = true; frame(30); keys.R = false;
check('pause freezes timer, raids and player', runTime === rt0 && raidTimer === rd0 && player.x === px0);
paused = false; frame(5);
check('resume unfreezes the game', runTime === rt0 + 5);
quitToTitle();
check('Q quits back to the title screen', scene === 'title' && !paused);

reset();
check('villager spawns outside the castle walls', villager && villager.x > castleRight() && villager.x <= castleRight() + 200);
goblins = []; player.x = 1500; player.y = GROUND; // keep everyone else out of the way
// a raider dropped on the villager hunts them down: five hits, ~55 frames
// apart — the villager can flee but never escape
raiders.push({ x: villager.x, y: GROUND, hp: 9, max: 9, face: -1, hurt: 0, atkCd: 0, raider: true });
frame(1);
check('villager panics when raiders close in', villager.state === 'flee' || villager.state === 'cower');
frame(200);
check('fleeing does not save the villager', villager === null || villager.hp <= villager.max - 3);
frame(150);
check('raiders kill the villager in five hits', villager === null);
frame(300);
check('slain villager stays dead for the rest of the run', villager === null);
reset();
check('starting a new quest brings a new villager', villager !== null && villager.hp === 5);

// ---- mid-world castle, left-side raiders, legendary sword ----
reset();
check('castle sits mid-world', Math.abs(castle.x + castle.w / 2 - WORLD_W / 2) < 220);
check('troll waits on the right side', troll.x > WORLD_W * 0.7);
check('resources spawn on both sides', trees.some(function (tr) { return tr.x < castle.x; }) && trees.some(function (tr) { return tr.x > castle.x + castle.w; }));
goblins = []; villager = null; // nothing to distract the raider
var chp0 = castle.hp;
raiders.push({ x: castle.x - 12, y: GROUND, hp: 9, max: 9, face: 1, hurt: 0, atkCd: 0, raider: true });
player.x = 700; player.y = GROUND; // well away from the action
frame(60);
check('raiders bash the castle from the left too', castle.hp < chp0);
reset(); goblins = []; raiders = [];
player.swordLvl = 2; player.x = level.relic.x; player.y = GROUND;
frame(1);
check('legendary sword adds +3 on top of current damage', relic.taken && player.swordLvl === 5);
frame(60);
check('legendary sword is a one-time pickup', player.swordLvl === 5);

// ---- gold ore + villager trading ----
reset();
check('gold ore spawns and is tougher than iron', golds.length > 0 && golds[0].max > ores[0].max);
goblins = []; raiders = []; trees = []; rocks = []; ores = []; // nothing else in sword reach
var go = golds[0];
player.x = go.x - 20; player.y = GROUND; player.face = 1;
keys.A = true; frame(220); keys.A = false;
check('gold ore is slow to mine and pays exactly 2', go.hp <= 0 && res.gold === 2);
check('villager offers three trades', villager.trades.length === 3);
player.x = villager.x; player.y = GROUND;
keys.T = true; frame(1); keys.T = false;
check('T opens the trade menu near the villager', menuOpen && menuMode === 'trade');
res.gold = 10; tradeSel = 0;
var cost = villager.trades[0].gold;
keys.A = true; frame(1); keys.A = false;
check('buying a trade spends gold', res.gold === 10 - cost);
menuOpen = false;
var offers = villager.trades;
raidTimer = 1; frame(2);
check('raid start rerolls the trades', villager.trades !== offers && villager.trades.length === 3);

var sfxOk = true;
try { Object.keys(sfx).forEach(function (k) { sfx[k](); }); toggleMute(); toggleMute(); musicTick(); }
catch (e) { sfxOk = false; }
check('audio no-ops headless', sfxOk);

if (fails) throw new Error(fails + ' smoke test failure(s)');
'SMOKE TEST PASSED';
