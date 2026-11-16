// Mon programme — maquette Programme (§5.14).
// Paliers terminés, palier en cours, puis 4 paliers projetés avec les réglages actuels.
import { esc } from '../ui.js';
import { fmtKmShort, fmtStep, plural } from '../format.js';
import { projectPaliers } from '../plan.js';
import { backButton } from './profil.js';

const INFINITY_PATH = 'M12 12c-2-3-3.5-4-5.5-4a4 4 0 0 0 0 8c2 0 3.5-1 5.5-4Zm0 0c2 3 3.5 4 5.5 4a4 4 0 0 0 0-8c-2 0-3.5 1-5.5 4Z';
const SHOW_DONE = 3; // paliers terminés affichés en détail (les plus récents)

/**
 * Lignes du tableau : un « Rester » prolonge le même palier, on fusionne donc
 * les segments consécutifs de même numéro.
 */
export function programmeRows(result, settings, projected = 4) {
  const rows = [];
  const segs = result.segments;
  segs.forEach((seg, i) => {
    const isLast = i === segs.length - 1;
    const endN = seg.startN + seg.target - 1;
    const prev = rows[rows.length - 1];
    if (prev && prev.index === seg.index) {
      prev.endN = endN;
      prev.current = isLast;
    } else {
      rows.push({ index: seg.index, km: seg.km, startN: seg.startN, endN, current: isLast });
    }
  });
  const awaiting = result.state === 'awaiting_decision';
  rows.forEach((r) => { r.tag = r.current && !awaiting ? 'current' : 'done'; });
  const next = projectPaliers(result, settings, projected).map((p) => ({ index: p.index, km: p.km, startN: p.startN, endN: p.endN, tag: 'next' }));
  return [...rows, ...next];
}

export default {
  nav: false,
  render(app) {
    const { plan } = app.data;
    const s = app.state.settings;
    const r = app.derived().result;
    const rows = programmeRows(r, s);
    const done = rows.filter((x) => x.tag === 'done');
    const hidden = Math.max(0, done.length - SHOW_DONE);
    const visible = rows.slice(hidden);
    const back = app.prevRoute === 'seance' ? ['#/seance', 'Séance'] : ['#/reglages', 'Réglages'];
    const tagText = { done: 'Terminé', current: 'En cours', next: '' };
    return `
      ${backButton(...back)}
      <h1 class="h1">Mon programme</h1>
      <p class="lead" style="font-size:16px">Reprendre en douceur : ${plan.sessionsPerWeek} sorties par semaine, une distance qui monte tranquillement, et aucune course contre la montre.</p>
      <div class="lg card paliers">
        ${hidden ? `<div class="palier-row"><div class="palier-badge done">✓</div><div class="palier-main"><span class="palier-km">Paliers 1 à ${done[hidden - 1].index}</span><span class="palier-s"> · séances 1 à ${done[hidden - 1].endN}</span></div><div class="palier-tag done">Terminés</div></div>` : ''}
        ${visible.map((p) => `
          <div class="palier-row ${p.tag}">
            <div class="palier-badge ${p.tag}">${p.index}</div>
            <div class="palier-main"><span class="palier-km">${fmtKmShort(p.km)} km</span><span class="palier-s"> · séances ${p.startN} à ${p.endN}</span></div>
            <div class="palier-tag ${p.tag}">${tagText[p.tag]}</div>
          </div>`).join('')}
        <div class="palier-row last">
          <div class="palier-badge infinity"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3A2E3F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${INFINITY_PATH}"/></svg></div>
          <div class="palier-main" style="font-size:15px;font-weight:800;line-height:1.35">Et ensuite : +${fmtStep(s.stepKm)} toutes les ${s.sessionsPerPalier} ${plural(s.sessionsPerPalier, 'séance')}, sans limite</div>
        </div>
      </div>
      <a href="#/reglages" style="font-size:14px;font-weight:800;margin:-4px 4px 0">Modifier la progression dans les réglages</a>
      <p class="small" style="font-size:14px;margin:0 4px">Chaque sortie : ${plan.warmupMin} min de marche active, la distance prévue, ${plan.cooldownMin} min de marche tranquille.</p>
      <h2 style="font-size:20px;font-weight:900;margin-top:2px">Les règles d'or</h2>
      <div class="lg t-peche rules">
        ${plan.rules.map((x) => `<div class="rule"><span class="rule-dot"></span><div><div class="rule-t">${esc(x.t)}</div><div class="rule-d">${esc(x.d)}</div></div></div>`).join('')}
      </div>
      <div class="lg t-lavande safety">${esc(plan.safetyNote)}</div>`;
  },
};
