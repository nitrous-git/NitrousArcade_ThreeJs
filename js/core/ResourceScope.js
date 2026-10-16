/** Own game resources explicitly. Dispose is idempotent and attempts every cleanup. */
export class ResourceScope {
  constructor() { this.resources = new Set(); this.disposed = false; }
  track(resource) {
    if (this.disposed) { this.release(resource); return resource; }
    this.resources.add(resource);
    return resource;
  }
  release(resource) {
    try { typeof resource === 'function' ? resource() : resource?.dispose?.(); }
    catch (error) { console.warn('Resource cleanup failed:', error); }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const resource of [...this.resources].reverse()) this.release(resource);
    this.resources.clear();
  }
}
