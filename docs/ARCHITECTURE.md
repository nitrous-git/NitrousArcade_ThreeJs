# Architecture

## The boundary

`main.js` connects the DOM to shared services. `GameHost` owns one active game session. The selected game owns its rules, scene, camera, and assets. Neither the launcher nor the host contains game-specific collision or AI logic.

The menu imports no Three.js modules. A launch dynamically imports the selected game and then the graphics wrapper. A CDN or GPU failure therefore leaves the menu usable and provides a retry / exit overlay in the player.

## Session states

| State | Meaning | Main exits |
| --- | --- | --- |
| menu | No session / canvas | launch → loading |
| loading | Importing / initializing | success → playing, error → error, exit → menu |
| playing | Input and loop enabled | pause → paused, finish → finished, exit → menu |
| paused | Scene retained, loop stopped | resume → playing, restart → playing, exit → menu |
| finished | Final score recorded, loop stopped | restart → playing, exit → menu |
| error | Failed session disposed | retry → loading, exit → menu |

Every launch increments a generation number and owns an AbortController. Late module imports cannot replace a newer session. A cancelled async init is disposed after it settles; pass the supplied signal to fetch and make long initialization cancel-aware. JavaScript dynamic imports themselves cannot be aborted.

## Shared game contract

The game module exports `createGame()`, returning a **fresh** object with:

| Method | Contract |
| --- | --- |
| `init(context)` | Required, may be async. Create scene/assets; no animation loop. |
| `start()` | Required, synchronous. Reset the existing game; called on initial launch and every restart. |
| `fixedUpdate(dt)` | Required, synchronous. Simulation at 1/60 second steps. |
| `render(alpha, dt)` | Required. Interpolate model state if needed, then call `context.graphics.render`. |
| `resize(viewport)` | Required. Update the camera / playfield framing. May run before `start()`. |
| `pause()` / `resume()` | Optional synchronous hooks. The host already stops and restarts timing/input. |
| `dispose()` | Required. Remove game references and non-tracked resources; must tolerate partial init. |

`start()` must reset existing objects or dispose replacements; it must not repeatedly allocate untracked assets. Call `finish()` from gameplay after start, not during init or start.

## Context services

| Member | Use |
| --- | --- |
| `graphics` | `canvas`, `renderer`, `viewport`, `render(scene, camera, dt)` |
| `input` | `isDown(code)`, `consume(code)`, `axis(negativeCodes, positiveCodes)`, normalized `pointer` |
| `audio` | `tone(frequency, duration)` synthesized effect; shared AudioContext |
| `settings` | Read `.snapshot`; `subscribe(listener)` returns unsubscribe function |
| `motionReduced()` | Combines the app preference and the current OS motion preference |
| `scope` | `track(disposable)` or `track(cleanupFunction)` for ownership |
| `signal` | Session AbortSignal for fetch and game-owned event listeners |
| `setHud({score, best, label})` | Update relevant HUD fields |
| `finish(score)` | End the round and store its best score; score is a nonnegative safe integer |

Do not give a game its own requestAnimationFrame loop, renderer, AudioContext, or global keyboard listeners. Use the host services. If a future game's needs justify another approach, evolve the contract deliberately.

## Timing and input

The loop runs fixed simulation steps and renders once per animation frame. Delta time is clamped to 100 ms, with at most six catch-up steps. Excess elapsed time is dropped rather than creating a spiral of work. Resuming resets the accumulator and clock.

Keyboard input is accepted only when the focused canvas receives the event; settings fields retain native controls. Key-up and focus-loss clear held keys. Edge presses are available for one fixed simulation step via `consume`, while held keys use `isDown`. Pointer coordinates are normalized to [-1,1] and do not depend on device pixel ratio. Pointer capture supports dragging off the canvas; pointer cancellation clears the drag.

## Rendering and performance

One renderer is created per active session and reused across its restarts. Returning to the menu disposes it. Only the active scene renders; the launcher uses static SVG art, avoiding another GPU loop.

The render pipeline is RenderPass → UnrealBloomPass → OutputPass. Low quality uses direct rendering with no composer. Pixel ratio caps are 1 (Low), 1.5 (Balanced), and 2 (High). Bloom settings and resizing apply to the current session. Bright materials can use linear HDR color values above 1 for bloom; keep HUD text in HTML for legibility.

Three.js core and addons are pinned to the same release. Color output is sRGB and tone mapping is ACES Filmic. WebGL2-capable browsers / hardware are required by this Three.js baseline. A lost context ends the session and offers relaunch rather than trying to continue with invalid GPU resources.

## Resource ownership

Track each geometry, material, texture, render target, and custom cleanup once with `ctx.scope.track`. Track textures separately: disposing a material does **not** dispose its textures. A Set deduplicates resources within a scope. Scope cleanup attempts all registered disposals even if one throws.

Recommended order on exit: abort session work → stop loop → detach input → game dispose hook → scope cleanup → composer and renderer disposal → canvas removal. Shared audio is silenced but retained for the next game. No geometry, texture, or material cache is shared across games in this foundation.

Avoid untracked timers. For game events, use `element.addEventListener(name, handler, {signal: ctx.signal})`. For settings subscriptions, use `ctx.scope.track(ctx.settings.subscribe(handler))`.

## Persistence

One `nitrous-arcade:v1` document contains version, settings, and scores. Settings are sanitized on load. Scores are validated on read and write. Unknown document versions start fresh. Malformed or blocked storage never blocks the launcher; state remains in memory for the visit. No personal information is collected.

## Intentionally deferred

Real game rules, asset/audio loading pipelines, online leaderboards, controller support, advanced touch overlays, achievements, service workers, and elaborate scene transitions. Add shared abstractions only when a real game needs them.

References: [Three.js installation](https://threejs.org/manual/pages/installation.html), [EffectComposer](https://threejs.org/docs/pages/EffectComposer.html), [UnrealBloomPass](https://threejs.org/docs/pages/UnrealBloomPass.html).

## Brick Breaker integration

The implemented game in `js/games/brick-breaker/` uses a pure model, exact circle/polygon sweeps, stage generators, pooled visual effects, and a scoped DOM HUD. It uses the existing host and loop. `ctx.finish(score, result)` optionally accepts `{ victory, summary }`; score-only games remain compatible. `docs/BRICK_BREAKER.md` describes the model and resource ownership.
