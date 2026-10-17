import { BrickBreakerModel } from './model.js';
import { BrickBreakerView } from './view.js';
import { BrickBreakerHud } from './hud.js';

export function createGame() {
  let ctx, model, view, hud, useMouse = false, lastScore = -1, hudClock = 0, finished = false;
  return {
    init(context) {
      ctx = context; model = new BrickBreakerModel(); view = new BrickBreakerView(ctx);
      hud = new BrickBreakerHud(ctx.graphics.canvas.parentElement, ctx.scope);
      const move = event => { if (event.isPrimary && event.pointerType === 'mouse') useMouse = true; };
      ctx.graphics.canvas.addEventListener('pointermove', move);
      ctx.scope.track(() => ctx.graphics.canvas.removeEventListener('pointermove', move));
    },
    start() {
      const seed = globalThis.crypto?.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now();
      model.reset(seed); view.reset(model); hud.reset(); hud.update(model);
      useMouse = false; lastScore = -1; hudClock = 0; finished = false;
      ctx.setHud({ score: 0 }); model.drainEvents();
    },
    fixedUpdate(dt) {
      const axis = ctx.input.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
      if (axis) useMouse = false;
      const keyLaunch = ctx.input.consume('Space'), pointerLaunch = ctx.input.consume('Pointer');
      model.update(dt, { axis, pointerX: useMouse || ctx.input.pointer.active ? view.pointerX(ctx.input.pointer.x) : undefined, launch: keyLaunch || pointerLaunch });
      const events = model.drainEvents(); view.handle(events, model); hud.handle(events, model);
      // One cue per simulation tick prevents explosion chains from saturating the mixer.
      if (events.some(e => e.type === 'powerup')) ctx.audio.tone(880, 0.18);
      else if (events.some(e => e.type === 'clear')) ctx.audio.tone(1046, 0.32);
      else if (events.some(e => e.type === 'life')) ctx.audio.tone(130, 0.3);
      else if (events.some(e => e.type === 'explosion')) ctx.audio.tone(80, 0.22);
      else if (events.some(e => e.type === 'paddle')) ctx.audio.tone(340, 0.07);
      else if (events.some(e => e.type === 'destroy')) ctx.audio.tone(460 + Math.min(model.combo, 24) * 18, 0.065);
      else if (events.some(e => e.type === 'launch')) ctx.audio.tone(660, 0.10);
      if (model.score !== lastScore) { lastScore = model.score; ctx.setHud({ score: model.score }); }
      hudClock += dt;
      if (hudClock > 0.08 || events.length) { hud.update(model); hudClock = 0; }
      if (!finished && (model.status === 'won' || model.status === 'lost')) {
        finished = true; view.render(model, 1, 0); hud.update(model);
        ctx.finish(model.score, { victory: model.status === 'won',
          summary: `${model.stageIndex + 1}/8 stages reached · ${model.destroyed} bricks shattered · best chain ${model.bestCombo}` });
      }
    },
    render(alpha, dt) { view.render(model, alpha, dt); },
    resize(viewport) { view.resize(viewport); hud.resize(viewport); },
    pause() {},
    resume() { useMouse = false; for (const ball of model.balls) { ball.px = ball.x; ball.py = ball.y; } model.paddle.previousX = model.paddle.x; },
    dispose() { view?.dispose(); },
  };
}
