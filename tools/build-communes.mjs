// Construit data/communes-ref.json (§7.5) depuis geo.api.gouv.fr, une fois pour toutes.
// Contenu : grandes villes françaises + communes du Var (+ grandes communes des Bouches-du-Rhône),
// avec latitude / longitude, pour les anecdotes « depuis ta ville » (distances à vol d'oiseau).
// Usage : node tools/build-communes.mjs

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../data/communes-ref.json', import.meta.url));
const FIELDS = 'nom,code,centre,population,codeDepartement';
const TOP_FRANCE = 80; // les plus peuplées de France
const VAR_MIN_POP = 2500; // communes du Var retenues
const BDR_MIN_POP = 20000; // Bouches-du-Rhône

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'running-pwa-build-tool/1.0' } });
  if (!res.ok) throw new Error(`${url} : ${res.status}`);
  return res.json();
}

const toRef = (c) => ({
  name: c.nom,
  code: c.code,
  dep: c.codeDepartement,
  lat: Math.round(c.centre.coordinates[1] * 1e4) / 1e4,
  lon: Math.round(c.centre.coordinates[0] * 1e4) / 1e4,
  pop: c.population ?? 0,
});

const all = (await get(`https://geo.api.gouv.fr/communes?fields=${FIELDS}&format=json`)).filter((c) => c.centre);
const byCode = new Map();
const add = (c) => byCode.set(c.code, toRef(c));

all.filter((c) => c.codeDepartement === '83' && (c.population ?? 0) >= VAR_MIN_POP).forEach(add);
all.filter((c) => c.codeDepartement === '13' && (c.population ?? 0) >= BDR_MIN_POP).forEach(add);
all.filter((c) => !['971', '972', '973', '974', '976'].includes(c.codeDepartement))
  .sort((a, b) => (b.population ?? 0) - (a.population ?? 0)).slice(0, TOP_FRANCE).forEach(add);

const list = [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
await writeFile(OUT, `${JSON.stringify({ version: 1, source: 'geo.api.gouv.fr', communes: list })}\n`);
console.log(`${list.length} communes (${list.filter((c) => c.dep === '83').length} dans le Var) → data/communes-ref.json`);
