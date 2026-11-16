// Réglages — maquette Reglages (§5.13).
import { esc, icon } from '../ui.js';
import { fmtStep, plural } from '../format.js';
import { roundKm } from '../plan.js';

const MODES = [
  { id: 'auto', label: 'Auto' },
  { id: 'on', label: 'Activé' },
  { id: 'off', label: 'Désactivé' },
];
const STEP = { min: 0.1, max: 2, inc: 0.1 };
const COUNT = { min: 2, max: 8 };
const MINUS = 'M6 12h12';
const PLUS = 'M6 12h12M12 6v12';
const CHEVRON = 'M9 5l7 7-7 7';
const SHARE = 'M12 3v12M8 7l4-4 4 4M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8';

const stepper = (key, value, minusLabel, plusLabel, atMin, atMax) => `
  <div class="stepper">
    <button class="lgg step-btn" type="button" data-step="${key}" data-dir="-1" aria-label="${minusLabel}" ${atMin ? 'disabled' : ''}>${icon(MINUS, { size: 20, width: 2.6 })}</button>
    <span class="step-val" aria-live="polite">${esc(value)}</span>
    <button class="lgg step-btn" type="button" data-step="${key}" data-dir="1" aria-label="${plusLabel}" ${atMax ? 'disabled' : ''}>${icon(PLUS, { size: 20, width: 2.6 })}</button>
  </div>`;

export default {
  nav: true,
  render(app) {
    const p = app.state.profile || {};
    const s = app.state.settings;
    const g = app.glass;
    const status = g.enabled ? 'Effet verre actif' : 'Effet verre désactivé';
    const why = g.why?.length ? ` (${g.why.join(', ')})` : '';
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const installHelp = ios
      ? `Dans Safari : bouton Partager <span style="display:inline-block;vertical-align:-3px">${icon(SHARE, { size: 18 })}</span> puis <em>Sur l'écran d'accueil</em>.`
      : 'Dans Chrome : menu ⋮ puis <em>Installer l\'application</em> (ou <em>Ajouter à l\'écran d\'accueil</em>).';
    const cityName = p.city?.name ?? 'À renseigner';
    return `
      <h1 class="h1" style="margin-bottom:2px">Réglages</h1>

      <div class="section">
        <span class="label">Profil</span>
        <div class="lg card rows">
          <a class="row row-link" href="#/profil"><span class="row-k">Prénom</span><span class="row-v">${esc(p.firstName ?? '')} ${icon(CHEVRON, { size: 18, stroke: '#4F4254', width: 2.4 })}</span></a>
          <a class="row row-link" href="#/profil"><span class="row-k">Ville</span><span class="row-v">${esc(cityName)} ${icon(CHEVRON, { size: 18, stroke: '#4F4254', width: 2.4 })}</span></a>
        </div>
      </div>

      <div class="section">
        <span class="label">Progression</span>
        <div class="lg card rows" style="padding-bottom:12px">
          <div class="row" style="min-height:64px">
            <span class="row-k">Augmentation du palier</span>
            ${stepper('stepKm', fmtStep(s.stepKm), "Diminuer l'augmentation", "Augmenter l'augmentation", s.stepKm <= STEP.min + 1e-9, s.stepKm >= STEP.max - 1e-9)}
          </div>
          <div class="row" style="min-height:64px">
            <span class="row-k">Tous les</span>
            ${stepper('sessionsPerPalier', `${s.sessionsPerPalier} ${plural(s.sessionsPerPalier, 'séance')}`, 'Moins de séances par palier', 'Plus de séances par palier', s.sessionsPerPalier <= COUNT.min, s.sessionsPerPalier >= COUNT.max)}
          </div>
          <p class="small" style="margin-top:4px">Par défaut : +500 m toutes les 4 séances (environ 2 semaines). Sans limite. Le changement s'applique aux prochains paliers.</p>
        </div>
      </div>

      <div class="section">
        <span class="label">Sauvegarde</span>
        <div class="lg card">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px"><span class="dot dot-wait"></span><span style="font-size:16px;font-weight:900">Sauvegarde en ligne bientôt disponible</span></div>
          <p class="small" style="font-size:14px">Tes séances sont enregistrées sur ce téléphone. La sauvegarde automatique et le code de récupération arrivent au jalon M5.</p>
        </div>
      </div>

      <div class="section">
        <span class="label">Apparence</span>
        <div class="lg card">
          <div style="font-size:16px;font-weight:800;margin-bottom:10px">Effet verre</div>
          <div class="segmented lgi" role="group" aria-label="Effet verre">
            ${MODES.map((m) => `<button type="button" data-mode="${m.id}" aria-pressed="${m.id === s.glass}">${m.label}</button>`).join('')}
          </div>
          <p class="small" style="margin-top:10px">${esc(status + why)}.</p>
        </div>
      </div>

      <a class="lg card row-link link-card" href="#/programme">
        <span style="font-size:16px;font-weight:800">Mon programme et ses règles</span>
        ${icon(CHEVRON, { size: 20, stroke: '#4F4254', width: 2.4 })}
      </a>

      <div class="section">
        <span class="label">Installation</span>
        <div class="lg card"><p style="font-size:15px;line-height:1.4">${installHelp}</p></div>
      </div>

      <details class="lt card diag-box">
        <summary class="small">Diagnostic (temporaire)</summary>
        <div class="diag">${esc([
          `Mode affichage : ${standalone ? 'application installée' : 'onglet du navigateur'}`,
          `backdrop-filter : ${g.reasons.includes('backdrop-filter non pris en charge') ? 'non' : 'oui'}`,
          `Mémoire de l'appareil : ${navigator.deviceMemory ?? 'inconnue'} Go`,
          `Images/s mesurées : ${g.fps ?? 'pas encore mesuré'}`,
          `Service worker : ${navigator.serviceWorker?.controller ? 'actif' : 'pas encore actif'}`,
          `Dernière ouverture : ${app.state.ui.lastOpenAt ?? '—'}`,
          `Version installée : ${app.build}`,
          `Fond affiché : ${app.background?.id ?? 'secours'} (${app.backgrounds.length} fonds disponibles)`,
        ].join('\n'))}</div>
        <button class="lgg btn btn-secondary" type="button" data-reopen style="height:46px;font-size:15px;margin-top:10px">Simuler une nouvelle ouverture</button>
      </details>

      <div style="text-align:center;font-size:13px;font-weight:800;color:var(--ink-2);margin-top:4px">Running · version ${app.version}</div>`;
  },
  mount(root, app) {
    root.querySelector('[data-reopen]')?.addEventListener('click', () => app.reopen());
    root.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        app.setGlassMode(btn.dataset.mode);
        app.rerender();
      });
    });
    root.querySelectorAll('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = Number(btn.dataset.dir);
        const s = app.state.settings;
        if (btn.dataset.step === 'stepKm') {
          const v = roundKm(Math.min(STEP.max, Math.max(STEP.min, s.stepKm + dir * STEP.inc)));
          app.updateSettings({ stepKm: v });
        } else {
          const v = Math.min(COUNT.max, Math.max(COUNT.min, s.sessionsPerPalier + dir));
          app.updateSettings({ sessionsPerPalier: v });
        }
        const y = window.scrollY;
        app.rerender();
        window.scrollTo(0, y);
      });
    });
  },
};
