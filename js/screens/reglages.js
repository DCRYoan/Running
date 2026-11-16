// Réglages (§5.13) — M0 : rubrique Apparence fonctionnelle (Effet verre) + diagnostic.
import { esc } from '../ui.js';

const MODES = [
  { id: 'auto', label: 'Auto' },
  { id: 'on', label: 'Activé' },
  { id: 'off', label: 'Désactivé' },
];

export default {
  nav: true,
  render(app) {
    const mode = app.state.settings.glass;
    const g = app.glass;
    const status = g.enabled ? 'Effet verre actif' : 'Effet verre désactivé';
    const why = g.why?.length ? ` (${g.why.join(', ')})` : '';
    const mem = navigator.deviceMemory ?? 'inconnue';
    const standalone = matchMedia('(display-mode: standalone)').matches;
    return `
      <h1 class="h1" style="margin-bottom:2px">Réglages</h1>

      <div class="section">
        <span class="label">Apparence</span>
        <div class="lg card">
          <div style="font-size:16px;font-weight:800;margin-bottom:10px">Effet verre</div>
          <div class="segmented lgi" role="group" aria-label="Effet verre">
            ${MODES.map((m) => `<button type="button" data-mode="${m.id}" aria-pressed="${m.id === mode}">${m.label}</button>`).join('')}
          </div>
          <p class="small" style="margin-top:10px">${esc(status + why)}.</p>
        </div>
      </div>

      <div class="section">
        <span class="label">Installation</span>
        <div class="lg card">
          <p style="font-size:15px;line-height:1.4">Dans Chrome : menu ⋮ puis <em>Installer l'application</em> (ou <em>Ajouter à l'écran d'accueil</em>).</p>
        </div>
      </div>

      <div class="section">
        <span class="label">Diagnostic (temporaire)</span>
        <div class="lt card" style="border-radius:24px">
          <div class="diag">${esc([
            `Mode affichage : ${standalone ? 'application installée' : 'onglet du navigateur'}`,
            `backdrop-filter : ${g.reasons.includes('backdrop-filter non pris en charge') ? 'non' : 'oui'}`,
            `Mémoire de l'appareil : ${mem} Go`,
            `Images/s mesurées : ${g.fps ?? 'pas encore mesuré'}`,
            `Service worker : ${navigator.serviceWorker?.controller ? 'actif' : 'pas encore actif'}`,
            `Dernière ouverture : ${app.state.ui.lastOpenAt ?? '—'}`,
          ].join('\n'))}</div>
        </div>
      </div>

      <div class="spacer"></div>
      <div style="text-align:center;font-size:13px;font-weight:800;color:var(--ink-2)">Running · version ${app.version}</div>`;
  },
  mount(root, app) {
    root.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        app.setGlassMode(btn.dataset.mode);
        app.rerender();
      });
    });
  },
};
