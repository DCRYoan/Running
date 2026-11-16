// Tests de séparation des données (§10.4) contre le VRAI projet Supabase.
// Usage : node tools/test-separation.mjs      (lit l'URL et la clé publique dans config.js)
//
// Crée deux sauvegardes de test (profils « Test A » et « Test B », aucune donnée réelle).
// Le test n°3 bloque volontairement ta connexion pendant 1 minute (limite anti-abus) :
// il est lancé en dernier.

import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';
import { rpc, createSync, mergeData } from '../js/sync.js';
import { generateCode, normCode } from '../js/backup-code.js';
import { defaultState, withSession, withProfile } from '../js/state.js';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('config.js : SUPABASE_URL et SUPABASE_KEY sont vides.');
  process.exit(1);
}
const opts = { url: SUPABASE_URL, key: SUPABASE_KEY };
const call = (fn, body) => rpc(fn, body, opts);
let failures = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? '✔' : '✖'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!cond) failures += 1;
};
const session = (id, iso) => ({ id, date: iso, distanceKm: 2, plannedKm: 2, durationSec: 900, feeling: 3, pain: false, status: 'complete', updatedAt: iso });
const makeState = (name, code, ids) => {
  let s = withProfile(defaultState(), { firstName: name });
  ids.forEach((id, i) => { s = withSession(s, session(id, new Date(Date.UTC(2026, 10, 1 + i, 9)).toISOString())); });
  return { ...s, backup: { ...s.backup, code } };
};
const device = (state) => {
  const d = { state };
  d.sync = createSync({ getState: () => d.state, setState: (s) => { d.state = s; }, isOnline: () => true, rpcOpts: opts, configured: true });
  return d;
};

const codeA = generateCode();
const codeB = generateCode();
console.log(`Projet : ${SUPABASE_URL}\nCodes de test : A = ${codeA}, B = ${codeB}\n`);

// Préparation : deux profils A et B
const A = device(makeState('Test A', codeA, ['a1', 'a2', 'a3']));
const B = device(makeState('Test B', codeB, ['b1', 'b2']));
await A.sync.run();
await B.sync.run();
check(A.state.backup.registered && B.state.backup.registered, 'Préparation : profils A et B sauvegardés', `statuts ${A.state.backup.status} / ${B.state.backup.status}`);

// 1. Lire A avec le code de B : on n'obtient que B ; un code voisin de A est refusé
const withB = await call('backup_load', { p_code: codeB });
check(withB.ok && withB.data.sessions.every((s) => s.id.startsWith('b')), 'Test 1a : le code de B ne donne que les séances de B', withB.data?.sessions.map((s) => s.id).join(', '));
const near = normCode(codeA).slice(0, 11) + (normCode(codeA)[11] === 'A' ? 'B' : 'A');
const wrong = await call('backup_load', { p_code: near });
check(!wrong.ok && wrong.error === 'invalid_code' && !wrong.data, 'Test 1b : un code faux est refusé (invalid_code), aucune donnée', JSON.stringify(wrong));

// 2. Accès direct aux tables avec la clé publique : refusé
const headers = { apikey: SUPABASE_KEY, ...(SUPABASE_KEY.startsWith('eyJ') ? { Authorization: `Bearer ${SUPABASE_KEY}` } : {}) };
for (const table of ['backups', 'backup_attempts']) {
  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?select=*`, { headers });
  const body = await res.text();
  check(!res.ok || body.trim() === '[]', `Test 2 : lecture directe de « ${table} » refusée`, `HTTP ${res.status} ${body.slice(0, 80)}`);
}
const ins = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/backups`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ code_hash: 'x', data: {} }) });
check(!ins.ok, 'Test 2 : écriture directe dans « backups » refusée', `HTTP ${ins.status}`);
const internal = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/code_hash`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ p: 'x' }) });
check(!internal.ok, 'Test 2 : fonctions internes inaccessibles', `HTTP ${internal.status}`);

// 4. Restaurer A sur un navigateur vierge : toutes les séances de A, aucune de B
const restored = await call('backup_load', { p_code: codeA });
const blank = mergeData(defaultState(), restored.data);
check(blank.sessions.map((s) => s.id).sort().join() === 'a1,a2,a3' && blank.profile.firstName === 'Test A', 'Test 4 : restauration de A sur un appareil vierge = toutes les séances de A, aucune de B', blank.sessions.map((s) => s.id).join(', '));

// 5. Deux appareils avec le même code : aucune séance perdue après fusion
const A2 = device({ ...blank, backup: { ...defaultState().backup, code: codeA, registered: true, remoteUpdatedAt: restored.updated_at } });
A.state = withSession(A.state, session('a4', '2026-11-10T09:00:00Z'));
A2.state = withSession(A2.state, session('a5', '2026-11-11T09:00:00Z'));
await A2.sync.run();
await A.sync.run(); // conflit → fusion → renvoi
await A2.sync.run();
const final = await call('backup_load', { p_code: codeA });
const ids = (list) => list.map((s) => s.id).sort().join();
check(ids(final.data.sessions) === 'a1,a2,a3,a4,a5' && ids(A.state.sessions) === ids(A2.state.sessions), 'Test 5 : deux appareils, même code, aucune séance perdue', ids(final.data.sessions));

// 3. Onze faux codes d'affilée depuis la même source : too_many_attempts
let last;
for (let i = 0; i < 11; i += 1) last = await call('backup_load', { p_code: generateCode() });
check(last.error === 'too_many_attempts', 'Test 3 : 11 faux codes d\'affilée → too_many_attempts', JSON.stringify(last));
console.log('\n(ta connexion est bloquée 1 minute pour la lecture : c\'est la protection qui fonctionne)');

console.log(failures ? `\n${failures} test(s) en échec` : '\nTous les tests de séparation passent.');
process.exit(failures ? 1 : 0);
