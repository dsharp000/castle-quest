// Level 2 — harder than the forest: bigger world, sparser resources, tougher
// goblins (goblinHp), meaner raids (hpBonus, faster pacing), a stronger troll
// (dmg + hp), a weaker castle, and a taller win goal. `theme` recolors the
// background; the troll's c1/c2 recolor the boss.
LEVELS.push({
  name: 'Frostpeak Pass',
  tag: '⭐⭐ Hard',
  worldW: 5400,
  groundY: 420,
  playerStart: 2940,
  castle: { x: 2600, w: 200, hp: 80 },
  platforms: [
    { x: 500,  y: 320, w: 130 },
    { x: 1150, y: 320, w: 130 },
    { x: 1800, y: 330, w: 120 },
    { x: 1860, y: 230, w: 100 },
    { x: 3200, y: 330, w: 120 },
    { x: 3260, y: 235, w: 100 },
    { x: 3900, y: 310, w: 130 },
    { x: 4500, y: 300, w: 130 },
  ],
  bands: {
    trees:   [{ from: 300, to: 2400, gap: [230, 350] }, { from: 3050, to: -600, gap: [230, 350] }],
    rocks:   [{ from: 550, to: 2300, gap: [430, 650] }, { from: 3300, to: -450, gap: [430, 650] }],
    ores:    [{ from: 450, to: 1200, gap: [520, 780] }, { from: 3800, to: -350, gap: [520, 780] }],
    gold:    [{ from: 250, to: 800,  gap: [800, 1100] }, { from: 4200, to: -700, gap: [800, 1100] }],
    goblins: [{ from: 600, to: 2450, gap: [300, 440] }, { from: 3000, to: -400, gap: [300, 440] }],
  },
  goblinMinAlive: 9,
  goblinHp: 4,
  goblinRespawnZone: [{ from: 700, to: 2300 }, { from: 2900, to: -500 }],
  boss: { x: -260, hp: 28, dmg: 3, name: '🧊 FROST TROLL', c1: '#4a5a7a', c2: '#5d6f8e' },
  chest: { x: -140, loot: { wood: 14, stone: 14, iron: 12 } },
  relic: { x: 120, bonus: 3 },
  raids: { firstDelaySec: 40, extraDelayPerWaveSec: 4, baseCount: 3, maxCount: 9, hpBonus: 1 },
  goal: { keep: 4, walls: 3, towers: 3 }, // plus: defeat the boss
  theme: {
    sky0: '#141c30', sky1: '#3a5578', deep0: '#3a4656', deep1: '#2c3644',
    hills: '#243654', far: '#1b2a46',
    ground: '#8a95a3', edge: '#6e7a89', tufts: '#aab4c0', // snow
  },
});
