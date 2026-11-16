// Séance validée — maquette Celebration (§5.4). Jalon franchi : version renforcée (§4.7).
// L'anecdote illustrée arrive au jalon M4.
import { esc, triplet, milestoneBar, roundBadge, confetti, CHECK_SVG } from '../ui.js';
import { fmtKm1, fmtKm2, fmtDuration, fmtPace, paceSec } from '../format.js';
import { fill } from '../messages.js';

export function sessionFromFlow(app) {
  const id = app.flow?.ctx.sessionId;
  return app.state.sessions.find((s) => s.id === id);
}

export function milestoneBlock(app, ctx) {
  const m = app.derived().milestone;
  const crossed = ctx.crossed
    ? `<div class="lg card t-rose-2 milestone-hit"><b>${esc(fill(app.data.messages.milestone, { J: ctx.crossed }))}</b></div>`
    : '';
  return crossed + milestoneBar({ next: m.next, remainingText: fmtKm1(m.remaining), progress: m.progress });
}

export default {
  nav: false,
  layout: 'center',
  render(app) {
    const s = sessionFromFlow(app);
    if (!s) return '';
    const ctx = app.flow.ctx;
    const name = app.state.profile?.firstName ?? '';
    const n = app.derived().result.bySession[s.id]?.n ?? s.plannedN;
    return `
      ${confetti(ctx.crossed ? 26 : 8)}
      ${roundBadge(CHECK_SVG, { tint: 'rgba(255,201,77,.85)', extra: 'box-shadow:0 10px 26px rgba(255,201,77,.5),inset 0 1.5px 0 rgba(255,255,255,.9)' })}
      <h1 class="h1-xl" style="margin:20px 0 8px;font-size:36px;letter-spacing:-0.8px">Bravo ${esc(name)} !</h1>
      <div class="lgb pill">Séance ${n} validée</div>
      ${triplet([[fmtKm2(s.distanceKm), 'km'], [fmtDuration(s.durationSec), 'temps'], [fmtPace(paceSec(s.durationSec, s.distanceKm)), 'min / km']])}
      <div class="lg card fact" style="text-align:left;margin-bottom:12px">
        <p class="fact-text">${esc(ctx.encouragement)} ${fmtKm1(ctx.totalKm)} km depuis ta première séance.</p>
      </div>
      ${milestoneBlock(app, ctx)}
      <div class="spacer"></div>
      <button class="lgb btn btn-primary" type="button" data-next>Continuer</button>`;
  },
  mount(root, app) {
    root.querySelector('[data-next]')?.addEventListener('click', () => app.nextStep());
  },
};
