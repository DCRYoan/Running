// Communes françaises via l'API publique geo.api.gouv.fr (§12) + distance à vol d'oiseau.

const API = 'https://geo.api.gouv.fr/communes';

/** Distance à vol d'oiseau (haversine), en km. Ne jamais la présenter comme une distance de route. */
export function haversineKm(a, b) {
  const R = 6371.0088;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Réponse brute de l'API → { name, code, lat, lon, postcode, population } */
export function toCity(c) {
  const [lon, lat] = c.centre?.coordinates || [];
  return {
    name: c.nom,
    code: c.code,
    lat: typeof lat === 'number' ? Math.round(lat * 1e5) / 1e5 : null,
    lon: typeof lon === 'number' ? Math.round(lon * 1e5) / 1e5 : null,
    postcode: c.codesPostaux?.[0] ?? null,
    population: c.population ?? null,
  };
}

export async function searchCommunes(text, { signal, fetchFn = fetch } = {}) {
  const q = String(text || '').trim();
  if (q.length < 2) return [];
  const url = `${API}?nom=${encodeURIComponent(q)}&fields=nom,code,centre,codesPostaux,population&boost=population&limit=6`;
  const res = await fetchFn(url, { signal });
  if (!res.ok) throw new Error(`geo.api.gouv.fr : ${res.status}`);
  return (await res.json()).map(toCity);
}

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Ville saisie hors ligne (texte seul) → commune résolue au prochain accès réseau.
 * On prend la commune au nom identique la plus peuplée, sinon la première.
 */
export async function resolveCity(name, opts) {
  const list = await searchCommunes(name, opts);
  if (!list.length) return null;
  return list.find((c) => norm(c.name) === norm(name)) || list[0];
}

export const isResolved = (city) => Boolean(city && city.code && typeof city.lat === 'number');
