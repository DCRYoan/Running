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

/** Icône ronde en verre (coche, cœur, lune…). */
export const roundBadge = (svg, { size = 104, tint = 'rgba(255,255,255,.55)', extra = '' } = {}) =>
  `<div class="lg round-badge" style="width:${size}px;height:${size}px;background:${tint};${extra}">${svg}</div>`;

export const HEART_SVG = '<svg width="50" height="50" viewBox="0 0 24 24" fill="#F6A5BA" stroke="#3A2E3F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-4.4-9.2-9.1C1.3 8.6 3.4 5 7 5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 5.7 3.6 4.2 6.9C19 16.6 12 21 12 21Z"/></svg>';
export const CHECK_SVG = '<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#3A2E3F" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
export const MOON_SVG = '<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#3A2E3F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg>';

// ---------- Carte anecdote (§7.6) : image en fond, voile blanc à gauche, pastille de lieu ----------
const PIN_PATH = 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z';
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
      ${place ? `<div class="lg anecdote-place"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B02A52" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PIN_PATH}"/><circle cx="12" cy="10" r="2.4"/></svg><span>${placeHtml(place)}</span></div>` : ''}
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
  { route: 'seance', label: 'Séance', d: 'M5 21V4M5 4h11l-2.5 4L16 12H5' },
  { route: 'historique', label: 'Historique', d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18ZM12 7v5l3 2' },
  { route: 'stats', label: 'Stats', d: 'M5 20V10M12 20V4M19 20v-7' },
  { route: 'reglages', label: 'Réglages', d: 'M4 8h16M4 16h16M9 5v6M15 13v6' },
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
