import test from 'node:test';
import assert from 'node:assert/strict';
import { GameHost } from '../js/core/GameHost.js';
import { Storage } from '../js/core/Storage.js';
import { Settings } from '../js/core/Settings.js';
import { ScoreStore } from '../js/core/ScoreStore.js';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function harness() {
  const storage = new Storage({ getItem: () => null, setItem() {} });
  const settings = new Settings(storage);
  const counters = { graphics: 0, disposed: 0, inputDisposed: 0, starts: 0, stops: 0 };
  const states = [], errors = [], hud = [];
  const host = new GameHost({
    mount: {}, settings, scores: new ScoreStore(storage), audio: { stopAll() {} },
    onState: (state, detail) => states.push({ state, detail }), onHud: data => hud.push(data), onError: error => errors.push(error),
    createGraphics: async () => {
      counters.graphics++;
      return { canvas: { focus() {}, setAttribute() {} }, resize: () => ({ width: 800, height: 600, aspect: 4 / 3 }), configure() {}, dispose() { counters.disposed++; } };
    },
    createInput: () => ({ setEnabled() {}, endStep() {}, dispose() { counters.inputDisposed++; } }),
    createLoop: options => ({ options, start() { counters.starts++; }, stop() { counters.stops++; } }),
  });
  return { host, settings, counters, states, errors, hud };
}
function fixture(overrides = {}) {
  const counts = { init: 0, start: 0, dispose: 0, owned: 0 };
  let context;
  const game = {
    init(ctx) { context = ctx; counts.init++; ctx.scope.track(() => counts.owned++); },
    start() { counts.start++; }, fixedUpdate() {}, render() {}, resize() {}, dispose() { counts.dispose++; }, ...overrides,
  };
  return { counts, game, context: () => context, entry: { id: 'test', title: 'Test', controls: 'test controls', load: async () => ({ createGame: () => game }) } };
}

test('restarts reuse renderer; pause/resume, finish, and repeated exit clean up once', async () => {
  const h = harness(), f = fixture();
  assert.equal(await h.host.launch(f.entry), true);
  assert.equal(h.host.state, 'playing');
  h.host.pause(); assert.equal(h.host.state, 'paused');
  h.host.resume(); assert.equal(h.host.state, 'playing');
  h.host.restart(); h.host.restart();
  assert.equal(f.counts.start, 3);
  assert.equal(h.counters.graphics, 1);
  f.context().finish(8);
  assert.equal(h.host.state, 'finished');
  assert.equal(h.host.scores.best('test'), 8);
  h.host.leave(); h.host.leave();
  assert.equal(f.counts.dispose, 1);
  assert.equal(f.counts.owned, 1);
  assert.equal(h.counters.disposed, 1);
  assert.equal(h.counters.inputDisposed, 1);
  assert.equal(h.settings.listeners.size, 0);
});

test('exit during module import never creates a renderer or resurrects the game', async () => {
  const h = harness(), f = fixture(), gate = deferred();
  f.entry.load = () => gate.promise;
  const launch = h.host.launch(f.entry);
  h.host.leave();
  gate.resolve({ createGame: () => f.game });
  assert.equal(await launch, false);
  assert.equal(h.host.state, 'menu');
  assert.equal(h.counters.graphics, 0);
});

test('a new launch supersedes a delayed old import', async () => {
  const h = harness(), old = fixture(), next = fixture(), gate = deferred();
  old.entry.load = () => gate.promise;
  next.entry.id = 'next';
  const pending = h.host.launch(old.entry);
  await h.host.launch(next.entry);
  gate.resolve({ createGame: () => old.game });
  await pending;
  assert.equal(h.host.session.entry.id, 'next');
  assert.equal(h.counters.graphics, 1);
  assert.equal(old.counts.init, 0);
  h.host.leave();
});

test('exit during async init aborts the signal and disposes late resources', async () => {
  const h = harness(), gate = deferred(), begun = deferred();
  let ctx;
  const f = fixture({ async init(context) { ctx = context; begun.resolve(); await gate.promise; ctx.scope.track(() => f.counts.owned++); } });
  const pending = h.host.launch(f.entry);
  await begun.promise;
  h.host.leave();
  assert.equal(ctx.signal.aborted, true);
  gate.resolve(); await pending;
  assert.equal(h.host.state, 'menu');
  assert.equal(f.counts.dispose, 1);
  assert.equal(f.counts.owned, 1);
  assert.equal(h.counters.disposed, 1);
  assert.equal(h.counters.starts, 0);
});

test('failed init releases partial resources and a later launch recovers', async () => {
  const h = harness();
  const f = fixture({ init(ctx) { ctx.scope.track(() => f.counts.owned++); throw new Error('Expected test failure'); } });
  const original = console.error;
  console.error = () => {};
  try { assert.equal(await h.host.launch(f.entry), false); } finally { console.error = original; }
  assert.equal(h.host.state, 'error');
  assert.equal(h.errors.length, 1);
  assert.equal(h.counters.disposed, 1);
  assert.equal(f.counts.owned, 1);
  assert.equal(await h.host.launch(fixture().entry), true);
  h.host.leave();
});

test('repeated completed sessions release every renderer and subscription', async () => {
  const h = harness();
  for (let i = 0; i < 12; i++) { await h.host.launch(fixture().entry); h.host.leave(); }
  assert.equal(h.counters.graphics, 12);
  assert.equal(h.counters.disposed, 12);
  assert.equal(h.counters.inputDisposed, 12);
  assert.equal(h.settings.listeners.size, 0);
});
