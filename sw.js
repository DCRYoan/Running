// Service worker de Running (§11).
// - Précache versionné de l'application (liste générée par `npm run sw`).
// - Pas de skipWaiting automatique : la nouvelle version s'active à la prochaine
//   ouverture de l'app (app.js envoie SKIP_WAITING au bon moment).
// - Requêtes vers d'autres domaines (Supabase, geo.api.gouv.fr) : jamais mises en cache.

// <precache> — bloc généré par tools/build-sw.mjs, ne pas éditer à la main
const VERSION = '17825b6fc2f7';
const PRECACHE = [
  "./",
  "assets/backgrounds/secours/bg-bottom-hero.svg",
  "assets/backgrounds/secours/bg-top.svg",
  "assets/fonts/nunito-400.woff2",
  "assets/fonts/nunito-600.woff2",
  "assets/fonts/nunito-700.woff2",
  "assets/fonts/nunito-800.woff2",
  "assets/fonts/nunito-900.woff2",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "config.js",
  "css/glass.css",
  "css/screens.css",
  "css/tokens.css",
  "data/backgrounds.json",
  "index.html",
  "js/app.js",
  "js/backgrounds.js",
  "js/glass.js",
  "js/screens/accueil.js",
  "js/screens/historique.js",
  "js/screens/reglages.js",
  "js/screens/seance.js",
  "js/screens/stats.js",
  "js/state.js",
  "js/ui.js",
  "manifest.webmanifest"
];
// </precache>

const CACHE = `running-${VERSION}`;
const RUNTIME = 'running-runtime';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
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
  // Autres fichiers (fonds non précachés…) : stale-while-revalidate dans le cache d'exécution.
  event.respondWith((async () => {
    const pre = await caches.match(req, { cacheName: CACHE, ignoreSearch: true });
    if (pre) return pre;
    const runtime = await caches.open(RUNTIME);
    const hit = await runtime.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => {
      if (res.ok) runtime.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || network;
  })());
});
