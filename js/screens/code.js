// Code de récupération — maquette Code (§5.10). Montré une fois, après la 1re séance enregistrée.
import { esc, icon } from '../ui.js';
import { withUi } from '../state.js';
import { bindCodeButtons } from '../code-actions.js';

const LOCK = 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z';

export default {
  nav: false,
  render(app) {
    const name = app.state.profile?.firstName ?? '';
    const code = app.state.backup.code;
    return `
      <div style="padding-top:36px"></div>
      <div class="label" style="color:var(--ink-3);margin-bottom:6px">Première séance enregistrée</div>
      <h1 class="h1" style="font-size:34px;letter-spacing:-0.8px;margin-bottom:12px">Une dernière chose, ${esc(name)}.</h1>
      <p class="lead" style="font-size:16px;margin-bottom:6px">Ton historique est sauvegardé automatiquement. Si tu changes de téléphone, ce code te permet de le retrouver.</p>
      <div class="lg card" style="border-radius:28px;padding:18px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div class="lgg" style="flex:none;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center">${icon(LOCK, { size: 22 })}</div>
          <div style="font-size:18px;font-weight:900">Ton code de récupération</div>
        </div>
        <div class="lgi code-box" aria-label="Code de récupération">${esc(code)}</div>
        <div class="code-actions">
          <button class="lgg btn code-btn" type="button" data-copy>Copier</button>
          <button class="lgg btn code-btn" type="button" data-share>Partager</button>
        </div>
      </div>
      <div class="lg t-peche note">Note-le ou envoie-le-toi par message : tu le retrouveras aussi dans Réglages.</div>
      <div class="spacer"></div>
      <button class="lgb btn btn-primary" type="button" data-next>C'est noté</button>`;
  },
  mount(root, app) {
    bindCodeButtons(root, app.state.backup.code);
    root.querySelector('[data-next]').addEventListener('click', () => {
      app.set(withUi(app.state, { codeShown: true }));
      app.nextStep();
    });
  },
};
