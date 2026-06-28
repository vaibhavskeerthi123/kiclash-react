# KI CLASH — Tenkaichi Arena

A cel-shaded 3D arena fighter built with **React + Vite + Three.js (react-three-fiber)**.
Wheel character-select, Tenkaichi-style HUD, combos with launchers + air combos,
ki blasts, rush attacks, transformations, ultimate beams, and three environments.

Drop in your own **GLB / FBX** models with **no rigging or animation** required.

---

## Run it locally

You need Node.js 18+ installed.

```bash
npm install
npm run dev
```

It opens at http://localhost:5173 automatically.

To make a production build:

```bash
npm run build      # outputs to dist/
npm run preview    # serves the built version
```

---

## Controls (you are Player 1; Player 2 is the CPU)

| Action            | Key            |
|-------------------|----------------|
| Move              | A / D          |
| Jump / Dash       | Space (hold a direction + Space = dash) |
| Light attack      | J              |
| Heavy attack      | K              |
| Ki blast          | L              |
| Rush attack       | O              |
| Charge ki (hold)  | U              |
| Block (hold)      | I              |
| Transform         | T              |
| Ultimate          | P              |
| Pause             | Esc            |

### Combos

- **J, J, J** — ground string; the third hit launches the opponent into the air.
- Jump up with **Space**, then **J, J, K** — air combo; the heavy spikes them down.
- **K** — heavy launcher.
- **O** — rush: teleport in for a multi-hit (costs ki).
- **L** — ki blast projectile (costs ki).
- Hold **U** to fill your ki bar; land hits to fill the **blast gauge**, then **P** for the ultimate beam.

---

## Replacing the 3 characters with your own models

The game treats your model as one solid object and animates it for you
(lean, bob, lunge, knockback). No rigging, no animation files.

**Option A — folder (recommended):**
Put files in `public/models/` named after the fighter id, then run `npm run dev`:

```
public/models/sora.glb
public/models/rygar.glb
public/models/vela.glb
```

(`.fbx` also works. GLB is preferred since it's one self-contained file.)

**Option B — drag & drop:**
On the character-select screen, click a **Model → NAME** button to pick which
fighter to replace, then drag a `.glb` / `.fbx` file onto the window.

---

## Project structure

```
src/
  game/            framework-agnostic logic (no React, no Three.js)
    roster.js        characters, stages, attack frame data
    input.js         keyboard input + keymaps
    Fighter.js       per-fighter state machine + combat
    World.js         simulation: combat, projectiles, particles, AI
    materials.js     cel-shader + outline materials
  components/       React + react-three-fiber rendering
    FighterModel.jsx   loads GLB/FBX, applies cel shading, poses procedurally
    Stage.jsx          three environments
    Particles.jsx      instanced additive particle renderer
    Projectiles.jsx    ki blasts / beams
    BattleScene.jsx    drives the fixed-step loop + dynamic camera
    HUD.jsx            Tenkaichi-style overlay bars
    CharacterSelect.jsx  wheel select UI
  App.jsx          top-level scenes (title / select / battle / pause / result)
  styles.css
public/models/     drop your GLB/FBX here
```

The logic in `src/game/` is deliberately separate from rendering so you can
extend the combat, add characters, or swap renderers without touching the UI.

---

## Next-stage ideas (the architecture supports these)

- **Use a model's built-in animations** if its GLB ships with clips
  (Three.js `AnimationMixer`) — keeps the no-rigging promise while playing
  baked walk/attack clips.
- **Per-limb posing** by detecting named bones in an imported skeleton.
- **Local 2-player**: P2 keymap already exists in `src/game/input.js`
  (arrows + numpad). Swap the CPU `aiControl` call in `World.update` for a
  second `pollControls(b, MAP_P2)`.
- **More stages / characters**: add entries to `roster.js` and a branch in `Stage.jsx`.

Characters and art here are original and not based on any existing franchise.
