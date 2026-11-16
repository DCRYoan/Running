// Logique métier du plan (§4) — fonctions PURES, sans DOM ni stockage.
// Règle d'or : l'état du plan est toujours recalculé depuis l'historique
// (séances + décisions de palier) par `replay`, jamais stocké à part.

const EPS = 1e-9;

// Arrondi au mètre, pour éviter les 4,999999 km des sommes de décimaux.
export const roundKm = (km) => Math.round(km * 1000) / 1000;

// ---------- Validité d'une séance (§4.3) ----------

export function sessionStatus(distanceKm, plannedKm, threshold = 0.9) {
  return distanceKm + EPS >= roundKm(threshold * plannedKm) ? 'complete' : 'incomplete';
}

// ---------- Tri ----------

const time = (iso) => new Date(iso).getTime();

export function sortSessions(sessions) {
  return [...(sessions || [])].sort((a, b) =>
    time(a.date) - time(b.date) || String(a.id).localeCompare(String(b.id)));
}

// Les décisions sont consommées dans l'ordre de leur rang `seq` (1, 2, 3…).
// `afterPalierIndex` se répète quand on choisit « Rester » : ce n'est pas une clé.
export function sortDecisions(decisions) {
  return [...(decisions || [])].sort((a, b) =>
    (a.seq ?? Infinity) - (b.seq ?? Infinity) || time(a.decidedAt) - time(b.decidedAt));
}

// ---------- replay (§4.2) ----------

/**
 * Rejoue l'historique et renvoie la position dans le plan.
 * Un « segment » = un passage sur un palier (un « Rester » crée un nouveau
 * segment avec le même numéro de palier).
 *
 * @returns {{
 *   state: 'ready' | 'awaiting_decision',
 *   palier: { index, km, target, done },
 *   nextN, positionInPalier, isLastOfPalier, remaining,
 *   validCount, sessionCount,
 *   segments: Array<{ index, km, target, done, startN, sessionIds, endedBy }>,
 *   bySession: Record<string, { n, palierIndex, segment }>, unplaced: string[],
 *   decisionsUsed
 * }}
 */
export function replay(sessions, decisions, plan) {
  const sorted = sortSessions(sessions);
  const decs = sortDecisions(decisions);
  let di = 0;
  let validCount = 0;
  let awaiting = false;

  const segments = [];
  const open = (index, km, target) => {
    const seg = { index, km, target, done: 0, startN: validCount + 1, sessionIds: [], endedBy: null };
    segments.push(seg);
    return seg;
  };
  let seg = open(1, plan.startKm, plan.defaultSessionsPerPalier);

  // Palier rempli : on consomme la décision suivante, sinon on attend le choix.
  const advanceIfFull = () => {
    if (seg.done < seg.target) return;
    const d = decs[di];
    if (!d) { awaiting = true; return; }
    di += 1;
    seg.endedBy = d;
    seg = open(d.choice === 'up' ? seg.index + 1 : seg.index, d.nextKm, d.nextTarget);
    awaiting = false;
  };

  const bySession = {};
  const unplaced = [];
  for (const s of sorted) {
    bySession[s.id] = { n: validCount + 1, palierIndex: seg.index, segment: awaiting ? null : segments.length - 1 };
    // En attente de décision (cas rare : fusion entre appareils, modification
    // d'une ancienne séance), la séance compte dans les totaux mais pas dans
    // un palier : elle sera placée dès que la décision existera.
    if (awaiting) unplaced.push(s.id);
    else seg.sessionIds.push(s.id);
    if (s.status === 'complete') {
      validCount += 1;
      if (!awaiting) {
        seg.done += 1;
        advanceIfFull();
      }
    }
  }

  const done = Math.min(seg.done, seg.target);
  return {
    state: awaiting ? 'awaiting_decision' : 'ready',
    palier: { index: seg.index, km: seg.km, target: seg.target, done },
    nextN: validCount + 1,
    positionInPalier: Math.min(done + 1, seg.target),
    isLastOfPalier: done + 1 === seg.target,
    remaining: seg.target - done,
    validCount,
    sessionCount: sorted.length,
    segments,
    bySession,
    unplaced,
    decisionsUsed: di,
  };
}

// ---------- Décisions de fin de palier (§4.1) ----------

// Les réglages courants sont figés dans la décision : un changement de réglage
// n'affecte que les paliers créés après lui.
export function makeDecision(result, choice, settings, decisions, now = new Date()) {
  if (choice !== 'up' && choice !== 'stay') throw new Error(`Choix inconnu : ${choice}`);
  const p = result.palier;
  const seq = Math.max(0, ...(decisions || []).map((d) => d.seq || 0)) + 1;
  return {
    seq,
    afterPalierIndex: p.index,
    choice,
    nextKm: choice === 'up' ? roundKm(p.km + settings.stepKm) : p.km,
    nextTarget: settings.sessionsPerPalier,
    decidedAt: now.toISOString(),
  };
}

// Paliers à venir projetés avec les réglages actuels (écran Mon programme).
export function projectPaliers(result, settings, count = 4) {
  const out = [];
  let index = result.palier.index;
  let km = result.palier.km;
  let startN = result.nextN + result.remaining;
  for (let i = 0; i < count; i += 1) {
    index += 1;
    km = roundKm(km + settings.stepKm);
    out.push({ index, km, target: settings.sessionsPerPalier, startN, endN: startN + settings.sessionsPerPalier - 1 });
    startN += settings.sessionsPerPalier;
  }
  return out;
}

// ---------- Séance : création et modification ----------

export function buildSession(input, result, plan, { id, date, now = new Date() }) {
  const plannedKm = result.palier.km;
  return {
    id,
    date,
    plannedN: result.nextN,
    plannedKm,
    paliersIndex: result.palier.index,
    distanceKm: input.distanceKm,
    durationSec: input.durationSec,
    feeling: input.feeling,
    pain: Boolean(input.pain),
    status: sessionStatus(input.distanceKm, plannedKm, plan.completeThreshold),
    updatedAt: now.toISOString(),
  };
}

// La séance garde son plannedKm d'origine ; seul le statut est recalculé.
export function editSession(session, changes, plan, now = new Date()) {
  const next = { ...session, ...changes, updatedAt: now.toISOString() };
  next.status = sessionStatus(next.distanceKm, next.plannedKm, plan.completeThreshold);
  return next;
}

// ---------- Totaux (§4.3 : toutes les sorties comptent) ----------

export function totals(sessions) {
  const list = sessions || [];
  const count = list.length;
  const km = roundKm(list.reduce((a, s) => a + (s.distanceKm || 0), 0));
  const sec = list.reduce((a, s) => a + (s.durationSec || 0), 0);
  const paces = list.filter((s) => s.distanceKm > 0 && s.durationSec > 0).map((s) => s.durationSec / s.distanceKm);
  return {
    count,
    km,
    sec,
    avgPaceSec: km > 0 ? sec / km : null,
    avgKm: count ? roundKm(km / count) : 0,
    avgSec: count ? sec / count : 0,
    bestPaceSec: paces.length ? Math.min(...paces) : null,
    longestKm: count ? Math.max(...list.map((s) => s.distanceKm || 0)) : 0,
  };
}

// ---------- Jalons (§4.7) : tous les 5 km cumulés, sans limite ----------

export function milestoneProgress(totalKm, every = 5) {
  const total = roundKm(totalKm);
  const last = Math.floor(total / every + EPS) * every;
  const next = last + every;
  return { last, next, remaining: roundKm(next - total), progress: (total - last) / every };
}

// Jalon franchi entre deux totaux (le plus haut), ou null.
export function crossedMilestone(beforeKm, afterKm, every = 5) {
  const a = Math.floor(roundKm(beforeKm) / every + EPS);
  const b = Math.floor(roundKm(afterKm) / every + EPS);
  return b > a ? b * every : null;
}

// ---------- Semaine (§4.6) : lundi 00:00 → dimanche 23:59, heure locale ----------

export function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function endOfWeek(date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 7); // setDate gère les changements d'heure
  return d;
}

export function sessionsInWeek(sessions, now = new Date()) {
  const from = startOfWeek(now).getTime();
  const to = endOfWeek(now).getTime();
  return (sessions || []).filter((s) => {
    const t = time(s.date);
    return t >= from && t < to;
  });
}

export function isWeekDone(sessions, now = new Date(), perWeek = 2) {
  return sessionsInWeek(sessions, now).length >= perWeek;
}

/**
 * Sorties par semaine (graphique Régularité) : des `maxWeeks` dernières semaines
 * jusqu'à la semaine en cours, sans remonter avant la première sortie.
 * @returns {Array<{ start: Date, count: number }>}
 */
export function weeklyCounts(sessions, now = new Date(), maxWeeks = 8) {
  const list = sortSessions(sessions);
  if (!list.length) return [];
  const first = startOfWeek(list[0].date);
  const weeks = [];
  let start = startOfWeek(now);
  while (weeks.length < maxWeeks && start >= first) {
    weeks.unshift({ start: new Date(start), count: sessionsInWeek(list, start).length });
    start.setDate(start.getDate() - 7);
    start = startOfWeek(start); // recale à minuit après un changement d'heure
  }
  return weeks;
}

// ---------- Ressenti (§4.8) ----------

export const FEELINGS = ['Très difficile', 'Difficile', 'Correct', 'Bien', 'Super'];

export function averageFeeling(sessions) {
  const f = (sessions || []).map((s) => s.feeling).filter((x) => typeof x === 'number');
  return f.length ? f.reduce((a, b) => a + b, 0) / f.length : null;
}

export function feelingLabel(avg) {
  if (avg === null || avg === undefined) return null;
  if (avg < 1.5) return 'très difficile';
  if (avg < 2.5) return 'plutôt difficile';
  if (avg < 3.5) return 'correct';
  if (avg < 4.5) return 'plutôt bien';
  return 'super';
}

export const suggestStay = (avg) => avg !== null && avg <= 2;

// Séances du segment qui vient de se terminer (pour l'écran Fin de palier).
export function currentSegmentSessions(result, sessions) {
  const seg = result.segments[result.segments.length - 1];
  const ids = new Set(seg.sessionIds);
  return (sessions || []).filter((s) => ids.has(s.id));
}
