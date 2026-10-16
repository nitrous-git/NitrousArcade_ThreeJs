# Add the first game

1. Copy `js/games/_template` to `js/games/brick-breaker` (or the chosen game ID).
2. Keep `index.js` as the public entry. As needed, add `model.js` for rules, `config.js` for tuning, `view.js` for visuals, and a local `shaders/` folder. Do not split trivial code just to fill folders.
3. Implement the lifecycle methods, preserving the host's loop and input ownership.
4. In `js/games/registry.js`, change the corresponding entry to:

```js
{
  id: 'brick-breaker',
  title: 'Brick Breaker',
  category: 'reflex',
  status: 'ready',
  art: 'bricks',
  description: 'Find the angle. Break the pattern.',
  controls: 'Your actual controls, once implemented.',
  scoreLabel: 'Score',
  load: () => import('./brick-breaker/index.js'),
}
```

The existing card will launch it instead of opening planned-game details. Use stable IDs; they are also the local high-score keys.

5. Use `ctx.setHud({score})` when the score changes and `ctx.finish(score)` when the round ends. The shell supplies replay and exit actions.
6. Track owned GPU resources with `ctx.scope.track()`. If loading files, resolve URLs relative to the module:

```js
const url = new URL('./assets/levels.json', import.meta.url);
const data = await fetch(url, { signal: ctx.signal }).then(response => {
  if (!response.ok) throw new Error('Level data could not load');
  return response.json();
});
ctx.signal.throwIfAborted();
```

7. Keep world units independent of pixels. Fit the camera in `resize` and map normalized pointer coordinates into the playfield. Keep collision logic in world/model coordinates.
8. Run `npm run check`, `npm test`, and the browser checklist in `VALIDATION.md`.

Before calling the game complete, validate controls, fair collisions, score progression, pause/restart, game over, resize, audio, and repeated exits. Visual effects must preserve readability. Add game-specific touch controls only after defining the actual interaction.

## Suggested first-game phases

1. Finalize the rules and controls.
2. Implement and validate core gameplay using simple shapes.
3. Add levels / difficulty / scoring and a complete round lifecycle.
4. Add the final Three.js treatment, sound, and feedback.
5. Validate and tune; then move to the next game.
