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
['js/config.js', 'levels/level1.js', 'levels/level2.js', 'js/input.js', 'js/audio.js', 'js/world.js',
 'js/player.js', 'js/enemies.js', 'js/castle.js', 'js/render.js', 'js/main.js']
  .forEach(function (f) { (1, eval)(read(base + '/' + f).replace(/\b(const|let)\s+/g, 'var ')); });

// ---- helpers ----
var frame = function (n) { for (var i = 0; i < (n || 1); i++) rafCb(); };
var fails = 0;
var check = function (name, cond) {
  console.log((cond ? 'ok   - ' : 'FAIL - ') + name);
  if (!cond) fails++;
};

// ---- the tests ----
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

res.wood = 99; res.stone = 99; res.iron = 99;
menuOpen = true; menuSel = 0; keys.A = true; frame(1);
menuOpen = false; keys.A = false;
check('menu purchase builds wall', castle.walls === 1);

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

reset();
paused = true;
var rt0 = runTime, rd0 = raidTimer, px0 = player.x;
keys.R = true; frame(30); keys.R = false;
check('pause freezes timer, raids and player', runTime === rt0 && raidTimer === rd0 && player.x === px0);
paused = false; frame(5);
check('resume unfreezes the game', runTime === rt0 + 5);

var sfxOk = true;
try { Object.keys(sfx).forEach(function (k) { sfx[k](); }); toggleMute(); toggleMute(); musicTick(); }
catch (e) { sfxOk = false; }
check('audio no-ops headless', sfxOk);

if (fails) throw new Error(fails + ' smoke test failure(s)');
'SMOKE TEST PASSED';
