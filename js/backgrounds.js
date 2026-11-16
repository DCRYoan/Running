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

export function applyBackground(el, bg) {
  if (!bg) {
    el.classList.add('bg-secours');
    el.style.backgroundImage = '';
    el.style.backgroundPosition = '';
    return;
  }
  el.classList.remove('bg-secours');
  el.style.backgroundImage = `url("${bg.file}")`;
  el.style.backgroundPosition = bg.position || '50% 50%';
}
