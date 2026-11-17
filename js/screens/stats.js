// Statistiques — maquette Stats (§5.12), présentée en « bento » : des tuiles de tailles différentes
// selon leur importance. Toutes les sorties comptent (complètes ou non).
// Tuiles sans flou (.lt) : tuiles + 3 graphiques dépasseraient ~6 éléments floutés (§9.3).
import { esc, countUp, glossyIcon } from '../ui.js';
import { fmtKm1, fmtKm2, fmtHMin, fmtDuration, fmtPace, paceSec, fmtDayMonth, plural } from '../format.js';
import { sortSessions, weeklyCounts } from '../plan.js';
import { lineChart, weeklyBars, barChart } from '../charts.js';

const r1 = (v) => Math.round(v * 10) / 10;

/** Mini-courbe d'allure (plus haut = plus rapide), dernier point mis en avant. */
function miniPace(paces) {
  if (paces.length < 2) return '';
  const lo = Math.min(...paces);
  const hi = Math.max(...paces);
  const span = hi - lo || 1;
  const pts = paces.map((p, i) => [r1(6 + (i * 138) / (paces.length - 1)), r1(8 + ((p - lo) / span) * 40)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return `<svg class="mini-pace" viewBox="0 0 150 56" aria-hidden="true">
    <defs><linearGradient id="mp-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7C5CFF" stop-opacity=".35"/><stop offset="1" stop-color="#7C5CFF" stop-opacity="0"/></linearGradient></defs>
    <path d="${line} L${lx} 56 L${pts[0][0]} 56 Z" fill="url(#mp-g)"/>
    <path d="${line}" fill="none" stroke="#7C5CFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lx}" cy="${ly}" r="9" fill="#FF7A59" opacity=".25"/><circle cx="${lx}" cy="${ly}" r="5" fill="#FF7A59"/>
  </svg>`;
}

/** Mini-barres des dernières sorties (8 au plus), la dernière en baie. */
function miniBars(dists) {
  const last = dists.slice(-8);
  if (!last.length) return '';
  const max = Math.max(...last) || 1;
  return `<div class="mini-bars" aria-hidden="true">${last.map((d, i) =>
    `<i class="${i === last.length - 1 ? 'last' : ''}" style="height:${Math.max(8, Math.round((d / max) * 100))}%;--k:${i}"></i>`).join('')}</div>`;
}

/** Pastilles des 4 dernières semaines : une case par sortie (au moins l'objectif). */
function weekPills(weeks, goal) {
  return `<div class="week-pills" aria-hidden="true">${weeks.slice(-4).map((w) => {
    const n = Math.max(goal, w.count);
    return `<span class="wp"><span class="wp-seg">${Array.from({ length: n }, (_, i) => `<i class="${i < w.count ? 'on' : ''}"></i>`).join('')}</span><span>${esc(fmtDayMonth(w.start))}</span></span>`;
  }).join('')}</div>`;
}

export default {
  nav: true,
  render(app) {
    const t = app.derived().totals;
    const list = sortSessions(app.state.sessions);
    const n = list.length;
    const goal = app.data.plan.sessionsPerWeek;
    const dists = list.map((s) => s.distanceKm);
    const paces = list.map((s) => paceSec(s.durationSec, s.distanceKm));
    const weeks = weeklyCounts(list);
    const reached = weeks.filter((w) => w.count >= goal).length;

    const bento = `
      <div class="bento">
        <div class="lt stat tint-lav b-2 b-tall">
          <div>
            <div class="stat-l">Distance totale</div>
            <div class="stat-v stat-v-xl"><span data-count>${t.km ? fmtKm1(t.km) : '0'}</span><span class="stat-u">km</span></div>
            ${n ? `<div class="b-note">≈ ${esc(fmtKm2(t.avgKm))} km par séance</div>` : ''}
          </div>
          ${miniBars(dists)}
        </div>
        <div class="lt stat tint-rose b-2 b-row b-start">
          ${glossyIcon('seance', 32)}
          <div><div class="stat-v"><span data-count>${t.count}</span></div><div class="stat-l">${plural(t.count, 'séance')}</div></div>
        </div>
        <div class="lt stat b-2">
          <div class="stat-l">Temps total</div>
          <div class="stat-v">${t.sec ? esc(fmtHMin(t.sec)) : '0 min'}</div>
        </div>
        <div class="lt stat b-4 b-row">
          <div>
            <div class="stat-l">Allure moyenne</div>
            <div class="stat-v"><span data-count>${esc(fmtPace(t.avgPaceSec))}</span>${t.avgPaceSec ? '<span class="stat-u">/km</span>' : ''}</div>
            ${t.bestPaceSec ? `<div class="b-best">Meilleure : ${esc(fmtPace(t.bestPaceSec))}</div>` : ''}
          </div>
          ${miniPace(paces)}
        </div>
        <div class="lt stat tint-peche b-2">
          <div class="stat-l">Plus longue</div>
          <div class="stat-v"><span data-count>${t.count ? esc(fmtKm2(t.longestKm)) : '–'}</span>${t.count ? '<span class="stat-u">km</span>' : ''}</div>
        </div>
        <div class="lt stat b-2">
          <div class="stat-l">Durée moyenne</div>
          <div class="stat-v"><span data-count>${t.count ? esc(fmtDuration(t.avgSec)) : '–'}</span></div>
        </div>
        <div class="lt stat tint-rose b-4 b-row">
          <div>
            <div class="stat-l">Régularité</div>
            <div class="b-text">${weeks.length
              ? `${reached} ${plural(reached, 'semaine')} sur ${weeks.length} à l'objectif`
              : `Objectif : ${goal} sorties par semaine`}</div>
          </div>
          ${weekPills(weeks, goal)}
        </div>
      </div>`;

    const since = n ? `${n} ${plural(n, 'séance')} depuis le ${fmtDayMonth(list[0].date)}` : 'Tes progrès';
    const head = `<div><span class="label">${esc(since)}</span><h1 class="h1" style="margin-top:2px">Statistiques</h1></div>`;
    if (!n) {
      return `${head}${bento}
        <div class="lg card"><p class="lead">Tes graphiques apparaîtront après ta première sortie.</p></div>`;
    }
    return `
      ${head}
      ${bento}
      <div class="lg chart">
        <div class="chart-t">Distance par séance</div>
        <div class="chart-d">en km, de la séance 1 à la séance ${n}</div>
        ${n <= 24
    ? barChart(dists, { fmt: (v) => `${fmtKm1(v)} km`, ariaLabel: `Barres de la distance : de ${fmtKm1(dists[0])} km à ${fmtKm1(dists[n - 1])} km` })
    : lineChart(dists, { ariaLabel: `Courbe de la distance : de ${fmtKm1(dists[0])} km à ${fmtKm1(dists[n - 1])} km` })}
      </div>
      <div class="lg chart">
        <div class="chart-t">Allure</div>
        <div class="chart-d">de ${fmtPace(paces[0])} à ${fmtPace(paces[n - 1])} min/km : plus la courbe monte, plus tu es rapide</div>
        ${lineChart(paces, { color: '#6A47F0', invert: true, ariaLabel: `Courbe de l'allure : de ${fmtPace(paces[0])} à ${fmtPace(paces[n - 1])} minutes par kilomètre` })}
      </div>
      <div class="lg chart">
        <div class="chart-t">Régularité</div>
        <div class="chart-d" style="margin-bottom:8px">séances par semaine (objectif : ${goal})</div>
        ${weeklyBars(weeks, { goal, fmtLabel: fmtDayMonth, ariaLabel: `Séances par semaine : ${weeks.map((w) => w.count).join(', ')}` })}
      </div>`;
  },
  mount(root) {
    countUp(root, { delay: 100 });
  },
};
