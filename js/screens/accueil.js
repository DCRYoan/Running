// Accueil (§5.2) — M0 : squelette. Contenu réel au jalon M2.
import { brand, esc } from '../ui.js';

export default {
  nav: false,
  layout: 'hero',
  render(app) {
    const name = app.state.profile?.firstName;
    const hour = new Date().getHours();
    const hello = hour >= 18 ? 'Bonsoir' : 'Bonjour';
    return `
      ${brand()}
      <h1 class="h1-xl" style="margin:34px 0 8px">${hello}${name ? ` ${esc(name)}` : ''},</h1>
      <p class="lead">Contente de te retrouver.</p>
      <div class="lg card" style="margin-top:22px;border-radius:26px">
        <div class="label" style="margin-bottom:6px">Version de travail</div>
        <p style="font-size:16px;line-height:1.4">Jalon M0 : squelette de l'application. Les vraies séances arrivent au jalon M2.</p>
      </div>
      <div class="spacer"></div>
      <a class="lgb btn btn-primary" href="#/seance">Voir ma séance</a>`;
  },
};
