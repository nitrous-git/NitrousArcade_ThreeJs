export const APP = Object.freeze({ name: 'Nitrous Arcade', version: '0.1.0' });
export const STORAGE_KEY = 'nitrous-arcade:v1';
export const DEFAULT_SETTINGS = Object.freeze({
  volume: 0.35,
  muted: false,
  quality: 'balanced',
  bloom: true,
  reducedMotion: false,
});
export const QUALITY = Object.freeze({
  low: { pixelRatio: 1, bloom: false },
  balanced: { pixelRatio: 1.5, bloom: true },
  high: { pixelRatio: 2, bloom: true },
});
