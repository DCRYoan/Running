// Modifier une séance — maquette Modifier (§5.11).
// Après modification : statut recalculé (avec la distance prévue d'origine), replay, (sync en M5).
import { esc, facePicker, bindFacePicker, confirmDialog } from '../ui.js';
import { fmtKm2, fmtDuration, parseKm, parseDuration, maskDuration, paceSec, paceLooksOdd, fmtPace, toDateInput, toLocalIso } from '../format.js';
import { backButton } from './profil.js';

export default {
  nav: false,
  render(app) {
    const s = app.state.sessions.find((x) => x.id === app.params().get('id'));
    const n = app.derived().result.bySession[s.id]?.n ?? s.plannedN;
    return `
      ${backButton('#/historique', 'Annuler')}
      <div class="label" style="color:var(--ink-3);margin-bottom:-10px">Historique</div>
      <h1 class="h1">Modifier la séance ${n}</h1>
      <form class="lg card edit-form" id="edit-form" novalidate>
        <div class="field">
          <label for="date">Date</label>
          <input class="lgi input input-xl" id="date" type="date" value="${toDateInput(s.date)}" max="${toDateInput(new Date())}" style="font-size:20px" required>
        </div>
        <div class="grid2">
          <div class="field">
            <label for="dist">Distance (km)</label>
            <input class="lgi input input-xl" id="dist" type="text" inputmode="decimal" autocomplete="off" value="${esc(fmtKm2(s.distanceKm))}">
          </div>
          <div class="field">
            <label for="temps">Temps (mm:ss)</label>
            <input class="lgi input input-xl" id="temps" type="text" inputmode="numeric" autocomplete="off" value="${esc(fmtDuration(s.durationSec))}">
          </div>
        </div>
        <div>
          <div class="label" style="color:var(--ink-3);margin-bottom:8px">Ressenti</div>
          ${facePicker(s.feeling)}
        </div>
        <label class="check" for="douleur">
          <input id="douleur" type="checkbox" ${s.pain ? 'checked' : ''}>
          J'ai ressenti une douleur inhabituelle
        </label>
        <p class="small">Prévu ce jour-là : ${fmtKm2(s.plannedKm)} km. La séance est validée à partir de 90 % de cette distance.</p>
        <p class="form-error" id="edit-error" role="alert" hidden></p>
      </form>
      <div class="spacer"></div>
      <button class="lgb btn btn-primary" type="submit" form="edit-form">Enregistrer les modifications</button>
      <a class="lgg btn btn-secondary" href="#/historique">Annuler</a>`;
  },
  mount(root, app) {
    const s = app.state.sessions.find((x) => x.id === app.params().get('id'));
    let feeling = s.feeling;
    bindFacePicker(root, (v) => { feeling = v; });
    const time = root.querySelector('#temps');
    time.addEventListener('input', () => {
      if (/^\d*$/.test(time.value.replace(':', ''))) time.value = maskDuration(time.value);
    });
    const error = root.querySelector('#edit-error');
    const fail = (msg, el) => { error.textContent = msg; error.hidden = false; el?.focus(); };

    root.querySelector('#edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      error.hidden = true;
      const dateValue = root.querySelector('#date').value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return fail('Choisis une date.', root.querySelector('#date'));
      // On garde l'heure d'origine, on change seulement le jour.
      const old = new Date(s.date);
      const [y, m, d] = dateValue.split('-').map(Number);
      let when = new Date(y, m - 1, d, old.getHours(), old.getMinutes(), old.getSeconds());
      const now = new Date();
      if (toDateInput(when) > toDateInput(now)) return fail('La date ne peut pas être dans le futur.', root.querySelector('#date'));
      if (when > now) when = now; // aujourd'hui, mais plus tard que maintenant

      const distanceKm = parseKm(root.querySelector('#dist').value);
      if (!distanceKm) return fail('Indique la distance courue, par exemple 2,5.', root.querySelector('#dist'));
      const durationSec = parseDuration(time.value);
      if (!durationSec) return fail('Indique ton temps au format mm:ss, par exemple 18:30.', time);
      const pace = paceSec(durationSec, distanceKm);
      if (paceLooksOdd(pace)) {
        const ok = await confirmDialog({
          title: 'Ça te semble juste ?',
          text: `${fmtKm2(distanceKm)} km en ${fmtDuration(durationSec)}, soit ${fmtPace(pace)} par km.`,
          ok: 'Oui, enregistrer',
          cancel: 'Corriger',
        });
        if (!ok) return;
      }
      app.updateSession(s.id, {
        date: toLocalIso(when),
        distanceKm,
        durationSec,
        feeling,
        pain: root.querySelector('#douleur').checked,
      });
      app.go('historique', { replace: true });
    });
  },
};
