export const CONFIG = Object.freeze({
  left: -11, right: 11, top: 10, bottom: -10,
  paddleY: -8.5, paddleWidth: 3.4, paddleHeight: 0.3,
  paddleSpeed: 18, pointerSpeed: 38, wideScale: 1.48,
  ballRadius: 0.19, baseSpeed: 9.2, stageSpeed: 0.52, maxSpeed: 15.8,
  minVertical: 0.32, minHorizontal: 0.08, maxBounceAngle: Math.PI * 0.36,
  lives: 3, maxBalls: 12, maxCollisions: 18,
  explosionRadius: 2.55, chargeRadius: 1.65,
  dropChance: 0.23, dropCooldown: 1.35, maxDrops: 4, dropSpeed: 3.2,
  comboWindow: 2.8, comboCap: 5, stageDelay: 2.2,
});
export const BRICK_TYPES = Object.freeze({
  normal: { hp: 1, score: 100, color: '#63dfc3' },
  armored: { hp: 3, score: 230, color: '#a4a8f6' },
  explosive: { hp: 1, score: 160, color: '#ffa852' },
  prism: { hp: 2, score: 180, color: '#6dcefa' },
});
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export function randomGenerator(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
