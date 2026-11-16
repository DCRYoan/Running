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
  try {
    const txt = storage?.getItem(STORAGE_KEY);
    return migrate(txt ? JSON.parse(txt) : null);
  } catch (err) {
    console.error('[state] lecture impossible, état neuf', err);
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

// Demande au navigateur de ne pas effacer nos données sous pression d'espace (§6.1, §11).
export async function requestPersist() {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
