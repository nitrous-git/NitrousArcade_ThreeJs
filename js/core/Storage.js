import { STORAGE_KEY } from '../config.js';

/** One versioned document. Failure to persist never prevents playing. */
export class Storage {
  constructor(backend) {
    this.persistent = true;
    this.data = { version: 1, settings: {}, scores: {} };
    try {
      this.backend = backend === undefined ? globalThis.localStorage : backend;
      if (!this.backend) throw new Error('Storage unavailable');
      const parsed = JSON.parse(this.backend.getItem(STORAGE_KEY) || 'null');
      if (parsed?.version === 1) {
        if (parsed.settings && typeof parsed.settings === 'object' && !Array.isArray(parsed.settings)) this.data.settings = parsed.settings;
        if (parsed.scores && typeof parsed.scores === 'object' && !Array.isArray(parsed.scores)) this.data.scores = parsed.scores;
      }
      this.backend.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch { this.persistent = false; }
  }
  read(section) { return structuredClone(this.data[section]); }
  write(section, value) {
    if (!['settings', 'scores'].includes(section)) throw new Error('Unknown storage section');
    this.data[section] = structuredClone(value);
    try {
      this.backend.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.persistent = true;
    } catch { this.persistent = false; }
  }
}
