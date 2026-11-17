// Réglages — maquette Reglages (§5.13).
import { esc, icon } from '../ui.js';
import { fmtStep, plural } from '../format.js';
import { roundKm } from '../plan.js';
import { fmtRelativeDateTime } from '../format.js';
import { isConfigured } from '../sync.js';
import { bindCodeButtons } from '../code-actions.js';

// Rubrique Sauvegarde (§5.13, §10.3) : état, dernière synchronisation, code.
function backupBlock(app) {
  const b = app.state.backup;
  let dot = 'dot';
  let title = 'Sauvegarde automatique active';
  if (!isConfigured()) { dot = 'dot dot-wait'; title = 'Sauvegarde en ligne non activée'; }
  else if (b.status === 'offline' || (!navigator.onLine && b.dirty)) { dot = 'dot dot-wait'; title = 'En attente de réseau'; }
  else if (b.status === 'error') { dot = 'dot dot-error'; title = 'Erreur de sauvegarde (réessai automatique)'; }
  else if (!b.registered || b.dirty) { dot = 'dot dot-wait'; title = 'Sauvegarde en cours…'; }
  const last = b.lastSyncAt ? `Dernière synchronisation : ${fmtRelativeDateTime(b.lastSyncAt)}.` : 'Pas encore synchronisée.';
  return `
    <div class="set-title">${tile('menthe', 'cloud')}<span style="font-weight:900">${esc(title)}</span><span class="${dot}" style="margin-left:auto"></span></div>
    <p class="small" style="font-size:14px;margin-bottom:12px">${esc(last)} Hors ligne, tes séances se synchronisent dès que le réseau revient.</p>
    <div class="label" style="margin-bottom:6px">Code de récupération</div>
    <div class="lgi code-box code-box-sm">${esc(b.code ?? '—')}</div>
    <div class="code-actions">
      <button class="lgg btn code-btn" type="button" data-copy>Copier</button>
      <button class="lgg btn code-btn" type="button" data-share>Partager</button>
    </div>
    <a class="text-link" href="#/restaurer" style="margin-top:8px;font-size:14px">J'ai un code d'un autre téléphone</a>`;
}

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

// Pastilles d'icônes façon réglages de l'iPhone : icône blanche sur fond coloré
const TILE = {
  berry: 'linear-gradient(160deg,#E04A74,#A51E4D)', lav: 'linear-gradient(160deg,#9C88E8,#6A47F0)',
  peche: 'linear-gradient(160deg,#F2B97A,#D98A3A)', menthe: 'linear-gradient(160deg,#5ED6BE,#1F9C85)',
  prune: 'linear-gradient(160deg,#8A4A7C,#4A2140)',
};
const ICON = {
  user: 'M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0',
  pin: 'M12 21s-6.5-5.8-6.5-10.4a6.5 6.5 0 0 1 13 0C18.5 15.2 12 21 12 21ZM12 8.4a2.2 2.2 0 1 0 0 4.4a2.2 2.2 0 0 0 0-4.4Z',
  trend: 'M4 18l6-6 4 4 6-8M15 8h5v5',
  repeat: 'M17 3l3 3-3 3M20 6H9a5 5 0 0 0-5 5M7 21l-3-3 3-3M4 18h11a5 5 0 0 0 5-5',
  cloud: 'M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 8a4 4 0 0 1-1 10H7Z',
  sparkle: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8Z',
  book: 'M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4V4ZM9 8h6M9 12h6',
  phone: 'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM11 18h2',
};
const tile = (color, path) => `<span class="set-tile" style="background:${TILE[color]}" aria-hidden="true">${icon(ICON[path], { size: 17, stroke: '#fff', width: 2.2 })}</span>`;
const chevron = (size = 18) => icon(CHEVRON, { size, stroke: 'currentColor', width: 2.4 });

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
          <a class="row row-link" href="#/profil"><span class="row-k">${tile('berry', 'user')}Prénom</span><span class="row-v">${esc(p.firstName ?? '')} ${chevron()}</span></a>
          <a class="row row-link" href="#/profil"><span class="row-k">${tile('menthe', 'pin')}Ville</span><span class="row-v">${esc(cityName)} ${chevron()}</span></a>
        </div>
      </div>

      <div class="section">
        <span class="label">Progression</span>
        <div class="lg card rows" style="padding-bottom:12px">
          <div class="row" style="min-height:64px">
            <span class="row-k">${tile('peche', 'trend')}Augmentation du palier</span>
            ${stepper('stepKm', fmtStep(s.stepKm), "Diminuer l'augmentation", "Augmenter l'augmentation", s.stepKm <= STEP.min + 1e-9, s.stepKm >= STEP.max - 1e-9)}
          </div>
          <div class="row" style="min-height:64px">
            <span class="row-k">${tile('lav', 'repeat')}Tous les</span>
            ${stepper('sessionsPerPalier', `${s.sessionsPerPalier} ${plural(s.sessionsPerPalier, 'séance')}`, 'Moins de séances par palier', 'Plus de séances par palier', s.sessionsPerPalier <= COUNT.min, s.sessionsPerPalier >= COUNT.max)}
          </div>
          <p class="small" style="margin-top:4px">Par défaut : +500 m toutes les 4 séances (environ 2 semaines). Sans limite. Le changement s'applique aux prochains paliers.</p>
        </div>
      </div>

      <div class="section">
        <span class="label">Sauvegarde</span>
        <div class="lg card">
          ${backupBlock(app)}
        </div>
      </div>

      <div class="section">
        <span class="label">Apparence</span>
        <div class="lg card">
          <div class="set-title">${tile('lav', 'sparkle')}Effet verre</div>
          <div class="segmented lgi" role="group" aria-label="Effet verre">
            ${MODES.map((m) => `<button type="button" data-mode="${m.id}" aria-pressed="${m.id === s.glass}">${m.label}</button>`).join('')}
          </div>
          <p class="small" style="margin-top:10px">${esc(status + why)}.</p>
        </div>
      </div>

      <a class="lg card row-link link-card" href="#/programme">
        <span class="set-title" style="margin:0">${tile('berry', 'book')}Mon programme et ses règles</span>
        <span class="row-v">${chevron(20)}</span>
      </a>

      <div class="section">
        <span class="label">Installation</span>
        <div class="lg card"><div class="set-title">${tile('prune', 'phone')}Sur ton téléphone</div><p style="font-size:15px;line-height:1.4">${standalone ? 'Running est installée sur ton téléphone : elle fonctionne aussi sans réseau.' : installHelp}</p></div>
      </div>

      <div class="app-version">
        <div>Running · version ${app.version}</div>
        <div class="app-build">réf. ${esc(app.build)}</div>
      </div>`;
  },
  mount(root, app) {
    if (app.state.backup.code) bindCodeButtons(root, app.state.backup.code);
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
