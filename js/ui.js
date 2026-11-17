// Petits utilitaires d'interface partagés par les écrans.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

// Icône trait (viewBox 24) comme dans les maquettes.
export const icon = (d, { size = 24, stroke = 'currentColor', width = 2.2 } = {}) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

export const LOGO_PATH = 'M4 17c3 0 4-3 6-6s4-4 6-4h4M4 21h16';

export const brand = () => `
  <div class="brand">
    <div class="brand-mark lgb">${icon(LOGO_PATH, { size: 20, stroke: '#fff', width: 2.4 })}</div>
    <span class="brand-name">Running</span>
  </div>`;

// ---------- Visages de ressenti (§9.4, repris de Seance.dc.html) ----------
export const FACES = [
  { value: 1, label: 'Très difficile', fill: '#E6E0F5', m: 'M11 23 Q16 18 21 23', mf: 'none' },
  { value: 2, label: 'Difficile', fill: '#F6D3DA', m: 'M11 22 Q16 20 21 22.5', mf: 'none' },
  { value: 3, label: 'Correct', fill: '#FFE3D3', m: 'M11 20 Q16 23.5 21 20', mf: 'none' },
  { value: 4, label: 'Bien', fill: '#FFD98A', m: 'M10 19 Q16 26 22 19', mf: 'none' },
  { value: 5, label: 'Super', fill: '#FFC94D', m: 'M10 19.5 H22 Q22 27 16 27 Q10 27 10 19.5Z', mf: '#ffffff' },
];

export function faceSvg(value, size = 36) {
  const f = FACES[value - 1];
  if (!f) return '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="${f.fill}"/><circle cx="11.5" cy="13" r="1.7" fill="#3A2E3F"/><circle cx="20.5" cy="13" r="1.7" fill="#3A2E3F"/><path d="${f.m}" fill="${f.mf}" stroke="#3A2E3F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/** Sélecteur des 5 visages (boutons radio accessibles). */
export function facePicker(selected, name = 'feeling') {
  return `
    <div class="faces" role="radiogroup" aria-label="Ressenti">
      ${FACES.map((f) => `
        <button class="lgg face" type="button" role="radio" data-${name}="${f.value}" aria-label="${f.label}" aria-checked="${selected === f.value}">${faceSvg(f.value)}</button>`).join('')}
    </div>
    <div class="faces-legend"><span>Difficile</span><span>Super</span></div>`;
}

export function bindFacePicker(root, onChange, name = 'feeling') {
  const buttons = [...root.querySelectorAll(`[data-${name}]`)];
  buttons.forEach((b) => b.addEventListener('click', () => {
    buttons.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    // Le visage choisi rebondit (CSS .face.pop) ; petite vibration sur Android (l'iPhone l'ignore)
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
    try { navigator.vibrate?.(12); } catch { /* non pris en charge */ }
    onChange(Number(b.dataset[name]));
  }));
}

// ---------- Blocs partagés ----------

/** Carte 3 chiffres (km, temps, min/km). */
export const triplet = (items) => `
  <div class="lg triplet">
    ${items.map(([v, l]) => `<div><div class="triplet-v" data-count>${esc(v)}</div><div class="triplet-l">${esc(l)}</div></div>`).join('')}
  </div>`;

/** Barre « Prochain jalon : 20 km — encore 1,8 km ». */
export const milestoneBar = ({ next, remainingText, progress }) => `
  <div class="lg card milestone">
    <div class="milestone-head"><span>Prochain jalon : ${esc(next)} km</span><span class="milestone-left">encore ${esc(remainingText)} km</span></div>
    <div class="bar"><div class="bar-fill" style="width:${Math.max(3, Math.round(progress * 100))}%"></div></div>
  </div>`;

// ---------- Icônes « bonbon verre » ----------
// Formes pleines en dégradé (variables --ic-1 → --ic-2), reflet en haut à gauche, détails en
// --ic-detail. Les couleurs viennent du CSS : baie par défaut, prune pour un onglet inactif,
// champagne le soir (voir .gi dans screens.css). Pictogrammes sur une grille de 24.
const GLOSSY = {
  seance: { base: ['M3 19V10.6Q3 9 4.6 9H7Q8 11.6 10.5 10.6L11.5 7.6Q12 6.6 13 7L13.9 7.4Q14.6 7.8 14.3 8.6L13.6 11L17.6 13.2Q21 14.9 21 17.3V17.5Q21 19 19.5 19Z'],
    details: ['M3.2 16.4H20.8', 'M12.2 12.3l2 1.1', 'M11.3 14.1l2 1.1'] },
  historique: { base: ['M4 7a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 7v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18Z'],
    lines: ['M8.5 2.8v3.2M15.5 2.8v3.2'], details: ['M4 9.6h16', 'M9 14.6l2 2 4-4'] },
  stats: { base: ['M4.5 15.8l4.2-4.6 3.6 2.8 6.7-7.2V19.5H4.5Z'],
    lines: ['M4 19.5h16', 'M4.5 15.8l4.2-4.6 3.6 2.8 6.7-7.2'], dots: [[19, 6.8, 1.7]] },
  reglages: { base: ['M9 5.1a2.6 2.6 0 1 0 0 5.2a2.6 2.6 0 1 0 0-5.2Z', 'M15 13.9a2.6 2.6 0 1 0 0 5.2a2.6 2.6 0 1 0 0-5.2Z'],
    lines: ['M4 7.7h2.4M11.6 7.7H20M4 16.5h8.4M17.6 16.5H20'] },
  coeur: { base: ['M12 20.5s-7-4.3-9.1-8.9C1.4 8.3 3.5 4.8 7 4.8c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.5 0 5.6 3.5 4.1 6.8C19 16.2 12 20.5 12 20.5Z'],
    details: ['M7.4 8.3c-1 .2-1.8 1-2 2'] },
  lune: { base: ['M19.6 14.6A8.2 8.2 0 1 1 9.4 4.4a6.3 6.3 0 0 0 10.2 10.2Z'],
    sparkle: 'M17.4 3.6l.55 1.45 1.45.55-1.45.55-.55 1.45-.55-1.45-1.45-.55 1.45-.55Z' },
  lieu: { base: ['M12 21s-6.8-6-6.8-10.8a6.8 6.8 0 0 1 13.6 0C18.8 15 12 21 12 21Z'],
    details: ['M12 7.8a2.4 2.4 0 1 0 0 4.8a2.4 2.4 0 1 0 0-4.8Z'] },
  valide: { base: ['M12 3.2a8.8 8.8 0 1 0 0 17.6a8.8 8.8 0 1 0 0-17.6Z'], details: ['M8 12.4l2.8 2.8L16.2 9.6'] },
  pas: { base: ['M7.5 3.5c1.9 0 3 1.8 3 4.2 0 2.6-1.2 4.8-3 4.8s-3-2.2-3-4.8c0-2.4 1.1-4.2 3-4.2Z', 'M16.5 9.5c1.9 0 3 1.8 3 4.2 0 2.6-1.2 4.8-3 4.8s-3-2.2-3-4.8c0-2.4 1.1-4.2 3-4.2Z'],
    lines: ['M5.6 14.6l3.6.6M14.6 20.6l3.6.6'] },
};
let glossyUid = 0;

export function glossyIcon(name, size = 24, cls = '') {
  const ic = GLOSSY[name];
  const id = `gi${glossyUid += 1}`;
  const line = 'fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const parts = [
    `<defs><linearGradient id="${id}g" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" style="stop-color:var(--ic-1)"/><stop offset="1" style="stop-color:var(--ic-2)"/></linearGradient>`,
    `<clipPath id="${id}c">${ic.base.map((d) => `<path d="${d}"/>`).join('')}</clipPath></defs>`,
    ...(ic.lines || []).map((d) => `<path d="${d}" ${line} style="stroke:var(--ic-2)"/>`),
    ...ic.base.map((d) => `<path d="${d}" fill="url(#${id}g)"/>`),
    `<g clip-path="url(#${id}c)"><ellipse cx="8" cy="6.5" rx="7" ry="4" fill="#fff" opacity=".42" transform="rotate(-24 8 6.5)"/><path d="M3 20.5h18" stroke="#000" stroke-opacity=".12" stroke-width="3"/></g>`,
    ...(ic.details || []).map((d) => `<path d="${d}" ${line} style="stroke:var(--ic-detail)"/>`),
    ...(ic.dots || []).map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + 0.5}" style="fill:var(--ic-2);stroke:var(--ic-detail)" stroke-width="1.2"/>`),
    ic.sparkle ? `<path d="${ic.sparkle}" style="fill:var(--ic-2)"/>` : '',
  ];
  return `<svg class="gi ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${parts.join('')}</svg>`;
}

/** Icône ronde en verre (coche, cœur, lune…). */
export const roundBadge = (svg, { size = 104, tint = 'rgba(255,255,255,.55)', extra = '' } = {}) =>
  `<div class="lg round-badge" style="width:${size}px;height:${size}px;background:${tint};${extra}">${svg}</div>`;

export const HEART_SVG = glossyIcon('coeur', 54);
export const CHECK_SVG = '<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#3A2E3F" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
export const MOON_SVG = glossyIcon('lune', 62);

// ---------- Carte anecdote (§7.6) : image en fond, voile blanc à gauche, pastille de lieu ----------
// « Saint-Cyr-sur-Mer → Six-Fours-les-Plages » : chaque commune reste sur une ligne,
// le retour à la ligne ne peut se faire qu'après la flèche.
const placeHtml = (place) => String(place).split(' → ').map((p) => `<span class="nw">${esc(p)}</span>`).join(' → ');

export function anecdoteCard({ label = '', text, image, place, height = 166, textWidth = 236 }) {
  return `
    <div class="anecdote" style="min-height:${height}px">
      <img class="anecdote-img" src="${esc(image)}" alt="" onerror="this.onerror=null;this.src='assets/anecdotes/generic-route.svg'">
      <div class="anecdote-veil"></div>
      <div class="anecdote-body" style="width:${textWidth}px">
        ${label ? `<div class="label anecdote-label">${esc(label)}</div>` : ''}
        <p class="anecdote-text">${esc(text)}</p>
      </div>
      ${place ? `<div class="lg anecdote-place">${glossyIcon('lieu', 17)}<span>${placeHtml(place)}</span></div>` : ''}
    </div>`;
}

// ---------- Médaille de l'écran Bravo ----------
// Tombe au bout de son ruban, se balance, brille ; rayons et étincelles autour.
// Jalon franchi : médaille dorée gravée « 5 km » (10 km…). CSS seul ; avec
// prefers-reduced-motion, l'état final s'affiche directement (tokens.css).
const MEDAL_CHECK = '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

export function medal({ milestone = null, rnd = Math.random } = {}) {
  const n = milestone ? 9 : 5;
  let sparks = '';
  for (let i = 0; i < n; i += 1) {
    const ang = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.6;
    const dist = 70 + rnd() * (milestone ? 60 : 40);
    const x = Math.round(Math.cos(ang) * dist);
    const y = Math.round(Math.sin(ang) * dist * 0.8);
    const size = 10 + Math.round(rnd() * 8);
    sparks += `<i class="medal-spark" style="--x:${x}px;--y:${y}px;--s:${size}px;--del:${(0.75 + i * 0.12).toFixed(2)}s"></i>`;
  }
  const label = milestone
    ? `<span class="medal-km" style="font-size:${String(milestone).length > 2 ? 17 : 22}px">${esc(String(milestone))} km</span>`
    : MEDAL_CHECK;
  return `<div class="medal${milestone ? ' medal-gold' : ''}" aria-hidden="true">
    <div class="medal-glow"><div class="medal-rays"></div></div>${sparks}
    <div class="medal-swing"><div class="medal-ribbon"></div><div class="medal-face">${label}<i class="medal-shine"></i></div></div>
  </div>`;
}

// ---------- Typographie française ----------
// Espace insécable avant « ! ? : ; » et après « « », pour qu'un « ! » ne se
// retrouve jamais seul en début de ligne. Ne touche que les nœuds texte.
export function frenchSpacing(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.nodeValue;
    if (/ [!?:;»]|« /.test(t)) n.nodeValue = t.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');
  }
}

// ---------- Fenêtre de confirmation ----------
export function confirmDialog({ title, text, ok = 'Oui', cancel = 'Annuler' }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="lg modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title" class="modal-title">${esc(title)}</h2>
        <p class="modal-text">${esc(text)}</p>
        <button class="lgb btn btn-primary" type="button" data-ok>${esc(ok)}</button>
        <button class="lgg btn btn-secondary" type="button" data-cancel>${esc(cancel)}</button>
      </div>`;
    const close = (v) => { wrap.remove(); resolve(v); };
    wrap.querySelector('[data-ok]').addEventListener('click', () => close(true));
    wrap.querySelector('[data-cancel]').addEventListener('click', () => close(false));
    frenchSpacing(wrap);
    document.body.appendChild(wrap);
    wrap.querySelector('[data-ok]').focus();
  });
}

// Onglets de la barre du bas (icônes reprises des maquettes).
export const TABS = [
  { route: 'seance', label: 'Séance', icon: 'seance' },
  { route: 'historique', label: 'Historique', icon: 'historique' },
  { route: 'stats', label: 'Stats', icon: 'stats' },
  { route: 'reglages', label: 'Réglages', icon: 'reglages' },
];

// ---------- Compteurs animés ----------
// Les éléments [data-count] défilent de 0 jusqu'à leur valeur affichée (« 13,0 », « 18:40 », « 6 »).
// Le texte final est remis tel quel à la fin. Rien ne bouge si « Réduire les animations ».
export function countUp(root, { duration = 900, delay = 0 } = {}) {
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('[data-count]').forEach((el) => {
    const final = el.textContent.trim();
    let to; let fmt; let m;
    if ((m = final.match(/^(\d+):(\d{2})$/))) {
      to = Number(m[1]) * 60 + Number(m[2]);
      fmt = (v) => `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, '0')}`;
    } else if ((m = final.match(/^(\d+),(\d+)$/))) {
      const d = m[2].length;
      to = Number(`${m[1]}.${m[2]}`);
      fmt = (v) => v.toFixed(d).replace('.', ',');
    } else if (/^\d+$/.test(final)) {
      to = Number(final);
      fmt = (v) => String(Math.round(v));
    } else return;
    if (!to) return;
    el.textContent = fmt(0);
    const start = performance.now() + delay;
    const step = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      el.textContent = t < 1 ? fmt(to * (1 - (1 - t) ** 3)) : final;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// ---------- Anneau de progression vers le prochain jalon (Accueil) ----------
const RING_C = 2 * Math.PI * 54;
export function progressRing({ totalText, progress, next }) {
  const off = Math.round(RING_C * (1 - Math.min(1, Math.max(0, progress))) * 10) / 10;
  return `
    <div class="ring" role="img" aria-label="${esc(totalText)} km parcourus, prochain jalon ${esc(String(next))} km">
      <svg viewBox="0 0 132 132" aria-hidden="true">
        <defs><linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3D9B5"/><stop offset=".55" stop-color="#F0A0A0"/><stop offset="1" stop-color="#A51E4D"/></linearGradient></defs>
        <circle class="ring-track" cx="66" cy="66" r="54"/>
        <circle class="ring-prog" cx="66" cy="66" r="54" stroke="url(#ring-grad)" stroke-dasharray="${Math.round(RING_C * 10) / 10}" style="stroke-dashoffset:${off}"/>
      </svg>
      <div class="ring-c"><span class="ring-v" data-count>${esc(totalText)}</span><span class="ring-u">km</span></div>
    </div>`;
}
