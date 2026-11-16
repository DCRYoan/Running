// Point d'entrée : routeur, démarrage, détection « nouvelle ouverture » (§4.10),
// effet verre (§9.3), fond (§8.1), service worker (§11).

import { loadState, saveState, requestPersist } from './state.js';
import { staticGlassChecks, measureFps, decideGlass, applyGlass } from './glass.js';
import { pickBackground, loadBackgroundList, applyBackground } from './backgrounds.js';
import { TABS, icon } from './ui.js';

import accueil from './screens/accueil.js';
import seance from './screens/seance.js';
import historique from './screens/historique.js';
import stats from './screens/stats.js';
import reglages from './screens/reglages.js';

const SCREENS = { accueil, seance, historique, stats, reglages };
const HOME = 'accueil';

// Retour au premier plan après plus de 30 min = nouvelle ouverture.
// Pour tester sans attendre : ouvrir l'app avec ?reopenMs=5000 (5 s).
const params = new URLSearchParams(location.search);
const REOPEN_AFTER_MS = Number(params.get('reopenMs')) || 30 * 60 * 1000;

const $app = document.getElementById('app');
const $nav = document.getElementById('tabbar');
const $bg = document.getElementById('bg');

export const app = {
  state: loadState(),
  glass: { reasons: [], fps: null, enabled: true },
  backgrounds: [],
  background: null,
  swReg: null,
  version: '1',

  save() { saveState(this.state); },
  go(route) { location.hash = `#/${route}`; },
  rerender() { render(); },

  setGlassMode(mode) {
    this.state.settings.glass = mode;
    this.state.settings.updatedAt = new Date().toISOString();
    this.save();
    refreshGlass();
  },
};

// ---------- Effet verre ----------
function refreshGlass() {
  const decision = decideGlass(app.state.settings.glass, { reasons: app.glass.reasons, fps: app.glass.fps });
  app.glass.enabled = decision.enabled;
  app.glass.why = decision.reasons;
  applyGlass(decision.enabled);
}

async function probeFps() {
  if (app.state.settings.glass !== 'auto' || !app.glass.enabled) return;
  const fps = await measureFps();
  if (fps !== null) {
    app.glass.fps = fps;
    refreshGlass();
    if (currentRoute() === 'reglages') render();
  }
}

// ---------- Routeur (hash : #/seance, #/reglages…) ----------
function currentRoute() {
  const r = location.hash.replace(/^#\/?/, '').split('?')[0];
  return SCREENS[r] ? r : HOME;
}

function renderNav(active) {
  $nav.innerHTML = TABS.map((t) => `
    <a class="tab" href="#/${t.route}" ${t.route === active ? 'aria-current="page"' : ''}>
      ${icon(t.d)}<span>${t.label}</span>
    </a>`).join('');
}

function render() {
  const route = currentRoute();
  const screen = SCREENS[route];
  const classes = ['screen', screen.nav ? 'has-nav' : '', screen.layout || ''].filter(Boolean).join(' ');
  $app.innerHTML = `<div class="${classes}" data-screen="${route}">${screen.render(app)}</div>`;
  screen.mount?.($app.firstElementChild, app);
  $nav.hidden = !screen.nav;
  if (screen.nav) renderNav(screen.tab || route);
  window.scrollTo(0, 0);
}

// ---------- Ouverture de l'app ----------
async function onOpening({ cold }) {
  app.state.ui.lastOpenAt = new Date().toISOString();

  // Nouveau fond à chaque ouverture, jamais le même que le précédent.
  if (!app.backgrounds.length) app.backgrounds = await loadBackgroundList();
  app.background = pickBackground(app.backgrounds, app.state.ui.lastBackground);
  if (app.background) app.state.ui.lastBackground = app.background.id;
  applyBackground($bg, app.background);
  app.save();

  // Une mise à jour de l'app attend ? On l'applique maintenant (aucune saisie en cours).
  if (applyWaitingUpdate()) return;
  if (!cold) app.swReg?.update().catch(() => {});

  if (currentRoute() !== HOME || !location.hash) location.replace(`#/${HOME}`);
  else render();
}

let hiddenAt = null;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    hiddenAt = Date.now();
    app.save();
  } else if (hiddenAt !== null) {
    const away = Date.now() - hiddenAt;
    hiddenAt = null;
    if (away > REOPEN_AFTER_MS) onOpening({ cold: false });
  }
});

window.addEventListener('hashchange', render);

// ---------- Service worker ----------
let updating = false;

function applyWaitingUpdate() {
  const waiting = app.swReg?.waiting;
  if (!waiting || !navigator.serviceWorker.controller) return false;
  updating = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updating) location.reload();
  });
  try {
    app.swReg = await navigator.serviceWorker.register('./sw.js');
  } catch (err) {
    console.warn('[sw] enregistrement impossible', err);
  }
}

// ---------- Démarrage ----------
async function start() {
  app.glass.reasons = staticGlassChecks();
  refreshGlass();
  await registerServiceWorker();
  await onOpening({ cold: true });
  requestPersist();
  setTimeout(probeFps, 300);
}

start();
