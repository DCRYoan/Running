// Premier lancement — maquette Main (§5.1).
import { esc, icon, LOGO_PATH } from '../ui.js';
import { searchCommunes } from '../geo.js';

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
      <form class="lg card" id="welcome-form" style="border-radius:28px;padding:18px;display:flex;flex-direction:column;gap:12px" novalidate>
        <div class="field">
          <label for="prenom">Ton prénom</label>
          <input class="lgi input" id="prenom" name="prenom" type="text" placeholder="Camille" autocomplete="given-name" autocapitalize="words" maxlength="30" required>
        </div>
        <div class="field city-field">
          <label for="ville">Ta ville</label>
          <input class="lgi input" id="ville" name="ville" type="text" placeholder="Saint-Cyr-sur-Mer" autocomplete="off" autocapitalize="words" maxlength="60"
                 role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="ville-list">
          <ul class="lg suggestions" id="ville-list" role="listbox" hidden></ul>
          <div class="hint">Pour te comparer des distances près de chez toi.</div>
        </div>
        <p class="form-error" id="welcome-error" role="alert" hidden></p>
      </form>
      <div class="spacer"></div>
      <button class="lgb btn btn-primary" type="submit" form="welcome-form">Commencer</button>
      <a class="text-link" href="#/restaurer">J'ai déjà un code de récupération</a>`;
  },

  mount(root, app) {
    const form = root.querySelector('#welcome-form');
    const firstName = root.querySelector('#prenom');
    const city = root.querySelector('#ville');
    const list = root.querySelector('#ville-list');
    const error = root.querySelector('#welcome-error');
    let chosen = null; // commune choisie dans la liste
    let results = [];
    let timer = null;
    let ctrl = null;

    const close = () => { list.hidden = true; city.setAttribute('aria-expanded', 'false'); };
    const show = (items) => {
      results = items;
      if (!items.length) { close(); return; }
      list.innerHTML = items.map((c, i) => `
        <li role="option" id="ville-opt-${i}" data-i="${i}">
          <span class="sugg-name">${esc(c.name)}</span>${c.postcode ? `<span class="sugg-cp">${esc(c.postcode)}</span>` : ''}
        </li>`).join('');
      list.hidden = false;
      city.setAttribute('aria-expanded', 'true');
    };

    city.addEventListener('input', () => {
      chosen = null;
      clearTimeout(timer);
      ctrl?.abort();
      const q = city.value.trim();
      if (q.length < 2 || !navigator.onLine) { close(); return; }
      timer = setTimeout(async () => {
        ctrl = new AbortController();
        try { show(await searchCommunes(q, { signal: ctrl.signal })); } catch { close(); }
      }, 250);
    });
    // pointerdown : choisir avant que le champ ne perde le focus.
    list.addEventListener('pointerdown', (e) => {
      const li = e.target.closest('[data-i]');
      if (!li) return;
      e.preventDefault();
      chosen = results[Number(li.dataset.i)];
      city.value = chosen.name;
      close();
    });
    city.addEventListener('blur', () => setTimeout(close, 150));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = firstName.value.trim().replace(/\s+/g, ' ');
      if (!name) {
        error.textContent = 'Indique ton prénom pour commencer.';
        error.hidden = false;
        firstName.focus();
        return;
      }
      const typed = city.value.trim();
      let cityValue = null;
      if (chosen && chosen.name === typed) cityValue = { name: chosen.name, code: chosen.code, lat: chosen.lat, lon: chosen.lon };
      else if (typed) cityValue = { name: typed }; // hors ligne ou non choisie : résolue plus tard
      app.saveProfile({ firstName: name, city: cityValue });
      app.go('accueil', { replace: true });
    });
  },
};
