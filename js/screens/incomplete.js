// Séance incomplète — maquette Incomplete (§5.7). La même séance est reproposée.
// La carte de motivation « Tu progresses » arrive au jalon M4.
import { esc, triplet, roundBadge, HEART_SVG } from '../ui.js';
import { fmtKm2, fmtDuration, fmtPace, paceSec, fmtOutAndBack } from '../format.js';
import { sessionFromFlow } from './celebration.js';
import { fill } from '../messages.js';

export default {
  nav: false,
  layout: 'center',
  render(app) {
    const s = sessionFromFlow(app);
    if (!s) return '';
    const r = app.derived().result;
    const ctx = app.flow.ctx;
    const hit = ctx.crossed
      ? `<div class="lg card t-rose-2 milestone-hit" style="margin-top:12px"><b>${esc(fill(app.data.messages.milestone, { J: ctx.crossed }))}</b></div>`
      : '';
    return `
      ${roundBadge(HEART_SVG, { size: 100 })}
      <h1 class="h1" style="margin:20px 0 10px">Bien joué d'être sortie !</h1>
      <p class="lead" style="font-size:16px;margin:0 0 18px">Tu n'as pas fait toute la distance prévue, et ce n'est pas grave : alterner course et marche fait partie du programme.</p>
      ${triplet([[fmtKm2(s.distanceKm), `km (prévu : ${fmtKm2(s.plannedKm)})`], [fmtDuration(s.durationSec), 'temps'], [fmtPace(paceSec(s.durationSec, s.distanceKm)), 'min / km']])}
      <div class="lg card t-lavande" style="width:100%;text-align:left">
        <div class="label" style="color:var(--lavender-ink);margin-bottom:6px">La prochaine fois</div>
        <p style="font-size:16px;line-height:1.45;font-weight:700">On retente la séance ${r.nextN} : ${esc(fmtOutAndBack(r.palier.km))}. Aucune obligation de progresser selon le calendrier.</p>
      </div>
      ${hit}
      <div class="spacer"></div>
      <button class="lgb btn btn-primary" type="button" data-next>Compris</button>`;
  },
  mount(root, app) {
    root.querySelector('[data-next]')?.addEventListener('click', () => app.nextStep());
  },
};
