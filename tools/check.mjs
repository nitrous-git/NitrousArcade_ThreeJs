import { readdir, readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
let checked = 0;
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const filename = path.join(dir, entry.name);
    if (entry.isDirectory()) { await scan(filename); continue; }
    if (!/\.(js|mjs)$/.test(filename)) continue;
    const result = spawnSync(process.execPath, ['--check', filename], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr);
    const source = await readFile(filename, 'utf8');
    const imports = source.matchAll(/(?:from\s+|import\s*\()(['"])(\.[^'"]+)\1/g);
    for (const match of imports) await access(path.resolve(path.dirname(filename), match[2]));
    checked++;
  }
}
await scan(root);
const html = await readFile(path.join(root, 'index.html'), 'utf8');
const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
if (!map.imports.three.includes('@0.180.0/') || !map.imports['three/addons/'].includes('@0.180.0/')) throw new Error('Three.js version mismatch');
for (const match of html.matchAll(/(?:src|href)="(\.\/[^\"]+)"/g)) await access(path.resolve(root, match[1]));
const { games } = await import('../js/games/registry.js');
if (new Set(games.map(g => g.id)).size !== games.length) throw new Error('Duplicate game IDs');
for (const game of games) {
  if (game.art) await access(path.join(root, 'assets/art', `${game.art}.svg`));
  if (game.status === 'ready' && typeof game.load !== 'function') throw new Error(`Missing loader: ${game.id}`);
}
console.log(`Checked ${checked} JavaScript files, local imports, HTML assets, registry, and pinned import map.`);
