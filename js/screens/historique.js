// Historique — maquette Historique (§5.11), présenté en « carnet de course » :
// calendrier du mois en haut, puis les sorties regroupées par semaine le long d'un fil,
// la plus récente d'abord, avec les jalons franchis insérés dans le fil. Pas de suppression.
// Longue liste : cartes translucides SANS flou (.lt) pour rester fluide (§9.3).
import { esc, faceSvg, icon } from '../ui.js';
import { fmtKm1, fmtKm2, fmtDuration, fmtPace, paceSec, fmtLongDuration, fmtDateShort, fmtDayMonth, plural } from '../format.js';
import { sortSessions, startOfWeek, milestonesReached } from '../plan.js';

const EDIT_PATH = 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4';
const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; };

/** Calendrier du mois en cours (lundi en premier), jours courus en baie. */
function monthCalendar(list, now = new Date()) {
  const ran = new Set(list.map((s) => dayKey(s.date)));
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = startOfWeek(first);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const inMonth = list.filter((s) => { const d = new Date(s.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;
  const cells = [];
  for (let d = new Date(start); d <= last || cells.length % 7; d.setDate(d.getDate() + 1)) {
    const out = d.getMonth() !== now.getMonth();
    const cls = [out ? 'out' : '', ran.has(dayKey(d)) ? 'run' : '', dayKey(d) === dayKey(now) ? 'today' : ''].filter(Boolean).join(' ');
    cells.push(`<span class="${cls}">${d.getDate()}</span>`);
  }
  const title = MONTH.format(now);
  return `
    <div class="lt cal">
      <div class="cal-head"><b>${esc(title.charAt(0).toUpperCase() + title.slice(1))}</b><span class="label">${inMonth} ${plural(inMonth, 'sortie')}</span></div>
      <div class="cal-grid" aria-hidden="true">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => `<b>${x}</b>`).join('')}${cells.join('')}</div>
    </div>`;
}

export default {
  nav: true,
  render(app) {
    const d = app.derived();
    const t = d.totals;
    const list = sortSessions(app.state.sessions);
    if (!list.length) {
      return `
        <h1 class="h1" style="margin-bottom:4px">Historique</h1>
        <div class="lg card"><p class="lead">Pas encore de sortie enregistrée. Ta première séance t'attend, tout en douceur.</p></div>
        <a class="lgb btn btn-primary" href="#/seance">Voir ma séance</a>`;
    }

    // Jalons franchis, rattachés à la sortie qui les franchit
    const caps = new Map();
    milestonesReached(list, app.data.plan.milestoneEveryKm).forEach((m) => {
      caps.set(m.sessionId, [...(caps.get(m.sessionId) || []), m.km]);
    });

    // Semaines, de la plus récente à la plus ancienne
    const weeks = [];
    [...list].reverse().forEach((s) => {
      const start = startOfWeek(s.date).getTime();
      let w = weeks[weeks.length - 1];
      if (!w || w.start !== start) { w = { start, sessions: [] }; weeks.push(w); }
      w.sessions.push(s);
    });

    const runItem = (s) => {
      const n = d.result.bySession[s.id]?.n ?? s.plannedN;
      const incomplete = s.status !== 'complete';
      const capItems = (caps.get(s.id) || []).slice().reverse().map((km) => `
        <li class="tl-item"><span class="tl-dot tl-gold" aria-hidden="true"></span>
          <div class="cap-item"><span class="mini-medal">${km}</span>Cap des ${km} km franchi</div></li>`).join('');
      return `${capItems}
        <li class="tl-item"><span class="tl-dot" aria-hidden="true">${faceSvg(s.feeling, 22)}</span>
          <div class="lt run${incomplete ? ' is-incomplete' : ''}">
            <div class="run-body">
              <div class="run-title">Séance ${n}</div>
              <div class="run-line">${esc(fmtDateShort(s.date))} · ${fmtDuration(s.durationSec)} · ${fmtPace(paceSec(s.durationSec, s.distanceKm))} /km</div>
              ${incomplete || s.pain ? `<div class="run-tags">${incomplete ? `<span class="tag tag-lav">Incomplète (prévu : ${fmtKm2(s.plannedKm)} km)</span>` : ''}${s.pain ? '<span class="tag tag-rose">Douleur signalée</span>' : ''}</div>` : ''}
            </div>
            <span class="run-km">${fmtKm2(s.distanceKm)}<small>km</small></span>
            <a class="lgg run-edit" href="#/modifier?id=${encodeURIComponent(s.id)}" aria-label="Modifier la séance ${n}">${icon(EDIT_PATH, { size: 18 })}</a>
          </div>
        </li>`;
    };

    return `
      <div>
        <span class="label">${t.count} ${plural(t.count, 'séance')} · ${fmtKm1(t.km)} km · ${fmtLongDuration(t.sec)}</span>
        <h1 class="h1" style="margin-top:2px">Historique</h1>
      </div>
      ${monthCalendar(list)}
      ${weeks.map((w) => {
        const km = w.sessions.reduce((sum, s) => sum + (s.distanceKm || 0), 0);
        return `
        <section class="week">
          <div class="week-h"><span class="label">Semaine du ${esc(fmtDayMonth(w.start))}</span><span>${w.sessions.length} ${plural(w.sessions.length, 'sortie')} · ${fmtKm1(km)} km</span></div>
          <ul class="tl">${w.sessions.map(runItem).join('')}</ul>
        </section>`;
      }).join('')}`;
  },
};
