import { CONFIG as C, BRICK_TYPES, clamp, randomGenerator } from './config.js';
import { generateLayout, STAGES } from './layouts.js';
import { rectangle, sweepCircle, sweptBoundsOverlap, circleTouchesPolygon } from './collision.js';
import { POWERUPS, choosePowerup } from './powerups.js';

/** Pure simulation. No Three.js, DOM, wall clock, timers, or audio dependencies. */
export class BrickBreakerModel {
  constructor(seed = 1) { this.revision = 0; this.reset(seed); }
  reset(seed = this.seed) {
    this.seed = seed >>> 0; this.random = randomGenerator(this.seed);
    this.score = 0; this.lives = C.lives; this.stageIndex = 0; this.time = 0;
    this.combo = 0; this.comboTime = 0; this.bestCombo = 0;
    this.destroyed = 0; this.explosions = 0; this.collected = 0;
    this.events = []; this.nextId = 1; this.firstDrop = true;
    this.loadStage();
  }
  emit(type, data = {}) { this.events.push({ type, ...data }); }
  drainEvents() { const events = this.events; this.events = []; return events; }
  get stage() { return STAGES[this.stageIndex]; }
  get remaining() { return this.bricks.reduce((n, b) => n + Number(b.alive), 0); }
  get speed() { return Math.min(C.maxSpeed, C.baseSpeed + this.stageIndex * C.stageSpeed + this.rally * 0.025) * (this.effects.overdrive > 0 ? 1.2 : 1); }
  get multiplier() { return Math.min(C.comboCap, 1 + Math.floor(this.combo / 6)) * (this.effects.overdrive > 0 ? 2 : 1); }
  loadStage() {
    this.bricks = generateLayout(this.stageIndex, this.random);
    this.revision++; this.paddle = { x: 0, previousX: 0, width: C.paddleWidth };
    this.effects = {}; this.safety = false; this.drops = []; this.balls = [];
    this.rally = 0; this.combo = 0; this.comboTime = 0; this.dropCooldown = 0; this.sinceDrop = 0;
    this.status = 'serve'; this.stageTimer = 0;
    this.makeBall(0, C.paddleY + C.paddleHeight / 2 + C.ballRadius + 0.03, 0, 1, true);
    this.emit('stage', { index: this.stageIndex });
  }
  makeBall(x, y, vx = 0, vy = 1, attached = false) {
    if (this.balls.length >= C.maxBalls) return null;
    const ball = { id: this.nextId++, x, y, px: x, py: y, vx, vy, attached,
      attachOffset: 0, heldByMagnet: false, contacts: new Set() };
    this.normalizeVelocity(ball); this.balls.push(ball); return ball;
  }
  normalizeVelocity(ball) {
    const speed = this.speed, length = Math.hypot(ball.vx, ball.vy) || 1;
    ball.vx = ball.vx / length * speed; ball.vy = ball.vy / length * speed;
    if (Math.abs(ball.vy) < speed * C.minVertical) {
      ball.vy = (Math.sign(ball.vy) || 1) * speed * C.minVertical;
      ball.vx = (Math.sign(ball.vx) || 1) * Math.sqrt(speed * speed - ball.vy * ball.vy);
    }
    if (Math.abs(ball.vx) < speed * C.minHorizontal) {
      ball.vx = (Math.sign(ball.vx) || (ball.id % 2 ? 1 : -1)) * speed * C.minHorizontal;
      ball.vy = (Math.sign(ball.vy) || 1) * Math.sqrt(speed * speed - ball.vx * ball.vx);
    }
  }
  launch() {
    if (!['serve', 'playing'].includes(this.status)) return;
    let launched = false;
    for (const ball of this.balls) if (ball.attached) {
      if (ball.heldByMagnet) delete this.effects.magnet;
      const angle = clamp(ball.attachOffset / (this.paddle.width / 2), -1, 1) * 0.7;
      ball.vx = Math.sin(angle || 0.20); ball.vy = Math.cos(angle || 0.20);
      ball.attached = false; ball.heldByMagnet = false; this.normalizeVelocity(ball); launched = true;
    }
    if (launched) { this.status = 'playing'; this.emit('launch'); }
  }
  update(dt, input = {}) {
    if (this.status === 'won' || this.status === 'lost') return;
    this.time += dt;
    this.paddle.previousX = this.paddle.x;
    const targetWidth = C.paddleWidth * (this.effects.wide > 0 ? C.wideScale : 1);
    this.paddle.width += (targetWidth - this.paddle.width) * (1 - Math.exp(-14 * dt));
    const half = this.paddle.width / 2;
    if (Number.isFinite(input.pointerX)) this.paddle.x += clamp(input.pointerX - this.paddle.x, -C.pointerSpeed * dt, C.pointerSpeed * dt);
    else this.paddle.x += (input.axis || 0) * C.paddleSpeed * dt;
    this.paddle.x = clamp(this.paddle.x, C.left + half, C.right - half);
    if (this.status === 'clearing') {
      this.stageTimer -= dt;
      if (this.stageTimer <= 0) {
        if (this.stageIndex === STAGES.length - 1) { this.status = 'won'; this.emit('finish', { victory: true }); }
        else { this.stageIndex++; this.loadStage(); }
      }
      return;
    }
    this.dropCooldown = Math.max(0, this.dropCooldown - dt);
    if (this.status === 'playing') {
      this.comboTime -= dt;
      if (this.comboTime <= 0) this.combo = 0;
      for (const key of Object.keys(this.effects)) {
        this.effects[key] = Math.max(0, this.effects[key] - dt);
        if (!this.effects[key]) {
          delete this.effects[key];
          if (key === 'magnet' && this.balls.some(b => b.heldByMagnet)) this.launch();
          this.emit('expire', { kind: key });
        }
      }
    }
    // Attach before launch so touch relocation and a simultaneous launch agree.
    for (const ball of this.balls) {
      ball.px = ball.x; ball.py = ball.y;
      if (ball.attached) {
        ball.attachOffset = clamp(ball.attachOffset, -half + C.ballRadius, half - C.ballRadius);
        ball.x = this.paddle.x + ball.attachOffset;
        ball.y = C.paddleY + C.paddleHeight / 2 + C.ballRadius + 0.03;
      }
    }
    if (input.launch) this.launch();
    if (this.status !== 'playing') return;
    for (const ball of this.balls) {
      if (!ball.attached) { this.normalizeVelocity(ball); this.moveBall(ball, dt); }
    }
    const fallen = this.balls.filter(ball => ball.y < C.bottom - 0.8);
    this.balls = this.balls.filter(ball => ball.y >= C.bottom - 0.8);
    // Clearing takes precedence over a simultaneous final ball loss.
    if (!this.remaining) {
      const bonus = 1000 * (this.stageIndex + 1) + this.lives * 250;
      this.score += bonus; this.status = 'clearing'; this.stageTimer = C.stageDelay;
      this.drops = []; this.emit('clear', { bonus }); return;
    }
    this.updateDrops(dt);
    if (!this.balls.length) {
      if (this.safety) {
        const last = fallen.at(-1);
        this.safety = false;
        this.makeBall(clamp(last?.x || 0, C.left + C.ballRadius, C.right - C.ballRadius), C.bottom + 0.4, last?.vx || 2, Math.abs(last?.vy || 8));
        this.emit('rescue');
      } else this.loseLife();
    }
  }
  moveBall(ball, dt) {
    for (const id of ball.contacts) {
      const brick = this.bricks[id];
      if (!brick?.alive || !circleTouchesPolygon(ball.x, ball.y, C.ballRadius + 0.001, brick.vertices)) ball.contacts.delete(id);
    }
    let left = dt;
    const radius = C.ballRadius;
    for (let iteration = 0; iteration < C.maxCollisions && left > 1e-7; iteration++) {
      let hit = null;
      const consider = candidate => {
        if (candidate && candidate.t >= -1e-8 && candidate.t <= left && (!hit || candidate.t < hit.t)) hit = candidate;
      };
      if (ball.vx < 0) consider({ t: (C.left + radius - ball.x) / ball.vx, nx: 1, ny: 0, kind: 'wall' });
      if (ball.vx > 0) consider({ t: (C.right - radius - ball.x) / ball.vx, nx: -1, ny: 0, kind: 'wall' });
      if (ball.vy > 0) consider({ t: (C.top - radius - ball.y) / ball.vy, nx: 0, ny: -1, kind: 'wall' });
      const paddleTop = C.paddleY + C.paddleHeight / 2;
      if (ball.vy < 0 && ball.y >= paddleTop + radius - 1e-6) {
        const collision = sweepCircle(ball.x, ball.y, ball.vx, ball.vy, radius,
          rectangle(this.paddle.x, C.paddleY, this.paddle.width, C.paddleHeight), left);
        if (collision) consider({ ...collision, kind: 'paddle' });
      }
      for (const brick of this.bricks) {
        if (!brick.alive || ball.contacts.has(brick.id) || !sweptBoundsOverlap(ball, brick.bounds, left, radius)) continue;
        const collision = sweepCircle(ball.x, ball.y, ball.vx, ball.vy, radius, brick.vertices, left);
        if (collision) consider({ ...collision, kind: 'brick', brick });
      }
      if (!hit) { ball.x += ball.vx * left; ball.y += ball.vy * left; break; }
      const step = Math.max(0, hit.t);
      ball.x += ball.vx * step; ball.y += ball.vy * step; left -= step;
      if (hit.kind === 'paddle') {
        this.rally++;
        const offset = clamp((ball.x - this.paddle.x) / (this.paddle.width / 2), -1, 1);
        if (this.effects.magnet > 0 && !this.balls.some(b => b.heldByMagnet)) {
          ball.attached = true; ball.heldByMagnet = true;
          ball.attachOffset = offset * (this.paddle.width / 2 - radius);
          // A pickup catches exactly one ball. Keep the timer only until release/expiry.
          this.effects.magnet = Math.min(this.effects.magnet, 5);
          this.emit('catch', { x: ball.x, y: ball.y }); return;
        }
        ball.vx = Math.sin(offset * C.maxBounceAngle);
        ball.vy = Math.cos(offset * C.maxBounceAngle);
        ball.y = paddleTop + radius + 0.003;
        this.emit('paddle', { x: ball.x, y: ball.y });
      } else {
        if (hit.kind === 'brick') {
          this.rally++;
          const damage = [{ brick: hit.brick, amount: this.effects.fire > 0 ? 2 : 1 }];
          if (this.effects.charge > 0) {
            for (const other of this.bricks) if (other !== hit.brick && other.alive && Math.hypot(other.x - hit.brick.x, other.y - hit.brick.y) <= C.chargeRadius) damage.push({ brick: other, amount: 1 });
            this.emit('charge', { x: hit.brick.x, y: hit.brick.y, radius: C.chargeRadius });
          }
          this.resolveDamage(damage);
          this.emit('hit', { x: ball.x, y: ball.y, color: BRICK_TYPES[hit.brick.type].color });
          if (this.effects.fire > 0) {
            ball.contacts.add(hit.brick.id);
            const length = Math.hypot(ball.vx, ball.vy);
            ball.x += ball.vx / length * 0.002; ball.y += ball.vy / length * 0.002;
            continue;
          }
        }
        const dot = ball.vx * hit.nx + ball.vy * hit.ny;
        ball.vx -= 2 * dot * hit.nx; ball.vy -= 2 * dot * hit.ny;
        ball.x += hit.nx * 0.002; ball.y += hit.ny * 0.002;
        if (hit.kind === 'wall') this.emit('wall', { x: ball.x, y: ball.y });
      }
      this.normalizeVelocity(ball);
    }
    // If the iteration cap is hit, discard the remainder instead of tunnelling.
  }
  resolveDamage(queue) {
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const { brick, amount } = queue[cursor];
      if (!brick.alive) continue;
      brick.hp -= amount;
      this.emit('damage', { id: brick.id });
      if (brick.hp > 0) continue;
      brick.alive = false; this.destroyed++; this.sinceDrop++;
      this.combo++; this.comboTime = C.comboWindow; this.bestCombo = Math.max(this.bestCombo, this.combo);
      const points = BRICK_TYPES[brick.type].score * this.multiplier;
      this.score += points;
      this.emit('destroy', { id: brick.id, x: brick.x, y: brick.y, color: BRICK_TYPES[brick.type].color, points });
      if (brick.type === 'explosive') {
        this.explosions++;
        this.emit('explosion', { x: brick.x, y: brick.y, radius: C.explosionRadius });
        for (const other of this.bricks) if (other.alive && Math.hypot(other.x - brick.x, other.y - brick.y) <= C.explosionRadius) queue.push({ brick: other, amount: 2 });
      }
      this.maybeDrop(brick);
    }
  }
  maybeDrop(brick) {
    if (this.dropCooldown > 0 || this.drops.length >= C.maxDrops) return;
    const first = this.firstDrop && this.destroyed >= 4;
    if (!first && this.sinceDrop < 9 && this.random() > C.dropChance) return;
    const kind = first ? 'multiball' : choosePowerup(this.random);
    if (first) this.firstDrop = false;
    this.drops.push({ id: this.nextId++, x: brick.x, y: brick.y, kind });
    this.dropCooldown = C.dropCooldown; this.sinceDrop = 0;
    this.emit('drop', { kind });
  }
  updateDrops(dt) {
    this.drops = this.drops.filter(drop => {
      const previousY = drop.y;
      drop.y -= C.dropSpeed * dt;
      if (previousY + 0.35 >= C.paddleY - C.paddleHeight / 2 && drop.y - 0.35 <= C.paddleY + C.paddleHeight / 2
        && Math.abs(drop.x - this.paddle.x) <= this.paddle.width / 2 + 0.34) {
        this.applyPowerup(drop.kind); return false;
      }
      return drop.y > C.bottom - 0.5;
    });
  }
  applyPowerup(kind) {
    if (!POWERUPS[kind]) return;
    this.collected++;
    if (kind === 'multiball') {
      const candidates = this.balls.filter(b => !b.attached);
      const source = candidates.length ? candidates[Math.floor(this.random() * candidates.length)] : this.balls[0];
      if (source) {
        const base = Math.atan2(source.vx, source.attached ? 1 : source.vy);
        for (const offset of [-0.4, 0.4]) {
          const ball = this.makeBall(source.x, source.y, Math.sin(base + offset), Math.cos(base + offset));
          if (ball) ball.contacts = new Set(source.contacts);
        }
      }
    } else if (kind === 'safety') this.safety = true;
    else this.effects[kind] = POWERUPS[kind].duration; // Refresh; do not stack indefinite time.
    this.emit('powerup', { kind });
  }
  loseLife() {
    this.lives--; this.combo = 0; this.comboTime = 0; this.effects = {}; this.drops = []; this.rally = 0;
    this.emit('life', { lives: this.lives });
    if (!this.lives) { this.status = 'lost'; this.emit('finish', { victory: false }); return; }
    this.status = 'serve';
    this.makeBall(this.paddle.x, C.paddleY + C.paddleHeight / 2 + C.ballRadius + 0.03, 0, 1, true);
  }
}
