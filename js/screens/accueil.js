// Accueil — maquettes Accueil* (§5.2) et Accueil sans séance (§5.6).
import { brand, esc, anecdoteCard } from '../ui.js';
import { fmtKm1, plural } from '../format.js';

export default {
  nav: false,
  layout: 'hero',
  render(app) {
    const name = app.state.profile?.firstName ?? '';
    const hello = new Date().getHours() >= 18 ? 'Bonsoir' : 'Bonjour';
    const t = app.derived().totals;
    const a = app.getAnecdote();
    return `
      ${brand()}
      <h1 class="h1-xl" style="margin:34px 0 8px">${hello} ${esc(name)},</h1>
      <p class="lead" style="margin:0 0 22px;max-width:300px">${esc(app.getWelcome())}</p>

      <div class="tiles">
        <div class="lg tile t-rose">
          <div class="tile-v">${t.count}</div>
          <div class="tile-l" style="color:#5E3A47">${plural(t.count, 'séance')}</div>
        </div>
        <div class="lg tile t-lavande">
          <div class="tile-row"><span class="tile-v">${t.km === 0 ? '0' : fmtKm1(t.km)}</span><span class="tile-u">km</span></div>
          <div class="tile-l" style="color:var(--lavender-ink)">parcourus</div>
        </div>
      </div>

      ${anecdoteCard({
        label: a.kind === 'first' ? 'Ton premier objectif' : 'Le savais-tu ?',
        text: a.kind === 'first' ? a.text.replace(/^Ton premier objectif : /, '') : a.text,
        image: a.anecdote.image,
        place: a.anecdote.place,
      })}

      <div class="spacer"></div>
      <button class="lgb btn btn-primary" type="button" data-open>Voir ma séance</button>`;
  },
  mount(root, app) {
    root.querySelector('[data-open]').addEventListener('click', () => app.openSession());
  },
};
