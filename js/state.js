// Stockage local de l'état (§6.1). Clé unique `running:v1` dans localStorage.
// M0 : chargement / sauvegarde / valeurs par défaut. M1 complète (migrations testées).

export const STORAGE_KEY = 'running:v1';
export const SCHEMA_VERSION = 1;

export function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: null, // { firstName, city: { name, code, lat, lon } | { name } , updatedAt }
    settings: { stepKm: 0.5, sessionsPerPalier: 4, glass: 'auto', updatedAt: null },
    sessions: [],
    decisions: [],
    ui: {
      lastAnecdoteId: null,
      lastTone: null,
      lastBackground: null,
      lastMilestoneShown: 0,
      codeShown: false,
      lastOpenAt: null,
    },
    backup: { code: null, registered: false, lastSyncAt: null, dirty: false, status: 'idle' },
  };
}

// Migrations successives : MIGRATIONS[n] transforme un état v n → v n+1.
const MIGRATIONS = {};

export function migrate(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  let s = raw;
  let v = Number(s.schemaVersion) || 1;
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`Migration manquante depuis la version ${v}`);
    s = step(s);
    v += 1;
  }
  // Complète les sections absentes sans écraser l'existant.
  return {
    ...base,
    ...s,
    schemaVersion: SCHEMA_VERSION,
    settings: { ...base.settings, ...(s.settings || {}) },
    ui: { ...base.ui, ...(s.ui || {}) },
    backup: { ...base.backup, ...(s.backup || {}) },
    sessions: Array.isArray(s.sessions) ? s.sessions : [],
    decisions: Array.isArray(s.decisions) ? s.decisions : [],
  };
}

export function loadState(storage = globalThis.localStorage) {
  let txt = null;
  try {
    txt = storage?.getItem(STORAGE_KEY);
    return migrate(txt ? JSON.parse(txt) : null);
  } catch (err) {
    // Données illisibles : on en garde une copie avant de repartir d'un état
    // neuf, pour ne jamais écraser définitivement un historique.
    try { if (txt) storage.setItem(`${STORAGE_KEY}:illisible:${Date.now()}`, txt); } catch { /* plein */ }
    console.warn('[state] lecture impossible, copie conservée, état neuf', err.message);
    return defaultState();
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('[state] écriture impossible', err);
    return false;
  }
}

// ---------- Identifiants ----------

// UUID v4. randomUUID n'existe qu'en contexte sécurisé (https, localhost) : repli.
export function newId(cryptoObj = globalThis.crypto) {
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  const b = cryptoObj.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ---------- Mises à jour (renvoient un nouvel état, sans muter l'ancien) ----------

const stamp = (now) => (now instanceof Date ? now : new Date(now ?? Date.now())).toISOString();

export function withSession(state, session) {
  const others = state.sessions.filter((s) => s.id !== session.id);
  return { ...state, sessions: [...others, session], backup: { ...state.backup, dirty: true } };
}

export function withDecision(state, decision) {
  return { ...state, decisions: [...state.decisions, decision], backup: { ...state.backup, dirty: true } };
}

export function withProfile(state, changes, now) {
  return {
    ...state,
    profile: { ...(state.profile || {}), ...changes, updatedAt: stamp(now) },
    backup: { ...state.backup, dirty: true },
  };
}

export function withSettings(state, changes, now) {
  return {
    ...state,
    settings: { ...state.settings, ...changes, updatedAt: stamp(now) },
    backup: { ...state.backup, dirty: true },
  };
}

export function withUi(state, changes) {
  return { ...state, ui: { ...state.ui, ...changes } };
}

// Demande au navigateur de ne pas effacer nos données sous pression d'espace (§6.1, §11).
export async function requestPersist() {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
