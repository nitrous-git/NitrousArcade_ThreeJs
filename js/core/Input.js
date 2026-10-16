const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space']);

/** Keyboard belongs to the focused canvas, never to settings or menus. */
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.enabled = false;
    this.down = new Set();
    this.pressed = new Set();
    this.pointer = { x: 0, y: 0, active: false };
    this.abort = new AbortController();
    const on = (target, name, handler) => target.addEventListener(name, handler, { signal: this.abort.signal });
    on(canvas, 'keydown', event => {
      if (!this.enabled || !GAME_KEYS.has(event.code)) return;
      event.preventDefault();
      if (!this.down.has(event.code)) this.pressed.add(event.code);
      this.down.add(event.code);
    });
    on(window, 'keyup', event => this.down.delete(event.code));
    on(window, 'blur', () => this.reset());
    on(canvas, 'blur', () => this.reset());
    const position = event => {
      const r = canvas.getBoundingClientRect();
      this.pointer.x = Math.max(-1, Math.min(1, ((event.clientX - r.left) / r.width) * 2 - 1));
      this.pointer.y = Math.max(-1, Math.min(1, -((event.clientY - r.top) / r.height) * 2 + 1));
    };
    on(canvas, 'pointerdown', event => {
      if (!this.enabled || !event.isPrimary || event.button !== 0) return;
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(event.pointerId);
      position(event);
      this.pointer.active = true;
      this.pressed.add('Pointer');
    });
    on(canvas, 'pointermove', event => { if (this.enabled && event.isPrimary) position(event); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      on(canvas, type, event => { if (event.isPrimary !== false) this.pointer.active = false; });
    }
  }
  setEnabled(enabled) { this.enabled = enabled; this.reset(); }
  isDown(code) { return this.enabled && this.down.has(code); }
  consume(code) {
    if (!this.enabled) return false;
    const found = this.pressed.has(code);
    this.pressed.delete(code);
    return found;
  }
  axis(negative, positive) { return Number(positive.some(k => this.isDown(k))) - Number(negative.some(k => this.isDown(k))); }
  endStep() { this.pressed.clear(); }
  reset() { this.down.clear(); this.pressed.clear(); this.pointer.active = false; }
  dispose() { this.abort.abort(); this.reset(); }
}
