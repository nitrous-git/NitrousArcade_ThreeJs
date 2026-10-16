import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../js/core/Input.js';

function emit(target, type, fields = {}) {
  const event = new Event(type, { cancelable: true });
  for (const [key, value] of Object.entries(fields)) Object.defineProperty(event, key, { value });
  target.dispatchEvent(event);
  return event;
}

test('input scopes keys, clears focus-loss state, normalizes pointer, and removes listeners', () => {
  const previousWindow = globalThis.window;
  globalThis.window = new EventTarget();
  const canvas = new EventTarget();
  canvas.focus = () => {};
  canvas.setPointerCapture = () => {};
  canvas.getBoundingClientRect = () => ({ left: 10, top: 20, width: 200, height: 100 });
  try {
    const input = new Input(canvas);
    input.setEnabled(true);
    emit(window, 'keydown', { code: 'ArrowRight' });
    assert.equal(input.isDown('ArrowRight'), false, 'global keys must not drive gameplay');
    assert.equal(emit(canvas, 'keydown', { code: 'ArrowRight' }).defaultPrevented, true);
    assert.equal(input.isDown('ArrowRight'), true);
    assert.equal(input.consume('ArrowRight'), true);
    assert.equal(input.consume('ArrowRight'), false);
    emit(canvas, 'keydown', { code: 'ArrowRight', repeat: true });
    assert.equal(input.consume('ArrowRight'), false);
    emit(canvas, 'blur');
    assert.equal(input.isDown('ArrowRight'), false);
    emit(canvas, 'pointerdown', { clientX: 210, clientY: 20, isPrimary: true, button: 0, pointerId: 1 });
    assert.deepEqual(input.pointer, { x: 1, y: 1, active: true });
    assert.equal(input.consume('Pointer'), true);
    emit(canvas, 'pointercancel');
    assert.equal(input.pointer.active, false);
    input.setEnabled(false);
    assert.equal(emit(canvas, 'keydown', { code: 'Space' }).defaultPrevented, false);
    input.dispose(); input.setEnabled(true);
    emit(canvas, 'keydown', { code: 'Space' });
    assert.equal(input.isDown('Space'), false);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
