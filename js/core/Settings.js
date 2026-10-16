import { DEFAULT_SETTINGS, QUALITY } from '../config.js';

export function sanitizeSettings(raw = {}) {
  const s = { ...DEFAULT_SETTINGS };
  if (Number.isFinite(raw.volume)) s.volume = Math.min(1, Math.max(0, raw.volume));
  for (const key of ['muted', 'bloom', 'reducedMotion']) {
    if (typeof raw[key] === 'boolean') s[key] = raw[key];
  }
  if (Object.hasOwn(QUALITY, raw.quality)) s.quality = raw.quality;
  return s;
}

export class Settings {
  constructor(storage) {
    this.storage = storage;
    this.value = sanitizeSettings(storage.read('settings'));
    this.listeners = new Set();
  }
  get snapshot() { return { ...this.value }; }
  update(patch) {
    this.value = sanitizeSettings({ ...this.value, ...patch });
    this.storage.write('settings', this.value);
    for (const listener of this.listeners) listener(this.snapshot);
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
