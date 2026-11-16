// Message douleur (§5.8) : après l'enregistrement si la case est cochée.
// Icône cœur + texte prudent + « Compris » (l'image du cœur tourne désormais comme fond).
import { esc, roundBadge, HEART_SVG } from '../ui.js';

export default {
  nav: false,
  layout: 'center',
  render(app) {
    return `
      ${roundBadge(HEART_SVG, { size: 100 })}
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
