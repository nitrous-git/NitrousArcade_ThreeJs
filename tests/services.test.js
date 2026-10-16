import test from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../js/core/Storage.js';
import { Settings } from '../js/core/Settings.js';
import { ScoreStore } from '../js/core/ScoreStore.js';
import { ResourceScope } from '../js/core/ResourceScope.js';
import { FrameLoop } from '../js/core/FrameLoop.js';

function memory(seed = null) {
  let value = seed;
  return { getItem: () => value, setItem: (_, next) => { value = next; } };
}

test('corrupt JSON recovers in memory; later writes create a valid document', () => {
  const backend = memory('{broken');
  const storage = new Storage(backend);
  const settings = new Settings(storage);
  assert.equal(settings.snapshot.quality, 'balanced');
  settings.update({ volume: 0.5 });
  assert.equal(new Settings(new Storage(backend)).snapshot.volume, 0.5);
});

test('blocked persistence keeps settings and records usable during the visit', () => {
  const storage = new Storage({ getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } });
  const settings = new Settings(storage);
  settings.update({ muted: true });
  const scores = new ScoreStore(storage);
  scores.submit('signal-lab', 12);
  assert.equal(storage.persistent, false);
  assert.equal(settings.snapshot.muted, true);
  assert.equal(scores.best('signal-lab'), 12);
});

test('untrusted settings are sanitized and invalid stored scores are ignored', () => {
  const storage = new Storage(memory(JSON.stringify({ version: 1, settings: { volume: 7, quality: '__proto__', muted: 'false', bloom: false }, scores: { 'signal-lab': -10, pong: '1000' } })));
  const settings = new Settings(storage);
  assert.equal(settings.snapshot.volume, 1);
  assert.equal(settings.snapshot.quality, 'balanced');
  assert.equal(settings.snapshot.muted, false);
  assert.equal(settings.snapshot.bloom, false);
  const scores = new ScoreStore(storage);
  assert.equal(scores.best('signal-lab'), 0);
  assert.equal(scores.best('pong'), 0);
});

test('scores are monotonic, survive reload, reject invalid values, and clear independently', () => {
  const backend = memory();
  const storage = new Storage(backend);
  new Settings(storage).update({ volume: 0.1 });
  const scores = new ScoreStore(storage);
  assert.equal(scores.submit('pong', 19), 19);
  assert.equal(scores.submit('pong', 3), 19);
  assert.equal(new ScoreStore(new Storage(backend)).best('pong'), 19);
  for (const bad of [NaN, Infinity, -1, 2.5, Number.MAX_SAFE_INTEGER + 1, '12']) assert.throws(() => scores.submit('pong', bad));
  scores.clear();
  assert.equal(scores.best('pong'), 0);
  assert.equal(new Settings(storage).snapshot.volume, 0.1);
});

test('malformed array sections cannot silently discard new records on persistence', () => {
  const backend = memory(JSON.stringify({ version: 1, settings: [], scores: [] }));
  new ScoreStore(new Storage(backend)).submit('pong', 42);
  assert.equal(new ScoreStore(new Storage(backend)).best('pong'), 42);
});

test('resource scope deduplicates, cleans in reverse order, and disposes late resources', () => {
  const order = [];
  const scope = new ResourceScope();
  const resource = { dispose: () => order.push('resource') };
  scope.track(resource); scope.track(resource);
  scope.track(() => order.push('listener'));
  scope.dispose(); scope.dispose();
  scope.track(() => order.push('late'));
  assert.deepEqual(order, ['listener', 'resource', 'late']);
});

test('frame loop caps catch-up, resets on resume, and does not schedule after stop in update', () => {
  let callback, updates = 0, requests = 0;
  const loop = new FrameLoop({
    update: () => { updates++; }, render() {}, onError: error => { throw error; },
    request: fn => { callback = fn; return ++requests; }, cancel() {},
  });
  loop.start(); callback(0); callback(5000);
  assert.ok(updates <= 6 && updates >= 5);
  loop.stop();
  const before = updates;
  loop.start(); callback(50000);
  assert.equal(updates, before);
  loop.update = () => { updates++; loop.stop(); };
  const scheduled = requests;
  callback(50020);
  assert.equal(requests, scheduled);
  assert.equal(updates, before + 1);
});
