// Génère la liste de précache et la version du service worker.
// Usage : node tools/build-sw.mjs   (ou npm run sw) — à lancer avant chaque commit.
// La version est une empreinte du contenu : elle ne change que si un fichier change.

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PRECACHED_BACKGROUNDS = 5;

async function walk(dir, filter) {
  const out = [];
  let entries = [];
  try { entries = await readdir(join(ROOT, dir), { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...(await walk(rel, filter)));
    else if (filter(e.name)) out.push(rel);
  }
  return out;
}

const ext = (...xs) => (name) => xs.some((x) => name.toLowerCase().endsWith(x));

export async function collectPrecache() {
  const files = [
    'index.html',
    'manifest.webmanifest',
    'config.js',
    ...(await walk('css', ext('.css'))),
    ...(await walk('js', ext('.js'))),
    ...(await walk('data', ext('.json'))),
    ...(await walk('assets/fonts', ext('.woff2'))),
    ...(await walk('assets/icons', ext('.png', '.svg'))),
    ...(await walk('assets/anecdotes', ext('.svg'))),
    ...(await walk('assets/cards', ext('.webp', '.png', '.jpg'))),
    ...(await walk('assets/backgrounds/secours', ext('.svg'))),
  ];
  try {
    const bg = JSON.parse(await readFile(join(ROOT, 'data/backgrounds.json'), 'utf8'));
    files.push(...bg.backgrounds.slice(0, PRECACHED_BACKGROUNDS).map((b) => b.file));
  } catch { /* pas de fonds */ }
  return [...new Set(files)].sort();
}

async function main() {
  const files = await collectPrecache();
  const hash = createHash('sha256');
  for (const f of files) {
    hash.update(f);
    hash.update(await readFile(join(ROOT, f)));
  }
  const version = hash.digest('hex').slice(0, 12);
  const block = [
    '// <precache> — bloc généré par tools/build-sw.mjs, ne pas éditer à la main',
    `const VERSION = '${version}';`,
    `const PRECACHE = ${JSON.stringify(['./', ...files], null, 2)};`,
    '// </precache>',
  ].join('\n');
  const swPath = join(ROOT, 'sw.js');
  const sw = await readFile(swPath, 'utf8');
  const next = sw.replace(/\/\/ <precache>[\s\S]*?\/\/ <\/precache>/, block);
  await writeFile(swPath, next);
  console.log(`sw.js : version ${version}, ${files.length + 1} fichiers précachés`);
}

if (process.argv[1] && relative(process.argv[1], fileURLToPath(import.meta.url)) === '') main();
