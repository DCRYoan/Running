// Sélection et rédaction des anecdotes (§7) — fonctions pures, testées.
// « c'est comme aller de A à B » : toujours un trajet ou un équivalent unique, jamais « X fois ».
import { fmtKm1 } from './format.js';
import { haversineKm } from './geo.js';

const TONES = ['encourageant', 'humour', 'sobre'];
const VOWEL = /^[aeiouyhâàéèêëîïôöûüœæ]/i;

/** « de aller » → « d'aller », « que aller » → « qu'aller ». */
export const de = (text) => (VOWEL.test(text) ? `d'${text}` : `de ${text}`);
export const que = (text) => (VOWEL.test(text) ? `qu'${text}` : `que ${text}`);

/** « à Toulon », « au Castellet », « aux Arcs », « à La Seyne ». */
export function toPlace(name) {
  if (/^Le /.test(name)) return `au ${name.slice(3)}`;
  if (/^Les /.test(name)) return `aux ${name.slice(4)}`;
  return `à ${name}`;
}

const fill = (t, vars) => t.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const pick = (list, rnd) => list[Math.floor(rnd() * list.length)] ?? list[0];

/** Comparaison selon le rapport total / distance de l'anecdote. */
export function fitOf(total, km, fit) {
  const r = total / km;
  if (r < 1) return 'presque';
  if (r < fit.plusFrom) return 'pile';
  if (r < fit.bienPlusFrom) return 'plus';
  return 'bienPlus';
}

/** Anecdote « depuis ta ville » (§7.5) : la commune de référence la plus loin sous le total. */
export function cityAnecdote(city, total, communes, data) {
  if (!city || typeof city.lat !== 'number' || typeof city.lon !== 'number') return null;
  let best = null;
  for (const c of communes) {
    if (c.code === city.code || c.name === city.name) continue;
    const d = haversineKm(city, c);
    if (d < 1 || d > total) continue;
    if (!best || d > best.d) best = { c, d };
  }
  if (!best) return null;
  const km = Math.round(best.d * 10) / 10;
  return {
    id: `ville-${best.c.code}`,
    kind: 'city',
    km,
    text: fill(data.city.text, { ville: city.name, a_destination: toPlace(best.c.name) }),
    place: `${city.name} → ${best.c.name}`,
    image: data.city.image,
    tones: TONES,
  };
}

/** Candidates fixes : les 4 plus grandes ≤ total, plus la suivante si on en est « presque » là. */
export function candidates(total, list, fit) {
  const fixed = list.filter((a) => a.kind !== 'city');
  const below = fixed.filter((a) => a.km <= total).sort((a, b) => b.km - a.km).slice(0, 4);
  const almost = fixed.filter((a) => a.km > total && total >= a.km * fit.presqueFrom).sort((a, b) => a.km - b.km)[0];
  return almost ? [...below, almost] : below;
}

/** Phrase complète pour un ton donné. */
export function sentence(anecdote, total, tone, data, rnd = Math.random) {
  const f = fitOf(total, anecdote.km, data.fit);
  const vars = { text: anecdote.text, de_text: de(anecdote.text), que_text: que(anecdote.text) };
  const comp = fill(pick(data.comparisons[f], rnd), vars);
  const compSobre = fill(pick(data.comparisonsSobre[f], rnd), vars);
  // « sans les embouteillages » n'a pas de sens pour une distance à vol d'oiseau.
  let templates = data.templates[tone];
  if (/vol d'oiseau/.test(anecdote.text)) templates = templates.filter((t) => !t.includes('embouteillages'));
  return fill(pick(templates, rnd), { total: fmtKm1(total), comp, compSobre });
}

/** Version courte pour l'écran Bravo : « 18,2 km depuis ta première séance : c'est comme … ». */
export function shortSentence(anecdote, total, data, rnd = Math.random) {
  const f = fitOf(total, anecdote.km, data.fit);
  const comp = fill(pick(data.comparisons[f], rnd), { text: anecdote.text, que_text: que(anecdote.text) });
  return `${fmtKm1(total)} km depuis ta première séance : ${comp}.`;
}

/**
 * Choisit l'anecdote à afficher (§7.4).
 * @param {object} p
 * @param {number} p.total distance totale cumulée
 * @param {object} p.data contenu de data/anecdotes.json
 * @param {Array}  p.communes data/communes-ref.json (communes)
 * @param {object} p.city ville de l'utilisatrice ({ name, code, lat, lon })
 * @param {string} p.lastId dernière anecdote montrée (exclue)
 * @param {string} p.lastTone dernier ton (jamais deux fois de suite)
 * @param {number} p.count nombre d'anecdotes déjà tirées (une sur trois depuis la ville)
 * @returns {{ kind: 'first'|'anecdote', anecdote, tone, text, short?, x? }}
 */
export function pickAnecdote({ total, data, communes = [], city = null, lastId = null, lastTone = null, count = 0, rnd = Math.random }) {
  const fixed = data.anecdotes;
  const smallest = [...fixed].sort((a, b) => a.km - b.km)[0];

  // Avant la première cible : « Ton premier objectif : …, encore x km. »
  if (total < smallest.km * data.fit.presqueFrom) {
    return {
      kind: 'first',
      anecdote: smallest,
      tone: lastTone,
      x: Math.round((smallest.km - total) * 10) / 10,
      text: fill(data.firstTarget, { text: smallest.text, x: fmtKm1(smallest.km - total) }),
    };
  }

  let chosen = null;
  // Une anecdote sur trois environ depuis la ville (si elle a des coordonnées).
  if (count % data.city.every === data.city.every - 1) {
    const c = cityAnecdote(city, total, communes, data);
    if (c && c.id !== lastId) chosen = c;
  }
  if (!chosen) {
    let pool = candidates(total, fixed, data.fit);
    if (!pool.length) pool = [[...fixed].sort((a, b) => b.km - a.km)[0]]; // au-delà de la liste : la plus grande
    const fresh = pool.filter((a) => a.id !== lastId);
    if (fresh.length) pool = fresh;
    // Préférer une anecdote qui propose un ton différent du précédent.
    const toneOk = pool.filter((a) => a.tones.some((t) => t !== lastTone));
    chosen = pick(toneOk.length ? toneOk : pool, rnd);
  }

  const tones = chosen.tones.filter((t) => t !== lastTone);
  const tone = pick(tones.length ? tones : TONES.filter((t) => t !== lastTone), rnd);
  return {
    kind: 'anecdote',
    anecdote: chosen,
    tone,
    text: sentence(chosen, total, tone, data, rnd),
    short: shortSentence(chosen, total, data, rnd),
  };
}
