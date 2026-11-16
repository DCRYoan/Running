// Accueil — maquettes Accueil* (§5.2) et Accueil sans séance (§5.6).
// La carte anecdote illustrée arrive au jalon M4 ; d'ici là, carte « prochain jalon ».
import { brand, esc } from '../ui.js';
import { fmtKm1 } from '../format.js';
import { plural } from '../format.js';

export default {
  nav: false,
  layout: 'hero',
  render(app) {
    const name = app.state.profile?.firstName ?? '';
    const hello = new Date().getHours() >= 18 ? 'Bonsoir' : 'Bonjour';
    const d = app.derived();
    const t = d.totals;
    const m = d.milestone;
    const first = t.count === 0;
    return `
      ${brand()}
      <h1 class="h1-xl" style="margin:34px 0 8px">${hello} ${esc(name)},</h1>
      <p class="lead" style="margin:0 0 22px;max-width:300px">${esc(app.getWelcome())}</p>

      <div class="tiles">
        <div class="lg tile t-rose">
          <div class="tile-v">${t.count}</div>
          <div class="tile-l" style="color:#5E3A47">${plural(t.count, 'séance')}</div>
        </div>
        <div class="lg tile t-lavande">
          <div class="tile-row"><span class="tile-v">${t.km === 0 ? '0' : fmtKm1(t.km)}</span><span class="tile-u">km</span></div>
          <div class="tile-l" style="color:var(--lavender-ink)">parcourus</div>
        </div>
      </div>

      <div class="lg card fact">
        <div class="label" style="margin-bottom:6px;color:var(--ink-3)">${first ? 'Ton premier objectif' : 'Le savais-tu ?'}</div>
        <p class="fact-text">${first
          ? `Ton premier jalon : ${m.next} km cumulés. Chaque sortie t'en rapproche.`
          : `${fmtKm1(t.km)} km depuis ta première séance. Prochain jalon : ${m.next} km, encore ${fmtKm1(m.remaining)} km.`}</p>
        <div class="bar" style="margin-top:12px"><div class="bar-fill" style="width:${Math.max(3, Math.round(m.progress * 100))}%"></div></div>
      </div>

      <div class="spacer"></div>
      <button class="lgb btn btn-primary" type="button" data-open>Voir ma séance</button>`;
  },
  mount(root, app) {
    root.querySelector('[data-open]').addEventListener('click', () => app.openSession());
  },
};
