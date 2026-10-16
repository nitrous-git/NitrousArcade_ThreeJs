/** Fixed simulation step; capped catch-up prevents a hidden-tab time jump. */
export class FrameLoop {
  constructor({ update, render, onError, step = 1 / 60,
    request = cb => requestAnimationFrame(cb), cancel = id => cancelAnimationFrame(id) }) {
    Object.assign(this, { update, render, onError, step, request, cancel });
    this.running = false;
    this.frame = this.frame.bind(this);
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.previous = null;
    this.accumulator = 0;
    this.id = this.request(this.frame);
  }
  stop() { this.running = false; this.cancel(this.id); }
  frame(now) {
    if (!this.running) return;
    const dt = this.previous === null ? 0 : Math.min(0.1, Math.max(0, (now - this.previous) / 1000));
    this.previous = now;
    this.accumulator += dt;
    try {
      let steps = 0;
      while (this.accumulator >= this.step && steps < 6 && this.running) {
        this.update(this.step);
        this.accumulator -= this.step;
        steps++;
      }
      if (steps === 6) this.accumulator %= this.step;
      if (this.running) this.render(this.accumulator / this.step, dt);
    } catch (error) {
      this.stop();
      this.onError(error);
    }
    if (this.running) this.id = this.request(this.frame);
  }
}
