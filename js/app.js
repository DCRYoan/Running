// Point d'entrée : routeur, démarrage, détection « nouvelle ouverture » (§4.10),
// enchaînement des écrans après une séance, effet verre (§9.3), fond (§8.1),
// service worker (§11).

import { loadState, saveState, requestPersist, newId, withSession, withDecision, withProfile, withSettings, withUi } from './state.js';
import { replay, totals, buildSession, editSession, makeDecision, crossedMilestone, isWeekDone, sessionsInWeek, milestoneProgress } from './plan.js';
import { toLocalIso } from './format.js';
import { welcomeContext, pickWelcome, pickVariant } from './messages.js';
import { pickAnecdote } from './anecdotes.js';
import { resolveCity, isResolved } from './geo.js';
import { staticGlassChecks, measureFps, decideGlass, applyGlass } from './glass.js';
import { pickBackground, loadBackgroundList, applyBackground, preloadNext } from './backgrounds.js';
import { TABS, icon, frenchSpacing } from './ui.js';

import bienvenue from './screens/bienvenue.js';
import accueil from './screens/accueil.js';
import seance from './screens/seance.js';
import douleur from './screens/douleur.js';
import celebration from './screens/celebration.js';
import incomplete from './screens/incomplete.js';
import repos from './screens/repos.js';
import finPalier from './screens/fin-palier.js';
import historique from './screens/historique.js';
import modifier from './screens/modifier.js';
import stats from './screens/stats.js';
import reglages from './screens/reglages.js';
import profil from './screens/profil.js';
import programme from './screens/programme.js';
import { placeholder } from './screens/placeholder.js';

const SCREENS = {
  bienvenue, accueil, seance, douleur, celebration, incomplete, repos,
  'fin-palier': finPalier, historique, modifier, stats, reglages, profil, programme,
  restaurer: placeholder('Retrouver ma progression', 'La restauration par code arrive au jalon M5.', { back: 'bienvenue' }),
};
const HOME = 'accueil';
const FLOW_SCREENS = new Set(['douleur', 'celebration', 'incomplete']);

// Retour au premier plan après plus de 30 min = nouvelle ouverture.
// Pour tester sans attendre : ouvrir l'app avec ?reopenMs=5000 (5 s).
const params = new URLSearchParams(location.search);
const REOPEN_AFTER_MS = Number(params.get('reopenMs')) || 30 * 60 * 1000;

const $app = document.getElementById('app');
const $nav = document.getElementById('tabbar');
const $bg = document.getElementById('bg');

export const app = {
  state: loadState(),
  data: { plan: null, messages: null },
  glass: { reasons: [], fps: null, enabled: true },
  backgrounds: [],
  background: null,
  swReg: null,
  version: '1',
  welcome: null, // message d'accueil tiré pour cette ouverture
  flow: null, // écrans à enchaîner après l'enregistrement d'une séance
  extraSession: false, // « Faire une séance en plus » depuis l'écran Repos
  draft: {}, // saisie en cours de l'écran Séance

  save() { saveState(this.state); },
  set(next) { this.state = next; this.save(); },
  go(route, { replace = false } = {}) {
    const hash = `#/${route}`;
    if (replace) location.replace(hash);
    else location.hash = hash;
  },
  rerender() { render(); },

  /** Données recalculées depuis l'historique (règle d'or §3). */
  derived() {
    const { plan } = this.data;
    const s = this.state.sessions;
    const result = replay(s, this.state.decisions, plan);
    const t = totals(s);
    return {
      result,
      totals: t,
      milestone: milestoneProgress(t.km, plan.milestoneEveryKm),
      week: sessionsInWeek(s),
      weekDone: isWeekDone(s, new Date(), plan.sessionsPerWeek),
    };
  },

  /** Message d'accueil : tiré une fois par ouverture, jamais le même deux fois de suite. */
  getWelcome() {
    if (!this.welcome) {
      const d = this.derived();
      const ctx = welcomeContext({ sessions: this.state.sessions, weekDone: d.weekDone, milestoneRemaining: d.milestone.remaining });
      this.welcome = pickWelcome(ctx, this.data.messages, this.state.ui.lastWelcome);
      this.set(withUi(this.state, { lastWelcome: this.welcome }));
    }
    return this.welcome;
  },

  /**
   * Nouvelle anecdote (§7.4) : jamais la même deux fois de suite, tons qui alternent,
   * une sur trois depuis la ville. Mémorise le tirage dans ui.
   */
  drawAnecdote(total) {
    const ui = this.state.ui;
    const res = pickAnecdote({
      total,
      data: this.data.anecdotes,
      communes: this.data.communes,
      city: this.state.profile?.city,
      lastId: ui.lastAnecdoteId,
      lastTone: ui.lastTone,
      count: ui.anecdoteCount || 0,
    });
    if (res.kind === 'anecdote') {
      this.set(withUi(this.state, { lastAnecdoteId: res.anecdote.id, lastTone: res.tone, anecdoteCount: (ui.anecdoteCount || 0) + 1 }));
    }
    return res;
  },

  /** Anecdote de l'Accueil : tirée une fois par ouverture. */
  getAnecdote() {
    if (!this.anecdote) this.anecdote = this.drawAnecdote(this.derived().totals.km);
    return this.anecdote;
  },

  /** Bouton « Séance » / « Voir ma séance » : Repos si la semaine est faite (§4.6). */
  openSession() { this.go('seance'); },

  setGlassMode(mode) {
    this.state.settings.glass = mode;
    this.state.settings.updatedAt = new Date().toISOString();
    this.save();
    refreshGlass();
  },

  saveProfile({ firstName, city }) {
    this.set(withProfile(this.state, { firstName, city }));
    resolvePendingCity();
  },

  /** Enregistre une séance puis enchaîne : douleur → célébration/incomplète → fin de palier → Séance. */
  recordSession(input) {
    const { plan, messages } = this.data;
    const before = totals(this.state.sessions).km;
    const result = replay(this.state.sessions, this.state.decisions, plan);
    const session = buildSession(input, result, plan, { id: newId(), date: toLocalIso(new Date()) });
    this.set(withSession(this.state, session));
    this.draft = {};
    this.extraSession = false;
    this.welcome = null; // l'Accueil reflétera cette nouvelle sortie

    const after = totals(this.state.sessions).km;
    const crossed = crossedMilestone(before, after, plan.milestoneEveryKm);
    // Phrase d'encouragement : seulement pour l'écran Bravo (qui l'affiche), jamais deux fois de suite.
    const encouragement = session.status === 'complete' ? pickVariant(messages.encouragements, this.state.ui.lastEncouragement) : null;
    this.set(withUi(this.state, {
      ...(encouragement ? { lastEncouragement: encouragement } : {}),
      ...(crossed ? { lastMilestoneShown: crossed } : {}),
    }));

    const steps = [];
    if (session.pain) steps.push('douleur');
    steps.push(session.status === 'complete' ? 'celebration' : 'incomplete');
    if (this.derived().result.state === 'awaiting_decision') steps.push('fin-palier');
    const anecdote = session.status === 'complete' ? this.drawAnecdote(after) : null;
    this.anecdote = null; // l'Accueil en tirera une nouvelle
    this.flow = { steps, i: 0, ctx: { sessionId: session.id, crossed, totalKm: after, encouragement, anecdote } };
    this.go(steps[0]);
  },

  /** Choix de fin de palier (§4.1) : les réglages actuels sont figés dans la décision. */
  decidePalier(choice) {
    const r = this.derived().result;
    if (r.state !== 'awaiting_decision') return;
    const d = makeDecision(r, choice, this.state.settings, this.state.decisions);
    this.set(withDecision(this.state, d));
    if (this.flow) this.nextStep();
    else this.go('seance', { replace: true });
  },

  /** Modification d'une séance (§5.11) : statut recalculé, puis tout le plan via replay. */
  updateSession(id, changes) {
    const s = this.state.sessions.find((x) => x.id === id);
    if (!s) return;
    this.set(withSession(this.state, editSession(s, changes, this.data.plan)));
    this.welcome = null;
  },

  updateSettings(changes) {
    this.set(withSettings(this.state, changes));
  },

  /** Paramètres après « ? » dans le hash : #/modifier?id=… */
  params() {
    return new URLSearchParams(location.hash.split('?')[1] || '');
  },

  /** Écran précédent (pour les boutons « Retour »). */
  prevRoute: null,

  /** Écran suivant de l'enchaînement, puis l'entrée Séance (qui affiche Repos si besoin). */
  nextStep() {
    const f = this.flow;
    if (f && f.i + 1 < f.steps.length) {
      f.i += 1;
      this.go(f.steps[f.i], { replace: true });
      return;
    }
    this.flow = null;
    this.go('seance', { replace: true });
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

// ---------- Ville saisie hors ligne : résolue dès que le réseau revient (§12) ----------
async function resolvePendingCity() {
  const city = app.state.profile?.city;
  if (!city?.name || isResolved(city) || !navigator.onLine) return;
  try {
    const found = await resolveCity(city.name);
    if (found) app.set(withProfile(app.state, { city: { name: found.name, code: found.code, lat: found.lat, lon: found.lon } }));
  } catch { /* on réessaiera */ }
}
window.addEventListener('online', resolvePendingCity);

// ---------- Routeur (hash : #/seance, #/reglages…) ----------
function currentRoute() {
  const r = location.hash.replace(/^#\/?/, '').split('?')[0];
  return SCREENS[r] ? r : HOME;
}

// Redirections : premier lancement, Repos, fin de palier, écrans d'enchaînement.
function guard(route) {
  const hasProfile = Boolean(app.state.profile?.firstName);
  if (!hasProfile && route !== 'bienvenue' && route !== 'restaurer') return 'bienvenue';
  if (hasProfile && route === 'bienvenue') return HOME;
  if (FLOW_SCREENS.has(route) && !app.flow) return HOME;
  if (route === 'modifier' && !app.state.sessions.some((s) => s.id === app.params().get('id'))) return 'historique';
  if (route === 'fin-palier' && app.derived().result.state !== 'awaiting_decision') return 'seance';
  if (route === 'seance' || route === 'repos') {
    const d = app.derived();
    if (d.result.state === 'awaiting_decision') return 'fin-palier';
    if (route === 'seance' && d.weekDone && !app.extraSession) return 'repos';
    if (route === 'repos' && !d.weekDone) return 'seance';
  }
  return route;
}

function renderNav(active) {
  $nav.innerHTML = TABS.map((t) => `
    <a class="tab" href="#/${t.route}" ${t.route === active ? 'aria-current="page"' : ''}>
      ${icon(t.d)}<span>${t.label}</span>
    </a>`).join('');
}

let lastRendered = null;

function render() {
  const asked = currentRoute();
  const route = guard(asked);
  if (route !== asked) { app.go(route, { replace: true }); return; }
  if (lastRendered && lastRendered !== route) app.prevRoute = lastRendered;
  lastRendered = route;
  const screen = SCREENS[route];
  const classes = ['screen', screen.nav ? 'has-nav' : '', screen.layout || ''].filter(Boolean).join(' ');
  $app.innerHTML = `<div class="${classes}" data-screen="${route}">${screen.render(app)}</div>`;
  frenchSpacing($app);
  screen.mount?.($app.firstElementChild, app);
  $nav.hidden = !screen.nav;
  if (screen.nav) renderNav(screen.tab || route);
  window.scrollTo(0, 0);
}

// ---------- Ouverture de l'app ----------
async function onOpening({ cold }) {
  app.state.ui.lastOpenAt = new Date().toISOString();
  app.extraSession = false;
  app.flow = null;

  // Nouveau fond à chaque ouverture, jamais le même que le précédent.
  if (!app.backgrounds.length) app.backgrounds = await loadBackgroundList();
  app.background = pickBackground(app.backgrounds, app.state.ui.lastBackground);
  if (app.background) app.state.ui.lastBackground = app.background.id;
  applyBackground($bg, app.background).then(() => preloadNext(app.backgrounds, app.background?.id));

  app.welcome = null; // retiré au prochain affichage de l'Accueil
  app.anecdote = null;
  app.save();

  // Une mise à jour de l'app attend ? On l'applique maintenant (aucune saisie en cours).
  if (applyWaitingUpdate()) return;
  if (!cold) app.swReg?.update().catch(() => {});
  resolvePendingCity();

  if (currentRoute() !== HOME || !location.hash) app.go(HOME, { replace: true });
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
async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} : ${res.status}`);
  return res.json();
}

async function start() {
  app.glass.reasons = staticGlassChecks();
  refreshGlass();
  [app.data.plan, app.data.messages, app.data.anecdotes] = await Promise.all([
    loadJson('data/plan.json'), loadJson('data/messages.json'), loadJson('data/anecdotes.json'),
  ]);
  // Communes de référence : seulement utiles aux anecdotes « depuis ta ville ».
  app.data.communes = [];
  loadJson('data/communes-ref.json').then((j) => { app.data.communes = j.communes; }).catch(() => {});
  await registerServiceWorker();
  await onOpening({ cold: true });
  requestPersist();
  setTimeout(probeFps, 300);
}

start().catch((err) => {
  console.error(err);
  $app.innerHTML = '<div class="screen"><h1 class="h1">Oups.</h1><p class="lead">Running n\'a pas pu démarrer. Ferme l\'app et rouvre-la.</p></div>';
});
