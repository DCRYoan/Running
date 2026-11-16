// Formats français (§4.9) et lecture des saisies. Fonctions pures.
// Intl fr-FR : virgule décimale, espace fine insécable (U+202F) pour les milliers.

const nf = (min, max) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: min, maximumFractionDigits: max });
const NF2 = nf(2, 2);
const NF1 = nf(1, 1);
const NF0_2 = nf(0, 2);
const NF0_1 = nf(0, 1);
const NF0 = nf(0, 0);

// ---------- Distances ----------

/** Distance saisie : 2,50 */
export const fmtKm2 = (km) => NF2.format(km);
/** Total cumulé : 15,7 */
export const fmtKm1 = (km) => NF1.format(km);
/** Distance du plan, sans zéros inutiles : 2 · 2,5 · 1,25 */
export const fmtKmShort = (km) => NF0_2.format(km);
/** Grands nombres (anecdotes) : 149 600 000 */
export const fmtInt = (n) => NF0.format(n);

/** Pas du réglage de progression : 500 m · 1 km · 1,5 km */
export function fmtStep(km) {
  const m = Math.round(km * 1000);
  return m < 1000 ? `${m} m` : `${NF0_1.format(m / 1000)} km`;
}

/** Moitié (aller ou retour), arrondie à 0,01 km (§4.4). */
export const half = (km) => Math.round((km / 2) * 100) / 100;

/** « 2,5 km (1,25 km à l'aller, 1,25 km au retour) » */
export function fmtOutAndBack(km) {
  const h = fmtKmShort(half(km));
  return `${fmtKmShort(km)} km (${h} km à l'aller, ${h} km au retour)`;
}

// ---------- Durées et allures ----------

const pad2 = (n) => String(n).padStart(2, '0');

/** Durée de séance mm:ss (les minutes peuvent dépasser 59) : 18:30 · 75:05 */
export function fmtDuration(sec) {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
}

/** Durée longue : 1 h 57 min · 45 min · 2 h */
export function fmtLongDuration(sec) {
  const totalMin = Math.round(sec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Tuile de statistiques : 1 h 57 · 45 min */
export function fmtHMin(sec) {
  const totalMin = Math.round(sec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h === 0 ? `${m} min` : `${h} h ${pad2(m)}`;
}

/** Allure en secondes par km */
export const paceSec = (durationSec, km) => (km > 0 ? durationSec / km : null);

/** Allure affichée m:ss : 7:24 */
export const fmtPace = (secPerKm) => (secPerKm == null ? '–' : fmtDuration(secPerKm));

/** Garde-fou anti-faute de frappe (§4.9) : < 2:30 /km ou > 20:00 /km. */
export const paceLooksOdd = (secPerKm) => secPerKm != null && (secPerKm < 150 || secPerKm > 1200);

// ---------- Saisies ----------

/** « 2,5 », « 2.50 », « 3 » → nombre > 0, sinon null. */
export function parseKm(text) {
  const t = String(text ?? '').replace(/\s/g, '').replace(',', '.');
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) return null;
  const v = Number(t);
  return v > 0 && Number.isFinite(v) ? v : null;
}

/**
 * Temps de course → secondes, sinon null.
 * Accepte « 18:30 », « 18.30 », « 18,30 » (le clavier numérique de l'iPhone n'a
 * pas de « : »), « 1830 » (chiffres seuls, les 2 derniers = secondes) et « 18 » (minutes).
 * Minutes jusqu'à 599, secondes 0–59.
 */
export function parseDuration(text) {
  const t = String(text ?? '').replace(/\s/g, '');
  let m;
  let s;
  let match;
  if ((match = t.match(/^(\d{1,3})[:.,'h](\d{2})$/))) {
    m = Number(match[1]);
    s = Number(match[2]);
  } else if ((match = t.match(/^(\d{3,5})$/))) {
    m = Number(match[1].slice(0, -2));
    s = Number(match[1].slice(-2));
  } else if ((match = t.match(/^(\d{1,2})$/))) {
    m = Number(match[1]);
    s = 0;
  } else {
    return null;
  }
  if (s > 59 || m > 599) return null;
  const total = m * 60 + s;
  return total > 0 ? total : null;
}

/** Masque de saisie du temps : garde les chiffres et insère « : » (« 1830 » → « 18:30 »). */
export function maskDuration(text) {
  const digits = String(text ?? '').replace(/\D/g, '').slice(0, 5);
  return digits.length <= 2 ? digits : `${digits.slice(0, -2)}:${digits.slice(-2)}`;
}

// ---------- Dates ----------

const DATE_SHORT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const WEEKDAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });
const DAY_MONTH = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const HOUR_MIN = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** sam. 14 nov. */
export const fmtDateShort = (d) => DATE_SHORT.format(new Date(d));
/** samedi */
export const fmtWeekday = (d) => WEEKDAY.format(new Date(d));
/** 19 oct. */
export const fmtDayMonth = (d) => DAY_MONTH.format(new Date(d));
/** 14:41 */
export const fmtTime = (d) => HOUR_MIN.format(new Date(d));

/** Nombre de jours calendaires entre deux dates (heure locale). */
export function daysBetween(a, b) {
  const x = new Date(a);
  const y = new Date(b);
  x.setHours(12, 0, 0, 0);
  y.setHours(12, 0, 0, 0);
  return Math.round((y - x) / 86400000);
}

/** « aujourd'hui, 14:41 » · « hier, 09:05 » · « sam. 14 nov., 09:05 » */
export function fmtRelativeDateTime(d, now = new Date()) {
  const n = daysBetween(d, now);
  const day = n === 0 ? "aujourd'hui" : n === 1 ? 'hier' : fmtDateShort(d);
  return `${day}, ${fmtTime(d)}`;
}

/** Instant ISO avec le fuseau local : 2026-11-14T09:30:00+01:00 */
export function toLocalIso(date) {
  const d = new Date(date);
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

/** Valeur pour <input type="date"> : 2026-11-14 */
export const toDateInput = (d) => toLocalIso(d).slice(0, 10);

// ---------- Textes ----------

/** Ordinal court : 1re, 2e, 3e… */
export const ordinal = (n) => (n === 1 ? '1re' : `${n}e`);

/** Accord simple : 1 séance · 2 séances */
export const plural = (n, one, many = `${one}s`) => (n === 1 || n === 0 ? one : many);
