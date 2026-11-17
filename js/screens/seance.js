// Séance du jour — maquette Seance (§5.3) : la séance proposée + le formulaire « Ma séance ».
import { esc, facePicker, bindFacePicker, confirmDialog, glossyIcon } from '../ui.js';
import { fmtKmShort, half, ordinal, parseKm, parseDuration, maskDuration, paceSec, fmtPace, fmtDuration, fmtKm2, paceLooksOdd } from '../format.js';

// Conseil du jour : stable pour une journée donnée.
function tipOfTheDay(tips, now = new Date()) {
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now - start) / 86400000);
  const t = tips[day % tips.length];
  return t.charAt(0).toLowerCase() + t.slice(1);
}

export default {
  nav: true,
  render(app) {
    const { plan } = app.data;
    const r = app.derived().result;
    const km = r.palier.km;
    const h = fmtKmShort(half(km));
    const pos = r.isLastOfPalier ? `${ordinal(r.positionInPalier)} et dernière` : ordinal(r.positionInPalier);
    const d = app.draft;
    return `
      <div>
        <div class="label" style="color:var(--ink-3);margin-bottom:4px">Séance ${r.nextN} · palier ${r.palier.index} · ${pos}</div>
        <h1 class="h1" style="font-size:30px;letter-spacing:-0.6px">Ta séance du jour</h1>
      </div>

      <div class="lg card" style="border-radius:28px;padding:18px 18px 12px">
        <div style="display:flex;align-items:baseline;gap:8px"><span class="big-km">${fmtKmShort(km)}</span><span style="font-size:24px;font-weight:800">km</span></div>
        <div style="font-size:15px;color:var(--ink-2);font-weight:700;margin:4px 0 6px">Course à allure confortable, sans objectif de temps.</div>
        <svg class="route" viewBox="0 0 320 92" width="100%" height="92" role="img" aria-label="Aller ${h} km jusqu'au demi-tour, puis retour ${h} km">
          <defs><mask id="route-back-mask"><path class="route-back-reveal" pathLength="1" d="M290 34 C 260 38, 215 50, 160 46 S 80 82, 30 78" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/></mask></defs>
          <path d="M30 70 C 80 70, 100 30, 160 36 S 260 22, 290 26" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="10" stroke-linecap="round"/>
          <path class="route-out" pathLength="1" d="M30 70 C 80 70, 100 30, 160 36 S 260 22, 290 26" fill="none" stroke="#A51E4D" stroke-width="3.5" stroke-linecap="round"/>
          <path mask="url(#route-back-mask)" d="M290 34 C 260 38, 215 50, 160 46 S 80 82, 30 78" fill="none" stroke="#E9A100" stroke-width="3" stroke-dasharray="4 7" stroke-linecap="round"/>
          <circle cx="30" cy="74" r="8.5" fill="#34C3A8" stroke="#fff" stroke-width="2.5"/>
          <g class="route-flag"><path d="M290 34 V6" style="stroke:var(--ink)" stroke-width="2.5" stroke-linecap="round"/><path d="M290 6 L309 12 L290 18Z" fill="#E04A74"/></g>
          <text x="160" y="14" text-anchor="middle" font-size="13" font-weight="800" style="fill:var(--ink-2)" font-family="Nunito, sans-serif">aller · ${h} km →</text>
          <text x="160" y="91" text-anchor="middle" font-size="13" font-weight="800" style="fill:var(--ink-2)" font-family="Nunito, sans-serif">← retour · ${h} km</text>
        </svg>
      </div>

      <div class="lg frise">
        <div class="frise-step"><span class="frise-ic">${glossyIcon('pas', 26)}</span><b>${plan.warmupMin} min</b><small>Marche active</small></div>
        <div class="frise-step"><span class="frise-ic">${glossyIcon('seance', 28)}</span><b>${fmtKmShort(km)} km</b><small>Course douce</small></div>
        <div class="frise-step"><span class="frise-ic">${glossyIcon('lune', 24)}</span><b>${plan.cooldownMin} min</b><small>Retour au calme</small></div>
        <p class="frise-note">Tu peux marcher si le souffle manque.</p>
      </div>

      <div class="lg t-peche tip">
        <b>Conseil du jour :</b> ${esc(tipOfTheDay(plan.tips))} <a href="#/programme">Voir le programme</a>
      </div>

      <form id="session-form" novalidate style="display:flex;flex-direction:column;gap:14px">
        <h2 style="font-size:20px;font-weight:900;margin-top:6px">Ma séance</h2>
        <div class="grid2">
          <div class="field">
            <label for="dist">Distance (km)</label>
            <input class="lgi input input-xl" id="dist" type="text" inputmode="decimal" placeholder="${fmtKm2(km)}" autocomplete="off" value="${esc(d.dist ?? '')}">
          </div>
          <div class="field">
            <label for="temps">Temps (mm:ss)</label>
            <input class="lgi input input-xl" id="temps" type="text" inputmode="numeric" placeholder="18:30" autocomplete="off" value="${esc(d.time ?? '')}">
          </div>
        </div>
        <div class="hint" style="margin-top:-6px;color:var(--ink-2);font-weight:700">Compte uniquement la partie course, sans les 2 × 5 min de marche.</div>
        <div>
          <div class="label" style="color:var(--ink-3);margin-bottom:8px">Comment t'es-tu sentie ?</div>
          ${facePicker(d.feeling ?? null)}
        </div>
        <label class="check" for="douleur">
          <input id="douleur" type="checkbox" ${d.pain ? 'checked' : ''}>
          J'ai ressenti une douleur inhabituelle
          <span class="pain-heart">${glossyIcon('coeur', 24)}</span>
        </label>
        <p class="form-error" id="session-error" role="alert" hidden></p>
        <button class="lgb btn btn-primary" type="submit">Enregistrer ma séance</button>
      </form>`;
  },

  mount(root, app) {
    const d = app.draft;
    const dist = root.querySelector('#dist');
    const time = root.querySelector('#temps');
    const pain = root.querySelector('#douleur');
    const error = root.querySelector('#session-error');
    const form = root.querySelector('#session-form');

    dist.addEventListener('input', () => { d.dist = dist.value; });
    time.addEventListener('input', () => {
      // Le clavier numérique de l'iPhone n'a pas de « : » : on l'insère.
      if (/^\d*$/.test(time.value.replace(':', ''))) time.value = maskDuration(time.value);
      d.time = time.value;
    });
    pain.addEventListener('change', () => { d.pain = pain.checked; });
    bindFacePicker(root, (v) => { d.feeling = v; });

    const fail = (msg, field) => {
      error.textContent = msg;
      error.hidden = false;
      field?.focus();
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      error.hidden = true;
      const distanceKm = parseKm(dist.value);
      if (!distanceKm) return fail('Indique la distance courue, par exemple 2,5.', dist);
      const durationSec = parseDuration(time.value);
      if (!durationSec) return fail('Indique ton temps de course au format mm:ss, par exemple 18:30.', time);
      if (!d.feeling) return fail('Choisis le visage qui correspond à ton ressenti.', root.querySelector('.face'));

      const pace = paceSec(durationSec, distanceKm);
      if (paceLooksOdd(pace)) {
        const ok = await confirmDialog({
          title: 'Ça te semble juste ?',
          text: `${fmtKm2(distanceKm)} km en ${fmtDuration(durationSec)}, soit ${fmtPace(pace)} par km. Vérifie la distance et le temps avant d'enregistrer.`,
          ok: 'Oui, enregistrer',
          cancel: 'Corriger',
        });
        if (!ok) return;
      }
      app.recordSession({ distanceKm, durationSec, feeling: d.feeling, pain: Boolean(d.pain) });
    });
  },
};
