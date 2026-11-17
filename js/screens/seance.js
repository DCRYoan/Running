// Séance du jour — maquette Seance (§5.3) : la séance proposée + le formulaire « Ma séance ».
import { esc, facePicker, bindFacePicker, confirmDialog } from '../ui.js';
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
        <svg viewBox="0 0 320 72" width="100%" height="72" role="img" aria-label="Aller ${h} km jusqu'au demi-tour, puis retour ${h} km">
          <path d="M30 38 H292" stroke="rgba(255,255,255,.85)" stroke-width="6" stroke-linecap="round"/>
          <circle cx="26" cy="38" r="10" fill="#34C3A8"/>
          <path d="M298 48 V12" style="stroke:var(--ink)" stroke-width="3" stroke-linecap="round"/>
          <path d="M298 12 L318 19 L298 26Z" fill="#FF7A59"/>
          <text x="160" y="22" text-anchor="middle" font-size="14" font-weight="800" style="fill:var(--ink-2)" font-family="Nunito, sans-serif">aller · ${h} km →</text>
          <text x="160" y="64" text-anchor="middle" font-size="14" font-weight="800" style="fill:var(--ink-2)" font-family="Nunito, sans-serif">← retour · ${h} km</text>
        </svg>
      </div>

      <div class="lg steps">
        <div class="step"><div class="step-n lav">1</div><div><div class="step-t">${plan.warmupMin} min de marche active</div><div class="step-d">Pour préparer ton corps</div></div></div>
        <div class="step"><div class="step-n rose">2</div><div><div class="step-t">${fmtKmShort(km)} km à allure confortable</div><div class="step-d">Tu peux marcher si le souffle manque</div></div></div>
        <div class="step"><div class="step-n lav">3</div><div><div class="step-t">${plan.cooldownMin} min de marche tranquille</div><div class="step-d">Retour au calme</div></div></div>
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
