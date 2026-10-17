import { BRICK_TYPES } from './config.js';
import { rectangle, regularPolygon, bounds } from './collision.js';

export const STAGES = [
  { name: 'First Contact', subtitle: 'Find the angle. Start a chain.', family: 'GRID', color: '#63dfc3' },
  { name: 'Archipelago', subtitle: 'Four islands. One chain reaction.', family: 'CLUSTERS', color: '#6dcefa' },
  { name: 'Diamond Cut', subtitle: 'Work the edges. Break the heart.', family: 'DIAMOND', color: '#ae9cf4' },
  { name: 'Honeycomb', subtitle: 'Six sides. A thousand possibilities.', family: 'HEXAGON', color: '#ffc071' },
  { name: 'Crosscurrent', subtitle: 'A different angle of attack.', family: 'CHEVRONS', color: '#63dfc3' },
  { name: 'Orbital', subtitle: 'Slip through the rings.', family: 'RINGS', color: '#7bb6ff' },
  { name: 'Spiral Circuit', subtitle: 'Follow the energy inward.', family: 'SPIRAL', color: '#d89cf5' },
  { name: 'Reactor Core', subtitle: 'One last beautiful collapse.', family: 'REACTOR', color: '#ffa852' },
];

export function generateLayout(stageIndex, random = Math.random) {
  const bricks = [];
  function add(x, y, width = 1.66, height = 0.66, options = {}) {
    const i = bricks.length;
    const roll = random();
    const type = options.type || (i % 11 === 4 ? 'explosive' : roll < 0.10 + stageIndex * 0.025 ? 'armored' : roll > 0.84 ? 'prism' : 'normal');
    const vertices = options.hex ? regularPolygon(x, y, width, 6, Math.PI / 6) : rectangle(x, y, width, height, options.angle || 0);
    bricks.push({ id: i, x, y, type, hp: BRICK_TYPES[type].hp, maxHp: BRICK_TYPES[type].hp,
      alive: true, vertices, bounds: bounds(vertices), shape: options.hex ? 'hex' : 'rect' });
  }
  switch (stageIndex) {
    case 0:
      for (let row = 0; row < 6; row++) for (let col = 0; col < 10; col++) add((col - 4.5) * 1.93, 8 - row * 1.02);
      break;
    case 1:
      for (const cx of [-5.1, 5.1]) for (const cy of [6.95, 2.35]) {
        for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
          add(cx + (col - 1.5) * 1.92, cy + (row - 1) * 1.04, 1.66, 0.72,
            row === 1 && (col === 1 || col === 2) ? { type: 'explosive' } : {});
        }
      }
      break;
    case 2:
      for (let row = -4; row <= 4; row++) for (let col = -4; col <= 4; col++) {
        if (Math.abs(row) + Math.abs(col) <= 4) add(col * 1.9, 4.1 + row * 1.09, 1.68, 0.78,
          row === 0 ? { type: col % 2 ? 'explosive' : 'armored' } : {});
      }
      break;
    case 3:
      for (let row = 0; row < 6; row++) for (let col = 0; col < 10; col++) {
        const x = (col - 4.5) * 1.7 + (row % 2 ? 0.425 : -0.425);
        if (!(row === 0 && (col === 0 || col === 9))) add(x, 8 - row * 1.46, 0.87, 0, { hex: true });
      }
      break;
    case 4:
      for (let row = 0; row < 4; row++) for (let col = -5; col <= 5; col++) {
        add(col * 1.72, 8.2 - row * 1.8 - Math.abs(col) * 0.57, 1.53, 0.64,
          { angle: col < 0 ? 0.32 : col > 0 ? -0.32 : 0 });
      }
      break;
    case 5:
      for (const [radius, count] of [[2.1, 10], [4.25, 18], [6.4, 26]]) {
        for (let i = 0; i < count; i++) {
          const a = (i + 0.5) / count * Math.PI * 2;
          add(Math.cos(a) * radius * 1.36, 3.1 + Math.sin(a) * radius * 0.87, radius < 3 ? 0.85 : radius < 5 ? 0.98 : 1.15, 0.58,
            { angle: Math.atan2(0.87 * Math.cos(a), -1.36 * Math.sin(a)) });
        }
      }
      break;
    case 6:
      for (let a = 0; a < 16;) {
        const radius = 1.15 + a * 0.43;
        add(Math.cos(a) * radius * 1.07, 3.2 + Math.sin(a) * radius * 0.66, 0.53, 0, { hex: true });
        a += 1.7 / radius;
      }
      break;
    default:
      for (let row = -4; row <= 4; row++) for (let col = -5; col <= 5; col++) {
        const d = Math.max(Math.abs(col), Math.abs(row));
        if (d === 3 || (d === 5 && row % 2)) continue;
        add(col * 1.78, 3.7 + row * 1.17, 1.54, 0.84,
          { type: d === 2 ? 'explosive' : d <= 1 ? 'armored' : (row + col) % 3 === 0 ? 'prism' : 'normal' });
      }
  }
  return bricks;
}
