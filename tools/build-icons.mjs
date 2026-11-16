// Génère les icônes PNG de l'app à partir du logo (tracé repris des maquettes).
// Usage : node tools/build-icons.mjs   (dépendance de dev : sharp)

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../assets/icons/', import.meta.url));
const LOGO = 'M4 17c3 0 4-3 6-6s4-4 6-4h4M4 21h16'; // viewBox 24, centre du tracé ≈ (12, 14)

const gradient = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E65A82"/>
      <stop offset="1" stop-color="#C92F5C"/>
    </linearGradient>
  </defs>`;

const glyph = (scale) => {
  const tx = 256 - 12 * scale;
  const ty = 256 - 14 * scale;
  return `<g transform="translate(${tx} ${ty}) scale(${scale})"><path d="${LOGO}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>`;
};

// Icône « any » : carré arrondi sur fond transparent.
const anySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${gradient}
  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#g)"/>${glyph(17)}</svg>`;

// Icône « maskable » : fond plein, logo dans la zone de sécurité (cercle de 40 %).
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${gradient}
  <rect width="512" height="512" fill="url(#g)"/>${glyph(13)}</svg>`;

await mkdir(OUT, { recursive: true });
await sharp(Buffer.from(anySvg)).resize(192, 192).png().toFile(`${OUT}icon-192.png`);
await sharp(Buffer.from(anySvg)).resize(512, 512).png().toFile(`${OUT}icon-512.png`);
await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(`${OUT}icon-maskable-512.png`);

// iPhone : iOS arrondit lui-même les coins et remplit la transparence en noir,
// donc icône pleine (sans coins transparents), 180 × 180.
const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${gradient}
  <rect width="512" height="512" fill="url(#g)"/>${glyph(16)}</svg>`;
await sharp(Buffer.from(appleSvg)).resize(180, 180).flatten({ background: '#D63A66' }).png().toFile(`${OUT}apple-touch-icon.png`);
console.log('Icônes générées dans assets/icons/');
