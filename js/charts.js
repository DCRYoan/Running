// Graphiques SVG dessinés à la main (§5.12), mêmes proportions que la maquette Stats.
// Fonctions pures : elles renvoient une chaîne SVG.
import { esc } from './ui.js';

const W = 310;
const X0 = 15;
const X1 = 295;
const GRID = '<path d="M15 90H295M15 60H295M15 30H295" stroke="rgba(255,255,255,.8)" stroke-width="1.5"/>';
// Couleur via style (suit le thème du moment : jour / soir)
const label = (x, y, text) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="12" font-weight="700" style="fill:var(--ink-2)" font-family="Nunito, sans-serif">${esc(text)}</text>`;
const r1 = (v) => Math.round(v * 10) / 10;

/** Indices à étiqueter sous l'axe : 1, …, n, au plus 4 étiquettes régulières. */
export function tickIndexes(n, max = 4) {
  if (n <= 0) return [];
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  // Graduations régulières si possible (5 séances → 1, 3, 5 ; 7 → 1, 3, 5, 7).
  for (let k = max; k >= 3; k -= 1) {
    if ((n - 1) % (k - 1) === 0) return Array.from({ length: k }, (_, i) => (i * (n - 1)) / (k - 1));
  }
  const step = (n - 1) / (max - 1);
  return [...new Set(Array.from({ length: max }, (_, i) => Math.round(i * step)))];
}

/**
 * Courbe avec points. `invert` : les petites valeurs en haut (allure : plus haut = plus rapide).
 * Le dernier point est mis en avant (corail).
 */
export function lineChart(values, { color = '#D63A66', invert = false, ariaLabel = '' } = {}) {
  const n = values.length;
  if (!n) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i) => (n === 1 ? (X0 + X1) / 2 : X0 + (i * (X1 - X0)) / (n - 1));
  const y = (v) => {
    const t = max === min ? 0.5 : (v - min) / span;
    return r1(84 - (invert ? 1 - t : t) * 56);
  };
  const pts = values.map((v, i) => [r1(x(i)), y(v)]);
  const dots = n <= 40
    ? pts.slice(0, -1).map(([px, py]) => `<circle cx="${px}" cy="${py}" r="5" fill="${color}"/>`).join('')
    : '';
  const [lx, ly] = pts[n - 1];
  const ticks = tickIndexes(n).map((i) => label(pts[i][0], 106, String(i + 1))).join('');
  const gid = `lc${color.replace('#', '')}`;
  const area = n > 1
    ? `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
       <path d="M${pts.map((p) => p.join(' ')).join(' L')} L${pts[n - 1][0]} 90 L${pts[0][0]} 90 Z" fill="url(#${gid})"/>`
    : '';
  return `<svg viewBox="0 0 ${W} 110" width="100%" height="110" role="img" aria-label="${esc(ariaLabel)}">
    ${GRID}${area}
    <circle cx="${lx}" cy="${ly}" r="12" fill="#FF7A59" opacity=".22"/>
    ${n > 1 ? `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    ${dots}<circle cx="${lx}" cy="${ly}" r="6.5" fill="#FF7A59"/>
    ${ticks}
  </svg>`;
}

/** Barres « sorties par semaine » avec repère pointillé à l'objectif. */
export function weeklyBars(weeks, { goal = 2, fmtLabel, ariaLabel = '' } = {}) {
  const n = weeks.length;
  if (!n) return '';
  const top = Math.max(goal, ...weeks.map((w) => w.count));
  const slot = 290 / n;
  const bw = Math.min(48, slot * 0.64);
  const h = (c) => (c / top) * 60;
  const goalY = r1(70 - h(goal));
  const showLabel = (i) => n <= 4 || i === 0 || i === n - 1 || i % Math.ceil(n / 4) === 0;
  const bars = weeks.map((w, i) => {
    const cx = r1(10 + slot * i + slot / 2);
    const bh = r1(Math.max(w.count ? h(w.count) : 0, w.count ? 6 : 0));
    const fill = w.count >= goal ? '#34C3A8' : '#C9BCE6';
    return `${bh ? `<rect x="${r1(cx - bw / 2)}" y="${r1(70 - bh)}" width="${r1(bw)}" height="${bh}" rx="10" fill="${fill}"/>` : `<rect x="${r1(cx - bw / 2)}" y="66" width="${r1(bw)}" height="4" rx="2" fill="rgba(255,255,255,.9)"/>`}
      ${showLabel(i) ? label(cx, 86, fmtLabel(w.start)) : ''}`;
  }).join('');
  return `<svg viewBox="0 0 ${W} 90" width="100%" height="90" role="img" aria-label="${esc(ariaLabel)}">
    <path d="M10 70H300" stroke="rgba(255,255,255,.8)" stroke-width="1.5"/>
    <path d="M10 ${goalY}H300" stroke="#14705F" stroke-width="1.5" stroke-dasharray="5 6" opacity=".55"/>
    ${bars}
  </svg>`;
}

/**
 * Barres arrondies en dégradé champagne, la dernière en baie avec sa valeur au-dessus.
 * `fmt` met en forme la valeur affichée sur la dernière barre.
 */
export function barChart(values, { fmt = (v) => String(v), ariaLabel = '' } = {}) {
  const n = values.length;
  if (!n) return '';
  const max = Math.max(...values) * 1.18 || 1;
  const slot = (X1 - X0) / n;
  const bw = Math.min(30, slot * 0.62);
  const h = (v) => Math.max(4, (v / max) * 70);
  const ticks = tickIndexes(n);
  const bars = values.map((v, i) => {
    const cx = X0 + slot * i + slot / 2;
    const bh = r1(h(v));
    const last = i === n - 1;
    return `<rect class="bc-bar" style="--k:${i}" x="${r1(cx - bw / 2)}" y="${r1(88 - bh)}" width="${r1(bw)}" height="${bh}" rx="${r1(Math.min(9, bw / 2))}" fill="url(#${last ? 'bc-last' : 'bc-g'})"/>`
      + (last ? `<text x="${r1(cx)}" y="${r1(88 - bh - 7)}" text-anchor="middle" font-size="12" font-weight="900" style="fill:var(--berry-label, #A51E4D)" font-family="Nunito, sans-serif">${esc(fmt(v))}</text>` : '')
      + (ticks.includes(i) ? label(r1(cx), 106, String(i + 1)) : '');
  }).join('');
  return `<svg viewBox="0 0 ${W} 110" width="100%" height="110" role="img" aria-label="${esc(ariaLabel)}">
    <defs>
      <linearGradient id="bc-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DDB9"/><stop offset="1" stop-color="#E9B98A"/></linearGradient>
      <linearGradient id="bc-last" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E04A74"/><stop offset="1" stop-color="#A51E4D"/></linearGradient>
    </defs>
    <path d="M${X0} 88H${X1}" stroke="rgba(255,255,255,.8)" stroke-width="1.5"/>
    ${bars}
  </svg>`;
}
