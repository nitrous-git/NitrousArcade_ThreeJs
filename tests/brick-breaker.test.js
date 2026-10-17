import test from 'node:test';
import assert from 'node:assert/strict';
import { BrickBreakerModel } from '../js/games/brick-breaker/model.js';
import { CONFIG as C, randomGenerator } from '../js/games/brick-breaker/config.js';
import { STAGES, generateLayout } from '../js/games/brick-breaker/layouts.js';
import { POWERUPS } from '../js/games/brick-breaker/powerups.js';
import { sweepCircle, rectangle, regularPolygon, bounds } from '../js/games/brick-breaker/collision.js';

const close = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} != ${b}`);
const make = () => { const m = new BrickBreakerModel(42); m.drainEvents(); return m; };
function brick(id, x, y, type = 'normal', hp = 1, vertices = rectangle(x, y, 1.6, 0.7)) {
  return { id, x, y, type, hp, maxHp: hp, alive: true, vertices, bounds: bounds(vertices) };
}
function playing(bricks) {
  const m = make(); m.bricks = bricks; m.balls = []; m.status = 'playing'; m.dropCooldown = 999; return m;
}
function overlaps(a, b) {
  for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], nx = q.y - p.y, ny = p.x - q.x;
    const pa = a.map(v => v.x * nx + v.y * ny), pb = b.map(v => v.x * nx + v.y * ny);
    if (Math.max(...pa) <= Math.min(...pb) + 0.001 || Math.max(...pb) <= Math.min(...pa) + 0.001) return false;
  }
  return true;
}

test('all eight seeded layouts are bounded, convex, non-overlapping, and reproducible', () => {
  assert.equal(STAGES.length, 8);
  for (let stage = 0; stage < 8; stage++) {
    const bricks = generateLayout(stage, randomGenerator(20));
    assert.deepEqual(bricks, generateLayout(stage, randomGenerator(20)));
    assert.ok(bricks.length >= 35 && bricks.length <= 100);
    for (const b of bricks) {
      assert.ok(b.bounds.minX > C.left && b.bounds.maxX < C.right && b.bounds.maxY < C.top && b.bounds.minY > -4, `stage ${stage}: bounds`);
      let area = 0;
      for (let i = 0; i < b.vertices.length; i++) { const p = b.vertices[i], q = b.vertices[(i + 1) % b.vertices.length]; area += p.x * q.y - p.y * q.x; }
      assert.ok(area > 0, 'counterclockwise polygon');
      for (const other of bricks) if (other.id > b.id) assert.equal(overlaps(b.vertices, other.vertices), false, `stage ${stage}: ${b.id} overlaps ${other.id}`);
    }
  }
});
test('sweep detects a high-speed thin face and misses a rounded corner outside the circle', () => {
  const shape = rectangle(0, 0, 2, 0.2);
  const hit = sweepCircle(0, -4, 0, 1000, 0.2, shape, 1 / 60);
  close(hit.t, 0.0037); close(hit.ny, -1);
  assert.equal(sweepCircle(1.18, -0.28, 1, 0, 0.2, shape, 0.01), null);
});
test('hexagon uses slanted face normals rather than its rectangular bounds', () => {
  const hex = regularPolygon(0, 0, 1, 6, Math.PI / 6);
  const hit = sweepCircle(0.7, 3, 0, -10, 0.15, hex, 0.4);
  assert.ok(hit && hit.nx > 0.4 && hit.ny > 0.4);
  assert.equal(sweepCircle(0.97, 1.1, 0, -1, 0.05, hex, 0.1), null);
});
test('simultaneous hits and explosive cycles score each brick once', () => {
  const a = brick(0, 0, 0, 'explosive'), b = brick(1, 1.8, 0, 'explosive'), c = brick(2, 3.6, 0, 'armored', 2);
  const m = playing([a, b, c]); m.resolveDamage([{ brick: a, amount: 1 }, { brick: a, amount: 1 }]);
  assert.equal(m.remaining, 0); assert.equal(m.destroyed, 3); assert.equal(m.explosions, 2); assert.equal(m.score, 550);
  m.resolveDamage([{ brick: b, amount: 10 }]); assert.equal(m.score, 550);
});
test('high-speed model collision reflects without tunnelling', () => {
  const m = playing([brick(0, 0, 0), brick(1, 8, 8)]), b = m.makeBall(0, -3, 0, 1);
  b.vx = 0; b.vy = 1000; m.moveBall(b, 1 / 60);
  assert.equal(m.bricks[0].alive, false); assert.ok(b.vy < 0); assert.ok(Number.isFinite(b.y));
});
test('two balls hitting the same brick on one tick cannot double score', () => {
  const m = playing([brick(0, 0, 0), brick(1, 8, 8)]);
  m.makeBall(0, -0.62, 0, 1); m.makeBall(0.05, -0.62, 0, 1); m.update(1 / 60);
  assert.equal(m.destroyed, 1); assert.equal(m.score, 100);
});
test('multiball adds two, keeps magnitudes, and respects the twelve-ball cap', () => {
  const m = make(); m.launch();
  m.applyPowerup('multiball'); assert.equal(m.balls.length, 3);
  for (let i = 0; i < 10; i++) m.applyPowerup('multiball');
  assert.equal(m.balls.length, 12);
  for (const b of m.balls) close(Math.hypot(b.vx, b.vy), m.speed);
  assert.ok(new Set(m.balls.map(b => b.vx)).size > 2);
});
test('only the last lost ball costs a life; losing twelve at once costs exactly one', () => {
  const m = make(); m.launch(); m.applyPowerup('multiball');
  m.balls[0].y = -12; m.update(1 / 60); assert.equal(m.lives, 3); assert.equal(m.balls.length, 2);
  for (const b of m.balls) b.y = -12;
  m.update(1 / 60); assert.equal(m.lives, 2); assert.equal(m.status, 'serve'); assert.ok(m.balls[0].attached);
  m.launch(); for (let i = 0; i < 10; i++) m.applyPowerup('multiball');
  for (const b of m.balls) b.y = -12;
  m.update(1 / 60); assert.equal(m.lives, 1);
});
test('safety net rescues the last ball once and is not consumed by a partial loss', () => {
  const m = make(); m.launch(); m.applyPowerup('safety'); m.applyPowerup('multiball');
  m.balls[0].y = -12; m.update(1 / 60); assert.ok(m.safety);
  for (const b of m.balls) b.y = -12; m.update(1 / 60);
  assert.equal(m.lives, 3); assert.equal(m.safety, false); assert.equal(m.balls.length, 1); assert.ok(m.balls[0].vy > 0);
  m.balls[0].y = -12; m.update(1 / 60); assert.equal(m.lives, 2);
});
test('fireball pierces armor, hits it once per passage, and combines with charge', () => {
  const m = playing([brick(0, 0, 0, 'armored', 3), brick(1, 1.4, 0, 'armored', 3), brick(2, 8, 8)]);
  const b = m.makeBall(0, -1, 0, 1); m.applyPowerup('fire'); m.applyPowerup('charge');
  for (let i = 0; i < 12; i++) m.update(1 / 60);
  assert.equal(m.bricks[0].hp, 1); assert.equal(m.bricks[1].hp, 2); assert.ok(b.vy > 0);
});
test('power-up clocks refresh and expire on simulation time; overdrive slows back down', () => {
  const m = make(); m.launch(); const base = m.speed;
  m.applyPowerup('overdrive'); close(m.speed, base * 1.2);
  m.effects.overdrive = 0.001; m.update(1 / 60); assert.equal(m.effects.overdrive, undefined); close(m.speed, base);
  m.applyPowerup('wide'); m.effects.wide = 2; m.applyPowerup('wide'); assert.equal(m.effects.wide, POWERUPS.wide.duration);
});
test('magnet catches one ball, release consumes it, and expiry releases automatically', () => {
  const m = make(); m.launch(); m.applyPowerup('magnet');
  const b = m.balls[0]; b.x = 0; b.y = C.paddleY + 0.4; b.vx = 0; b.vy = -10;
  m.update(1 / 60); assert.ok(b.heldByMagnet); assert.ok(b.attached);
  m.launch(); assert.equal(b.attached, false); assert.equal(m.effects.magnet, undefined);
  m.applyPowerup('magnet'); b.x = 0; b.y = C.paddleY + 0.4; b.vy = -10; m.update(1 / 60);
  m.effects.magnet = 0.001; m.update(1 / 60); assert.equal(b.attached, false); assert.ok(b.vy > 0);
});
test('drops are caught by paddle and capped during a massive destruction chain', () => {
  const m = make(); m.launch();
  m.drops.push({ id: 500, x: 0, y: C.paddleY + 0.35, kind: 'wide' }); m.update(1 / 60);
  assert.ok(m.effects.wide > 0); assert.equal(m.drops.length, 0);
  m.resolveDamage(m.bricks.map(brick => ({ brick, amount: 10 })));
  assert.ok(m.drops.length <= 1);
});
test('clear wins over simultaneous last-ball loss and advances to a fresh serve', () => {
  const m = make(); m.launch(); m.bricks.forEach(b => { b.alive = false; }); m.balls[0].y = -12;
  m.update(1 / 60); assert.equal(m.status, 'clearing'); assert.equal(m.lives, 3);
  for (let i = 0; i < 140; i++) m.update(1 / 60);
  assert.equal(m.stageIndex, 1); assert.equal(m.status, 'serve'); assert.equal(m.balls.length, 1);
});
test('all eight stages reach victory once; restart fully resets the run', () => {
  const m = make();
  for (let stage = 0; stage < 8; stage++) {
    assert.equal(m.stageIndex, stage); m.launch(); m.bricks.forEach(b => { b.alive = false; });
    for (let i = 0; i < 140; i++) m.update(1 / 60);
  }
  assert.equal(m.status, 'won'); assert.equal(m.drainEvents().filter(e => e.type === 'finish').length, 1);
  m.reset(22); assert.equal(m.status, 'serve'); assert.equal(m.score, 0); assert.equal(m.lives, 3); assert.equal(m.stageIndex, 0); assert.deepEqual(m.effects, {});
});
test('three final losses end a run once, without spawning an extra ball', () => {
  const m = make();
  for (let i = 0; i < 3; i++) { m.launch(); m.balls[0].y = -12; m.update(1 / 60); }
  assert.equal(m.status, 'lost'); assert.equal(m.balls.length, 0);
  for (let i = 0; i < 10; i++) m.update(1 / 60);
  assert.equal(m.drainEvents().filter(e => e.type === 'finish').length, 1);
});
test('paddle bounce steers by hit position and enforces vertical and horizontal minima', () => {
  for (const x of [-1.3, 0, 1.3]) {
    const m = make(); m.launch(); const b = m.balls[0]; b.x = x; b.y = C.paddleY + 0.41; b.vx = 0; b.vy = -20;
    m.moveBall(b, 1 / 60); assert.ok(b.vy > 0); if (x) assert.equal(Math.sign(b.vx), Math.sign(x));
    assert.ok(Math.abs(b.vx) >= m.speed * C.minHorizontal - 1e-6); assert.ok(b.vy >= m.speed * C.minVertical);
  }
});
test('long multiball run keeps finite positions, bounded scores, and live counts', () => {
  const m = make(); m.launch(); for (let i = 0; i < 8; i++) m.applyPowerup('multiball');
  for (let tick = 0; tick < 10000 && !['lost', 'won'].includes(m.status); tick++) {
    const target = m.balls.filter(b => b.vy < 0).sort((a, b) => a.y - b.y)[0] || m.balls[0];
    m.update(1 / 60, { pointerX: (target?.x || 0) + Math.sin(tick * 0.05) * 0.5, launch: m.status === 'serve' });
    for (const ball of m.balls) assert.ok([ball.x, ball.y, ball.vx, ball.vy].every(Number.isFinite));
    assert.ok(m.balls.length <= 12); assert.ok(Number.isSafeInteger(m.score)); m.drainEvents();
  }
  assert.ok(m.destroyed > 20);
});
