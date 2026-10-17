import { FrameLoop } from './FrameLoop.js';
import { Input } from './Input.js';
import { ResourceScope } from './ResourceScope.js';

/** Owns one active session. Late imports / async init cannot resurrect exited games. */
export class GameHost {
  constructor({ mount, settings, audio, scores, onState, onHud, onError,
    createGraphics = async (...args) => {
      const { Graphics } = await import('../rendering/Graphics.js');
      return new Graphics(...args);
    }, createInput = canvas => new Input(canvas), createLoop = options => new FrameLoop(options) }) {
    Object.assign(this, { mount, settings, audio, scores, onState, onHud, onError, createGraphics, createInput, createLoop });
    this.state = 'menu';
    this.generation = 0;
  }
  setState(state, detail = {}) { this.state = state; this.onState(state, detail); }
  async launch(entry) {
    this.leave(false);
    const generation = ++this.generation;
    const controller = new AbortController();
    this.pending = controller;
    const current = () => generation === this.generation && !controller.signal.aborted;
    this.setState('loading', { entry });
    let session;
    try {
      const module = await entry.load();
      if (!current()) return false;
      const scope = new ResourceScope();
      session = { scope, controller, entry, disposed: false };
      session.graphics = await this.createGraphics(this.mount, this.settings.snapshot,
        () => { if (current()) this.fail(new Error('The WebGL context was lost. Please launch the scene again.')); });
      if (!current()) { this.disposeSession(session); return false; }
      session.graphics.canvas.setAttribute('aria-label', `${entry.title}. ${entry.controls}`);
      session.input = this.createInput(session.graphics.canvas);
      session.game = module.createGame();
      for (const method of ['init', 'start', 'fixedUpdate', 'render', 'resize', 'dispose']) {
        if (typeof session.game[method] !== 'function') throw new Error(`Missing game method: ${method}`);
      }
      const context = {
        graphics: session.graphics, input: session.input, audio: this.audio,
        settings: this.settings, scope, signal: controller.signal,
        motionReduced: () => this.settings.snapshot.reducedMotion || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
        setHud: data => { if (current()) this.onHud(data); },
        finish: (score, result) => { if (current()) this.finish(score, result); },
      };
      await session.game.init(context);
      if (!current()) { this.disposeSession(session); return false; }
      session.loop = this.createLoop({
        update: dt => { session.game.fixedUpdate(dt); session.input.endStep(); },
        render: (alpha, dt) => session.game.render(alpha, dt),
        onError: error => this.fail(error),
      });
      this.session = session;
      this.pending = null;
      let graphicsSettings = this.settings.snapshot;
      scope.track(this.settings.subscribe(value => {
        if (!current()) return;
        try {
          if (value.quality !== graphicsSettings.quality || value.bloom !== graphicsSettings.bloom) {
            session.graphics.configure(value);
            this.resize();
          } else if (this.state !== 'playing') session.game.render(0, 0);
          graphicsSettings = value;
        }
        catch (error) { this.fail(error); }
      }));
      this.resize();
      if (!current()) return false;
      this.startSession();
      return true;
    } catch (error) {
      const reportFailure = current();
      if (session) this.disposeSession(session);
      if (reportFailure) this.fail(error);
      return false;
    }
  }
  startSession() {
    const s = this.session;
    if (!s) return;
    this.onHud({ score: 0, best: this.scores.best(s.entry.id), label: s.entry.scoreLabel || 'Score' });
    s.game.start();
    s.input.setEnabled(true);
    this.setState('playing', { entry: s.entry });
    s.graphics.canvas.focus({ preventScroll: true });
    s.loop.start();
  }
  pause() {
    if (this.state !== 'playing') return;
    const s = this.session;
    s.loop.stop(); s.input.setEnabled(false); this.audio.stopAll();
    this.setState('paused', { entry: s.entry });
    try { s.game.pause?.(); } catch (error) { this.fail(error); }
  }
  resume() {
    if (this.state !== 'paused') return;
    const s = this.session;
    try {
      s.game.resume?.();
      s.input.setEnabled(true);
      this.setState('playing', { entry: s.entry });
      s.graphics.canvas.focus({ preventScroll: true });
      s.loop.start();
    } catch (error) { this.fail(error); }
  }
  restart() {
    if (!this.session || !['playing', 'paused', 'finished'].includes(this.state)) return;
    this.session.loop.stop(); this.audio.stopAll();
    try { this.startSession(); } catch (error) { this.fail(error); }
  }
  finish(score, result = {}) {
    if (this.state !== 'playing') return;
    const s = this.session;
    s.loop.stop(); s.input.setEnabled(false); this.audio.stopAll();
    try {
      const previous = this.scores.best(s.entry.id);
      const best = this.scores.submit(s.entry.id, score);
      this.onHud({ score, best });
      this.setState('finished', { entry: s.entry, score, best, record: score > previous,
        victory: result.victory === true, summary: typeof result.summary === 'string' ? result.summary : '' });
    } catch (error) { this.fail(error); }
  }
  resize() {
    const s = this.session;
    if (!s) return;
    try {
      s.game.resize(s.graphics.resize());
      if (this.state !== 'playing') s.game.render(0, 0);
    } catch (error) { this.fail(error); }
  }
  disposeSession(s) {
    if (s.disposed) return;
    s.disposed = true;
    s.controller.abort();
    s.loop?.stop();
    s.input?.dispose();
    try { s.game?.dispose(); } catch (error) { console.warn('Game disposal failed:', error); }
    s.scope.dispose();
    s.graphics?.dispose();
  }
  leave(notify = true) {
    ++this.generation;
    this.pending?.abort(); this.pending = null;
    if (this.session) this.disposeSession(this.session);
    this.session = null;
    this.audio.stopAll();
    if (notify) this.setState('menu');
  }
  fail(error) {
    console.error(error);
    this.leave(false);
    this.setState('error');
    this.onError(error);
  }
}
