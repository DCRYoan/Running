// Repos — maquette Repos (§5.5) : 2 sorties faites cette semaine.
// La carte de motivation « Continue » arrive au jalon M4.
import { esc, roundBadge, MOON_SVG, motivationCard } from '../ui.js';
import { fmtKmShort } from '../format.js';

export default {
  nav: true,
  tab: 'seance',
  layout: 'center',
  render(app) {
    const name = app.state.profile?.firstName ?? '';
    const d = app.derived();
    const perWeek = app.data.plan.sessionsPerWeek;
    const done = Math.min(d.week.length, perWeek);
    const segs = Array.from({ length: perWeek }, (_, i) => `<div class="week-seg${i < done ? ' on' : ''}"></div>`).join('');
    return `
      ${roundBadge(MOON_SVG, { size: 120, tint: 'rgba(246,211,218,.6)', extra: 'margin-bottom:22px' })}
      <h1 class="h1" style="margin:0 0 10px">Repos mérité, ${esc(name)}.</h1>
      <p class="lead" style="margin:0 0 20px">Tu as fait tes ${perWeek} sorties de la semaine. C'est pendant le repos que ton corps progresse.</p>
      <div class="lg card" style="width:100%;text-align:left;border-radius:26px;padding:16px 18px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span class="label" style="color:var(--ink-3)">Cette semaine</span>
          <span style="font-size:16px;font-weight:900">${d.week.length} sur ${perWeek}</span>
        </div>
        <div class="week">${segs}</div>
        <p style="font-size:15px;line-height:1.4;color:var(--ink-2);font-weight:700">Ta séance ${d.result.nextN} (${fmtKmShort(d.result.palier.km)} km) t'attend dès lundi.</p>
      </div>
      ${motivationCard('continue', 'margin-top:12px')}
      <div class="spacer" style="min-height:16px"></div>
      <button class="lgg btn btn-secondary" type="button" data-extra>Faire une séance en plus</button>
      <p class="small" style="font-size:14px;margin:8px 0 2px">Laisse idéalement 48 à 72 h entre deux sorties.</p>`;
  },
  mount(root, app) {
    root.querySelector('[data-extra]').addEventListener('click', () => {
      app.extraSession = true;
      app.go('seance');
    });
  },
};
