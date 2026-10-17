# Brick Breaker implementation

## Simulation and collision

`BrickBreakerModel` is independent of Three.js and the DOM. It takes a fixed `dt` and an input object with `axis`, optional world-space `pointerX`, and `launch`. It produces state plus a drainable event queue. Rendering, audio, and effect randomness never influence score or collision.

Every ball sweeps a circle against the arena, paddle, and live brick polygons. A swept AABB rejects distant bricks; exact contacts test each polygon's offset faces and rounded corner circles. The earliest hit is resolved, reflected (or pierced), and followed by another sweep for the remaining time. A bounded iteration count discards excess time in degenerate contact cases instead of advancing through geometry. A small outward separation avoids immediate re-hits. No external physics engine is needed at this scale.

The paddle uses its current fixed-step position for contact. Its hit offset sets the outgoing angle; this is intentional arcade steering, not physical momentum transfer. Paddle width eases between normal and wide states. Camera size never changes physics bounds. Input is converted from the same orthographic camera used to render.

Fireballs remember contacted bricks until they leave that polygon's expanded boundary, so an armored brick cannot take damage every tick while the ball is inside it. When a piercing ball splits, its new balls inherit the contact set. Direct fire damage is two; charged splash and explosions are separate queued damage events.

## Damage and score

Destruction marks the brick dead before enqueueing neighboring explosion damage. This guarantees each brick explodes and scores only once even when several balls or queued damage events reach it in the same tick. Explosion chains are iterative, with no recursive mesh removal. Remaining-brick count is checked before life loss, so destroying the last brick and losing the final ball on the same step clears the stage.

Render objects follow model state. Individual brick flashes do not alter health. Scoped stage resources are disposed on each stage change and restart. Shared game geometry, materials, textures, listeners, HUD, particles, and rings are owned by the host's resource scope. No game-local `requestAnimationFrame`, `setTimeout`, or audio context is created.

## Run state

`serve → playing → clearing → serve` repeats for eight stages. The last clear ends in `won`. A full ball loss returns to `serve` if a life remains, otherwise `lost`. Safety Net consumes a charge and returns the last ball before a life is removed. Magnet is a single catch; release consumes the effect and timeout prevents indefinite capture.

`start()` resets the entire existing session and reuses the renderer. Pause stops the shared fixed loop, which freezes gameplay clocks. Resume synchronizes interpolation history. The finish event is sent once and carries victory/summary metadata to the shared score screen. The normal and victory results both save the local score.

## Layouts and replayability

Eight curated families combine rectangles, rotated rectangles, and point-up hexagons. Exact polygon geometry is shared between the model and extruded mesh construction. Tests verify bounds, winding, and pairwise non-overlap for every stage. Stage geometry is fixed; seeded composition varies normal, armored, and prism bricks while reserving designed explosive positions. Each new run chooses a new seed. There is no player-facing seed selector in this release.

## Tuning

Start with `config.js`. Ball speed, speed growth, movement, paddle width, lives, max balls, blast radius, drop pacing, chain timeout, and stage delay live there. Timed effect durations and capsule presentation are in `powerups.js`. Stage generators are in `layouts.js`.

The first-stage normal speed is 9.2 world units/second. Base speed caps at 15.8; Overdrive multiplies it by 1.2 for a maximum of 18.96. At 60 Hz a fast ball can cross a thin shape in one update, which is why contact detection is swept rather than overlap-only.

Drops have a 23% eligible destruction chance, a 1.35-second cooldown, a maximum of four live capsules, and a guaranteed eligible drop after nine dry destructions. Once four bricks have been destroyed, the first eligible introductory multiball drop is guaranteed. Picking it up is not guaranteed. Multiple simultaneous powers are encouraged; duplicate timed pickups refresh rather than add durations. Stage changes and life losses clear effects.

## Visuals

Beveled extrusions, physically lit materials, emissive insets, health pips, two directional lights, one moving ball light, an anti-aliased procedural floor, point-sprite trails, pooled debris, and pooled additive rings create the 2.5D treatment. Bright effects use the shared bloom chain. All assets are generated; the launcher artwork remains SVG.

Effects use a fixed pool of 1,000 particle slots and eighteen rings. Low quality reduces burst density. Reduced motion suppresses shake, rings, wobble, and floor motion, while shortening trails. Desktop side panels disappear on compact viewports; lives, remaining bricks, balls, launch prompts, capsule codes, and effect timers remain available.

## Release boundary

Arcade Run is implemented. Quick Play, unlocked-stage selection, challenge codes, online leaderboards, gamepads, and additional games are intentionally outside this release. Balance constants are exposed for the first hands-on playtest. Browser/device throughput and touch feel should be confirmed on the target hardware.
