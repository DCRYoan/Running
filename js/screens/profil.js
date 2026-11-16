// Réglages > Profil : modifier le prénom et la ville (§5.13).
// Changer la ville relance la recherche de commune.
import { esc, icon } from '../ui.js';
import { cityFieldHtml, bindCityField } from '../city-field.js';

export const BACK_PATH = 'M15 5l-7 7 7 7';
export const backButton = (href, label) =>
  `<a class="lgg back" href="${href}">${icon(BACK_PATH, { size: 20, width: 2.4 })}${esc(label)}</a>`;

export default {
  nav: false,
  render(app) {
    const p = app.state.profile || {};
    return `
      ${backButton('#/reglages', 'Annuler')}
      <div class="label" style="color:var(--ink-3);margin-bottom:-10px">Réglages</div>
      <h1 class="h1">Mon profil</h1>
      <form class="lg card profile-form" id="profile-form" novalidate>
        <div class="field">
          <label for="prenom">Prénom</label>
          <input class="lgi input" id="prenom" type="text" autocomplete="given-name" autocapitalize="words" maxlength="30" value="${esc(p.firstName ?? '')}" required>
        </div>
        ${cityFieldHtml(p.city?.name ?? '', 'Ville')}
        <p class="form-error" id="profile-error" role="alert" hidden></p>
      </form>
      <div class="spacer"></div>
      <button class="lgb btn btn-primary" type="submit" form="profile-form">Enregistrer</button>`;
  },
  mount(root, app) {
    const getCity = bindCityField(root, app.state.profile?.city);
    const firstName = root.querySelector('#prenom');
    root.querySelector('#profile-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = firstName.value.trim().replace(/\s+/g, ' ');
      if (!name) {
        const err = root.querySelector('#profile-error');
        err.textContent = 'Le prénom ne peut pas être vide.';
        err.hidden = false;
        return;
      }
      app.saveProfile({ firstName: name, city: getCity() });
      app.go('reglages', { replace: true });
    });
  },
};
