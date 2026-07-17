// Level data only — no logic. To add a level: copy this block, tweak the
// numbers, push it onto LEVELS, and wire the level switch in main.js.
// Negative x values are offsets from the right edge of the world (worldX()).
// "Bands" scatter things from `from` to `to` at random gaps of gap[0]..gap[1].
const LEVELS = [];

LEVELS.push({
  name: 'Forest of Shadows',
  tag: '⭐ Normal',
  worldW: 4200,
  groundY: 420,
  playerStart: 340,
  castle: { x: 80, w: 200, hp: 100 },
  platforms: [
    { x: 1250, y: 320, w: 140 },
    { x: 2050, y: 330, w: 120 },
    { x: 2100, y: 230, w: 100 },
    { x: 2900, y: 320, w: 150 },
    { x: 3450, y: 300, w: 130 },
  ],
  bands: {
    trees:   { from: 650,  to: -500, gap: [160, 260] },
    rocks:   { from: 900,  to: -400, gap: [380, 600] },
    ores:    { from: 1600, to: -300, gap: [500, 750] },
    goblins: { from: 1000, to: -400, gap: [420, 600] },
  },
  goblinMinAlive: 6,
  goblinRespawnZone: { from: 1200, to: -500 },
  boss: { x: -260, hp: 15, name: '🧌 FOREST TROLL' },
  chest: { x: -140, loot: { wood: 10, stone: 10, iron: 8 } },
  raids: { firstDelaySec: 45, extraDelayPerWaveSec: 6, baseCount: 2, maxCount: 7 },
  goal: { keep: 3, walls: 2, towers: 2 }, // plus: defeat the boss
});
