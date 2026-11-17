// Accueil — maquettes Accueil* (§5.2) et Accueil sans séance (§5.6).
import { brand, esc, anecdoteCard, progressRing, countUp } from '../ui.js';
import { fmtKm1, plural } from '../format.js';

export default {
  nav: false,
  layout: 'hero',
  render(app) {
    const name = app.state.profile?.firstName ?? '';
    const hello = new Date().getHours() >= 18 ? 'Bonsoir' : 'Bonjour';
    const t = app.derived().totals;
    const m = app.derived().milestone;
    const a = app.getAnecdote();
    return `
      ${brand()}
      <h1 class="h1-xl" style="margin:34px 0 8px">${hello} ${esc(name)},</h1>
      <p class="lead" style="margin:0 0 22px;max-width:300px">${esc(app.getWelcome())}</p>

      <div class="lg progress-card">
        ${progressRing({ totalText: t.km === 0 ? '0' : fmtKm1(t.km), progress: m.progress, next: m.next })}
        <div class="progress-side">
          <div><span class="tile-v" data-count>${t.count}</span> <span class="tile-l">${plural(t.count, 'séance')}</span></div>
          <p class="progress-next">${t.count === 0
            ? `Ta première séance t'attend. Premier cap : <b>${m.next}&nbsp;km</b>.`
            : `Plus que <b>${fmtKm1(m.remaining)}&nbsp;km</b> avant le cap des ${m.next}&nbsp;km.`}</p>
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
    countUp(root, { delay: 150 });
    root.querySelector('[data-open]').addEventListener('click', () => app.openSession());
  },
};
