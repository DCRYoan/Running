// Sauvegarde en ligne Supabase (§10.3) : appels RPC par fetch (aucune bibliothèque),
// file d'attente hors ligne, fusion en cas de conflit entre appareils.
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';
import { generateCode } from './backup-code.js';

export const isConfigured = (url = SUPABASE_URL, key = SUPABASE_KEY) => Boolean(url && key);

// ---------- Données sauvegardées : profil, réglages, séances, décisions (pas les données publiques) ----------

export function backupPayload(state) {
  return {
    schemaVersion: state.schemaVersion,
    profile: state.profile,
    settings: state.settings,
    sessions: state.sessions,
    decisions: state.decisions,
  };
}

const time = (iso) => (iso ? new Date(iso).getTime() : 0);
const newest = (a, b, key = 'updatedAt') => {
  if (!a) return b ?? null;
  if (!b) return a;
  return time(b[key]) > time(a[key]) ? b : a; // égalité : la version locale
};
const decisionKey = (d) => (d.seq != null ? `seq:${d.seq}` : `p:${d.afterPalierIndex}:${d.decidedAt}`);

/**
 * Fusion (§10.3) : séances = union par id (la plus récente si même id) ;
 * décisions = union par rang (la plus récente) ; profil et réglages = la section la plus récente.
 * L'effet verre reste celui de l'appareil. ui et backup restent locaux.
 */
export function mergeData(local, remote) {
  const r = remote || {};
  const sessions = new Map();
  for (const s of [...(local.sessions || []), ...(r.sessions || [])]) sessions.set(s.id, newest(sessions.get(s.id), s));
  const decisions = new Map();
  for (const d of [...(local.decisions || []), ...(r.decisions || [])]) {
    const k = decisionKey(d);
    decisions.set(k, newest(decisions.get(k), d, 'decidedAt'));
  }
  const settings = newest(local.settings, r.settings);
  return {
    ...local,
    profile: newest(local.profile, r.profile),
    settings: { ...settings, glass: local.settings?.glass ?? settings?.glass ?? 'auto' },
    sessions: [...sessions.values()],
    decisions: [...decisions.values()],
  };
}

/** Les deux jeux de données sont-ils identiques (sans tenir compte de l'ordre) ? */
export function samePayload(a, b) {
  const norm = (p) => JSON.stringify({
    profile: p.profile ?? null,
    settings: { ...(p.settings || {}), glass: undefined },
    sessions: [...(p.sessions || [])].sort((x, y) => String(x.id).localeCompare(String(y.id))),
    decisions: [...(p.decisions || [])].sort((x, y) => decisionKey(x).localeCompare(decisionKey(y))),
  });
  return norm(a) === norm(b);
}

// ---------- Appel RPC ----------

export async function rpc(fn, body, { fetchFn = globalThis.fetch, url = SUPABASE_URL, key = SUPABASE_KEY, timeoutMs = 12000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers = { 'Content-Type': 'application/json', apikey: key };
    // Ancienne clé « anon » (JWT) : aussi en Authorization. Nouvelle clé « publishable » : apikey suffit.
    if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
    const res = await fetchFn(`${url.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
      method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal,
    });
    if (!res.ok) {
      const err = new Error(`${fn} : HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const loadBackup = (code, opts) => rpc('backup_load', { p_code: code }, opts);

// ---------- Moteur de synchronisation ----------

const RETRY = [15e3, 60e3, 5 * 60e3, 15 * 60e3];
// Minuteur qui n'empêche pas Node de s'arrêter (tests) ; sans effet dans le navigateur.
const later = (fn, ms) => { const t = setTimeout(fn, ms); t?.unref?.(); return t; };

/**
 * @param {object} o
 * @param {() => object} o.getState
 * @param {(state: object, opts?: { data?: boolean }) => void} o.setState
 * @param {() => boolean} [o.isOnline]
 * @param {object} [o.rpcOpts] options passées à rpc (tests : fetchFn, url, key)
 */
export function createSync({ getState, setState, isOnline = () => navigator.onLine, rpcOpts = {}, configured = isConfigured() }) {
  let running = false;
  let again = false;
  let debounce = null;
  let retryTimer = null;
  let attempt = 0;

  const patchBackup = (changes, extra = {}) => {
    const s = getState();
    setState({ ...s, ...extra, backup: { ...s.backup, ...changes } }, { data: 'sessions' in extra });
  };
  const call = (fn, body) => rpc(fn, body, rpcOpts);
  const now = () => new Date().toISOString();

  async function step() {
    const s = getState();
    const b = s.backup;
    if (!b.code || !s.profile) return; // rien à sauvegarder avant le premier lancement
    const payload = backupPayload(s);

    if (!b.registered) {
      const r = await call('backup_register', { p_code: b.code, p_data: payload });
      if (r.ok) {
        patchBackup({ registered: true, remoteUpdatedAt: r.updated_at, dirty: false, lastSyncAt: now(), status: 'ok' });
      } else if (r.error === 'code_taken' && !s.ui.codeShown) {
        patchBackup({ code: generateCode() }); // quasi impossible : on en tire un autre
        again = true;
      } else {
        throw Object.assign(new Error(r.error), { server: r.error });
      }
      return;
    }

    if (b.dirty) {
      const r = await call('backup_save', { p_code: b.code, p_data: payload, p_base_updated_at: b.remoteUpdatedAt ?? null });
      if (r.ok) {
        // Si l'état a encore changé pendant l'envoi, on garde dirty pour un nouvel envoi.
        const changed = !samePayload(backupPayload(getState()), payload);
        patchBackup({ remoteUpdatedAt: r.updated_at, dirty: changed, lastSyncAt: now(), status: 'ok' });
        if (changed) again = true;
      } else if (r.error === 'conflict') {
        // Un autre appareil a écrit entre-temps : fusion puis nouvel envoi.
        const merged = mergeData(getState(), r.data);
        setState({ ...merged, backup: { ...merged.backup, remoteUpdatedAt: r.updated_at, dirty: true } }, { data: true });
        again = true;
      } else if (r.error === 'invalid_code') {
        patchBackup({ registered: false }); // sauvegarde disparue côté serveur : on la recrée
        again = true;
      } else {
        throw Object.assign(new Error(r.error), { server: r.error });
      }
      return;
    }

    // Rien à envoyer : on vérifie si un autre appareil a écrit (et on garde le projet actif).
    const r = await call('backup_load', { p_code: b.code });
    if (r.ok) {
      if (r.updated_at !== b.remoteUpdatedAt) {
        const merged = mergeData(getState(), r.data);
        const needPush = !samePayload(backupPayload(merged), r.data);
        setState({ ...merged, backup: { ...merged.backup, remoteUpdatedAt: r.updated_at, dirty: needPush, lastSyncAt: now(), status: 'ok' } }, { data: true });
        if (needPush) again = true;
      } else {
        patchBackup({ lastSyncAt: now(), status: 'ok' });
      }
    } else if (r.error === 'invalid_code') {
      patchBackup({ registered: false });
      again = true;
    } else {
      throw Object.assign(new Error(r.error), { server: r.error });
    }
  }

  async function run() {
    if (!configured) return;
    if (running) { again = true; return; }
    if (!isOnline()) { patchBackup({ status: 'offline' }); return; }
    running = true;
    clearTimeout(retryTimer);
    try {
      let guard = 0;
      do {
        again = false;
        await step();
        guard += 1;
      } while (again && guard < 5);
      attempt = 0;
    } catch (err) {
      console.warn('[sync]', err.message);
      patchBackup({ status: isOnline() ? 'error' : 'offline' });
      retryTimer = later(run, RETRY[Math.min(attempt, RETRY.length - 1)]);
      attempt += 1;
    } finally {
      running = false;
    }
  }

  return {
    run,
    /** Anti-rebond : plusieurs modifications rapprochées = un seul envoi. */
    schedule(delay = 1500) {
      clearTimeout(debounce);
      debounce = later(run, delay);
    },
    get configured() { return configured; },
    stop() { clearTimeout(debounce); clearTimeout(retryTimer); },
  };
}
