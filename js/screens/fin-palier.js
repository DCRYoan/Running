// Fin de palier — maquette FinPalier (§5.9, §4.1, §4.8).
// Aucun choix présélectionné : le bouton reste désactivé tant qu'elle n'a pas choisi.
import { esc } from '../ui.js';
import { fmtKmShort, fmtStep, half } from '../format.js';
import { averageFeeling, feelingLabel, suggestStay, currentSegmentSessions, roundKm } from '../plan.js';

export default {
  nav: false,
  render(app) {
    const r = app.derived().result;
    const p = r.palier;
    const { stepKm, sessionsPerPalier: next } = app.state.settings;
    const upKm = roundKm(p.km + stepKm);
    const avg = averageFeeling(currentSegmentSessions(r, app.state.sessions));
    const label = feelingLabel(avg);
    const segs = Array.from({ length: p.target }, () => '<div class="week-seg on"></div>').join('');
    return `
      <div style="padding-top:32px"></div>
      <div class="label" style="color:var(--ink-3);margin-bottom:6px">Palier ${p.index} terminé</div>
      <h1 class="h1" style="font-size:34px;letter-spacing:-0.8px;margin-bottom:14px">${p.target} séances à ${fmtKmShort(p.km)} km. Bravo !</h1>
      <div class="week" style="gap:8px;margin-bottom:14px">${segs}</div>
      ${label ? `<div class="lg t-peche chip">Ton ressenti sur ce palier : ${esc(label)}</div>` : ''}
      ${suggestStay(avg) ? `<p class="lead" style="font-size:16px;margin-bottom:16px">${esc(app.data.messages.staySuggestion)}</p>` : ''}
      <h2 style="font-size:20px;font-weight:900;margin:6px 0 12px">Et maintenant, tu te sens comment ?</h2>
      <div class="choices" role="radiogroup" aria-label="Choix de la suite">
        <label class="lg choice">
          <input type="radio" name="choix" value="up">
          <span><span class="choice-t">Passer à ${fmtKmShort(upKm)} km</span>
          <span class="choice-d">+${fmtStep(stepKm)} : ${next} séances à ${fmtKmShort(upKm)} km (${fmtKmShort(half(upKm))} km aller, ${fmtKmShort(half(upKm))} km retour).</span></span>
        </label>
        <label class="lg choice">
          <input type="radio" name="choix" value="stay">
          <span><span class="choice-t">Rester à ${fmtKmShort(p.km)} km</span>
          <span class="choice-d">Encore ${next} séances sur ce palier. C'est prévu, sans aucune pression.</span></span>
        </label>
      </div>
      <div class="spacer"></div>
      <button class="lgb btn btn-primary" type="button" data-validate disabled>Valider mon choix</button>`;
  },
  mount(root, app) {
    const btn = root.querySelector('[data-validate]');
    let choice = null;
    root.querySelectorAll('input[name=choix]').forEach((input) => {
      input.addEventListener('change', () => {
        choice = input.value;
        root.querySelectorAll('.choice').forEach((c) => c.classList.toggle('selected', c.contains(input)));
        btn.disabled = false;
      });
    });
    btn.addEventListener('click', () => {
      if (choice) app.decidePalier(choice);
    });
  },
};
