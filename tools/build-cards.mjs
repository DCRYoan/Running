// Cartes de motivation (§8.3) : cartes-motivation/*.png → assets/cards/motivation-*.webp,
// recadrées sur la zone de texte (fenêtres y données sur l'original de 1672 px de haut).
// Usage : node tools/build-cards.mjs [dossier-sources]   (par défaut ../cartes-motivation)

import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = process.argv[2] || join(ROOT, '..', 'cartes-motivation');
const OUT = join(ROOT, 'assets', 'cards');
const REF_H = 1672;

const CARDS = [
  { source: 'tu-progresses.png', out: 'motivation-tu-progresses.webp', y0: 190, y1: 1110 }, // Séance incomplète
  { source: 'continue.png', out: 'motivation-continue.webp', y0: 340, y1: 1000 }, // Repos
  { source: 'liste-motivation.png', out: 'motivation-liste.webp', y0: 60, y1: 1130 }, // Mon programme
  { source: 'coeur.png', out: 'motivation-coeur.webp', y0: 380, y1: 1200 }, // Message douleur
];

const files = await readdir(SRC);
await mkdir(OUT, { recursive: true });
for (const c of CARDS) {
  // Noms de fichiers sans tenir compte des majuscules (Coeur.png, coeur.png…).
  const file = files.find((f) => f.toLowerCase() === c.source);
  if (!file) { console.warn(`Manquant : ${c.source}`); continue; }
  const img = sharp(join(SRC, file));
  const { width, height } = await img.metadata();
  const k = height / REF_H;
  const top = Math.round(c.y0 * k);
  const h = Math.round((c.y1 - c.y0) * k);
  const info = await img.extract({ left: 0, top, width, height: Math.min(h, height - top) })
    .webp({ quality: 82, effort: 6 }).toFile(join(OUT, c.out));
  console.log(`${file} → assets/cards/${c.out} (${info.width}×${info.height}, ${Math.round(info.size / 1024)} Ko)`);
}
