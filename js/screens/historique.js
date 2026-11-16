// Historique — maquette Historique (§5.11). La plus récente d'abord. Pas de suppression.
// Longue liste : cartes translucides SANS flou (.lt) pour rester fluide (§9.3).
import { esc, faceSvg, icon } from '../ui.js';
import { fmtKm1, fmtKm2, fmtDuration, fmtPace, paceSec, fmtLongDuration, fmtDateShort, plural } from '../format.js';
import { sortSessions } from '../plan.js';

const EDIT_PATH = 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4';

export default {
  nav: true,
  render(app) {
    const d = app.derived();
    const t = d.totals;
    const list = sortSessions(app.state.sessions).reverse();
    if (!list.length) {
      return `
        <h1 class="h1" style="margin-bottom:4px">Historique</h1>
        <div class="lg card"><p class="lead">Pas encore de sortie enregistrée. Ta première séance t'attend, tout en douceur.</p></div>
        <a class="lgb btn btn-primary" href="#/seance">Voir ma séance</a>`;
    }
    return `
      <div>
        <h1 class="h1" style="margin-bottom:4px">Historique</h1>
        <div style="font-size:16px;font-weight:800;color:var(--ink-2)">${t.count} ${plural(t.count, 'séance')} · ${fmtKm1(t.km)} km · ${fmtLongDuration(t.sec)}</div>
      </div>
      <ul class="runs">
        ${list.map((s) => {
          const n = d.result.bySession[s.id]?.n ?? s.plannedN;
          const incomplete = s.status !== 'complete';
          return `
          <li class="lt run${incomplete ? ' is-incomplete' : ''}">
            <span class="run-face">${faceSvg(s.feeling, 42)}</span>
            <div class="run-body">
              <div class="run-title">Séance ${n} <span class="run-date">· ${esc(fmtDateShort(s.date))}</span></div>
              <div class="run-line">${fmtKm2(s.distanceKm)} km · ${fmtDuration(s.durationSec)} · ${fmtPace(paceSec(s.durationSec, s.distanceKm))} /km</div>
              ${incomplete || s.pain ? `<div class="run-tags">${incomplete ? `<span class="tag tag-lav">Incomplète (prévu : ${fmtKm2(s.plannedKm)} km)</span>` : ''}${s.pain ? '<span class="tag tag-rose">Douleur signalée</span>' : ''}</div>` : ''}
            </div>
            <a class="lgg run-edit" href="#/modifier?id=${encodeURIComponent(s.id)}" aria-label="Modifier la séance ${n}">${icon(EDIT_PATH, { size: 20 })}</a>
          </li>`;
        }).join('')}
      </ul>`;
  },
};
