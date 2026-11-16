// Tests des messages (§6.3) et de la géographie (§12).
process.env.TZ = 'Europe/Paris';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fill, pickVariant, welcomeContext, pickWelcome } from '../js/messages.js';
import { haversineKm, toCity, resolveCity, searchCommunes, isResolved } from '../js/geo.js';

const messages = JSON.parse(readFileSync(new URL('../data/messages.json', import.meta.url), 'utf8'));
const at = (d, h = 10) => new Date(2026, 10, d, h); // novembre 2026 : le 16 est un lundi
const sess = (d) => ({ id: `s${d}`, date: at(d, 9).toISOString() });

describe('messages d\'accueil', () => {
  test('aucune séance', () => {
    assert.equal(welcomeContext({ sessions: [], now: at(18) }).key, 'first');
  });
  test('sortie aujourd\'hui, hier, avant-hier', () => {
    assert.equal(welcomeContext({ sessions: [sess(18)], now: at(18, 20) }).key, 'today');
    assert.deepEqual(welcomeContext({ sessions: [sess(17)], now: at(18) }), { key: 'recent', vars: { quand: "d'hier" } });
    assert.deepEqual(welcomeContext({ sessions: [sess(14)], now: at(16, 8) }), { key: 'recent', vars: { quand: 'de samedi' } });
    assert.deepEqual(welcomeContext({ sessions: [sess(15)], now: at(17) }), { key: 'recent', vars: { quand: 'de dimanche' } });
  });
  test('3 à 7 jours, plus de 7 jours, lundi', () => {
    assert.equal(welcomeContext({ sessions: [sess(13)], now: at(18) }).key, 'days3to7');
    assert.equal(welcomeContext({ sessions: [sess(5)], now: at(18) }).key, 'longAbsence');
    assert.equal(welcomeContext({ sessions: [sess(11)], now: at(16) }).key, 'monday');
  });
  test('semaine terminée et jalon proche passent avant « dernière sortie »', () => {
    assert.equal(welcomeContext({ sessions: [sess(17)], now: at(18), weekDone: true }).key, 'weekDone');
    assert.deepEqual(welcomeContext({ sessions: [sess(17)], now: at(18), milestoneRemaining: 0.4 }), { key: 'milestoneClose', vars: { x: '0,4' } });
  });
  test('jamais le même message deux fois de suite', () => {
    const ctx = { key: 'default', vars: {} };
    let last = null;
    for (let i = 0; i < 50; i += 1) {
      const m = pickWelcome(ctx, messages, last);
      assert.notEqual(m, last);
      last = m;
    }
  });
  test('variables remplacées', () => {
    const m = pickWelcome({ key: 'recent', vars: { quand: 'de samedi' } }, messages, null, () => 0);
    assert.equal(m, 'Contente de te retrouver. Ta dernière sortie date de samedi : bravo !');
    assert.equal(fill('Cap des {J} km !', { J: 15 }), 'Cap des 15 km !');
  });
  test('pickVariant avec une seule variante', () => {
    assert.equal(pickVariant(['a'], 'a'), 'a');
    assert.equal(pickVariant([], 'a'), null);
  });
});

describe('textes : féminin, encourageants, sans « X fois »', () => {
  const all = JSON.stringify(messages);
  test('pas de tournures au masculin pour l\'utilisatrice', () => {
    for (const w of ['Prêt ', 'Content de', 'sorti ', 'fier de', 'parti ']) assert.ok(!all.includes(w), w);
  });
  test('pas de comparaison « X fois »', () => {
    assert.ok(!/\d+\s*fois/i.test(all));
  });
  test('6 à 10 encouragements, tous différents', () => {
    assert.ok(messages.encouragements.length >= 6 && messages.encouragements.length <= 10);
    assert.equal(new Set(messages.encouragements).size, messages.encouragements.length);
  });
});

describe('géographie', () => {
  test('haversine : Saint-Cyr-sur-Mer → Toulon ≈ 19 km à vol d\'oiseau', () => {
    const d = haversineKm({ lat: 43.17, lon: 5.7055 }, { lat: 43.1364, lon: 5.9334 });
    assert.ok(d > 18 && d < 20, `${d}`);
  });
  test('haversine : Paris → Londres ≈ 344 km', () => {
    const d = haversineKm({ lat: 48.8566, lon: 2.3522 }, { lat: 51.5074, lon: -0.1278 });
    assert.ok(Math.abs(d - 344) < 3, `${d}`);
  });
  test('réponse de l\'API → ville (centre = [lon, lat])', () => {
    const c = toCity({ nom: 'Toulon', code: '83137', centre: { type: 'Point', coordinates: [5.9334, 43.1364] }, codesPostaux: ['83000', '83100'], population: 180000 });
    assert.deepEqual(c, { name: 'Toulon', code: '83137', lat: 43.1364, lon: 5.9334, postcode: '83000', population: 180000 });
    assert.equal(isResolved(c), true);
    assert.equal(isResolved({ name: 'Toulon' }), false);
  });
  test('résolution d\'une ville saisie hors ligne (API simulée)', async () => {
    const api = [
      { nom: 'Saint-Cyr-sur-Loire', code: '37214', centre: { coordinates: [0.66, 47.4] } },
      { nom: 'Saint-Cyr-sur-Mer', code: '83112', centre: { coordinates: [5.7055, 43.17] } },
    ];
    let calledUrl = '';
    const fetchFn = async (url) => { calledUrl = url; return { ok: true, json: async () => api }; };
    const c = await resolveCity('saint cyr sur mer', { fetchFn });
    assert.equal(c.code, '83112');
    assert.match(calledUrl, /^https:\/\/geo\.api\.gouv\.fr\/communes\?nom=saint%20cyr%20sur%20mer&fields=nom,code,centre,codesPostaux,population&boost=population&limit=6$/);
    assert.deepEqual(await searchCommunes('a', { fetchFn }), [], 'pas d\'appel sous 2 caractères');
  });
});
