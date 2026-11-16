// Prépare les fonds d'écran (§8.2) : backgrounds-sources/ → assets/backgrounds/fond-NN.webp
// + data/backgrounds.json.
//
// Usage : node tools/build-backgrounds.mjs [dossier-sources]
//   (par défaut ../backgrounds-sources, à côté du dépôt : les sources ne sont pas publiées)
//   Option --contact <fichier.jpg> : planche contact pour vérifier les images d'un coup d'œil.
//
// - 1080 × 1920 (9:16), WebP qualité ≈ 80, ≤ 400 Ko (qualité baissée si besoin).
// - Image non portrait : recadrée en 9:16, centrée à 46 % horizontalement.
// - Les identifiants restent stables : une source déjà convertie garde son fond-NN.
// - Les images ne doivent contenir ni texte, ni logo, ni marque : à vérifier sur la planche.

import sharp from 'sharp';
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const contactIdx = args.indexOf('--contact');
const contactOut = contactIdx >= 0 ? args.splice(contactIdx, 2)[1] : null;
const SRC = args[0] || join(ROOT, '..', 'backgrounds-sources');
const OUT_DIR = join(ROOT, 'assets', 'backgrounds');
const JSON_PATH = join(ROOT, 'data', 'backgrounds.json');
const W = 1080;
const H = 1920;
const MAX_BYTES = 400 * 1024;
const FOCUS_X = 0.46;

const natural = (a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });

async function cropToPortrait(file) {
  const img = sharp(file).rotate();
  const { width, height } = await img.metadata();
  const target = W / H;
  const ratio = width / height;
  if (Math.abs(ratio - target) < 0.01) return img;
  if (ratio > target) {
    // Trop large : on garde toute la hauteur, fenêtre centrée à 46 %.
    const w = Math.round(height * target);
    const left = Math.min(width - w, Math.max(0, Math.round(width * FOCUS_X - w / 2)));
    return img.extract({ left, top: 0, width: w, height });
  }
  // Trop haute : on garde toute la largeur, fenêtre centrée verticalement.
  const h = Math.round(width / target);
  return img.extract({ left: 0, top: Math.round((height - h) / 2), width, height: h });
}

async function encode(file) {
  for (let q = 80; q >= 50; q -= 5) {
    const buf = await (await cropToPortrait(file)).resize(W, H, { fit: 'cover' }).webp({ quality: q, effort: 6 }).toBuffer();
    if (buf.length <= MAX_BYTES) return { buf, q };
  }
  throw new Error(`${basename(file)} : impossible de passer sous 400 Ko`);
}

async function main() {
  const excluded = JSON.parse(await readFile(join(ROOT, 'tools', 'backgrounds-exclude.json'), 'utf8')).exclude;
  const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g)$/i.test(f) && !(f in excluded)).sort(natural);
  for (const [f, why] of Object.entries(excluded)) console.log(`Écarté : ${f} (${why})`);
  if (!files.length) throw new Error(`Aucune image dans ${SRC}`);

  if (contactOut) {
    const tw = 180; const th = 320; const cols = 6;
    const rows = Math.ceil(files.length / cols);
    const tiles = await Promise.all(files.map(async (f, i) => ({
      input: await (await cropToPortrait(join(SRC, f))).resize(tw, th).jpeg().toBuffer(),
      left: (i % cols) * (tw + 8), top: Math.floor(i / cols) * (th + 8),
    })));
    await sharp({ create: { width: cols * (tw + 8), height: rows * (th + 8), channels: 3, background: '#ffffff' } })
      .composite(tiles).jpeg({ quality: 80 }).toFile(contactOut);
    console.log(`Planche contact : ${contactOut} (ordre : ${files.join(', ')})`);
    return;
  }

  let existing = { version: 1, backgrounds: [] };
  try { existing = JSON.parse(await readFile(JSON_PATH, 'utf8')); } catch { /* premier passage */ }
  const bySource = new Map(existing.backgrounds.filter((b) => b.source).map((b) => [b.source, b]));
  let next = Math.max(0, ...existing.backgrounds.map((b) => Number(b.id.replace(/\D/g, '')) || 0)) + 1;

  await mkdir(OUT_DIR, { recursive: true });
  const list = [];
  for (const f of files) {
    let entry = bySource.get(f);
    if (!entry) {
      const id = `fond-${String(next).padStart(2, '0')}`;
      next += 1;
      entry = { id, file: `assets/backgrounds/${id}.webp`, position: '50% 50%', source: f };
    }
    const { buf, q } = await encode(join(SRC, f));
    await writeFile(join(ROOT, entry.file), buf);
    console.log(`${f} → ${entry.file} (${Math.round(buf.length / 1024)} Ko, q${q})`);
    list.push(entry);
  }
  // Les fonds dont la source a disparu restent publiés (on ne casse rien).
  for (const b of existing.backgrounds) if (!list.some((x) => x.id === b.id)) {
    try { await stat(join(ROOT, b.file)); list.push(b); } catch { /* fichier absent : retiré */ }
  }
  list.sort((a, b) => natural(a.id, b.id));
  await writeFile(JSON_PATH, `${JSON.stringify({ version: 1, backgrounds: list }, null, 2)}\n`);
  console.log(`${list.length} fonds dans data/backgrounds.json`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
