const valid = score => Number.isSafeInteger(score) && score >= 0;
export class ScoreStore {
  constructor(storage) { this.storage = storage; }
  best(id) {
    const all = this.storage.read('scores');
    return Object.hasOwn(all, id) && valid(all[id]) ? all[id] : 0;
  }
  submit(id, score) {
    if (!/^[a-z0-9-]+$/.test(id) || !valid(score)) throw new Error('Invalid score');
    const best = Math.max(this.best(id), score);
    const all = this.storage.read('scores');
    Object.defineProperty(all, id, { value: best, enumerable: true, configurable: true, writable: true });
    this.storage.write('scores', all);
    return best;
  }
  clear() { this.storage.write('scores', {}); }
}
