// Message douleur (§5.8) : après l'enregistrement si la case est cochée.
// Image du cœur (carte de motivation, §8.3) + texte prudent + « Compris ».
import { esc, motivationCard } from '../ui.js';

export default {
  nav: false,
  layout: 'center',
  render(app) {
    return `
      ${motivationCard('coeur', 'max-width:260px;margin:0 auto')}
      <h1 class="h1" style="margin:18px 0 10px">Prends soin de toi.</h1>
      <div class="lg card" style="width:100%;text-align:left">
        <p style="font-size:16px;line-height:1.45;font-weight:700">${esc(app.data.messages.pain)}</p>
      </div>
      <p class="small" style="margin-top:12px">Ta séance est bien enregistrée.</p>
      <div class="spacer"></div>
      <button class="lgb btn btn-primary" type="button" data-next>Compris</button>`;
  },
  mount(root, app) {
    root.querySelector('[data-next]').addEventListener('click', () => app.nextStep());
  },
};
