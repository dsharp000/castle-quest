# Castle Quest

2D side-scrolling gather → build → defend game (chop trees, mine rock/iron,
fight goblins, upgrade the castle, survive raids, beat the troll boss).
Pure canvas + vanilla JS. No dependencies, no build step, no server needed:
plain `<script>` tags share globals (NOT ES modules), so double-clicking
`index.html` works from `file://`.

## File layout — edit only the file that owns the feature

| File | Owns |
|---|---|
| `index.html` | DOM, CSS, touch buttons, script load order (config → level → input → world → player → enemies → castle → villager → render → main) |
| `js/config.js` | canvas handles (`cv`,`ctx`,`W`,`H`), constants, helpers (`rand`,`ri`,`near`,`worldX`), declarations of all shared globals, `say()` |
| `js/input.js` | keyboard/touch → `keys` flags: `L R` move, `J` jump/menu-up, `A` attack/buy, `E` build menu, `T` trade with villager, `U` teleport, `LK` look; plus direct toggles (`Y` pause, `P` power mode ⚡ = invincible+fast cheat (password-gated via `prompt()`; re-locks each time it's turned off, so the password is needed every time you turn it on), `Q` quit to title, win-screen name typing) |
| `js/audio.js` | Web Audio: procedural `sfx.*` effects + looping chiptune music (raid variant); mute = M key / 🔊 button, persisted in localStorage `cq-muted` |
| `levels/*.js` | `LEVELS` array — pure data: platforms, resource/goblin bands, boss (hp/dmg/colors), chest loot, raid pacing (incl. `hpBonus`), `goblinHp`, win goal, background `theme`. Add a level = new file pushing an entry + a `<script>` tag in `index.html`; the title screen picks it up automatically |
| `js/world.js` | trees/rocks/ores/golds (spawn, respawn, drawing), particles (`puff`/`pop`), treasure chest. Gold ore: 8 hp, always yields exactly 2 🪙 — the villager's trade currency |
| `js/player.js` | knight movement/physics, `swing()` (gathering AND melee), `hurtPlayer()`, player drawing |
| `js/enemies.js` | goblin AI, raider waves, troll boss, `killEnemy()` drops, enemy drawing |
| `js/castle.js` | build/craft `MENU`, tower auto-fire + arrows, castle & menu drawing |
| `js/villager.js` | friendly villager NPC: wander/flee/cower AI, raider kills (permanent for the run — next villager comes with `reset()`), gift to nearby player, gold-for-goods trade menu (`rollTrades`/`updateTradeMenu`/`drawTradeMenu`, rerolled by `spawnRaid`), drawing (raider hunt-the-villager targeting itself lives in `enemies.js`) |
| `js/render.js` | background/parallax, HUD, `bar()` health bars, title/end screens, `draw()` orchestration |
| `js/main.js` | `reset()`, `update()` call order, game loop, scenes (`title`/`game`/`over`/`win`), per-level best-times tables (`allTimes` in localStorage `cq-times-v2`; old `cq-times` migrates to level 1), and the transferred meat inventory (`carriedMeat` in localStorage `cq-meat` — seeds `res.meat` each level, `update()` banks changes back) |

## Conventions

- Shared mutable state is top-level globals **declared in `config.js`**,
  assigned in `main.js reset()`: `player, res, castle, trees, rocks, ores,
  golds, goblins, raiders, arrows, parts, platforms, raidTimer, wave, menuOpen,
  menuMode ('build'|'trade' — which overlay `menuOpen` shows), troll, chest,
  relic, villager, level, scene, t`. Level selection: `selLevel` is the
  title-screen choice (←/→ or tap a card), `loadLevel()` applies it and swaps
  `bestTimes` to that level's table.
- Each entity's update AND draw functions live in the same module.
- Time: `t` increments once per frame (~60 fps). Timers count frames
  (`60 * seconds`). Throttled events use `t % N === 0`.
- World coordinates: x grows rightward. The castle sits mid-world; each
  whole raid strikes from one random edge (all its raiders share it) and the
  raid banner never says which (side-aware targeting in `updateRaiders`). The
  troll boss + chest are always at the far right, the legendary sword `relic`
  (+3 swordLvl, one-time) at the far left. An entity's `x,y` is its feet at
  `GROUND` (y=420) when standing. In level data, **negative x = offset from
  the right edge** (`worldX()` resolves); band specs may be arrays (one band
  per side of the castle).
- `draw()` wraps world-space drawing in `translate(-cam(), 0)`; HUD/menus
  draw after `restore()` in screen space.
- Style: compact vanilla JS, no classes, plain object literals for entities,
  emoji for icons/pickup text.
- Sound: call `sfx.<name>()` from gameplay code at the moment something
  happens — every `sfx` function safely no-ops before the first user gesture,
  when muted, or headless. All audio is synthesized (no asset files).

## Testing

No Node on this machine — use the JavaScriptCore smoke test (stubs the DOM,
runs real frames, asserts core mechanics). Run it after any gameplay change:

    cd castle-quest && osascript -l JavaScript test/smoke.js

Add a `check(...)` line to `test/smoke.js` when adding a new mechanic.
Final check: open `index.html` in a browser and play.
