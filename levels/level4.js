// Level 4 — "Cavernous Cave": a dark, rocky underground level tuned to the
// Hard tier (⭐⭐, on par with the desert). Big world, sparse trees but plenty
// of rock, sturdy goblins, and a stone-floor cave theme. The boss is the
// GIANT SALAMANDER — a huge four-legged cave amphibian (shape: 'salamander',
// dark body with glowing orange spots).
LEVELS.push({
  name: 'Cavernous Cave',
  tag: '⭐⭐ Hard',
  worldW: 5600,
  groundY: 420,
  playerStart: 2940,
  castle: { x: 2600, w: 200, hp: 85 },
  platforms: [
    { x: 500,  y: 320, w: 130 },  // stalagmite ledges
    { x: 1150, y: 315, w: 120 },
    { x: 1210, y: 220, w: 90 },
    { x: 1800, y: 330, w: 120 },
    { x: 3300, y: 325, w: 120 },
    { x: 3360, y: 230, w: 90 },
    { x: 3950, y: 315, w: 130 },
    { x: 4550, y: 300, w: 130 },
  ],
  bands: {
    trees:   [{ from: 350, to: 2200, gap: [300, 460] }, { from: 3050, to: -600, gap: [300, 460] }], // rare cave fungus-trees
    rocks:   [{ from: 400, to: 2400, gap: [280, 430] }, { from: 3150, to: -400, gap: [280, 430] }], // rock everywhere
    ores:    [{ from: 400, to: 1300, gap: [460, 700] }, { from: 3500, to: -350, gap: [460, 700] }],
    gold:    [{ from: 250, to: 850,  gap: [720, 1020] }, { from: 3950, to: -650, gap: [720, 1020] }],
    goblins: [{ from: 550, to: 2450, gap: [280, 410] }, { from: 3000, to: -400, gap: [280, 410] }],
  },
  goblinMinAlive: 10,
  goblinHp: 4,                 // sturdy, same as the desert
  goblinRespawnZone: [{ from: 650, to: 2350 }, { from: 2950, to: -500 }],
  boss: { x: -260, hp: 24, dmg: 2, name: '🦎 GIANT SALAMANDER', shape: 'salamander', c1: '#43372f', c2: '#e8892b' },
  chest: { x: -140, loot: { wood: 8, stone: 10, iron: 12, gold: 5 } },
  relic: { x: 120, bonus: 3 },
  raids: { firstDelaySec: 44, extraDelayPerWaveSec: 5, baseCount: 2, maxCount: 8 },
  goal: { keep: 5, walls: 5, towers: 4 }, // plus: defeat the boss
  theme: {
    sky0: '#0e0b14', sky1: '#241b2e', deep0: '#2a231f', deep1: '#181310', // cave ceiling → dark rock
    hills: '#2a2430', far: '#1e1a24',
    ground: '#4a4048', edge: '#332d38', tufts: '#5f5566', // grey stone floor + pebbles
  },
});
