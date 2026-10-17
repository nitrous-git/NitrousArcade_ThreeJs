# Validation — Brick Breaker v1.0.0

## Verification performed

- `npm run check`: 31 JavaScript files passed syntax checks, along with local imports, HTML assets, registry entries, and the pinned Three.js import map.
- `npm test`: all 33 tests passed (18 Brick Breaker simulation tests and 15 shared-service, input, and host tests).
- Headless Chromium 138.0.7204.0 rendered the game with no page errors, console errors, or warnings in the recorded browser run. The test harness served local copies of the pinned CDN modules; production files retain the CDN import map.
- Browser checks covered launch, Space launch, keyboard paddle movement, frozen simulation time while paused, resume, combined power-ups, restart, all eight stage layouts, victory UI, score display, quality/bloom switching, and reduced-motion switching.
- Restart reset score, lives, and balls. Five repeated restarts with the same stage seed returned to the same renderer resource counts: 159 geometries and 14 textures.
- Five exit/relaunch cycles removed the canvas and game HUD on exit and created exactly one of each on relaunch. Signal Lab still launched and scored afterward.
- Desktop (1440 × 960), narrow portrait (390 × 844), and landscape (844 × 390) viewport screenshots were captured. Portrait and landscape checks reported no horizontal document overflow. Desktop and portrait gameplay and powered-ball screenshots were visually inspected.

Browser state injection was used to exercise later layouts, combined powers, and the victory screen without requiring a complete manual run. These checks establish functional integration; they do not measure target-device frame rate or replace hands-on balance and touch testing.

## Simulation coverage

- All eight seeded layouts: bounded, convex, non-overlapping, and reproducible.
- High-speed swept collision, rounded-corner misses, and true hexagon face normals.
- Simultaneous hits, single scoring per brick, and cyclic explosive chains.
- Multiball fan-out, preserved speed, twelve-ball cap, and last-ball-only life loss.
- One-use safety net, fire piercing and contact tracking, and charged splash.
- Timed effect refresh/expiry, Overdrive speed restoration, and magnet catch/release/timeout.
- Capsule collection and bounded drops during large destruction chains.
- Stage-clear priority over simultaneous ball loss, eight-stage victory, game over, and full reset.
- Paddle-angle steering, minimum velocity components, and finite state during sustained multiball simulation.

## First local playtest

1. Serve through WebStorm's HTTP server or `npm start`, with internet available for the pinned Three.js modules. Confirm the featured Brick Breaker card and Play button.
2. Launch and press Space. Move with mouse, A / D, and arrows. Try edge and center paddle contacts and confirm that returns are controllable.
3. Hit amber bricks and collect capsules. Test multiball with fire/charge, catch/release with Magnet, and a last-ball rescue with Safety Net.
4. Pause during an active power-up. Wait, resume, and verify that the timer was frozen. Switch tabs while moving and confirm the game stays paused when you return.
5. Restart, return to the arcade, and relaunch. Confirm three lives, a single serving ball, zero score, and no duplicate HUD.
6. Complete or lose a run. Confirm the result screen and best score. Reload to check persistence on the same browser origin.
7. Test mute, volume, fullscreen, actual touchscreen dragging, and portrait/landscape rotation on your target devices. Check performance with several balls and explosions. Use Low quality if needed.
8. Launch Signal Lab to confirm the shared sandbox still behaves normally.

## Expected limits

- This release implements Arcade Run. Quick Play, layout selection, challenge codes, online leaderboards, gamepads, and the five remaining collection games are future work.
- Headless browser checks do not certify audible sound quality, fullscreen permissions, real touchscreen feel, or performance on a specific GPU. Those remain local checks.
- Records are local browser data, not secure online scores.
- Low quality disables bloom; reduced motion suppresses nonessential movement and shortens trails.
- CDN loading requires internet. Native `file://` loading is unsupported.
