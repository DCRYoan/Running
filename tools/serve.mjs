// Petit serveur statique pour tester en local (aucune dépendance).
// Usage : node tools/serve.mjs [port]   → http://localhost:8080/
// Le service worker est servi en mode « dev » (pas de cache) pour voir les
// modifications immédiatement ; la version mise en ligne garde le vrai précache.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.argv[2] || process.env.PORT || 8080);
// --prod : sert le vrai service worker (précache), pour tester le hors-ligne et les mises à jour.
const PROD = process.argv.includes('--prod');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(normalize(ROOT)) || file.includes('node_modules')) throw new Error('interdit');
    await stat(file);
    let body = await readFile(file);
    if (path === '/sw.js' && !PROD) {
      body = body.toString('utf8').replace(
        /\/\/ <precache>[\s\S]*?\/\/ <\/precache>/,
        "const VERSION = 'dev';\nconst PRECACHE = [];",
      ).replace("if (req.method !== 'GET') return;", "if (req.method !== 'GET' || VERSION === 'dev') return;");
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Introuvable');
  }
}).listen(PORT, () => console.log(`Running : http://localhost:${PORT}/`));
