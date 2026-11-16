// Tests de la logique du plan (§4). Lancer : npm test
process.env.TZ = 'Europe/Paris';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  replay, sessionStatus, makeDecision, projectPaliers, buildSession, editSession,
  totals, milestoneProgress, crossedMilestone, startOfWeek, sessionsInWeek, isWeekDone,
  averageFeeling, feelingLabel, suggestStay, currentSegmentSessions, sortSessions,
} from '../js/plan.js';

const plan = JSON.parse(readFileSync(new URL('../data/plan.json', import.meta.url), 'utf8'));
const settings = { stepKm: 0.5, sessionsPerPalier: 4 };

// Fabrique de séances : une par jour à partir du 2 nov. 2026 (un lundi).
let seq = 0;
function run(km, planned = 2, { feeling = 3, day } = {}) {
  seq += 1;
  const d = new Date(2026, 10, 2 + (day ?? seq), 9, 30);
  return {
    id: `s${String(seq).padStart(3, '0')}`,
    date: d.toISOString(),
    plannedKm: planned,
    distanceKm: km,
    durationSec: Math.round(km * 450),
    feeling,
    pain: false,
    status: sessionStatus(km, planned, 0.9),
    updatedAt: d.toISOString(),
  };
}
const decision = (s, choice, nextKm, nextTarget = 4) => ({
  seq: s, afterPalierIndex: 0, choice, nextKm, nextTarget, decidedAt: new Date(2026, 10, 1, 8).toISOString(),
});

describe('validité d\'une séance (§4.3)', () => {
  test('≥ 90 % de la distance prévue = complète', () => {
    assert.equal(sessionStatus(2.25, 2.5), 'complete');
    assert.equal(sessionStatus(2.5, 2.5), 'complete');
    assert.equal(sessionStatus(3.1, 2.5), 'complete');
  });
  test('< 90 % = incomplète', () => {
    assert.equal(sessionStatus(2.24, 2.5), 'incomplete');
    assert.equal(sessionStatus(1.6, 2.5), 'incomplete');
  });
  test('pas de piège de virgule flottante (0,9 × 2,3 = 2,07)', () => {
    assert.equal(sessionStatus(2.07, 2.3), 'complete');
    assert.equal(sessionStatus(1.8, 2), 'complete');
    assert.equal(sessionStatus(1.79, 2), 'incomplete');
  });
});

describe('replay (§4.2)', () => {
  test('aucune séance : séance 1, palier 1 à 2 km, 4 séances', () => {
    const r = replay([], [], plan);
    assert.equal(r.state, 'ready');
    assert.deepEqual(r.palier, { index: 1, km: 2, target: 4, done: 0 });
    assert.equal(r.nextN, 1);
    assert.equal(r.positionInPalier, 1);
    assert.equal(r.isLastOfPalier, false);
    assert.equal(r.remaining, 4);
  });

  test('3 séances valides : 4e et dernière du palier', () => {
    const r = replay([run(2), run(2), run(2)], [], plan);
    assert.equal(r.nextN, 4);
    assert.equal(r.positionInPalier, 4);
    assert.equal(r.isLastOfPalier, true);
  });

  test('séance incomplète : même séance reproposée, mêmes numéro et distance', () => {
    const a = run(2);
    const b = run(1.2); // incomplète
    const r = replay([a, b], [], plan);
    assert.equal(r.nextN, 2);
    assert.equal(r.palier.km, 2);
    assert.equal(r.palier.done, 1);
    assert.equal(r.sessionCount, 2);
    assert.equal(r.bySession[b.id].n, 2, 'l\'incomplète porte le numéro de la séance retentée');
  });

  test('4 séances valides sans décision : attente du choix de fin de palier', () => {
    const r = replay([run(2), run(2), run(2), run(2)], [], plan);
    assert.equal(r.state, 'awaiting_decision');
    assert.deepEqual(r.palier, { index: 1, km: 2, target: 4, done: 4 });
    assert.equal(r.remaining, 0);
  });

  test('« Passer » : palier 2 à 2,5 km, séance 5', () => {
    const r = replay([run(2), run(2), run(2), run(2)], [decision(1, 'up', 2.5)], plan);
    assert.equal(r.state, 'ready');
    assert.deepEqual(r.palier, { index: 2, km: 2.5, target: 4, done: 0 });
    assert.equal(r.nextN, 5);
    assert.equal(r.segments[1].startN, 5);
  });

  test('« Rester » deux fois : même palier, +4 séances à chaque fois (clé seq)', () => {
    const s = Array.from({ length: 8 }, () => run(2));
    const d = [decision(1, 'stay', 2), decision(2, 'stay', 2)];
    const r = replay(s, d, plan);
    assert.equal(r.palier.index, 1);
    assert.equal(r.palier.km, 2);
    assert.equal(r.nextN, 9);
    assert.equal(r.segments.length, 3);
    assert.equal(r.decisionsUsed, 2);
  });

  test('les séances sont rejouées par date, pas par ordre d\'enregistrement', () => {
    const s = [run(2), run(2), run(2), run(2), run(2.5, 2.5)];
    const shuffled = [s[4], s[2], s[0], s[3], s[1]];
    const r = replay(shuffled, [decision(1, 'up', 2.5)], plan);
    assert.equal(r.nextN, 6);
    assert.equal(r.palier.done, 1);
    assert.deepEqual(sortSessions(shuffled).map((x) => x.id), s.map((x) => x.id));
  });

  test('séances enregistrées pendant l\'attente : placées dès que la décision existe', () => {
    const s = [run(2), run(2), run(2), run(2), run(2.5, 2.5)];
    const waiting = replay(s, [], plan);
    assert.equal(waiting.state, 'awaiting_decision');
    assert.deepEqual(waiting.unplaced, [s[4].id]);
    const r = replay(s, [decision(1, 'up', 2.5)], plan);
    assert.equal(r.palier.done, 1);
    assert.deepEqual(r.unplaced, []);
  });

  test('plan infini : 40 paliers d\'affilée sans plafond', () => {
    const s = [];
    const d = [];
    let km = 2;
    for (let p = 1; p <= 40; p += 1) {
      for (let i = 0; i < 4; i += 1) s.push(run(km, km, { day: s.length }));
      km += 0.5;
      d.push(decision(p, 'up', km));
    }
    const r = replay(s, d, plan);
    assert.equal(r.palier.index, 41);
    assert.equal(r.palier.km, 22);
    assert.equal(r.nextN, 161);
  });
});

describe('décisions et réglages (§4.1)', () => {
  test('makeDecision fige le pas et le nombre de séances du moment', () => {
    const r = replay([run(2), run(2), run(2), run(2)], [], plan);
    const d = makeDecision(r, 'up', { stepKm: 0.3, sessionsPerPalier: 6 }, [], new Date('2026-11-10T10:00:00Z'));
    assert.deepEqual(d, {
      seq: 1, afterPalierIndex: 1, choice: 'up', nextKm: 2.3, nextTarget: 6, decidedAt: '2026-11-10T10:00:00.000Z',
    });
  });

  test('« Rester » garde la distance', () => {
    const r = replay([run(2), run(2), run(2), run(2)], [], plan);
    const d = makeDecision(r, 'stay', settings, [{ seq: 3 }]);
    assert.equal(d.nextKm, 2);
    assert.equal(d.seq, 4);
  });

  test('changer les réglages n\'affecte pas les paliers déjà créés', () => {
    const s = [run(2), run(2), run(2), run(2)];
    const r1 = replay(s, [], plan);
    const d1 = makeDecision(r1, 'up', settings, []); // +500 m, 4 séances
    // Changement de réglage ensuite : +1 km, 2 séances
    const r2 = replay(s, [d1], plan);
    assert.deepEqual(r2.palier, { index: 2, km: 2.5, target: 4, done: 0 });
    const proj = projectPaliers(r2, { stepKm: 1, sessionsPerPalier: 2 }, 2);
    assert.deepEqual(proj.map((p) => [p.index, p.km, p.startN, p.endN]), [[3, 3.5, 9, 10], [4, 4.5, 11, 12]]);
  });

  test('pas de 100 m : pas d\'erreur d\'arrondi (2 + 0,1 + 0,1 + 0,1 = 2,3)', () => {
    let r = replay([], [], plan);
    let km = r.palier.km;
    for (let i = 0; i < 3; i += 1) {
      km = makeDecision({ palier: { index: 1, km } }, 'up', { stepKm: 0.1, sessionsPerPalier: 4 }, []).nextKm;
    }
    assert.equal(km, 2.3);
  });
});

describe('création et modification d\'une séance', () => {
  test('buildSession reprend la séance proposée par le plan', () => {
    const r = replay([run(2), run(2), run(2), run(2)], [decision(1, 'up', 2.5)], plan);
    const s = buildSession({ distanceKm: 2.6, durationSec: 1145, feeling: 4, pain: false }, r, plan,
      { id: 'x', date: '2026-11-14T09:30:00+01:00', now: new Date('2026-11-14T09:05:00Z') });
    assert.equal(s.plannedN, 5);
    assert.equal(s.plannedKm, 2.5);
    assert.equal(s.paliersIndex, 2);
    assert.equal(s.status, 'complete');
  });

  test('modifier une séance recalcule son statut puis tout le plan', () => {
    const s = [run(2), run(2), run(2), run(2)];
    const d = [decision(1, 'up', 2.5)];
    assert.equal(replay(s, d, plan).palier.index, 2);
    s[1] = editSession(s[1], { distanceKm: 1.2 }, plan);
    assert.equal(s[1].status, 'incomplete');
    const r = replay(s, d, plan);
    assert.equal(r.palier.index, 1, 'le palier 1 n\'est plus terminé');
    assert.equal(r.nextN, 4);
    assert.equal(s[1].plannedKm, 2, 'la distance prévue d\'origine est conservée');
  });
});

describe('totaux (toutes les sorties comptent)', () => {
  test('séances complètes et incomplètes', () => {
    const s = [
      { distanceKm: 2, durationSec: 930, status: 'complete' },
      { distanceKm: 1.6, durationSec: 760, status: 'incomplete' },
      { distanceKm: 2.6, durationSec: 1145, status: 'complete' },
    ];
    const t = totals(s);
    assert.equal(t.count, 3);
    assert.equal(t.km, 6.2);
    assert.equal(t.sec, 2835);
    assert.equal(Math.round(t.avgPaceSec), 457);
    assert.equal(t.longestKm, 2.6);
    assert.equal(Math.round(t.bestPaceSec), 440);
  });
  test('aucune séance', () => {
    assert.deepEqual(totals([]), { count: 0, km: 0, sec: 0, avgPaceSec: null, avgKm: 0, avgSec: 0, bestPaceSec: null, longestKm: 0 });
  });
  test('somme de décimaux sans 4,999999', () => {
    assert.equal(totals([{ distanceKm: 2.6 }, { distanceKm: 2.4 }, { distanceKm: 0.1 }, { distanceKm: 0.2 }]).km, 5.3);
  });
});

describe('jalons (§4.7)', () => {
  test('progression entre deux jalons', () => {
    assert.deepEqual(milestoneProgress(0), { last: 0, next: 5, remaining: 5, progress: 0 });
    const p = milestoneProgress(18.2);
    assert.equal(p.last, 15);
    assert.equal(p.next, 20);
    assert.equal(p.remaining, 1.8);
  });
  test('pile sur un jalon : il est franchi', () => {
    assert.equal(milestoneProgress(5).last, 5);
    assert.equal(crossedMilestone(2.6 + 2.3, 2.6 + 2.3 + 0.1), 5);
  });
  test('franchissement', () => {
    assert.equal(crossedMilestone(4.99, 5), 5);
    assert.equal(crossedMilestone(3, 4.9), null);
    assert.equal(crossedMilestone(9.8, 15.2), 15);
    assert.equal(crossedMilestone(995, 1002.5), 1000);
  });
});

describe('semaine du lundi au dimanche (§4.6)', () => {
  const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);
  const sess = (date) => ({ id: String(date.getTime()), date: date.toISOString() });

  test('début de semaine = lundi 00:00', () => {
    assert.equal(startOfWeek(at(2026, 11, 15, 23, 59)).getTime(), at(2026, 11, 9, 0, 0).getTime()); // dimanche
    assert.equal(startOfWeek(at(2026, 11, 16, 0, 0)).getTime(), at(2026, 11, 16, 0, 0).getTime()); // lundi
  });

  test('dimanche 23:59 et lundi 00:00 sont dans deux semaines différentes', () => {
    const s = [sess(at(2026, 11, 14, 9)), sess(at(2026, 11, 15, 23, 59))];
    assert.equal(isWeekDone(s, at(2026, 11, 15, 23, 59)), true);
    assert.equal(sessionsInWeek(s, at(2026, 11, 16, 0, 0)).length, 0, 'la semaine repart le lundi');
  });

  test('semaine du changement d\'heure (29 mars 2026)', () => {
    const s = [sess(at(2026, 3, 23, 8)), sess(at(2026, 3, 29, 22))];
    assert.equal(sessionsInWeek(s, at(2026, 3, 29, 23)).length, 2);
    assert.equal(sessionsInWeek(s, at(2026, 3, 30, 0, 30)).length, 0);
  });

  test('une seule sortie : semaine pas terminée', () => {
    assert.equal(isWeekDone([sess(at(2026, 11, 17))], at(2026, 11, 18)), false);
  });
});

describe('ressenti (§4.8)', () => {
  test('libellés', () => {
    assert.equal(feelingLabel(1.4), 'très difficile');
    assert.equal(feelingLabel(1.5), 'plutôt difficile');
    assert.equal(feelingLabel(2.49), 'plutôt difficile');
    assert.equal(feelingLabel(3), 'correct');
    assert.equal(feelingLabel(4), 'plutôt bien');
    assert.equal(feelingLabel(4.5), 'super');
    assert.equal(feelingLabel(null), null);
  });
  test('suggestion « rester » si moyenne ≤ 2', () => {
    assert.equal(suggestStay(2), true);
    assert.equal(suggestStay(2.25), false);
    assert.equal(suggestStay(null), false);
  });
  test('moyenne du palier qui vient de se terminer', () => {
    const s = [run(2, 2, { feeling: 1 }), run(2, 2, { feeling: 2 }), run(1, 2, { feeling: 1 }), run(2, 2, { feeling: 3 }), run(2, 2, { feeling: 3 })];
    const r = replay(s, [], plan);
    assert.equal(r.state, 'awaiting_decision');
    const avg = averageFeeling(currentSegmentSessions(r, s));
    assert.equal(avg, 2);
    assert.equal(feelingLabel(avg), 'plutôt difficile');
  });
});
