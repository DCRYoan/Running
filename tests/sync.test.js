// Tests de la sauvegarde (§10) : code de récupération, fusion, moteur de synchronisation
// face à un faux serveur qui reproduit les fonctions SQL (supabase/schema.sql).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto, createHash } from 'node:crypto';
import { generateCode, normCode, formatCode, isValidCode, ALPHABET } from '../js/backup-code.js';
import { mergeData, samePayload, backupPayload, createSync, rpc } from '../js/sync.js';
import { defaultState, withSession, withProfile, withDecision } from '../js/state.js';

// ---------- Faux Supabase : mêmes règles que schema.sql ----------
function fakeSupabase() {
  const rows = new Map();
  const attempts = [];
  let clock = 0;
  let online = true;
  const now = () => new Date(Date.UTC(2026, 10, 16, 12, 0, 0, clock++)).toISOString();
  const hash = (c) => createHash('sha256').update(normCode(c)).digest('hex');
  const throttled = (kind, max) => attempts.filter((a) => a === kind).length >= max;
  const H = {
    backup_register({ p_code, p_data }) {
      if (!/^[A-HJ-NP-Z2-9]{12}$/.test(normCode(p_code))) return { ok: false, error: 'bad_code' };
      if (throttled('register', 20)) return { ok: false, error: 'too_many_attempts' };
      attempts.push('register');
      if (rows.has(hash(p_code))) return { ok: false, error: 'code_taken' };
      const t = now();
      rows.set(hash(p_code), { data: p_data, updated_at: t });
      return { ok: true, updated_at: t };
    },
    backup_load({ p_code }) {
      if (throttled('fail', 10)) return { ok: false, error: 'too_many_attempts' };
      const r = rows.get(hash(p_code));
      if (!r) { attempts.push('fail'); return { ok: false, error: 'invalid_code' }; }
      return { ok: true, data: structuredClone(r.data), updated_at: r.updated_at };
    },
    backup_save({ p_code, p_data, p_base_updated_at }) {
      if (throttled('fail', 10)) return { ok: false, error: 'too_many_attempts' };
      const r = rows.get(hash(p_code));
      if (!r) { attempts.push('fail'); return { ok: false, error: 'invalid_code' }; }
      if (p_base_updated_at && r.updated_at > p_base_updated_at) return { ok: false, error: 'conflict', data: structuredClone(r.data), updated_at: r.updated_at };
      r.data = p_data;
      r.updated_at = now();
      return { ok: true, updated_at: r.updated_at };
    },
  };
  const fetchFn = async (url, opts) => {
    if (!online) throw new TypeError('Failed to fetch');
    const fn = url.split('/rpc/')[1];
    return { ok: true, status: 200, json: async () => H[fn](JSON.parse(opts.body)) };
  };
  return { rows, attempts, fetchFn, hash, setOnline: (v) => { online = v; } };
}

// Un « appareil » : son état local + son moteur de synchronisation.
function device(server, state) {
  const d = { state, online: true };
  d.sync = createSync({
    getState: () => d.state,
    setState: (s) => { d.state = s; },
    isOnline: () => d.online,
    rpcOpts: { fetchFn: server.fetchFn, url: 'https://exemple.supabase.co', key: 'sb_publishable_test' },
    configured: true,
  });
  return d;
}
const session = (id, km, iso, extra = {}) => ({ id, date: iso, distanceKm: km, plannedKm: 2, durationSec: 900, feeling: 3, pain: false, status: 'complete', updatedAt: iso, ...extra });
const fresh = (code, name = 'Camille') => {
  const s = withProfile(defaultState(), { firstName: name }, new Date('2026-11-16T08:00:00Z'));
  return { ...s, backup: { ...s.backup, code } };
};

describe('code de récupération (§10.1)', () => {
  test('format XXXX-XXXX-XXXX, alphabet sans I ni O', () => {
    for (let i = 0; i < 200; i += 1) {
      const c = generateCode(webcrypto);
      assert.match(c, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
      assert.ok(isValidCode(c));
    }
    assert.equal(ALPHABET.length, 32);
    assert.ok(!/[IO01]/.test(ALPHABET));
  });
  test('tous les caractères sortent (tirage uniforme)', () => {
    const seen = new Set();
    for (let i = 0; i < 300; i += 1) for (const ch of normCode(generateCode(webcrypto))) seen.add(ch);
    assert.equal(seen.size, 32);
  });
  test('saisie tolérante : minuscules, espaces, tirets', () => {
    assert.equal(normCode(' k7m2 9qxp-4tdl '), 'K7M29QXP4TDL');
    assert.equal(formatCode('k7m29qxp4tdl'), 'K7M2-9QXP-4TDL');
    assert.equal(formatCode('k7m2-9q'), 'K7M2-9Q');
    assert.equal(isValidCode('K7M2-9QXP-4TDL'), true);
    assert.equal(isValidCode('K7M2-9QXP-4TD'), false);
    assert.equal(isValidCode('O7M2-9QXP-4TDL'), false, 'pas de O');
  });
});

describe('fusion (§10.3)', () => {
  const t = (h) => `2026-11-16T${String(h).padStart(2, '0')}:00:00.000Z`;
  test('séances : union par id, la plus récente gagne', () => {
    const local = { ...defaultState(), sessions: [session('a', 2, t(8)), session('b', 2.5, t(9), { updatedAt: t(12) })] };
    const remote = { sessions: [session('b', 1.5, t(9), { updatedAt: t(10) }), session('c', 3, t(11))] };
    const m = mergeData(local, remote);
    assert.deepEqual(m.sessions.map((s) => s.id).sort(), ['a', 'b', 'c']);
    assert.equal(m.sessions.find((s) => s.id === 'b').distanceKm, 2.5);
  });
  test('décisions : union par rang (seq), deux « Rester » sur le même palier conservés', () => {
    const d1 = { seq: 1, afterPalierIndex: 1, choice: 'stay', nextKm: 2, nextTarget: 4, decidedAt: t(8) };
    const d2 = { seq: 2, afterPalierIndex: 1, choice: 'stay', nextKm: 2, nextTarget: 4, decidedAt: t(9) };
    const m = mergeData({ ...defaultState(), decisions: [d1] }, { decisions: [d1, d2] });
    assert.equal(m.decisions.length, 2);
  });
  test('profil et réglages : la section la plus récente ; effet verre de l\'appareil conservé', () => {
    const local = { ...defaultState(), profile: { firstName: 'Cam', updatedAt: t(8) }, settings: { stepKm: 0.5, sessionsPerPalier: 4, glass: 'off', updatedAt: t(8) } };
    const remote = { profile: { firstName: 'Camille', updatedAt: t(9) }, settings: { stepKm: 0.7, sessionsPerPalier: 3, glass: 'on', updatedAt: t(9) } };
    const m = mergeData(local, remote);
    assert.equal(m.profile.firstName, 'Camille');
    assert.equal(m.settings.stepKm, 0.7);
    assert.equal(m.settings.glass, 'off');
  });
  test('ui et backup restent locaux ; plan.json, anecdotes, fonds jamais sauvegardés', () => {
    const s = withSession(defaultState(), session('a', 2, t(8)));
    const p = backupPayload(s);
    assert.deepEqual(Object.keys(p).sort(), ['decisions', 'profile', 'schemaVersion', 'sessions', 'settings']);
    assert.ok(JSON.stringify(p).length < 1_000_000);
  });
  test('samePayload ignore l\'ordre et l\'effet verre', () => {
    const a = { profile: null, settings: { glass: 'on' }, sessions: [session('a', 2, t(1)), session('b', 2, t(2))], decisions: [] };
    const b = { profile: null, settings: { glass: 'off' }, sessions: [session('b', 2, t(2)), session('a', 2, t(1))], decisions: [] };
    assert.ok(samePayload(a, b));
  });
});

describe('moteur de synchronisation', () => {
  test('premier lancement : enregistrement du code, puis envoi des séances', async () => {
    const srv = fakeSupabase();
    const A = device(srv, fresh('K7M2-9QXP-4TDL'));
    await A.sync.run();
    assert.equal(A.state.backup.registered, true);
    assert.equal(A.state.backup.status, 'ok');
    A.state = withSession(A.state, session('s1', 2, '2026-11-16T09:00:00Z'));
    assert.equal(A.state.backup.dirty, true);
    await A.sync.run();
    assert.equal(A.state.backup.dirty, false);
    assert.equal(srv.rows.get(srv.hash('K7M29QXP4TDL')).data.sessions.length, 1);
    assert.ok(![...srv.rows.keys()].some((k) => k.includes('K7M2')), 'le code n\'est jamais stocké en clair');
  });

  test('hors ligne : rien n\'est perdu, envoi au retour du réseau (file d\'attente)', async () => {
    const srv = fakeSupabase();
    const A = device(srv, fresh('K7M2-9QXP-4TDL'));
    await A.sync.run();
    A.online = false;
    A.state = withSession(A.state, session('s1', 2, '2026-11-16T09:00:00Z'));
    A.state = withSession(A.state, session('s2', 2, '2026-11-16T10:00:00Z'));
    await A.sync.run();
    assert.equal(A.state.backup.status, 'offline');
    assert.equal(A.state.backup.dirty, true);
    A.online = true;
    await A.sync.run();
    assert.equal(A.state.backup.dirty, false);
    assert.equal(srv.rows.get(srv.hash('K7M29QXP4TDL')).data.sessions.length, 2);
  });

  test('§10.4 n°5 : deux appareils, même code, aucune séance perdue après fusion', async () => {
    const srv = fakeSupabase();
    const A = device(srv, fresh('K7M2-9QXP-4TDL'));
    A.state = withSession(A.state, session('a1', 2, '2026-11-10T09:00:00Z'));
    await A.sync.run();
    // B restaure avec le code de A
    const loaded = await rpc('backup_load', { p_code: 'K7M29QXP4TDL' }, { fetchFn: srv.fetchFn, url: 'https://x', key: 'k' });
    const B = device(srv, { ...mergeData(defaultState(), loaded.data), backup: { ...defaultState().backup, code: 'K7M2-9QXP-4TDL', registered: true, remoteUpdatedAt: loaded.updated_at } });
    // Chacun enregistre une séance, sans s'être synchronisé avec l'autre
    A.state = withSession(A.state, session('a2', 2, '2026-11-12T09:00:00Z'));
    B.state = withSession(B.state, session('b1', 2, '2026-11-13T09:00:00Z'));
    B.state = withDecision(B.state, { seq: 1, afterPalierIndex: 1, choice: 'up', nextKm: 2.5, nextTarget: 4, decidedAt: '2026-11-13T10:00:00Z' });
    await B.sync.run();
    await A.sync.run(); // conflit → fusion → nouvel envoi
    await B.sync.run(); // B récupère ce que A a ajouté
    const ids = (s) => s.sessions.map((x) => x.id).sort();
    assert.deepEqual(ids(A.state), ['a1', 'a2', 'b1']);
    assert.deepEqual(ids(B.state), ['a1', 'a2', 'b1']);
    assert.deepEqual(srv.rows.get(srv.hash('K7M29QXP4TDL')).data.sessions.map((x) => x.id).sort(), ['a1', 'a2', 'b1']);
    assert.equal(A.state.decisions.length, 1);
    assert.equal(A.state.backup.dirty, false);
  });

  test('séparation : le code de B ne donne jamais les séances de A', async () => {
    const srv = fakeSupabase();
    const A = device(srv, fresh('AAAA-BBBB-CCCC', 'Anne'));
    const B = device(srv, fresh('DDDD-EEEE-FFFF', 'Bea'));
    A.state = withSession(A.state, session('a1', 2, '2026-11-10T09:00:00Z'));
    B.state = withSession(B.state, session('b1', 3, '2026-11-10T09:00:00Z'));
    await A.sync.run();
    await B.sync.run();
    const rb = await rpc('backup_load', { p_code: 'DDDDEEEEFFFF' }, { fetchFn: srv.fetchFn, url: 'https://x', key: 'k' });
    assert.deepEqual(rb.data.sessions.map((s) => s.id), ['b1']);
    const bad = await rpc('backup_load', { p_code: 'DDDDEEEEFFFG' }, { fetchFn: srv.fetchFn, url: 'https://x', key: 'k' });
    assert.deepEqual(bad, { ok: false, error: 'invalid_code' });
  });

  test('sauvegarde disparue côté serveur : le code est réenregistré avec les données locales', async () => {
    const srv = fakeSupabase();
    const A = device(srv, fresh('K7M2-9QXP-4TDL'));
    A.state = withSession(A.state, session('a1', 2, '2026-11-10T09:00:00Z'));
    await A.sync.run();
    srv.rows.clear();
    A.state = withSession(A.state, session('a2', 2, '2026-11-11T09:00:00Z'));
    await A.sync.run();
    assert.equal(srv.rows.get(srv.hash('K7M29QXP4TDL')).data.sessions.length, 2);
  });

  test('erreur réseau : statut « erreur », données gardées en local', async () => {
    const srv = fakeSupabase();
    const A = device(srv, fresh('K7M2-9QXP-4TDL'));
    await A.sync.run();
    srv.setOnline(false); // le téléphone croit être en ligne, mais le serveur ne répond pas
    A.state = withSession(A.state, session('a1', 2, '2026-11-10T09:00:00Z'));
    await A.sync.run();
    assert.equal(A.state.backup.status, 'error');
    assert.equal(A.state.backup.dirty, true);
    assert.equal(A.state.sessions.length, 1);
  });

  test('en-têtes : clé publishable en apikey seule, ancienne clé anon (JWT) aussi en Authorization', async () => {
    const seen = [];
    const fetchFn = async (url, o) => { seen.push({ url, h: o.headers }); return { ok: true, json: async () => ({ ok: true }) }; };
    await rpc('backup_load', { p_code: 'X' }, { fetchFn, url: 'https://p.supabase.co/', key: 'sb_publishable_abc' });
    await rpc('backup_load', { p_code: 'X' }, { fetchFn, url: 'https://p.supabase.co', key: 'eyJhbGciOi' });
    assert.equal(seen[0].url, 'https://p.supabase.co/rest/v1/rpc/backup_load');
    assert.equal(seen[0].h.apikey, 'sb_publishable_abc');
    assert.equal(seen[0].h.Authorization, undefined);
    assert.equal(seen[1].h.Authorization, 'Bearer eyJhbGciOi');
  });
});
