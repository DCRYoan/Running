// Illustrations des anecdotes (§7.6) : assets/anecdotes/<id>.svg, viewBox 0 0 346 176.
// Style des références (references/cartes-anecdotes) : à plat, palette de l'app,
// soleil et nuage à gauche (zone calme sous le texte), SUJET SUR LA MOITIÉ DROITE.
// Pas de texte, pas de logo, pas de personnage reconnaissable.
// Usage : node tools/build-anecdote-art.mjs

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../assets/anecdotes/', import.meta.url));
const ROOT = fileURLToPath(new URL('..', import.meta.url));

// ---------- Palette ----------
const C = {
  peach: '#FDEBDD', pink: '#F9E1E6', apricot: '#FDE4D8', lav: '#EFE8F8', night: '#3B3366', dusk: '#5A4A8C',
  sunHalo: '#FFE8D2', sun: '#FFD3AE', sea1: '#A6DDE2', sea2: '#92D5DC', sea3: '#7FCBD3',
  hill1: '#CDEBDD', hill2: '#B9E1D0', leaf: '#8FD0BB', leaf2: '#A8DCCD', trunk: '#C9AEB8',
  sand1: '#FBE3B8', sand2: '#F6D3A0', stone: '#F6E7DD', stone2: '#E8C9BC', stone3: '#D9B8A5',
  lilac: '#E3DAF2', lilac2: '#CDBFE8', lilac3: '#C9BCE6', ink: '#8F7DB8',
  coral: '#FF7A59', yellow: '#FFC94D', rasp: '#D63A66', rose: '#F6D3DA', white: '#FFFFFF', green: '#34C3A8',
};

// ---------- Briques ----------
const svg = (bg, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 346 176" width="346" height="176">\n<rect width="346" height="176" fill="${bg}"/>\n${body}\n</svg>\n`;
const sun = (x = 64, y = 40, r = 21) => `<circle cx="${x}" cy="${y}" r="${r + 13}" fill="${C.sunHalo}" opacity="0.85"/><circle cx="${x}" cy="${y}" r="${r}" fill="${C.sun}"/>`;
const cloud = (x, y, o = 0.85) => `<g fill="#FFFFFF" opacity="${o}"><circle cx="${x + 8}" cy="${y + 6}" r="8"/><circle cx="${x + 20}" cy="${y - 1}" r="11"/><circle cx="${x + 34}" cy="${y + 5}" r="8"/><rect x="${x}" y="${y + 4}" width="42" height="9" rx="4.5"/></g>`;
const wave = (y, fill, x0 = 0, x1 = 346) => {
  let d = `M${x0} ${y} Q${x0 + 22} ${y - 7} ${x0 + 44} ${y}`;
  for (let x = x0 + 88; x <= x1 + 44; x += 44) d += ` T${x} ${y}`;
  return `<path d="${d} V176 H${x0} Z" fill="${fill}"/>`;
};
const sea = (y) => `<rect x="0" y="${y}" width="346" height="${176 - y}" fill="${C.sea1}"/>${wave(y + 16, C.sea2)}${y + 40 < 170 ? wave(y + 40, C.sea3) : ''}`;
const ripples = (pts) => `<g fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity="0.6">${pts.map(([x, y]) => `<path d="M${x} ${y} q10 -6 20 0 t20 0"/>`).join('')}</g>`;
const hills = (y = 140) => `<path d="M0 ${y} C80 ${y - 12} 190 ${y - 2} 346 ${y - 16} V176 H0 Z" fill="${C.hill1}"/><path d="M0 ${y + 20} C100 ${y + 10} 230 ${y + 22} 346 ${y + 8} V176 H0 Z" fill="${C.hill2}"/>`;
const sand = (y = 140) => `<path d="M0 ${y} C90 ${y - 8} 220 ${y - 2} 346 ${y - 10} V176 H0 Z" fill="${C.sand1}"/><path d="M0 ${y + 18} C100 ${y + 10} 230 ${y + 20} 346 ${y + 10} V176 H0 Z" fill="${C.sand2}"/>`;
const tree = (x, y, r = 10, c = C.leaf2) => `<rect x="${x - 1.5}" y="${y}" width="3" height="${r + 2}" rx="1.5" fill="${C.trunk}"/><circle cx="${x}" cy="${y - r * 0.4}" r="${r}" fill="${c}"/>`;
const pine = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})"><path d="M0 0 C1 -10 -2 -18 2 -26" stroke="${C.trunk}" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="2" cy="-30" rx="18" ry="7" fill="${C.leaf}"/><ellipse cx="-6" cy="-33" rx="10" ry="5" fill="${C.leaf2}"/></g>`;
const cypress = (x, y, h = 34) => `<ellipse cx="${x}" cy="${y - h / 2}" rx="${h / 7}" ry="${h / 2}" fill="#7FBFA8"/>`;
const palm = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})"><path d="M0 0 C2 -12 -1 -24 3 -36" stroke="${C.trunk}" stroke-width="3.4" fill="none" stroke-linecap="round"/><g fill="${C.leaf}"><path d="M3 -36 C-6 -42 -16 -40 -20 -32 C-12 -36 -4 -36 3 -36Z"/><path d="M3 -36 C12 -43 22 -40 26 -32 C18 -36 10 -36 3 -36Z"/><path d="M3 -36 C-2 -46 -10 -50 -16 -48 C-8 -46 -2 -42 3 -36Z"/><path d="M3 -36 C8 -46 16 -50 22 -48 C14 -46 8 -42 3 -36Z"/></g></g>`;
const boat = (x, y, s = 1, hull = C.rose, sail = C.white) => `<g transform="translate(${x},${y}) scale(${s})"><polygon points="0,-26 0,-2 17,-2" fill="${sail}"/><path d="M-10 -1 H24 L19 6 H-5 Z" fill="${hull}"/></g>`;
const pointu = (x, y, s = 1, c = C.coral) => `<g transform="translate(${x},${y}) scale(${s})"><path d="M-14 0 Q0 7 14 0 L12 -3 H-12 Z" fill="${c}"/><rect x="-1" y="-14" width="2" height="11" fill="${C.trunk}"/></g>`;
const parasol = (x, y, c = C.yellow) => `<rect x="${x - 1.5}" y="${y}" width="3" height="16" fill="${C.trunk}"/><path d="M${x - 11} ${y} Q${x} ${y - 14} ${x + 11} ${y} Z" fill="${c}"/>`;
const towel = (x, y, c1 = C.coral, c2 = C.rasp) => `<path d="M${x} ${y} L${x + 36} ${y - 6} L${x + 32} ${y - 11} L${x + 4} ${y - 6} Z" fill="${c1}" opacity="0.9"/><path d="M${x + 4} ${y - 6} L${x + 32} ${y - 11}" stroke="${c2}" stroke-width="3" stroke-linecap="round"/>`;
const house = (x, y, w, h, wall = C.stone, roof = '#F2B8A0') => `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${wall}"/><polygon points="${x - 2},${y - h} ${x + w / 2},${y - h - w * 0.32} ${x + w + 2},${y - h}" fill="${roof}"/><rect x="${x + w * 0.35}" y="${y - h * 0.6}" width="${w * 0.3}" height="${h * 0.3}" fill="#FFFFFF" opacity="0.6"/>`;
const tower = (x, y, w, h, c = C.lilac3) => `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${c}"/>`;
const windows = (pts) => `<g fill="#FFFFFF" opacity="0.55">${pts.map(([x, y]) => `<rect x="${x}" y="${y}" width="4" height="5"/>`).join('')}</g>`;
const birds = (x, y) => `<g fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round" opacity="0.7"><path d="M${x} ${y} q5 -5 10 0 q5 -5 10 0"/><path d="M${x + 26} ${y - 10} q4 -4 8 0 q4 -4 8 0"/></g>`;
const stars = (pts) => `<g fill="#FFFFFF">${pts.map(([x, y, r = 1.6]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`;
const vines = (y) => `<g stroke="${C.leaf}" stroke-width="4" stroke-linecap="round" opacity="0.9">${[0, 1, 2, 3].map((i) => `<path d="M${190 + i * 10} ${y + i * 9} L346 ${y - 6 + i * 9}"/>`).join('')}</g>`;
const pin = (x, y, c = C.rasp) => `<path d="M${x} ${y} c-9 -10 -12 -15 -12 -21 a12 12 0 0 1 24 0 c0 6 -3 11 -12 21Z" fill="${c}"/><circle cx="${x}" cy="${y - 21}" r="4.5" fill="#FFFFFF"/>`;
const plane = (x, y, s = 1, rot = -8) => `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s})"><path d="M-30 0 Q-30 -5 -22 -5 H18 Q30 -5 32 0 Q30 5 18 5 H-22 Q-30 5 -30 0Z" fill="#FFFFFF"/><path d="M-4 -4 L-16 -22 H-8 L10 -4Z M-4 4 L-16 22 H-8 L10 4Z" fill="${C.lilac2}"/><path d="M-24 -4 L-30 -14 H-25 L-17 -4Z" fill="${C.coral}"/></g>`;
const trail = (d) => `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="6 7" stroke-linecap="round" opacity="0.9"/>`;
const mountain = (pts, c = C.lilac) => `<polygon points="${pts}" fill="${c}"/>`;
const snow = (pts) => `<polygon points="${pts}" fill="#FFFFFF"/>`;
const road = (c = '#FFFAF6') => `<path d="M190 176 C210 150 250 136 300 128 L346 124 V132 C300 140 262 152 236 176 Z" fill="${c}"/><path d="M214 176 C232 156 262 142 300 134 L346 128" fill="none" stroke="${C.yellow}" stroke-width="2.4" stroke-dasharray="7 8"/>`;

// Scènes de base, déclinées par anecdote ----------
const beachScene = ({ bg = C.peach, right = '', boats = true, items = '' } = {}) => svg(bg, [
  sun(), cloud(192, 22), right,
  sea(100), boats ? boat(150, 104) : '',
  sand(138), items,
].join('\n'));

const portScene = ({ bg = C.peach, town = '', boats = '' } = {}) => svg(bg, [
  sun(), cloud(170, 22), town,
  sea(110), ripples([[20, 124], [140, 150]]), boats,
].join('\n'));

const roadScene = ({ bg = C.pink, far = '', side = '', sky = '' } = {}) => svg(bg, [
  sun(), cloud(176, 20), sky, far, hills(138), road(), side,
].join('\n'));

const skyline = (x0, heights, colors = [C.lilac, '#D9D0EE', '#F0CFD8']) => heights.map((h, i) => tower(x0 + i * 22, 142, 22, h, colors[i % colors.length])).join('');

// ---------- Une scène par anecdote ----------
const village = (x, y, c = C.stone) => [
  house(x, y, 22, 18, c), house(x + 18, y - 8, 20, 16, C.stone2), house(x + 36, y, 22, 20, c),
  `<rect x="${x + 28}" y="${y - 52}" width="10" height="34" fill="${C.stone2}"/><polygon points="${x + 26},${y - 52} ${x + 33},${y - 62} ${x + 40},${y - 52}" fill="#F2B8A0"/>`,
].join('');

const SCENES = {
  'plage-lecques': () => beachScene({
    right: `<path d="M346 96 C320 70 292 66 262 78 C250 84 238 96 232 110 L346 110 Z" fill="${C.hill1}"/>${tree(300, 72, 12, C.leaf)}`,
    items: `${towel(200, 150)}${parasol(270, 140)}${parasol(306, 146, C.coral)}`,
  }),
  'pont-brooklyn': () => svg(C.apricot, [
    sun(70, 90, 26), cloud(150, 24), skyline(190, [40, 58, 30]),
    sea(128), `<rect x="170" y="112" width="176" height="6" fill="${C.stone3}"/>`,
    ...[214, 300].map((x) => `<rect x="${x}" y="58" width="22" height="70" fill="${C.stone2}"/><path d="M${x + 4} 128 V82 Q${x + 11} 70 ${x + 18} 82 V128Z" fill="${C.apricot}"/>`),
    `<g fill="none" stroke="${C.ink}" stroke-width="1.6" opacity="0.7"><path d="M170 112 Q192 64 225 60"/><path d="M236 60 Q268 104 300 60"/><path d="M322 60 Q336 80 346 92"/></g>`,
  ].join('\n')),
  'champs-elysees': () => svg(C.pink, [
    sun(70, 52, 25), cloud(186, 26),
    `<g fill="${C.ink}" opacity="0.8"><path d="M232 142 V62 H312 V142 H292 V100 Q272 78 252 100 V142Z"/><rect x="226" y="54" width="92" height="10"/></g>`,
    `<g fill="${C.lilac2}">${[180, 198, 324, 338].map((x) => `<circle cx="${x}" cy="124" r="10"/>`).join('')}</g>`,
    hills(148), `<path d="M220 176 L262 142 H282 L326 176Z" fill="#FFFAF6"/>`,
  ].join('\n')),
  'toulon-mourillon': () => beachScene({
    bg: C.pink,
    right: `<path d="M346 106 L346 64 C330 58 300 60 286 74 L286 106Z" fill="${C.stone2}"/><rect x="292" y="56" width="40" height="18" fill="${C.stone}"/><g fill="${C.stone3}"><rect x="292" y="50" width="6" height="6"/><rect x="304" y="50" width="6" height="6"/><rect x="316" y="50" width="6" height="6"/><rect x="328" y="50" width="4" height="6"/></g>`,
    items: `${parasol(230, 140, C.coral)}${parasol(262, 144)}${palm(320, 150, 0.9)}`,
  }),
  'golden-gate': () => svg(C.apricot, [
    sun(70, 70, 26), cloud(140, 22),
    `<path d="M170 120 C220 96 260 110 346 90 V130 H170Z" fill="${C.lilac}"/>`,
    sea(118),
    `<rect x="160" y="104" width="186" height="5" fill="${C.coral}"/>`,
    ...[216, 312].map((x) => `<rect x="${x}" y="40" width="7" height="80" fill="${C.coral}"/><rect x="${x + 11}" y="40" width="7" height="80" fill="${C.coral}"/><rect x="${x}" y="52" width="18" height="4" fill="${C.coral}"/><rect x="${x}" y="74" width="18" height="4" fill="${C.coral}"/>`),
    `<g fill="none" stroke="${C.rasp}" stroke-width="1.8"><path d="M160 98 Q190 72 220 42"/><path d="M228 42 Q270 100 314 42"/><path d="M322 42 Q336 62 346 70"/></g>`,
  ].join('\n')),
  'corniche-kennedy': () => portScene({
    bg: C.peach,
    town: `<path d="M346 112 L346 70 C320 62 290 66 270 80 L250 112Z" fill="${C.stone2}"/><rect x="250" y="96" width="96" height="10" fill="${C.stone}"/><g fill="${C.peach}">${[258, 282, 306, 330].map((x) => `<path d="M${x} 112 V104 Q${x + 9} 96 ${x + 18} 104 V112Z"/>`).join('')}</g>${house(292, 72, 18, 14)}${house(314, 66, 20, 18, C.stone, '#F2A88C')}`,
    boats: `${boat(180, 132, 0.9)}${pointu(226, 150)}`,
  }),
  'grand-canal': () => svg(C.pink, [
    sun(64, 44, 22), cloud(170, 20),
    `<g>${[[196, 54, C.rose], [222, 66, C.stone], [246, 48, '#F2D3B8'], [272, 60, C.lilac], [298, 52, C.rose], [322, 64, C.stone]].map(([x, h, c]) => `<rect x="${x}" y="${120 - h}" width="26" height="${h}" fill="${c}"/><g fill="#FFFFFF" opacity="0.6"><path d="M${x + 6} ${130 - h} v-4 a3 3 0 0 1 6 0 v4z"/><path d="M${x + 15} ${130 - h} v-4 a3 3 0 0 1 6 0 v4z"/></g>`).join('')}</g>`,
    sea(118), ripples([[40, 140], [120, 160]]),
    `<path d="M200 146 Q240 154 290 146 Q296 140 302 136 Q300 146 290 152 Q240 160 196 150Z" fill="${C.ink}"/><rect x="262" y="124" width="2" height="24" fill="${C.ink}"/><circle cx="263" cy="121" r="4" fill="${C.coral}"/>`,
  ].join('\n')),
  copacabana: () => beachScene({
    bg: C.apricot,
    right: `<path d="M240 104 C250 70 262 54 276 56 C290 58 292 84 300 104Z" fill="${C.leaf}"/><path d="M296 104 C304 84 316 76 330 80 C342 84 346 96 346 104Z" fill="${C.hill1}"/>`,
    items: `${palm(212, 150, 1)}${parasol(262, 140, C.rasp)}${parasol(300, 146, C.yellow)}`,
  }),
  'saint-cyr-cadiere': () => svg(C.peach, [
    sun(), cloud(176, 22),
    `<path d="M176 140 C210 96 250 70 290 66 C320 64 340 76 346 84 V140Z" fill="${C.hill1}"/>`,
    village(262, 76),
    vines(118), hills(146), cypress(206, 140, 30),
  ].join('\n')),
  'sanary-six-fours': () => portScene({
    bg: C.pink,
    town: `<path d="M346 112 C320 60 290 44 262 56 C246 64 236 90 228 112Z" fill="${C.hill1}"/><rect x="282" y="34" width="22" height="16" fill="${C.stone}"/><rect x="288" y="24" width="10" height="12" fill="${C.stone2}"/>${pine(250, 104, 0.9)}${pine(330, 100, 0.8)}`,
    boats: `${boat(170, 130, 0.9)}${pointu(220, 148, 1, C.yellow)}`,
  }),
  'lecques-port-alon': () => svg(C.peach, [
    sun(), cloud(170, 22),
    sea(96), boat(184, 112, 0.8),
    `<path d="M346 176 V54 C326 50 300 58 286 82 C276 100 270 132 262 176Z" fill="${C.stone2}"/><path d="M346 176 C330 140 312 128 298 134 C286 140 280 156 278 176Z" fill="${C.stone}"/>`,
    pine(312, 60, 1.1), pine(286, 84, 0.8),
    sand(150).replace(/346/g, '240'),
  ].join('\n')),
  'toulon-faron': () => svg(C.pink, [
    sun(64, 40), cloud(150, 20),
    `<path d="M170 176 C200 120 240 66 286 54 C316 46 340 60 346 66 V176Z" fill="${C.lilac}"/><path d="M200 176 C230 140 264 112 300 104 C326 98 346 108 346 108 V176Z" fill="${C.lilac2}"/>`,
    `<path d="M150 150 L296 58" stroke="${C.ink}" stroke-width="1.6"/><g transform="translate(232,98)"><rect x="-1" y="-6" width="2" height="8" fill="${C.ink}"/><rect x="-9" y="2" width="18" height="12" rx="3" fill="${C.coral}"/></g>`,
    `<rect x="292" y="44" width="22" height="12" fill="${C.stone}"/>`,
    sea(150),
  ].join('\n')),
  'sanary-bandol': () => portScene({
    bg: C.peach,
    town: `${house(214, 110, 20, 22, '#F7D9C4')}${house(236, 110, 22, 28, C.rose)}${house(260, 110, 20, 20, C.stone)}${house(282, 110, 24, 26, '#F2D3B8')}${palm(318, 112, 1.1)}${palm(200, 112, 0.8)}`,
    boats: `${pointu(190, 132)}${pointu(240, 140, 1, C.yellow)}${pointu(290, 134, 1, '#7FCBD3')}${boat(150, 152, 0.8)}`,
  }),
  'sanary-brusc': () => portScene({
    bg: C.pink,
    town: `<path d="M260 110 C280 92 310 88 346 96 V110Z" fill="${C.hill1}"/>${house(276, 104, 18, 14)}${house(296, 104, 20, 18, C.rose)}`,
    boats: `${pointu(200, 130, 1.1)}${pointu(244, 138, 1.1, C.yellow)}${pointu(296, 132, 1.1, C.rasp)}`,
  }),
  porquerolles: () => svg(C.apricot, [
    sun(), cloud(170, 22),
    sea(96),
    `<path d="M190 118 C220 92 260 82 300 84 C326 86 346 96 346 96 V122 H190Z" fill="${C.hill1}"/><path d="M196 122 C240 114 290 116 346 112 V126 H196Z" fill="${C.sand1}"/>`,
    pine(234, 100, 1), pine(272, 92, 1.1), pine(312, 94, 0.9),
    boat(160, 140, 0.9), ripples([[40, 150], [220, 156]]),
  ].join('\n')),
  'saint-cyr-castellet': () => svg(C.pink, [
    sun(), cloud(170, 20),
    `<path d="M196 140 C226 100 256 76 290 72 C320 70 340 82 346 90 V140Z" fill="${C.hill1}"/>`,
    `<path d="M262 82 V60 H278 V52 H286 V60 H310 V82Z" fill="${C.stone}"/><g fill="${C.stone3}"><rect x="262" y="56" width="5" height="5"/><rect x="272" y="56" width="5" height="5"/></g>`,
    vines(118), hills(146), cypress(222, 140, 28), cypress(236, 142, 22),
  ].join('\n')),
  'saint-cyr-bandol': () => roadScene({
    bg: C.peach,
    far: `<rect x="0" y="108" width="346" height="22" fill="${C.sea1}"/>${boat(150, 118, 0.7)}`,
    side: `${palm(300, 128, 1)}${palm(330, 124, 0.8)}${pin(318, 92)}`,
  }),
  'central-park': () => svg(C.apricot, [
    sun(78, 96, 26), cloud(150, 26), skyline(200, [52, 76, 44, 60, 70, 40]),
    hills(132),
    `<ellipse cx="262" cy="160" rx="54" ry="9" fill="#BFE3EE"/>`,
    tree(206, 138, 16, C.leaf), tree(236, 142, 12), tree(320, 140, 18, C.leaf), tree(298, 148, 12),
  ].join('\n')),
  'saint-cyr-la-ciotat': () => portScene({
    bg: C.pink,
    town: `<path d="M346 110 C330 70 300 60 280 72 L262 110Z" fill="${C.stone2}"/><g stroke="${C.ink}" stroke-width="3" fill="none" stroke-linecap="round"><path d="M226 110 V44 L262 52"/><path d="M226 56 L250 60 V76"/></g><rect x="216" y="104" width="22" height="8" fill="${C.ink}"/>`,
    boats: `${boat(180, 134, 0.9)}${pointu(300, 140, 1, C.yellow)}`,
  }),
  giens: () => svg(C.peach, [
    sun(), cloud(170, 22),
    sea(90),
    `<path d="M200 122 C220 96 252 84 284 88 C316 92 334 104 346 110 V124 H200Z" fill="${C.hill1}"/><path d="M176 132 C220 126 260 128 346 120 V132 H176Z" fill="${C.sand1}"/>`,
    pine(244, 100, 1), pine(292, 96, 1.1), trail('M206 124 C230 108 260 98 300 100 C320 102 336 110 346 116'),
    ripples([[30, 150], [200, 156]]),
  ].join('\n')),
  'manhattan-harlem': () => svg(C.lav, [
    sun(70, 90, 26), cloud(150, 24),
    skyline(190, [36, 52, 70, 48, 86, 60, 40]),
    `<g fill="${C.lilac3}"><rect x="270" y="38" width="6" height="20"/><rect x="266" y="56" width="14" height="10"/></g>`,
    windows([[196, 116], [220, 100], [242, 84], [266, 112], [290, 70], [312, 96]]),
    hills(144), trail('M190 168 C230 160 280 158 346 150'),
  ].join('\n')),
  'lecques-sanary': () => svg(C.peach, [
    sun(), cloud(170, 22),
    sea(100),
    `<path d="M346 108 C326 90 300 84 280 92 C264 98 252 104 244 110 L346 110Z" fill="${C.hill1}"/>${house(300, 98, 16, 12)}${house(318, 98, 18, 16, C.rose)}`,
    sand(140), trail('M120 150 C180 140 240 132 330 112'), pine(214, 148, 0.9), pin(326, 98),
  ].join('\n')),
  'toulon-bandol': () => roadScene({
    bg: C.peach,
    far: `<rect x="0" y="104" width="346" height="26" fill="${C.sea1}"/>${pointu(210, 116, 0.9)}`,
    side: `${pine(312, 130, 1)}${pin(330, 100)}`,
  }),
  'marseille-aubagne': () => roadScene({
    bg: C.pink,
    far: `<path d="M220 128 C250 98 280 90 310 98 C330 104 346 112 346 112 V130 H220Z" fill="${C.lilac}"/><rect x="282" y="62" width="30" height="20" fill="${C.stone2}"/><rect x="292" y="40" width="10" height="24" fill="${C.stone2}"/><circle cx="297" cy="36" r="4" fill="${C.yellow}"/>`,
    side: tree(330, 140, 10),
  }),
  'toulon-hyeres': () => roadScene({
    bg: C.apricot,
    far: `<path d="M200 130 C240 104 280 96 320 102 L346 106 V130Z" fill="${C.lilac}"/>`,
    side: `${palm(250, 140, 1)}${palm(290, 132, 1.1)}${palm(330, 128, 0.9)}`,
  }),
  versailles: () => svg(C.pink, [
    sun(70, 52, 25), cloud(186, 26),
    `<g fill="${C.lilac}"><rect x="188" y="92" width="158" height="44"/><rect x="236" y="80" width="62" height="14"/><polygon points="236,80 267,66 298,80"/></g>`,
    `<g fill="#FFFFFF" opacity="0.6">${[196, 212, 228, 304, 320, 336].map((x) => `<rect x="${x}" y="102" width="6" height="12"/>`).join('')}</g>`,
    `<g stroke="${C.yellow}" stroke-width="2.2">${[200, 214, 228, 242, 256, 270, 284, 298, 312, 326].map((x) => `<path d="M${x} 150 V126"/>`).join('')}<path d="M196 132 H334"/></g>`,
    hills(150), cypress(180, 150, 22), cypress(340, 152, 22),
  ].join('\n')),
  'semi-marathon': () => svg(C.apricot, [
    sun(), cloud(160, 22), hills(140),
    `<path d="M214 140 V74 Q262 34 310 74 V140 H298 V80 Q262 50 226 80 V140Z" fill="${C.coral}"/>`,
    `<g>${[[222, 64, C.yellow], [240, 52, C.rasp], [262, 46, C.green], [284, 52, C.yellow], [302, 64, C.rasp]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="7" fill="${c}"/>`).join('')}</g>`,
    `<path d="M226 140 L298 140 L330 176 H194Z" fill="#FFFAF6"/>`,
  ].join('\n')),
  'manhattan-total': () => svg(C.apricot, [
    sun(70, 96, 26), cloud(150, 24),
    skyline(188, [30, 44, 60, 80, 96, 70, 50, 34]),
    `<g fill="${C.lilac3}"><rect x="270" y="30" width="8" height="18"/><rect x="273" y="20" width="2" height="12"/></g>`,
    sea(140), boat(220, 156, 0.8),
  ].join('\n')),
  'saint-cyr-toulon': () => roadScene({
    bg: C.pink,
    far: `<path d="M220 128 L346 128 L346 84 C326 74 304 72 286 82 L260 72 C246 82 232 104 220 128Z" fill="${C.lilac}"/>`,
    side: `${pin(300, 104)}${tree(330, 140, 9)}`,
  }),
  'saint-cyr-marseille': () => portScene({
    bg: C.peach,
    town: `<path d="M346 112 L346 64 C322 52 286 58 262 80 C250 92 244 104 240 112Z" fill="${C.stone2}"/><rect x="282" y="48" width="38" height="24" fill="${C.stone}"/><rect x="296" y="22" width="12" height="28" fill="${C.stone}"/><circle cx="302" cy="16" r="4" fill="${C.yellow}"/>`,
    boats: `${boat(170, 134)}${boat(232, 150, 0.8, C.coral)}`,
  }),
  'toulon-cassis': () => svg(C.pink, [
    sun(), cloud(170, 20),
    sea(98),
    `<path d="M346 176 V40 C330 36 316 44 306 62 C294 84 290 120 282 176Z" fill="${C.stone2}"/><path d="M300 60 C304 52 312 46 322 44" stroke="${C.stone3}" stroke-width="3" fill="none"/>`,
    house(226, 104, 18, 14, '#F7D9C4'), house(246, 104, 20, 18, C.rose), pointu(210, 128), boat(180, 150, 0.8),
  ].join('\n')),
  marathon: () => svg(C.pink, [
    sun(), cloud(160, 22), hills(140),
    `<path d="M206 140 V66 Q262 22 318 66 V140 H304 V72 Q262 40 220 72 V140Z" fill="${C.rasp}"/>`,
    `<g>${[[212, 58, C.yellow], [230, 44, C.coral], [250, 36, C.green], [274, 36, C.yellow], [294, 44, C.coral], [312, 58, C.green]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="7" fill="${c}"/>`).join('')}</g>`,
    `<path d="M218 140 L306 140 L336 176 H188Z" fill="#FFFAF6"/>`,
    `<g stroke="${C.yellow}" stroke-width="2" stroke-linecap="round"><path d="M190 30 l6 6"/><path d="M332 30 l-6 6"/><path d="M180 50 h8"/><path d="M336 50 h8"/></g>`,
  ].join('\n')),
  'saint-cyr-aix': () => roadScene({
    bg: C.apricot,
    far: `<path d="M196 130 C224 100 248 70 280 62 C300 58 316 70 330 84 L346 96 V130Z" fill="${C.lilac}"/><path d="M262 66 C276 60 292 62 304 72" stroke="#FFFFFF" stroke-width="3" fill="none" opacity="0.7"/>`,
    side: `${cypress(320, 140, 30)}${tree(296, 146, 9)}`,
  }),
  'toulon-saint-tropez': () => portScene({
    bg: C.apricot,
    town: `${house(212, 110, 20, 24, '#F7D9C4')}${house(234, 110, 22, 30, C.rose)}${house(258, 110, 20, 22, '#FFE3A8')}<rect x="286" y="62" width="14" height="48" fill="#F2D3B8"/><path d="M284 62 Q293 48 302 62Z" fill="${C.coral}"/>${house(304, 110, 22, 26, C.stone)}`,
    boats: `${boat(190, 136, 1.1)}${boat(260, 146, 1, C.coral)}`,
  }),
  'marseille-avignon': () => svg(C.peach, [
    sun(), cloud(170, 20),
    `<path d="M200 110 V62 H236 V50 H252 V62 H300 V110Z" fill="${C.stone2}"/><g fill="${C.stone3}">${[200, 214, 228, 270, 284, 296].map((x) => `<rect x="${x}" y="58" width="4" height="5"/>`).join('')}</g>`,
    sea(110).replace(new RegExp(C.sea1, 'g'), C.sea2),
    `<g fill="${C.stone2}"><path d="M200 120 H300 V128 H200Z"/>${[204, 236, 268].map((x) => `<path d="M${x} 128 Q${x + 14} 112 ${x + 28} 128 V140 H${x}Z" fill="${C.sea1}"/>`).join('')}</g>`,
    hills(152),
  ].join('\n')),
  'marseille-montpellier': () => roadScene({
    bg: C.lav,
    far: `<path d="M200 130 C230 112 270 108 346 112 V130Z" fill="${C.sea1}"/><g fill="${C.rose}"><circle cx="252" cy="116" r="3"/><circle cx="262" cy="112" r="3"/><circle cx="272" cy="116" r="3"/></g><g stroke="${C.rasp}" stroke-width="2"><path d="M252 119 v6"/><path d="M262 115 v10"/><path d="M272 119 v6"/></g>`,
    side: `${pin(312, 104)}`,
  }),
  'toulon-cannes': () => svg(C.pink, [
    sun(), cloud(170, 20),
    sea(104), boat(170, 124, 0.9),
    `<rect x="190" y="134" width="156" height="42" fill="${C.sand1}"/>`,
    palm(214, 136, 1), palm(262, 134, 1.1), palm(312, 136, 1),
    `<g>${[236, 286, 330].map((x, i) => `<path d="M${x - 9} 158 Q${x} 146 ${x + 9} 158 Z" fill="${[C.yellow, C.coral, C.rasp][i]}"/><rect x="${x - 1}" y="158" width="2" height="10" fill="${C.trunk}"/>`).join('')}</g>`,
  ].join('\n')),
  'tour-mont-blanc': () => svg(C.lav, [
    sun(64, 40), cloud(150, 24),
    mountain('180,140 236,70 262,92 300,34 346,90 346,140'), snow('284,56 300,34 316,58 306,52 296,60'), snow('226,82 236,70 246,82 240,80'),
    mountain('170,150 220,110 260,140 300,104 346,140 346,150', C.lilac2), hills(150), trail('M190 170 C230 150 270 152 300 140 C320 132 336 132 346 128'),
  ].join('\n')),
  'saint-cyr-nice': () => svg(C.apricot, [
    sun(), cloud(170, 20),
    `<path d="M346 104 C320 70 290 64 270 78 L250 104Z" fill="${C.hill1}"/>`,
    sea(102),
    `<path d="M180 142 C240 128 300 126 346 118 V176 H180Z" fill="${C.stone}"/>`,
    `<g>${[214, 250, 286, 322].map((x) => `<path d="M${x} 150 h16 v-10 h4 v14 h-20Z" fill="#7FCBD3"/>`).join('')}</g>`,
    palm(198, 140, 1), palm(336, 132, 0.9),
  ].join('\n')),
  gr20: () => svg(C.peach, [
    sun(64, 40), cloud(150, 20),
    mountain('176,150 210,96 230,110 262,58 284,84 306,48 346,100 346,150'),
    mountain('190,160 230,124 262,140 300,112 346,140 346,160', C.lilac2),
    trail('M180 172 C210 150 230 146 252 128 C268 116 284 108 302 74'),
    pine(330, 168, 0.9), hills(158),
  ].join('\n')),
  'marseille-lyon': () => roadScene({
    bg: C.pink,
    far: `<path d="M220 130 C250 96 286 84 320 90 L346 94 V130Z" fill="${C.lilac}"/><rect x="276" y="70" width="28" height="18" fill="${C.stone}"/><rect x="276" y="60" width="6" height="12" fill="${C.stone}"/><rect x="298" y="60" width="6" height="12" fill="${C.stone}"/>`,
    side: `${pin(240, 110)}`,
  }),
  'paris-londres': () => svg(C.lav, [
    sun(70, 52), cloud(170, 24), plane(250, 40, 0.8),
    `<rect x="268" y="66" width="20" height="76" fill="${C.lilac3}"/><polygon points="266,66 278,40 290,66" fill="${C.lilac3}"/><circle cx="278" cy="80" r="6" fill="#FFFFFF" opacity="0.7"/>`,
    `<rect x="196" y="110" width="150" height="32" fill="${C.lilac}"/>`, sea(140),
  ].join('\n')),
  'paris-lyon': () => roadScene({
    bg: C.apricot,
    far: `<path d="M200 130 C240 104 280 96 346 100 V130Z" fill="${C.lilac}"/><g fill="${C.ink}" opacity="0.8"><path d="M300 102 L306 62 L312 102Z"/><rect x="296" y="84" width="20" height="3"/></g><rect x="236" y="88" width="26" height="16" fill="${C.stone}"/><rect x="236" y="80" width="5" height="10" fill="${C.stone}"/><rect x="257" y="80" width="5" height="10" fill="${C.stone}"/>`,
    side: tree(220, 146, 9),
  }),
  'saint-cyr-paris': () => roadScene({
    bg: C.pink,
    far: `<g transform="translate(300,128) scale(0.2)"><path d="M0 -450 L4 -400 L10 -378 L26 -378 L26 -370 L16 -370 L30 -157 L40 -157 L40 -148 L30 -148 L62 -77 L70 -77 L70 -66 L62 -66 L78 0 L48 0 L38 -34 Q0 -76 -38 -34 L-48 0 L-78 0 L-62 -66 L-70 -66 L-70 -77 L-62 -77 L-30 -148 L-40 -148 L-40 -157 L-30 -157 L-16 -370 L-26 -370 L-26 -378 L-10 -378 L-4 -400 Z" fill="${C.ink}" opacity="0.8"/></g>`,
    side: `${pin(232, 112)}`,
    sky: plane(230, 44, 0.6),
  }),
  camino: () => svg(C.peach, [
    sun(64, 40), cloud(150, 20),
    `<g fill="${C.stone2}"><rect x="262" y="66" width="18" height="70"/><rect x="310" y="66" width="18" height="70"/><rect x="278" y="92" width="34" height="44"/><polygon points="260,66 271,40 282,66"/><polygon points="308,66 319,40 330,66"/></g>`,
    hills(138), trail('M180 176 C210 156 240 150 270 146'),
    `<g transform="translate(214,118)"><path d="M0 0 L-14 -22 Q0 -32 14 -22Z" fill="${C.yellow}"/><g stroke="${C.coral}" stroke-width="1.6"><path d="M0 0 L-8 -24"/><path d="M0 0 L0 -27"/><path d="M0 0 L8 -24"/></g></g>`,
  ].join('\n')),
  'paris-berlin': () => svg(C.lav, [
    sun(70, 52), cloud(170, 24), plane(220, 36, 0.6),
    `<g fill="${C.lilac3}"><rect x="210" y="70" width="130" height="10"/>${[214, 238, 262, 286, 310, 330].map((x) => `<rect x="${x}" y="80" width="8" height="58"/>`).join('')}<rect x="252" y="58" width="46" height="12"/></g>`,
    hills(146),
  ].join('\n')),
  'paris-rome': () => svg(C.apricot, [
    sun(), cloud(160, 22), plane(220, 30, 0.55),
    `<path d="M196 138 V74 Q270 58 346 70 V138Z" fill="${C.stone2}"/>`,
    `<g fill="${C.apricot}">${[0, 1, 2].map((r) => [204, 228, 252, 276, 300, 324].map((x) => `<path d="M${x} ${132 - r * 20} v-8 a6 6 0 0 1 12 0 v8z"/>`).join('')).join('')}</g>`,
    cypress(186, 146, 30), hills(148),
  ].join('\n')),
  'paris-lisbonne': () => svg(C.peach, [
    sun(), cloud(160, 22),
    `<path d="M190 176 C220 120 270 96 346 90 V176Z" fill="${C.hill1}"/>`,
    house(230, 132, 20, 18, C.yellow), house(252, 122, 22, 22, '#F7D9C4'), house(278, 112, 22, 20, C.rose), house(302, 104, 24, 22, '#BFE3EE'),
    `<g transform="translate(268,156) rotate(-14)"><rect x="-24" y="-16" width="48" height="20" rx="4" fill="${C.yellow}"/><rect x="-18" y="-12" width="10" height="8" fill="#FFFFFF" opacity="0.7"/><rect x="-4" y="-12" width="10" height="8" fill="#FFFFFF" opacity="0.7"/><rect x="10" y="-12" width="8" height="8" fill="#FFFFFF" opacity="0.7"/></g>`,
  ].join('\n')),
  'paris-athenes': () => svg(C.apricot, [
    sun(), cloud(160, 22), plane(220, 32, 0.55),
    `<path d="M180 150 C220 112 270 104 346 108 V150Z" fill="${C.stone2}"/>`,
    `<g fill="${C.stone}"><polygon points="214,82 270,62 326,82"/><rect x="214" y="82" width="112" height="6"/>${[218, 236, 254, 272, 290, 308].map((x) => `<rect x="${x}" y="88" width="8" height="26"/>`).join('')}<rect x="210" y="114" width="120" height="6"/></g>`,
    hills(150),
  ].join('\n')),
  'paris-moscou': () => svg(C.lav, [
    sun(70, 52), cloud(150, 24), plane(220, 30, 0.55),
    ...[[226, 96, C.coral], [262, 76, C.green], [300, 92, C.yellow]].map(([x, y, c]) => `<rect x="${x - 10}" y="${y + 10}" width="20" height="${142 - y - 10}" fill="${C.stone}"/><path d="M${x} ${y - 18} C${x + 14} ${y - 6} ${x + 14} ${y + 10} ${x} ${y + 12} C${x - 14} ${y + 10} ${x - 14} ${y - 6} ${x} ${y - 18}Z" fill="${c}"/><rect x="${x - 1}" y="${y - 28}" width="2" height="10" fill="${C.ink}"/>`),
    hills(146),
  ].join('\n')),
  'paris-le-caire': () => svg(C.peach, [
    sun(), cloud(150, 22), plane(220, 30, 0.55),
    `<polygon points="198,140 252,72 306,140" fill="${C.sand2}"/><polygon points="252,72 306,140 276,140" fill="#E9BF86"/><polygon points="270,140 310,90 346,140" fill="${C.sand1}"/>`,
    sand(140), palm(330, 160, 0.8),
  ].join('\n')),
  'route-66': () => svg(C.apricot, [
    sun(), cloud(150, 20),
    `<path d="M180 124 L210 96 H240 L254 84 H280 L294 124Z" fill="${C.stone2}"/><path d="M300 124 L316 104 H332 L346 116 V124Z" fill="${C.stone2}"/>`,
    sand(124),
    `<path d="M250 124 L270 124 L346 176 H206Z" fill="${C.lilac2}"/><path d="M260 124 L276 176" stroke="${C.yellow}" stroke-width="3" stroke-dasharray="8 8"/>`,
    `<g fill="${C.leaf}"><rect x="320" y="128" width="7" height="28" rx="3.5"/><rect x="311" y="136" width="6" height="12" rx="3"/><rect x="330" y="132" width="6" height="12" rx="3"/></g>`,
  ].join('\n')),
  'paris-new-york': () => svg(C.lav, [
    sun(64, 44), cloud(150, 26), plane(226, 46, 0.9, -6),
    `<path d="M120 60 C170 30 210 32 248 44" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="4 6" opacity="0.8"/>`,
    sea(110), skyline(270, [26, 40, 30]), ripples([[40, 140], [180, 154]]),
  ].join('\n')),
  'paris-tokyo': () => svg(C.pink, [
    sun(64, 40), cloud(150, 20), plane(196, 30, 0.55),
    mountain('190,140 268,58 346,140'), snow('248,78 268,58 288,78 278,74 268,82 258,74'),
    `<g fill="${C.rasp}"><rect x="300" y="96" width="34" height="5"/><rect x="304" y="104" width="4" height="36"/><rect x="326" y="104" width="4" height="36"/><rect x="302" y="108" width="30" height="3"/></g>`,
    hills(150), `<g fill="#F6B8C8">${[[206, 140], [222, 132], [214, 126], [234, 140]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7"/>`).join('')}</g>`,
  ].join('\n')),
  'paris-sydney': () => svg(C.apricot, [
    sun(), cloud(150, 22), plane(206, 28, 0.55),
    sea(122),
    `<rect x="196" y="116" width="150" height="8" fill="${C.stone2}"/>`,
    `<g fill="#FFFFFF" stroke="${C.lilac2}" stroke-width="1.4"><path d="M212 116 Q222 74 252 66 Q240 92 244 116Z"/><path d="M244 116 Q256 70 290 60 Q274 90 280 116Z"/><path d="M280 116 Q292 80 322 76 Q310 98 314 116Z"/></g>`,
    ripples([[40, 146], [220, 156]]),
  ].join('\n')),
  'grande-muraille': () => svg(C.peach, [
    sun(64, 40), cloud(150, 20),
    mountain('170,150 220,90 270,120 320,70 346,86 346,150', C.hill1),
    `<path d="M176 140 C200 120 214 100 230 98 C250 96 262 116 276 112 C294 106 304 82 322 78 L346 82" fill="none" stroke="${C.stone2}" stroke-width="9" stroke-linejoin="round"/>`,
    `<g fill="${C.stone3}"><rect x="226" y="88" width="12" height="12"/><rect x="316" y="68" width="12" height="12"/></g>`,
    hills(150),
  ].join('\n')),
  'tour-du-monde': () => svg(C.lav, [
    sun(64, 40), cloud(140, 22),
    `<circle cx="276" cy="94" r="58" fill="${C.sea1}"/><path d="M240 60 C256 54 270 64 266 80 C262 92 246 90 240 104 C236 92 230 72 240 60Z M286 90 C302 84 320 96 314 116 C310 132 292 136 288 122 C284 110 276 98 286 90Z M268 132 C276 130 282 140 276 146 C270 148 262 140 268 132Z" fill="${C.leaf}"/>`,
    `<ellipse cx="276" cy="94" rx="80" ry="18" fill="none" stroke="${C.coral}" stroke-width="2.4" stroke-dasharray="6 6" transform="rotate(-14 276 94)"/>`,
    `<circle cx="342" cy="76" r="5" fill="${C.rasp}"/>`,
  ].join('\n')),
  'terre-lune': () => svg(C.night, [
    stars([[30, 30], [90, 20], [140, 60], [180, 24], [60, 110], [120, 140], [210, 150], [330, 20, 1.2], [250, 18]]),
    `<circle cx="282" cy="80" r="46" fill="#F3EEDC"/><g fill="#E2DCC4"><circle cx="266" cy="68" r="9"/><circle cx="294" cy="98" r="12"/><circle cx="300" cy="64" r="6"/></g>`,
    `<path d="M150 170 C190 140 220 120 236 104" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="4 6" opacity="0.7"/>`,
    `<circle cx="150" cy="190" r="34" fill="${C.sea1}"/>`,
  ].join('\n')),
  'aller-retour-lune': () => svg(C.dusk, [
    stars([[30, 30], [90, 20], [140, 60], [180, 24], [60, 110], [120, 140], [330, 150, 1.2], [250, 160]]),
    `<circle cx="290" cy="64" r="38" fill="#F3EEDC"/><g fill="#E2DCC4"><circle cx="278" cy="56" r="7"/><circle cx="302" cy="78" r="9"/></g>`,
    `<path d="M190 160 C200 110 240 96 254 82 M262 98 C250 120 236 150 206 168" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="4 6" opacity="0.75"/>`,
    `<g transform="translate(222,128) rotate(30)"><path d="M0 -18 C8 -10 8 6 5 12 H-5 C-8 6 -8 -10 0 -18Z" fill="#FFFFFF"/><path d="M-5 12 L-9 18 H9 L5 12Z" fill="${C.coral}"/><circle cx="0" cy="-4" r="3" fill="${C.sea1}"/></g>`,
  ].join('\n')),
  'terre-soleil': () => svg(C.apricot, [
    `<circle cx="300" cy="88" r="80" fill="${C.sunHalo}"/><circle cx="300" cy="88" r="58" fill="${C.sun}"/><circle cx="300" cy="88" r="40" fill="${C.yellow}" opacity="0.8"/>`,
    `<g stroke="${C.coral}" stroke-width="3" stroke-linecap="round" opacity="0.7"><path d="M222 88 h-12"/><path d="M236 44 l-9 -7"/><path d="M236 132 l-9 7"/></g>`,
    cloud(130, 30),
    `<circle cx="150" cy="128" r="10" fill="${C.sea1}"/><path d="M146 124 c3 -2 6 0 5 3 c-1 3 -4 3 -5 6z" fill="${C.leaf}"/>`,
    `<path d="M162 124 C190 112 214 102 232 96" fill="none" stroke="${C.ink}" stroke-width="2" stroke-dasharray="4 6" opacity="0.6"/>`,
  ].join('\n')),
  'generic-route': () => svg(C.peach, [
    sun(), cloud(170, 22), hills(130),
    `<path d="M190 176 C200 150 240 150 252 128 C262 110 290 104 318 96" fill="none" stroke="#FFFAF6" stroke-width="12" stroke-linecap="round"/>`,
    `<path d="M190 176 C200 150 240 150 252 128 C262 110 290 104 318 96" fill="none" stroke="${C.yellow}" stroke-width="2.4" stroke-dasharray="6 7"/>`,
    pin(214, 156, C.green), pin(318, 94), tree(290, 146, 10), tree(240, 112, 8),
  ].join('\n')),
};

// ---------- Génération ----------
const { anecdotes, genericImage } = JSON.parse(await readFile(`${ROOT}data/anecdotes.json`, 'utf8'));
await mkdir(OUT, { recursive: true });
const missing = [];
for (const a of [...anecdotes.map((x) => x.id), 'generic-route']) {
  const scene = SCENES[a];
  if (!scene) { missing.push(a); continue; }
  await writeFile(`${OUT}${a}.svg`, scene());
}
console.log(`${Object.keys(SCENES).length} illustrations générées dans assets/anecdotes/ (image générique : ${genericImage})`);
if (missing.length) console.warn(`Sans illustration (image générique utilisée) : ${missing.join(', ')}`);
