// Canvas handles, physics constants, tiny helpers, and declarations of all
// shared game state. State is ASSIGNED in main.js reset(); declared here so
// every later script can reference it.
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;
const GRAV = 0.55;

const rand = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rand(a, b + 1));
const near = (a, b, d) => Math.abs(a - b) < d;
// Level data uses negative x to mean "offset from the right edge of the world".
const worldX = x => x < 0 ? WORLD_W + x : x;

// ---- shared mutable state (see main.js reset()) ----
var scene = 'title', t = 0, msg = null, msgT = 0;
var level, WORLD_W, GROUND;
var player, res, castle, trees, rocks, ores, goblins, raiders, arrows, parts,
    platforms, raidTimer, wave, menuOpen, troll, chest, dropBag;

const say = (s, dur = 140) => { msg = s; msgT = dur; };
