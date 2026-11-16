// Rotation des fonds d'écran (§8.1). M0 : fond de secours uniquement.
// M4 : tirage dans data/backgrounds.json + préchargement du suivant.

// Fonction pure : un fond au hasard, jamais le même que le précédent.
export function pickBackground(list, lastId, rnd = Math.random) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const pool = list.length > 1 ? list.filter((b) => b.id !== lastId) : list;
  return pool[Math.floor(rnd() * pool.length)] ?? null;
}

export async function loadBackgroundList() {
  try {
    const res = await fetch('data/backgrounds.json', { cache: 'no-cache' });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.backgrounds) ? json.backgrounds : [];
  } catch {
    return [];
  }
}

function showSecours(el) {
  el.classList.add('bg-secours');
  el.style.backgroundImage = '';
  el.style.backgroundPosition = '';
}

/**
 * Affiche le fond une fois l'image chargée. Si elle est introuvable (tout premier
 * lancement hors ligne, image pas encore en cache) : fond de secours (§8.1).
 */
export function applyBackground(el, bg) {
  if (!bg) { showSecours(el); return Promise.resolve(false); }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      el.classList.remove('bg-secours');
      el.style.backgroundImage = `url("${bg.file}")`;
      el.style.backgroundPosition = bg.position || '50% 50%';
      resolve(true);
    };
    img.onerror = () => { showSecours(el); resolve(false); };
    img.src = bg.file;
  });
}

/** Précharge un fond probable pour la prochaine ouverture (mis en cache par le service worker). */
export function preloadNext(list, currentId, rnd = Math.random) {
  const next = pickBackground(list, currentId, rnd);
  if (next) { const img = new Image(); img.src = next.file; }
  return next;
}
