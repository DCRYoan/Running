// Écran d'ouverture « Monogramme » (2,0 s). Le balisage est dans index.html pour s'afficher
// dès le premier rendu ; l'animation est en CSS (screens.css). Ce module le masque à la fin,
// le passe sur un appui, et le rejoue à chaque nouvelle ouverture (retour après 30 min).

const KEY = 'running:splashAt';
const $splash = () => document.getElementById('splash');

function hide(el) {
  el.hidden = true;
  el.classList.remove('play', 'skip');
}

function arm(el) {
  // Fin du fondu (ou de l'appui) : on retire l'écran ; filet de sécurité si l'événement manque.
  clearTimeout(el._t);
  el._t = setTimeout(() => hide(el), 2600);
  el.onanimationend = (e) => {
    if (e.target === el && (e.animationName === 'splash-out' || e.animationName === 'splash-skip')) {
      clearTimeout(el._t);
      hide(el);
    }
  };
  el.onclick = () => el.classList.add('skip');
}

function remember() {
  try { sessionStorage.setItem(KEY, String(Date.now())); } catch { /* stockage indisponible */ }
}

/** Lancement à froid : l'écran est déjà affiché par index.html. */
export function initSplash() {
  const el = $splash();
  if (!el) return;
  // Rechargement juste après une ouverture (mise à jour appliquée) : pas de deuxième écran.
  let last = 0;
  try { last = Number(sessionStorage.getItem(KEY)) || 0; } catch { /* idem */ }
  if (Date.now() - last < 10000) { hide(el); return; }
  remember();
  arm(el);
}

/** Nouvelle ouverture sans rechargement (retour après une longue absence). */
export function replaySplash() {
  const el = $splash();
  if (!el) return;
  el.hidden = false;
  el.classList.remove('play', 'skip');
  void el.offsetWidth; // relance les animations CSS
  el.classList.add('play');
  remember();
  arm(el);
}
