// Level 3 — "Deserted Desert", designed on paper with the level-designer
// sheet (July 2026): Hard ⭐⭐, medium world, desert at dusk, lots of tough
// goblins, a Strong cream + light-brown Giant Sand Snake boss, normal-paced
// raids, gold in the treasure chest, and a big castle to win (keep 5,
// walls 5, towers 4). Platforms follow the sheet's drawing left→right:
// high ledge, low hop, a two-pillar sand gate mid-world, low hop, then a
// stacked jump beside the boss.
LEVELS.push({
  name: 'Deserted Desert',
  tag: '⭐⭐ Hard',
  worldW: 4800,
  groundY: 420,
  playerStart: 2640,
  castle: { x: 2300, w: 200, hp: 85 },
  platforms: [
    { x: 2700, y: 270, w: 130 },  // high ledge (drawn at the top of the strip)
    { x: 2970, y: 330, w: 130 },
    { x: 3280, y: 300, w: 70 },   // sand-gate pillars — walk the doorway
    { x: 3420, y: 300, w: 70 },   //   between them or jump across the tops
    { x: 3870, y: 325, w: 130 },
    { x: 4180, y: 330, w: 120 },  // stacked jump up toward the boss
    { x: 4245, y: 245, w: 100 },
  ],
  bands: {
    trees:   [{ from: 300, to: 2100, gap: [260, 400] }, { from: 2750, to: -500, gap: [260, 400] }], // sparse — it's a desert
    rocks:   [{ from: 500, to: 2000, gap: [350, 550] }, { from: 2900, to: -400, gap: [350, 550] }],
    ores:    [{ from: 400, to: 1100, gap: [480, 720] }, { from: 3300, to: -300, gap: [480, 720] }],
    gold:    [{ from: 250, to: 750,  gap: [750, 1050] }, { from: 3700, to: -600, gap: [750, 1050] }],
    goblins: [{ from: 550, to: 2150, gap: [300, 440] }, { from: 2700, to: -400, gap: [300, 440] }],
    snakes:  [{ from: 800, to: 1900, gap: [520, 820] }, { from: 3000, to: -700, gap: [520, 820] }], // fast desert sand-vipers
  },
  goblinMinAlive: 10,          // sheet: "Lots"
  goblinHp: 4,                 // sheet: toughness 3 of 5
  snakeHp: 3,                  // fast but fragile — glass cannons
  goblinRespawnZone: [{ from: 650, to: 2050 }, { from: 2650, to: -500 }],
  boss: { x: -260, hp: 22, dmg: 2, name: '🐍 GIANT SAND SNAKE', shape: 'snake', c1: '#e3d7b4', c2: '#b9915f' },
  chest: { x: -140, loot: { wood: 6, stone: 8, iron: 10, gold: 4 } },
  relic: { x: 120, bonus: 3 },
  raids: { firstDelaySec: 45, extraDelayPerWaveSec: 5, baseCount: 2, maxCount: 8 },
  goal: { keep: 5, walls: 5, towers: 4 }, // plus: defeat the boss
  theme: {
    sky0: '#432f5e', sky1: '#c97b3f', deep0: '#9c7a45', deep1: '#7a5c33',
    hills: '#6e4530', far: '#54351f', // dunes + far pyramids
    ground: '#c9a25a', edge: '#a8823f', tufts: '#a89a4f', // sand + dry scrub
  },
});
