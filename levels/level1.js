// Level data only — no logic. To add a level: copy this block, tweak the
// numbers, push it onto LEVELS, and wire the level switch in main.js.
// Negative x values are offsets from the right edge of the world (worldX()).
// "Bands" scatter things from `from` to `to` at random gaps of gap[0]..gap[1];
// a band may be an array of ranges (castle is mid-world, so most things get a
// band on each side). The troll + chest live on the right edge, the legendary
// sword relic on the left edge.
const LEVELS = [];

LEVELS.push({
  name: 'Forest of Shadows',
  tag: '⭐ Normal',
  worldW: 4200,
  groundY: 420,
  playerStart: 2340,
  castle: { x: 2000, w: 200, hp: 100 },
  platforms: [
    { x: 600,  y: 320, w: 140 },
    { x: 1250, y: 320, w: 140 },
    { x: 1600, y: 240, w: 100 },
    { x: 2500, y: 330, w: 120 },
    { x: 2900, y: 320, w: 150 },
    { x: 3450, y: 300, w: 130 },
  ],
  bands: {
    trees:   [{ from: 250, to: 1800, gap: [160, 260] }, { from: 2450, to: -500, gap: [160, 260] }],
    rocks:   [{ from: 500, to: 1700, gap: [380, 600] }, { from: 2700, to: -400, gap: [380, 600] }],
    ores:    [{ from: 400, to: 1000, gap: [500, 750] }, { from: 3100, to: -300, gap: [500, 750] }],
    gold:    [{ from: 200, to: 700,  gap: [700, 1000] }, { from: 3400, to: -600, gap: [700, 1000] }],
    goblins: [{ from: 500, to: 1900, gap: [420, 600] }, { from: 2500, to: -400, gap: [420, 600] }],
  },
  goblinMinAlive: 6,
  goblinRespawnZone: [{ from: 600, to: 1800 }, { from: 2400, to: -500 }],
  boss: { x: -260, hp: 15, name: '🧌 FOREST TROLL' },
  chest: { x: -140, loot: { wood: 10, stone: 10, iron: 8 } },
  relic: { x: 120, bonus: 3 },
  raids: { firstDelaySec: 45, extraDelayPerWaveSec: 6, baseCount: 2, maxCount: 7 },
  goal: { keep: 3, walls: 2, towers: 2 }, // plus: defeat the boss
});
