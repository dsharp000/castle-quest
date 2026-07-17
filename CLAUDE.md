# Castle Quest

2D side-scrolling gather → build → defend game (chop trees, mine rock/iron,
fight goblins, upgrade the castle, survive raids, beat the troll boss).
Pure canvas + vanilla JS. No dependencies, no build step, no server needed:
plain `<script>` tags share globals (NOT ES modules), so double-clicking
`index.html` works from `file://`.

## File layout — edit only the file that owns the feature

| File | Owns |
|---|---|
| `index.html` | DOM, CSS, touch buttons, script load order (config → level → input → world → player → enemies → castle → render → main) |
| `js/config.js` | canvas handles (`cv`,`ctx`,`W`,`H`), constants, helpers (`rand`,`ri`,`near`,`worldX`), declarations of all shared globals, `say()` |
| `js/input.js` | keyboard/touch → `keys` flags: `L R` move, `J` jump/menu-up, `A` attack/buy, `E` build menu, `U` teleport; plus direct toggles (`Y` pause, win-screen name typing) |
| `js/audio.js` | Web Audio: procedural `sfx.*` effects + looping chiptune music (raid variant); mute = M key / 🔊 button, persisted in localStorage `cq-muted` |
| `levels/*.js` | `LEVELS` array — pure data: platforms, resource/goblin bands, boss (hp/dmg/colors), chest loot, raid pacing (incl. `hpBonus`), `goblinHp`, win goal, background `theme`. Add a level = new file pushing an entry + a `<script>` tag in `index.html`; the title screen picks it up automatically |
| `js/world.js` | trees/rocks/ores (spawn, respawn, drawing), particles (`puff`/`pop`), treasure chest |
| `js/player.js` | knight movement/physics, `swing()` (gathering AND melee), `hurtPlayer()`, player drawing |
| `js/enemies.js` | goblin AI, raider waves, troll boss, `killEnemy()` drops, enemy drawing |
| `js/castle.js` | build/craft `MENU`, tower auto-fire + arrows, castle & menu drawing |
| `js/render.js` | background/parallax, HUD, `bar()` health bars, title/end screens, `draw()` orchestration |
| `js/main.js` | `reset()`, `update()` call order, game loop, scenes (`title`/`game`/`over`/`win`), per-level best-times tables (`allTimes` in localStorage `cq-times-v2`; old `cq-times` migrates to level 1) |

## Conventions

- Shared mutable state is top-level globals **declared in `config.js`**,
  assigned in `main.js reset()`: `player, res, castle, trees, rocks, ores,
  goblins, raiders, arrows, parts, platforms, raidTimer, wave, menuOpen,
  troll, chest, level, scene, t`. Level selection: `selLevel` is the
  title-screen choice (←/→ or tap a card), `loadLevel()` applies it and swaps
  `bestTimes` to that level's table.
- Each entity's update AND draw functions live in the same module.
- Time: `t` increments once per frame (~60 fps). Timers count frames
  (`60 * seconds`). Throttled events use `t % N === 0`.
- World coordinates: x grows rightward, castle at far left, boss/chest at far
  right. An entity's `x,y` is its feet at `GROUND` (y=420) when standing.
  In level data, **negative x = offset from the right edge** (`worldX()` resolves).
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
