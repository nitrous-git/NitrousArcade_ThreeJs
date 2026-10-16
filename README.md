# Nitrous Arcade — Phase 1

A clean, buildless foundation for a growing collection of Three.js games. Open this entire folder as your WebStorm project.

## Start in WebStorm

1. Extract `NitrousArcade_Phase1_v0.1.0.zip`.
2. In WebStorm, select **Open** and choose the `NitrousArcade` folder containing `index.html`.
3. Open `index.html` using WebStorm's **Open in Browser** action. The URL must start with `http://localhost` (usually WebStorm's port 63342), not `file://`.
4. Click **Enter the playground** to launch Signal Lab.

No npm install or build step is required. Internet access is needed for the pinned Three.js CDN modules when you first launch a scene. Artwork, styles, JavaScript application code, and synthesized audio are included locally. No external textures, models, fonts, or sound packs are needed.

Optional alternative, with Node.js 20 or newer installed:

```sh
npm start
```

Then open `http://localhost:8080`. This uses a small dependency-free development server bound to your computer. It is not a production server. If the port is occupied, use WebStorm's built-in server or set `PORT` before starting it.

## What is included

- Responsive dark launcher with original vector artwork, game categories, planned game details, and a live playground entry.
- Six planned games: Brick Breaker, Pong, Snake, Block Stack, Starfighter, and Maze Runner. Their artwork is illustrative; they are **not implemented games**.
- **Signal Lab**: an interactive integration sandbox, not the first arcade game. Move the crystal, send pulses, try settings, and finish a session to verify score storage.
- Lazy module loading, one active session, fixed 60 Hz simulation with capped catch-up, variable-rate rendering, pause/resume/restart/exit, and fullscreen where supported.
- Automatic pause on window blur or hidden tab. Resume is always explicit.
- Keyboard and pointer/touch input scoped to the game canvas.
- One shared audio service, versioned browser storage, validated settings, per-game high scores, and safe in-memory fallback when storage is blocked.
- Three.js renderer wrapper with optional bloom, quality presets, and explicit resource ownership / disposal.
- A copyable game template, architecture notes, a manual validation checklist, and dependency-free runtime tests.

## Signal Lab controls

| Action | Input |
| --- | --- |
| Move | WASD or arrow keys |
| Pulse | Space or primary pointer press |
| Touch / mouse movement | Hold and drag inside the canvas |
| Pause / resume | Escape or toolbar button |
| Restart | Restart button |
| Save the test session | Finish test |
| Return to the launcher | Arcade button |

Pulses are a **test counter**, not a competitive game score. There are no enemies, win conditions, or loss conditions in this sandbox. It deliberately leaves the first game's mechanics and art direction open for the next phase.

## Structure

| Path | Responsibility |
| --- | --- |
| `index.html` | Accessible launcher, player shell, dialogs, Three.js import map |
| `css/tokens.css` | Shared colors, fonts, and design tokens |
| `css/base.css` | Common controls, dialogs, and reduced-motion behavior |
| `css/arcade.css` | Launcher and game cards |
| `css/player.css` | Player, HUD, and pause/error overlays |
| `js/main.js` | DOM wiring and application orchestration |
| `js/config.js` | Version, storage key, defaults, and quality presets |
| `js/core/` | Game lifecycle, input, loop, audio, storage, settings, scores, ownership |
| `js/rendering/` | Three.js renderer, post-processing, and shared shaders |
| `js/games/registry.js` | Game metadata and lazy module loaders |
| `js/games/signal-lab/` | Working integration sandbox |
| `js/games/_template/` | Starter for the first real game |
| `assets/` | Original SVG branding and illustrations |
| `docs/` | Architecture, adding a game, validation, and next steps |
| `tools/` | Optional development server and source checks |
| `tests/` | Automated tests for lifecycle and shared services |

## Validation

With Node.js 20+:

```sh
npm run check
npm test
```

These checks need no installed packages. They validate syntax, local references, storage behavior, timing, input scoping, and lifecycle cancellation/cleanup. GPU visuals and browser-specific fullscreen/audio behavior still require a browser; see `docs/VALIDATION.md`.

## Dependencies and hosting

Three.js is pinned to **0.180.0** in the import map in `index.html`. Core and addons use the same version and CDN. This is a deliberate fixed baseline, not a claim to use the latest release. To upgrade later, change both imports together and run the checklist. No third-party library source is bundled.

The project is compatible with static hosting, including a GitHub Pages project subdirectory: local paths are relative and there is no history router or backend. When you are ready, push the contents of this folder to your repository and configure Pages to serve the repository root. `.nojekyll` is included. The portfolio can later link to the arcade as one project.

Local records are tied to browser origin: changing port, browser, or deployment URL creates a separate set of records. This is intentional for Phase 1. There are no online accounts or leaderboards.

For offline use later, self-host the matching Three.js distribution and update the two import-map paths. The current delivery is **CDN-based**, not offline-ready.

## Next

Read `docs/ADDING_A_GAME.md`, then choose the first game's rules, controls, and visual direction. The launcher and services are ready to support it without prescribing the gameplay.
