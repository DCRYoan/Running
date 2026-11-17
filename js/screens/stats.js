// Statistiques — maquette Stats (§5.12). Toutes les sorties comptent (complètes ou non).
// Tuiles sans flou (.lt) : 8 tuiles + 3 graphiques dépasseraient ~6 éléments floutés (§9.3).
import { esc, countUp } from '../ui.js';
import { fmtKm1, fmtKm2, fmtHMin, fmtDuration, fmtPace, paceSec, fmtDayMonth } from '../format.js';
import { sortSessions, weeklyCounts } from '../plan.js';
import { lineChart, weeklyBars, barChart } from '../charts.js';

const tile = (label, value, unit = '', tint = '') =>
  `<div class="lt stat ${tint}"><div class="stat-l">${esc(label)}</div><div class="stat-v"><span data-count>${esc(value)}</span>${unit ? `<span class="stat-u">${esc(unit)}</span>` : ''}</div></div>`;

export default {
  nav: true,
  render(app) {
    const t = app.derived().totals;
    const list = sortSessions(app.state.sessions);
    const tiles = `
      <div class="stats-grid">
        ${tile('Séances', String(t.count), '', 'tint-rose')}
        ${tile('Distance totale', t.km ? fmtKm1(t.km) : '0', 'km', 'tint-lav')}
        ${tile('Temps total', t.sec ? fmtHMin(t.sec) : '0 min')}
        ${tile('Allure moyenne', fmtPace(t.avgPaceSec), t.avgPaceSec ? '/km' : '')}
        ${tile('Moyenne par séance', t.count ? fmtKm2(t.avgKm) : '–', t.count ? 'km' : '')}
        ${tile('Durée moyenne', t.count ? fmtDuration(t.avgSec) : '–')}
        ${tile('Meilleure allure', fmtPace(t.bestPaceSec), t.bestPaceSec ? '/km' : '', 'tint-peche')}
        ${tile('Plus longue sortie', t.count ? fmtKm2(t.longestKm) : '–', t.count ? 'km' : '', 'tint-peche')}
      </div>`;
    if (!list.length) {
      return `<h1 class="h1" style="margin-bottom:2px">Statistiques</h1>${tiles}
        <div class="lg card"><p class="lead">Tes graphiques apparaîtront après ta première sortie.</p></div>`;
    }
    const dists = list.map((s) => s.distanceKm);
    const paces = list.map((s) => paceSec(s.durationSec, s.distanceKm));
    const weeks = weeklyCounts(list);
    const goal = app.data.plan.sessionsPerWeek;
    const n = list.length;
    return `
      <h1 class="h1" style="margin-bottom:2px">Statistiques</h1>
      ${tiles}
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
