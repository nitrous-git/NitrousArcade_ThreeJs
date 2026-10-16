/** Small synthesized cues. No audio files, autoplay, or context per game. */
export class AudioService {
  constructor(settings) {
    this.settings = settings;
    this.voices = new Set();
    this.unsubscribe = settings.subscribe(() => this.apply());
  }
  async unlock() {
    try {
      if (!this.context) {
        const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Context) return;
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
        this.apply();
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch { /* Audio is optional. */ }
  }
  apply() {
    if (!this.context) return;
    const { muted, volume } = this.settings.snapshot;
    this.master.gain.setTargetAtTime(muted ? 0 : volume, this.context.currentTime, 0.02);
  }
  tone(frequency = 440, duration = 0.12) {
    if (this.context?.state !== 'running' || this.voices.size >= 12) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.6, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.28, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain); gain.connect(this.master);
    this.voices.add(osc);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); this.voices.delete(osc); };
    osc.start(now); osc.stop(now + duration + 0.02);
  }
  stopAll() { for (const osc of this.voices) { try { osc.stop(); } catch { /* Already stopped. */ } } }
  dispose() { this.stopAll(); this.unsubscribe(); void this.context?.close(); }
}
