export const POWERUPS = Object.freeze({
  multiball: { label: 'Multiball', code: '+2', color: '#81f7d1', duration: 0, description: 'Split into three · up to 12 balls' },
  fire: { label: 'Fireball', code: 'F', color: '#ff9a50', duration: 11, description: 'Pierce bricks · double damage' },
  charge: { label: 'Charged Ball', code: 'Z', color: '#a5b2ff', duration: 12, description: 'Electric splash on impact' },
  wide: { label: 'Wide Paddle', code: 'W', color: '#6dcfff', duration: 17, description: 'A wider margin for error' },
  magnet: { label: 'Magnet', code: 'M', color: '#e29eff', duration: 15, description: 'Catch the next ball · click to relaunch' },
  safety: { label: 'Safety Net', code: 'S', color: '#77e6c7', duration: 0, description: 'Rescue the last falling ball once' },
  overdrive: { label: 'Overdrive', code: '×2', color: '#ffe28c', duration: 12, description: 'Faster balls · double points' },
});
const weighted = ['multiball', 'multiball', 'fire', 'charge', 'wide', 'wide', 'magnet', 'safety', 'overdrive'];
export const choosePowerup = random => weighted[Math.floor(random() * weighted.length)];
