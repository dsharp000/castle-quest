// Level 5 — "Vengeful Volcano": the finale, tuned to the Super Hard tier
// (⭐⭐⭐ — a notch above the desert/cave). A huge world on the slopes of an
// erupting volcano: molten EMBERS rain from the sky (a dodge-or-burn hazard,
// see `embers` below), goblins are the sturdiest yet, the raids come hard and
// fast, and the finish demands a fuller castle. The boss is the FIRE DRAGON —
// a reared, winged serpent that breathes flame (shape: 'dragon', dark-red
// scales with an orange wing/horn glow).
LEVELS.push({
  name: 'Vengeful Volcano',
  tag: '⭐⭐⭐ Super Hard',
  worldW: 6200,
  groundY: 420,
  playerStart: 3260,
  castle: { x: 2900, w: 200, hp: 90 },
  platforms: [
    { x: 560,  y: 320, w: 130 },  // basalt ledges climbing the slope
    { x: 1180, y: 315, w: 120 },
    { x: 1240, y: 215, w: 90 },
    { x: 1820, y: 330, w: 120 },
    { x: 3620, y: 325, w: 120 },
    { x: 3680, y: 225, w: 90 },
    { x: 4300, y: 315, w: 130 },
    { x: 4360, y: 210, w: 90 },
    { x: 5000, y: 300, w: 130 },
  ],
  bands: {
    trees:   [{ from: 360, to: 2500, gap: [320, 500] }, { from: 3350, to: -600, gap: [320, 500] }], // charred, sparse
    rocks:   [{ from: 420, to: 2700, gap: [280, 430] }, { from: 3500, to: -400, gap: [280, 430] }], // volcanic rock everywhere
    ores:    [{ from: 420, to: 1400, gap: [460, 700] }, { from: 3900, to: -350, gap: [460, 700] }],
    gold:    [{ from: 260, to: 900,  gap: [720, 1020] }, { from: 4400, to: -650, gap: [720, 1020] }],
    goblins: [{ from: 580, to: 2750, gap: [270, 400] }, { from: 3300, to: -400, gap: [270, 400] }],
  },
  goblinMinAlive: 12,
  goblinHp: 5,                 // Super Hard — the sturdiest goblins in the game
  goblinRespawnZone: [{ from: 680, to: 2650 }, { from: 3250, to: -500 }],
  // molten ember rain: every ~2.2s, one or two lava drops fall near you;
  // a direct hit or a landing splash burns for 2 hearts. Dodge while you gather.
  embers: { everySec: 2.2, count: [1, 2], dmg: 2 },
  // The dragon does NOT appear at the start: `afterGoal` keeps it away until the
  // castle is finished, then it descends. Beating it doesn't kill it — you TAME
  // it by feeding it a full pack of raw meat (see `tame`). Bring meat from the
  // sand-vipers on Level 3 — there is no meat here on the volcano.
  boss: { x: -280, hp: 30, dmg: 3, name: '🐉 FIRE DRAGON', shape: 'dragon', c1: '#8a1f18', c2: '#f0761e', afterGoal: true },
  tame: { meat: 10 }, // feed the beaten dragon 10 🥩 to tame it → victory
  chest: { x: -150, loot: { wood: 8, stone: 12, iron: 14, gold: 6 } },
  relic: { x: 120, bonus: 3 },
  raids: { firstDelaySec: 40, extraDelayPerWaveSec: 4, baseCount: 3, maxCount: 9 },
  goal: { keep: 5, walls: 6, towers: 5 }, // finish this, and the dragon comes
  theme: {
    sky0: '#1a0d0e', sky1: '#5a1c14', deep0: '#3a1410', deep1: '#1c0806', // ash sky glowing red at the horizon
    hills: '#3a1210', far: '#280c0a', // volcanic cones
    ground: '#2e2422', edge: '#120c0a', tufts: '#e8641e', // black basalt + glowing ember flecks
  },
});
