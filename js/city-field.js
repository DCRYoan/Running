// Champ « Ta ville » avec autocomplétion geo.api.gouv.fr (§5.1, §12).
// Partagé par le premier lancement et la modification du profil.
import { esc } from './ui.js';
import { searchCommunes } from './geo.js';

export const cityFieldHtml = (value = '', label = 'Ta ville') => `
  <div class="field city-field">
    <label for="ville">${esc(label)}</label>
    <input class="lgi input" id="ville" name="ville" type="text" placeholder="Saint-Cyr-sur-Mer" autocomplete="off" autocapitalize="words" maxlength="60"
           role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="ville-list" value="${esc(value)}">
    <ul class="lg suggestions" id="ville-list" role="listbox" hidden></ul>
    <div class="hint">Pour te comparer des distances près de chez toi.</div>
  </div>`;

/**
 * Branche l'autocomplétion. Renvoie une fonction qui donne la ville à enregistrer :
 * la commune choisie (avec coordonnées), sinon le texte seul (résolu plus tard), sinon null.
 */
export function bindCityField(root, initialCity = null) {
  const input = root.querySelector('#ville');
  const list = root.querySelector('#ville-list');
  let chosen = initialCity?.code ? initialCity : null;
  let results = [];
  let timer = null;
  let ctrl = null;

  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); };
  const show = (items) => {
    results = items;
    if (!items.length) { close(); return; }
    list.innerHTML = items.map((c, i) => `
      <li role="option" id="ville-opt-${i}" data-i="${i}" aria-label="${esc(c.name)}${c.postcode ? ` ${esc(c.postcode)}` : ''}">
        <span class="sugg-name">${esc(c.name)}</span>${c.postcode ? `<span class="sugg-cp">${esc(c.postcode)}</span>` : ''}
      </li>`).join('');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('input', () => {
    chosen = null;
    clearTimeout(timer);
    ctrl?.abort();
    const q = input.value.trim();
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
    input.value = chosen.name;
    close();
  });
  input.addEventListener('blur', () => setTimeout(close, 150));

  return () => {
    const typed = input.value.trim();
    if (chosen && chosen.name === typed) return { name: chosen.name, code: chosen.code, lat: chosen.lat, lon: chosen.lon };
    return typed ? { name: typed } : null;
  };
}
