/** Registry metadata is light; imports run only after a launch request. */
export const games = [
  {
    id: 'signal-lab', title: 'Signal Lab', category: 'sandbox', status: 'ready',
    description: 'A small playground for light, motion, and the arcade controls.',
    controls: 'WASD / arrows to move · Space to pulse · Drag to move on touch',
    scoreLabel: 'Pulses', load: () => import('./signal-lab/index.js'),
  },
  { id: 'brick-breaker', title: 'Brick Breaker', category: 'reflex', status: 'ready', art: 'bricks',
    description: 'Eight patterns. Explosive chains. One more beautiful collapse.',
    controls: 'Mouse / A D / arrows to move · Click / Space to launch · Drag on touch',
    scoreLabel: 'Score', load: () => import('./brick-breaker/index.js') },
  { id: 'pong', title: 'Pong', category: 'reflex', status: 'planned', art: 'pong',
    description: 'Two paddles. One ball. Every return counts.', controls: 'Controls will be defined during development.' },
  { id: 'snake', title: 'Snake', category: 'reflex', status: 'planned', art: 'snake',
    description: 'One more turn. One less way out.', controls: 'Controls will be defined during development.' },
  { id: 'block-stack', title: 'Block Stack', category: 'puzzle', status: 'planned', art: 'blocks',
    description: 'Make room for the next move. A falling-block puzzle.', controls: 'Controls will be defined during development.' },
  { id: 'starfighter', title: 'Starfighter', category: 'action', status: 'planned', art: 'ship',
    description: 'Hold your line against a sky full of trouble.', controls: 'Controls will be defined during development.' },
  { id: 'maze-runner', title: 'Maze Runner', category: 'puzzle', status: 'planned', art: 'maze',
    description: 'Keep moving. Every corner is a decision.', controls: 'Controls will be defined during development.' },
];
export const findGame = id => games.find(game => game.id === id);
