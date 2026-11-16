// Tests des anecdotes (§7), des fonds (§8) et des données associées.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { pickAnecdote, candidates, fitOf, cityAnecdote, sentence, de, que, toPlace } from '../js/anecdotes.js';
import { pickBackground } from '../js/backgrounds.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const data = read('data/anecdotes.json');
const { communes } = read('data/communes-ref.json');
const bgs = read('data/backgrounds.json').backgrounds;
const saintCyr = { name: 'Saint-Cyr-sur-Mer', code: '83112', lat: 43.17, lon: 5.7055 };

// Générateur pseudo-aléatoire déterministe pour des tests reproductibles.
const seeded = (s = 1) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

describe('données des anecdotes', () => {
  test('identifiants uniques, distances vérifiées et positives, une source chacune', () => {
    const ids = data.anecdotes.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const a of data.anecdotes) {
      assert.equal(a.verified, true, a.id);
      assert.ok(a.km > 0, a.id);
      assert.ok(a.source?.length > 10, `${a.id} : source`);
      assert.ok(a.tones.length >= 1 && a.tones.every((t) => t in data.templates), a.id);
    }
  });
  test('chaque anecdote a son illustration SVG (viewBox 346 × 176)', () => {
    for (const a of data.anecdotes) {
      const url = new URL(`../${a.image}`, import.meta.url);
      assert.ok(existsSync(url), a.image);
      assert.match(readFileSync(url, 'utf8'), /viewBox="0 0 346 176"/, a.image);
    }
    assert.ok(existsSync(new URL('../assets/anecdotes/generic-route.svg', import.meta.url)));
  });
  test('jamais de « X fois », « à vol d\'oiseau » cohérent avec la source', () => {
    const all = JSON.stringify(data);
    assert.ok(!/\d+\s*fois/i.test(all));
    for (const a of data.anecdotes) {
      if (/vol d'oiseau \(haversine\)/.test(a.source)) assert.match(a.text, /à vol d'oiseau/, a.id);
    }
  });
  test('environ la moitié d\'anecdotes locales, et du Var au Soleil sans plafond', () => {
    const local = data.anecdotes.filter((a) => a.zone !== 'monde').length;
    assert.ok(local / data.anecdotes.length >= 0.4, `${local}/${data.anecdotes.length}`);
    assert.ok(Math.max(...data.anecdotes.map((a) => a.km)) >= 149e6);
  });
  test('plusieurs anecdotes à chaque palier de distance réaliste', () => {
    for (const total of [3, 6, 10, 15, 22, 30, 45, 80, 150, 300, 700, 1500]) {
      assert.ok(candidates(total, data.anecdotes, data.fit).length >= 3, `${total} km`);
    }
  });
});

describe('sélection (§7.4)', () => {
  test('aucune séance : premier objectif = la plus petite anecdote', () => {
    const r = pickAnecdote({ total: 0, data });
    assert.equal(r.kind, 'first');
    assert.equal(r.anecdote.id, 'plage-lecques');
    assert.equal(r.text, 'Ton premier objectif : longer toute la plage des Lecques, pieds dans le sable, encore 1,4 km.');
  });
  test('les candidates sont les 4 plus grandes sous le total (+ une « presque »)', () => {
    const c = candidates(15.7, data.anecdotes, data.fit).map((a) => a.id);
    assert.deepEqual(c.slice(0, 4), ['lecques-sanary', 'manhattan-harlem', 'giens', 'saint-cyr-la-ciotat']);
    assert.equal(c[4], 'toulon-bandol', '15,7 ≥ 85 % de 18,4 km : « presque »');
  });
  test('comparaisons selon le rapport total / distance', () => {
    assert.equal(fitOf(16, 18.4, data.fit), 'presque');
    assert.equal(fitOf(18.5, 18.4, data.fit), 'pile');
    assert.equal(fitOf(21, 18.4, data.fit), 'plus');
    assert.equal(fitOf(30, 19.6, data.fit), 'bienPlus');
  });
  test('500 tirages : jamais la même anecdote ni le même ton deux fois de suite', () => {
    const rnd = seeded(7);
    let lastId = null; let lastTone = null; let count = 0;
    let total = 1.5;
    for (let i = 0; i < 500; i += 1) {
      total += 2.2;
      const r = pickAnecdote({ total, data, communes, city: saintCyr, lastId, lastTone, count, rnd });
      assert.equal(r.kind, 'anecdote');
      assert.notEqual(r.anecdote.id, lastId, `tirage ${i}`);
      assert.notEqual(r.tone, lastTone, `tirage ${i}`);
      assert.ok(!/\d+\s*fois/.test(r.text));
      assert.ok(r.text.includes(r.anecdote.text), r.text);
      ({ id: lastId } = r.anecdote); lastTone = r.tone; count += 1;
    }
  });
  test('les anecdotes grandissent avec le total', () => {
    const avg = (total) => {
      const rnd = seeded(3);
      const ks = Array.from({ length: 40 }, (_, i) => pickAnecdote({ total, data, rnd, count: i * 3 }).anecdote.km);
      return ks.reduce((a, b) => a + b, 0) / ks.length;
    };
    assert.ok(avg(5) < avg(20) && avg(20) < avg(100) && avg(100) < avg(1000));
  });
  test('au-delà de tout (et même du Soleil), on garde la plus grande', () => {
    const r = pickAnecdote({ total: 3e8, data, rnd: seeded(2) });
    assert.equal(r.anecdote.km, 149600000);
  });
});

describe('anecdotes « depuis ta ville » (§7.5)', () => {
  test('commune la plus loin sous le total, à vol d\'oiseau, ville exclue', () => {
    const a = cityAnecdote(saintCyr, 20, communes, data);
    assert.equal(a.kind, 'city');
    assert.ok(a.km <= 20 && a.km > 10, `${a.km}`);
    assert.match(a.text, /^aller de Saint-Cyr-sur-Mer (à|au|aux) .+, à vol d'oiseau$/);
    assert.match(a.place, /^Saint-Cyr-sur-Mer → /);
    assert.ok(!a.text.includes('à Saint-Cyr-sur-Mer,'));
  });
  test('une anecdote sur trois environ, seulement si la ville a des coordonnées', () => {
    const kinds = [0, 1, 2, 3, 4, 5].map((count) => pickAnecdote({ total: 30, data, communes, city: saintCyr, count, rnd: seeded(5) }).anecdote.kind);
    assert.deepEqual(kinds, ['fixed', 'fixed', 'city', 'fixed', 'fixed', 'city']);
    assert.equal(pickAnecdote({ total: 30, data, communes, city: { name: 'Toulon' }, count: 2, rnd: seeded(5) }).anecdote.kind, 'fixed');
  });
  test('articles : au Castellet, aux Arcs, à La Seyne', () => {
    assert.equal(toPlace('Le Castellet'), 'au Castellet');
    assert.equal(toPlace('Les Arcs'), 'aux Arcs');
    assert.equal(toPlace('La Seyne-sur-Mer'), 'à La Seyne-sur-Mer');
  });
});

describe('phrases', () => {
  test('élisions', () => {
    assert.equal(de('aller de A à B'), "d'aller de A à B");
    assert.equal(de('traverser'), 'de traverser');
    assert.equal(que('aller'), "qu'aller");
  });
  test('ton sobre, pile', () => {
    const v = data.anecdotes.find((a) => a.id === 'versailles');
    const s = sentence(v, 19.7, 'sobre', data, () => 0);
    assert.equal(s, "19,7 km depuis ta première séance, soit l'équivalent d'aller de Notre-Dame au château de Versailles.");
  });
  test('pas d\'« embouteillages » pour une distance à vol d\'oiseau', () => {
    const pl = data.anecdotes.find((a) => a.id === 'paris-londres');
    for (let i = 0; i < 30; i += 1) assert.ok(!sentence(pl, 400, 'humour', data, seeded(i + 1)).includes('embouteillages'));
  });
  test('ton humour, presque (maquette Toulon)', () => {
    const tb = data.anecdotes.find((a) => a.id === 'toulon-bandol');
    assert.equal(sentence(tb, 15.7, 'humour', data, () => 0), "15,7 km au compteur… c'est presque aller du port de Toulon jusqu'à Bandol, sans les embouteillages.");
  });
});

describe('fonds d\'écran (§8)', () => {
  test('fichiers présents, ≤ 400 Ko, identifiants uniques', () => {
    assert.ok(bgs.length >= 20);
    assert.equal(new Set(bgs.map((b) => b.id)).size, bgs.length);
    for (const b of bgs) {
      const url = new URL(`../${b.file}`, import.meta.url);
      assert.ok(existsSync(url), b.file);
      assert.ok(statSync(url).size <= 400 * 1024, b.file);
    }
  });
  test('1000 ouvertures : jamais le même fond deux fois de suite, tous finissent par sortir', () => {
    const rnd = seeded(11);
    let last = null;
    const seen = new Set();
    for (let i = 0; i < 1000; i += 1) {
      const b = pickBackground(bgs, last, rnd);
      assert.notEqual(b.id, last);
      seen.add(b.id);
      last = b.id;
    }
    assert.equal(seen.size, bgs.length);
  });
  test('cartes de motivation présentes', () => {
    for (const f of ['tu-progresses', 'continue', 'liste', 'coeur']) {
      assert.ok(existsSync(new URL(`../assets/cards/motivation-${f}.webp`, import.meta.url)), f);
    }
  });
});
