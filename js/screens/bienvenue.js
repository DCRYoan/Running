// Premier lancement — maquette Main (§5.1).
import { icon, LOGO_PATH } from '../ui.js';
import { cityFieldHtml, bindCityField } from '../city-field.js';

export default {
  nav: false,
  layout: 'hero first-run',
  render() {
    return `
      <div class="brand">
        <div class="brand-mark lgb" style="width:42px;height:42px;border-radius:15px">${icon(LOGO_PATH, { size: 22, stroke: '#fff', width: 2.4 })}</div>
        <span class="brand-name" style="font-size:24px;letter-spacing:-0.3px">Running</span>
      </div>
      <h1 class="h1-xl" style="margin:38px 0 10px;font-size:36px;line-height:1.08;letter-spacing:-0.8px">Bienvenue.<br>On y va tout doucement.</h1>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.4;color:var(--ink-2);font-weight:600">2 sorties par semaine, sans chrono, à ton rythme.</p>
      <form class="lg card profile-form" id="welcome-form" novalidate>
        <div class="field">
          <label for="prenom">Ton prénom</label>
          <input class="lgi input" id="prenom" name="prenom" type="text" placeholder="Camille" autocomplete="given-name" autocapitalize="words" maxlength="30" required>
        </div>
        ${cityFieldHtml()}
        <p class="form-error" id="welcome-error" role="alert" hidden></p>
      </form>
      <div class="spacer"></div>
      <button class="lgb btn btn-primary" type="submit" form="welcome-form">Commencer</button>
      <a class="text-link" href="#/restaurer">J'ai déjà un code de récupération</a>`;
  },

  mount(root, app) {
    const form = root.querySelector('#welcome-form');
    const firstName = root.querySelector('#prenom');
    const error = root.querySelector('#welcome-error');
    const getCity = bindCityField(root);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = firstName.value.trim().replace(/\s+/g, ' ');
      if (!name) {
        error.textContent = 'Indique ton prénom pour commencer.';
        error.hidden = false;
        firstName.focus();
        return;
      }
      app.saveProfile({ firstName: name, city: getCity() });
      app.go('accueil', { replace: true });
    });
  },
};
