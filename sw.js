// Service worker de Running (§11).
// - Précache versionné de l'application (liste générée par `npm run sw`).
// - Pas de skipWaiting automatique : la nouvelle version s'active à la prochaine
//   ouverture de l'app (app.js envoie SKIP_WAITING au bon moment).
// - Requêtes vers d'autres domaines (Supabase, geo.api.gouv.fr) : jamais mises en cache.

// <precache> — bloc généré par tools/build-sw.mjs, ne pas éditer à la main
const VERSION = 'da4f05643f91';
const PRECACHE = [
  "./",
  "assets/anecdotes/aller-retour-lune.svg",
  "assets/anecdotes/camino.svg",
  "assets/anecdotes/central-park.svg",
  "assets/anecdotes/champs-elysees.svg",
  "assets/anecdotes/copacabana.svg",
  "assets/anecdotes/corniche-kennedy.svg",
  "assets/anecdotes/generic-route.svg",
  "assets/anecdotes/giens.svg",
  "assets/anecdotes/golden-gate.svg",
  "assets/anecdotes/gr20.svg",
  "assets/anecdotes/grand-canal.svg",
  "assets/anecdotes/grande-muraille.svg",
  "assets/anecdotes/lecques-port-alon.svg",
  "assets/anecdotes/lecques-sanary.svg",
  "assets/anecdotes/manhattan-harlem.svg",
  "assets/anecdotes/manhattan-total.svg",
  "assets/anecdotes/marathon.svg",
  "assets/anecdotes/marseille-aubagne.svg",
  "assets/anecdotes/marseille-avignon.svg",
  "assets/anecdotes/marseille-lyon.svg",
  "assets/anecdotes/marseille-montpellier.svg",
  "assets/anecdotes/paris-athenes.svg",
  "assets/anecdotes/paris-berlin.svg",
  "assets/anecdotes/paris-le-caire.svg",
  "assets/anecdotes/paris-lisbonne.svg",
  "assets/anecdotes/paris-londres.svg",
  "assets/anecdotes/paris-lyon.svg",
  "assets/anecdotes/paris-moscou.svg",
  "assets/anecdotes/paris-new-york.svg",
  "assets/anecdotes/paris-rome.svg",
  "assets/anecdotes/paris-sydney.svg",
  "assets/anecdotes/paris-tokyo.svg",
  "assets/anecdotes/plage-lecques.svg",
  "assets/anecdotes/pont-brooklyn.svg",
  "assets/anecdotes/porquerolles.svg",
  "assets/anecdotes/route-66.svg",
  "assets/anecdotes/saint-cyr-aix.svg",
  "assets/anecdotes/saint-cyr-bandol.svg",
  "assets/anecdotes/saint-cyr-cadiere.svg",
  "assets/anecdotes/saint-cyr-castellet.svg",
  "assets/anecdotes/saint-cyr-la-ciotat.svg",
  "assets/anecdotes/saint-cyr-marseille.svg",
  "assets/anecdotes/saint-cyr-nice.svg",
  "assets/anecdotes/saint-cyr-paris.svg",
  "assets/anecdotes/saint-cyr-toulon.svg",
  "assets/anecdotes/sanary-bandol.svg",
  "assets/anecdotes/sanary-brusc.svg",
  "assets/anecdotes/sanary-six-fours.svg",
  "assets/anecdotes/semi-marathon.svg",
  "assets/anecdotes/terre-lune.svg",
  "assets/anecdotes/terre-soleil.svg",
  "assets/anecdotes/toulon-bandol.svg",
  "assets/anecdotes/toulon-cannes.svg",
  "assets/anecdotes/toulon-cassis.svg",
  "assets/anecdotes/toulon-faron.svg",
  "assets/anecdotes/toulon-hyeres.svg",
  "assets/anecdotes/toulon-mourillon.svg",
  "assets/anecdotes/toulon-saint-tropez.svg",
  "assets/anecdotes/tour-du-monde.svg",
  "assets/anecdotes/tour-mont-blanc.svg",
  "assets/anecdotes/versailles.svg",
  "assets/backgrounds/fond-01.webp",
  "assets/backgrounds/fond-02.webp",
  "assets/backgrounds/fond-03.webp",
  "assets/backgrounds/fond-04.webp",
  "assets/backgrounds/fond-05.webp",
  "assets/backgrounds/secours/bg-bottom-hero.svg",
  "assets/backgrounds/secours/bg-top.svg",
  "assets/fonts/nunito-400.woff2",
  "assets/fonts/nunito-600.woff2",
  "assets/fonts/nunito-700.woff2",
  "assets/fonts/nunito-800.woff2",
  "assets/fonts/nunito-900.woff2",
  "assets/icons/apple-touch-icon.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "config.js",
  "css/glass.css",
  "css/screens.css",
  "css/tokens.css",
  "data/anecdotes.json",
  "data/backgrounds.json",
  "data/communes-ref.json",
  "data/messages.json",
  "data/plan.json",
  "index.html",
  "js/anecdotes.js",
  "js/app.js",
  "js/backgrounds.js",
  "js/backup-code.js",
  "js/charts.js",
  "js/city-field.js",
  "js/code-actions.js",
  "js/format.js",
  "js/geo.js",
  "js/glass.js",
  "js/messages.js",
  "js/plan.js",
  "js/screens/accueil.js",
  "js/screens/bienvenue.js",
  "js/screens/celebration.js",
  "js/screens/code.js",
  "js/screens/douleur.js",
  "js/screens/fin-palier.js",
  "js/screens/historique.js",
  "js/screens/incomplete.js",
  "js/screens/modifier.js",
  "js/screens/profil.js",
  "js/screens/programme.js",
  "js/screens/reglages.js",
  "js/screens/repos.js",
  "js/screens/restaurer.js",
  "js/screens/seance.js",
  "js/screens/stats.js",
  "js/state.js",
  "js/sync.js",
  "js/ui.js",
  "js/version.js",
  "manifest.webmanifest"
];
// </precache>

const CACHE = `running-${VERSION}`;
const RUNTIME = 'running-runtime';

self.addEventListener('install', (event) => {
  // cache: 'reload' : on contourne le cache HTTP du navigateur (GitHub Pages sert
  // max-age=600) pour ne jamais figer une ancienne copie d'un fichier dans la
  // nouvelle version.
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('running-') && k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // réseau direct

  // Navigation : toujours la coquille index.html (routage par #).
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = await caches.match('index.html', { cacheName: CACHE });
      if (cached) return cached;
      return fetch(req);
    })());
    return;
  }

  // Fichiers précachés : cache d'abord (versionné).
  // Autres fichiers : cache d'exécution. Images (fonds non précachés) : cache d'abord,
  // elles ne changent pas ; le reste : stale-while-revalidate.
  event.respondWith((async () => {
    const pre = await caches.match(req, { cacheName: CACHE, ignoreSearch: true });
    if (pre) return pre;
    const runtime = await caches.open(RUNTIME);
    const hit = await runtime.match(req, { ignoreSearch: true });
    if (hit && url.pathname.includes('/assets/')) return hit;
    const network = fetch(req).then(async (res) => {
      if (res.ok) {
        await runtime.put(req, res.clone());
        trimRuntime(runtime);
      }
      return res;
    }).catch(() => hit || Response.error());
    return hit || network;
  })());
});

// Le cache d'exécution garde au plus RUNTIME_MAX fichiers (les plus anciens partent).
const RUNTIME_MAX = 60;
async function trimRuntime(cache) {
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - RUNTIME_MAX))) await cache.delete(k);
}
