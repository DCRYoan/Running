// Tests du stockage local (§6.1) et de la liste de précache.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import {
  STORAGE_KEY, defaultState, migrate, loadState, saveState, newId,
  withSession, withDecision, withProfile, withSettings, withUi,
} from '../js/state.js';
import { collectPrecache } from '../tools/build-sw.mjs';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}

describe('état local', () => {
  test('état par défaut conforme au §6.1', () => {
    const s = defaultState();
    assert.equal(s.schemaVersion, 1);
    assert.deepEqual(s.settings, { stepKm: 0.5, sessionsPerPalier: 4, glass: 'auto', updatedAt: null });
    assert.deepEqual(s.sessions, []);
    assert.deepEqual(s.decisions, []);
    assert.equal(s.backup.code, null);
  });

  test('lecture vide, illisible ou partielle', () => {
    const st = memoryStorage();
    assert.deepEqual(loadState(st), defaultState());
    st.setItem(STORAGE_KEY, '{pas du json');
    assert.deepEqual(loadState(st), defaultState());
    const copies = [...st.map.keys()].filter((k) => k.startsWith(`${STORAGE_KEY}:illisible:`));
    assert.equal(copies.length, 1, 'une copie des données illisibles est conservée');
    assert.equal(st.getItem(copies[0]), '{pas du json');
    st.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, sessions: [{ id: 'a' }], settings: { stepKm: 0.3 } }));
    const s = loadState(st);
    assert.deepEqual(s.sessions, [{ id: 'a' }]);
    assert.equal(s.settings.stepKm, 0.3);
    assert.equal(s.settings.sessionsPerPalier, 4, 'les champs manquants sont complétés');
    assert.equal(s.ui.lastMilestoneShown, 0);
  });

  test('aller-retour sauvegarde → lecture', () => {
    const st = memoryStorage();
    let s = defaultState();
    s = withProfile(s, { firstName: 'Camille' }, new Date('2026-11-16T10:00:00Z'));
    assert.equal(saveState(s, st), true);
    assert.deepEqual(loadState(st), s);
  });

  test('migrate ignore un schéma futur sans planter et normalise les tableaux', () => {
    const s = migrate({ schemaVersion: 1, sessions: 'oups', decisions: null });
    assert.deepEqual(s.sessions, []);
    assert.deepEqual(s.decisions, []);
  });
});

describe('mises à jour immuables', () => {
  test('withSession ajoute ou remplace par id, et marque la sauvegarde à faire', () => {
    const s0 = defaultState();
    const s1 = withSession(s0, { id: 'a', distanceKm: 2 });
    const s2 = withSession(s1, { id: 'a', distanceKm: 2.5 });
    assert.equal(s0.sessions.length, 0, 'l\'état d\'origine n\'est pas modifié');
    assert.equal(s2.sessions.length, 1);
    assert.equal(s2.sessions[0].distanceKm, 2.5);
    assert.equal(s2.backup.dirty, true);
  });
  test('décisions, profil, réglages, ui', () => {
    let s = withDecision(defaultState(), { seq: 1 });
    assert.equal(s.decisions.length, 1);
    s = withSettings(s, { stepKm: 0.7 }, new Date('2026-11-16T10:00:00Z'));
    assert.equal(s.settings.updatedAt, '2026-11-16T10:00:00.000Z');
    assert.equal(s.settings.sessionsPerPalier, 4);
    s = withUi(s, { lastTone: 'humour' });
    assert.equal(s.ui.lastTone, 'humour');
    assert.equal(s.ui.lastAnecdoteId, null);
  });
});

describe('identifiants', () => {
  test('UUID v4 (natif et repli sans randomUUID)', () => {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    assert.match(newId(webcrypto), re);
    const fallback = { getRandomValues: (a) => webcrypto.getRandomValues(a) };
    const ids = new Set(Array.from({ length: 200 }, () => newId(fallback)));
    assert.equal(ids.size, 200);
    for (const id of ids) assert.match(id, re);
  });
});

describe('service worker', () => {
  test('chaque fichier précaché existe (sinon l\'installation hors ligne échoue)', async () => {
    const files = await collectPrecache();
    assert.ok(files.includes('index.html'));
    assert.ok(files.includes('data/plan.json'));
    for (const f of files) assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), f);
  });
});
