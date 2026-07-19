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
var scene = 'title', t = 0, msg = null, msgT = 0, paused = false;
var level, WORLD_W, GROUND, levelIdx = 0, selLevel = 0;
var player, res, castle, trees, rocks, ores, golds, goblins, raiders, arrows, parts,
    platforms, raidTimer, wave, menuOpen, menuMode, troll, chest, dropBag, runTime, lastRun,
    respawnWait, villager, relic,
    enteringName = false, nameBuf = '';

// frames → "m:ss.t" for the speedrun timer and best-times table
const fmtTime = f => { const s = f / 60, m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}.${Math.floor(s * 10 % 10)}`; };

const say = (s, dur = 140) => { msg = s; msgT = dur; };
