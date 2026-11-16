// Choix des messages (§6.3) — fonctions pures, testées.
import { daysBetween, fmtWeekday, fmtKm1 } from './format.js';
import { sortSessions } from './plan.js';

/** Remplace {cle} par la valeur correspondante. */
export const fill = (text, vars = {}) => String(text).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

/** Variante au hasard, jamais identique à `last` quand c'est possible. */
export function pickVariant(list, last, rnd = Math.random) {
  if (!list?.length) return null;
  const pool = list.length > 1 ? list.filter((x) => x !== last) : list;
  return pool[Math.floor(rnd() * pool.length)] ?? pool[0];
}

/**
 * Contexte du message d'accueil, par ordre de priorité.
 * @returns {{ key: string, vars: object }}
 */
export function welcomeContext({ sessions, now = new Date(), weekDone, milestoneRemaining }) {
  if (!sessions?.length) return { key: 'first', vars: {} };
  const last = sortSessions(sessions).at(-1);
  const days = daysBetween(last.date, now);
  if (days <= 0) return { key: 'today', vars: {} };
  if (weekDone) return { key: 'weekDone', vars: {} };
  if (milestoneRemaining > 0 && milestoneRemaining < 1) return { key: 'milestoneClose', vars: { x: fmtKm1(milestoneRemaining) } };
  if (days <= 2) return { key: 'recent', vars: { quand: days === 1 ? "d'hier" : `de ${fmtWeekday(last.date)}` } };
  if (days > 7) return { key: 'longAbsence', vars: {} };
  if (now.getDay() === 1) return { key: 'monday', vars: {} };
  return { key: 'days3to7', vars: {} };
}

/** Message d'accueil final, jamais le même deux fois de suite. */
export function pickWelcome(ctx, messages, lastText, rnd = Math.random) {
  const variants = (messages.welcome[ctx.key] || messages.welcome.default).map((t) => fill(t, ctx.vars));
  return pickVariant(variants, lastText, rnd);
}
