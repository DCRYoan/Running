// Retrouver ma progression — maquette Restaurer (§5.15, §10.3).
import { esc, confirmDialog } from '../ui.js';
import { formatCode, isValidCode, normCode } from '../backup-code.js';
import { loadBackup, isConfigured } from '../sync.js';
import { backButton } from './profil.js';
import { plural } from '../format.js';

const ERRORS = {
  invalid_code: 'Ce code ne correspond à aucune sauvegarde. Vérifie-le et réessaie.',
  too_many_attempts: 'Trop d\'essais d\'affilée. Patiente une minute avant de réessayer.',
  offline: 'Pas de réseau pour le moment : connecte-toi pour retrouver ta progression.',
  disabled: 'La sauvegarde en ligne n\'est pas encore activée sur cette version.',
  network: 'Impossible de joindre la sauvegarde. Réessaie dans un instant.',
};

export default {
  nav: false,
  render(app) {
    const back = app.state.profile ? (app.prevRoute === 'reglages' ? ['#/reglages', 'Réglages'] : ['#/accueil', 'Retour']) : ['#/bienvenue', 'Retour'];
    return `
      ${backButton(...back)}
      <h1 class="h1" style="font-size:34px;letter-spacing:-0.8px;margin-top:16px">Retrouver ma progression</h1>
      <p class="lead" style="font-size:16px">Entre le code de récupération que tu as noté : tes séances, tes statistiques et ta place dans le programme reviennent d'un coup.</p>
      <form class="lg card" id="restore-form" style="border-radius:28px;padding:18px;display:flex;flex-direction:column;gap:10px" novalidate>
        <label class="label" for="code" style="color:var(--ink-3)">Ton code</label>
        <input class="lgi input code-input" id="code" type="text" placeholder="XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="14">
        <p style="font-size:14px;line-height:1.45;font-weight:700;color:var(--ink-2)">Tu as perdu ton code ? Il est dans Réglages, rubrique Sauvegarde, sur ton ancien téléphone.</p>
        <p class="form-error" id="restore-error" role="alert" hidden></p>
      </form>
      <div class="lg card t-lavande" id="restore-ok" hidden></div>
      <div class="spacer"></div>
      <button class="lgb btn btn-primary" type="submit" form="restore-form" data-submit>Retrouver mon historique</button>`;
  },
  mount(root, app) {
    const input = root.querySelector('#code');
    const error = root.querySelector('#restore-error');
    const btn = root.querySelector('[data-submit]');
    const fail = (key) => { error.textContent = ERRORS[key] || ERRORS.network; error.hidden = false; };

    input.addEventListener('input', () => {
      const pos = input.value.length === input.selectionStart;
      input.value = formatCode(input.value);
      if (pos) input.setSelectionRange(input.value.length, input.value.length);
    });

    root.querySelector('#restore-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      error.hidden = true;
      if (!isValidCode(input.value)) {
        error.textContent = 'Le code compte 12 caractères (lettres et chiffres), au format XXXX-XXXX-XXXX.';
        error.hidden = false;
        return;
      }
      if (!isConfigured()) return fail('disabled');
      if (!navigator.onLine) return fail('offline');
      btn.disabled = true;
      btn.textContent = 'Recherche…';
      let res;
      try {
        res = await loadBackup(normCode(input.value));
      } catch {
        res = { ok: false, error: 'network' };
      }
      btn.disabled = false;
      btn.textContent = 'Retrouver mon historique';
      if (!res.ok) return fail(res.error);

      const n = res.data?.sessions?.length ?? 0;
      let merge = false;
      if (app.state.sessions.length) {
        const ok = await confirmDialog({
          title: 'Ajouter cet historique ?',
          text: `Ce téléphone contient déjà ${app.state.sessions.length} ${plural(app.state.sessions.length, 'séance')}. Les ${n} ${plural(n, 'séance')} retrouvée${n > 1 ? 's' : ''} vont s'y ajouter : rien ne sera perdu.`,
          ok: 'Oui, réunir les deux',
          cancel: 'Annuler',
        });
        if (!ok) return;
        merge = true;
      }
      app.restore({ code: formatCode(input.value), data: res.data, updatedAt: res.updated_at, merge });
      const total = app.state.sessions.length;
      const ok = root.querySelector('#restore-ok');
      ok.innerHTML = `<p style="font-size:18px;font-weight:900">${esc(`${n} ${plural(n, 'séance')} retrouvée${n > 1 ? 's' : ''}`)}</p>
        <p class="small" style="font-size:14px;margin-top:4px">${merge ? `Tu as maintenant ${total} ${plural(total, 'séance')} sur ce téléphone.` : 'Ton historique et ta place dans le programme sont de retour.'}</p>`;
      ok.hidden = false;
      root.querySelector('#restore-form').hidden = true;
      btn.type = 'button';
      btn.textContent = 'Continuer';
      btn.onclick = () => app.go('accueil', { replace: true });
    });
  },
};
