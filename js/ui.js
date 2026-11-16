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

// Onglets de la barre du bas (icônes reprises des maquettes).
export const TABS = [
  { route: 'seance', label: 'Séance', d: 'M5 21V4M5 4h11l-2.5 4L16 12H5' },
  { route: 'historique', label: 'Historique', d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18ZM12 7v5l3 2' },
  { route: 'stats', label: 'Stats', d: 'M5 20V10M12 20V4M19 20v-7' },
  { route: 'reglages', label: 'Réglages', d: 'M4 8h16M4 16h16M9 5v6M15 13v6' },
];
