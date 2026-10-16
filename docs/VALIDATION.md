# Validation checklist

## Verification performed for this delivery

- JavaScript syntax and local references checked with `npm run check`.
- All 14 shared-service and lifecycle tests passed with `npm test`.
- HTML IDs / asset references and authored SVG XML checked during packaging.
- No browser/GPU preview was available in the creation environment. Actual appearance, shader compilation, fullscreen, audio permissions, and device behavior are **not claimed as browser-tested**. Run the checklist below in WebStorm before treating the foundation as visually verified.

## First local launch

1. Open through WebStorm's HTTP server with internet access. Confirm the launcher artwork, six planned cards, and category filters display.
2. Open planned-game details, About, and Settings. Use Tab, Shift+Tab, and Escape; focus should stay in open modal dialogs.
3. Launch Signal Lab. Expect a mint crystal, orbital ring, dark grid, and particles. The browser console should show no application errors.
4. Use WASD / arrows to move, Space to pulse, and click-drag / touch-drag to move and pulse. Pulses increment once per press with a brief cooldown.
5. Pause, wait, resume. Restart and confirm the pulse counter resets to zero. Pause using Escape and the toolbar.
6. Switch tabs/windows while moving; return and confirm the scene stays paused with no stuck movement or time jump.
7. Finish test after several pulses. Confirm the best counter is updated. Reload, relaunch, and confirm it persists.
8. Change quality and bloom. Low disables bloom. Toggle reduced motion and the OS reduced-motion preference; nonessential rotation and pulse effects should stop.
9. Check mute and volume; no audio should play before interacting. If the browser blocks audio, the scene must still work.
10. Exit / relaunch at least ten times; the stage should contain only one canvas while playing and none after exit. Restart should reuse the active session's renderer.
11. Resize the window, try a narrow phone-sized viewport, and use fullscreen where available. The camera should fit the logical playfield and controls remain reachable.
12. Launch and immediately exit while modules load. A late load must not replace the launcher. Block the CDN or disable WebGL to check retry / exit behavior.
13. Test blocked storage; the launcher should still run and Settings should explain that persistence is unavailable.

## Expected limits

- Six collection cards are planned entries, not playable games.
- Signal Lab has no win/loss gameplay; Finish test is a deliberate lifecycle test control.
- Records are local, editable browser data, not secure online scores.
- Low quality intentionally disables bloom; OS reduced motion also takes priority over animation.
- Browser support and GPU throughput differ. Test on target devices before release.
- CDN requests require internet. Native `file://` loading is unsupported.
