// Tests M3 : régularité, graphiques, tableau du programme, scénario fin de palier + modification.
process.env.TZ = 'Europe/Paris';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { replay, makeDecision, weeklyCounts, sessionStatus, editSession } from '../js/plan.js';
import { lineChart, weeklyBars, tickIndexes } from '../js/charts.js';
import { programmeRows } from '../js/screens/programme.js';

const plan = JSON.parse(readFileSync(new URL('../data/plan.json', import.meta.url), 'utf8'));
let k = 0;
const run = (y, m, d, km = 2, planned = 2) => {
  k += 1;
  return { id: `r${k}`, date: new Date(y, m - 1, d, 9).toISOString(), distanceKm: km, plannedKm: planned, durationSec: km * 450, feeling: 3, status: sessionStatus(km, planned) };
};

describe('régularité (sorties par semaine)', () => {
  test('semaines du lundi, de la première sortie à aujourd\'hui, semaines vides comprises', () => {
    const s = [run(2026, 10, 20), run(2026, 10, 22), run(2026, 11, 3), run(2026, 11, 14)];
    const w = weeklyCounts(s, new Date(2026, 10, 16, 12));
    assert.deepEqual(w.map((x) => [x.start.getDate(), x.count]), [[19, 2], [26, 0], [2, 1], [9, 1], [16, 0]]);
  });
  test('au plus 8 semaines', () => {
    const s = [run(2026, 1, 5), run(2026, 6, 1)];
    assert.equal(weeklyCounts(s, new Date(2026, 10, 16)).length, 8);
  });
  test('aucune sortie', () => {
    assert.deepEqual(weeklyCounts([], new Date()), []);
  });
});

describe('graphiques SVG', () => {
  test('graduations : 1, …, n (4 au plus)', () => {
    assert.deepEqual(tickIndexes(7), [0, 2, 4, 6]);
    assert.deepEqual(tickIndexes(5), [0, 2, 4]);
    assert.deepEqual(tickIndexes(6), [0, 2, 3, 5]);
    assert.deepEqual(tickIndexes(100), [0, 33, 66, 99]);
    assert.deepEqual(tickIndexes(3), [0, 1, 2]);
    assert.deepEqual(tickIndexes(1), [0]);
  });
  test('courbe de distance : points entre y = 28 et y = 84, dernier point en corail', () => {
    const svg = lineChart([2, 2, 2.1, 2, 2.5, 2.5, 2.6]);
    const pts = svg.match(/points="([^"]+)"/)[1].split(' ').map((p) => p.split(',').map(Number));
    assert.equal(pts.length, 7);
    assert.deepEqual(pts[0], [15, 84]);
    assert.deepEqual(pts[6], [295, 28]);
    assert.match(svg, /fill="#FF7A59"/);
  });
  test('allure inversée : la plus rapide (petite valeur) est en haut', () => {
    const svg = lineChart([465, 440], { invert: true });
    const pts = svg.match(/points="([^"]+)"/)[1].split(' ').map((p) => p.split(',').map(Number));
    assert.ok(pts[1][1] < pts[0][1]);
  });
  test('une seule sortie : un point centré, pas de ligne', () => {
    const svg = lineChart([2]);
    assert.ok(!svg.includes('polyline'));
    assert.match(svg, /cx="155"/);
  });
  test('barres : vert si objectif atteint, lavande sinon', () => {
    const svg = weeklyBars([{ start: new Date(2026, 9, 19), count: 1 }, { start: new Date(2026, 9, 26), count: 2 }], { goal: 2, fmtLabel: () => 'x' });
    assert.match(svg, /fill="#C9BCE6"/);
    assert.match(svg, /fill="#34C3A8"/);
    assert.match(svg, /stroke-dasharray/);
  });
});

describe('tableau « Mon programme »', () => {
  const settings = { stepKm: 0.5, sessionsPerPalier: 4 };
  test('début : palier 1 en cours puis 4 paliers projetés', () => {
    const rows = programmeRows(replay([], [], plan), settings);
    assert.deepEqual(rows.map((r) => [r.index, r.km, r.startN, r.endN, r.tag]), [
      [1, 2, 1, 4, 'current'], [2, 2.5, 5, 8, 'next'], [3, 3, 9, 12, 'next'], [4, 3.5, 13, 16, 'next'], [5, 4, 17, 20, 'next'],
    ]);
  });
  test('maquette : palier 1 terminé, palier 2 en cours (séances 5 à 8)', () => {
    const s = [1, 2, 3, 4, 5].map((d) => run(2026, 10, d));
    s[4].plannedKm = 2.5; s[4].distanceKm = 2.5;
    const r = replay(s, [{ seq: 1, choice: 'up', nextKm: 2.5, nextTarget: 4 }], plan);
    const rows = programmeRows(r, settings);
    assert.deepEqual(rows.slice(0, 3).map((x) => [x.index, x.startN, x.endN, x.tag]), [[1, 1, 4, 'done'], [2, 5, 8, 'current'], [3, 9, 12, 'next']]);
  });
  test('« Rester » prolonge le même palier (séances 1 à 8) ; réglages modifiés = seulement les projections', () => {
    const s = [1, 2, 3, 4, 5].map((d) => run(2026, 10, d));
    const r = replay(s, [{ seq: 1, choice: 'stay', nextKm: 2, nextTarget: 4 }], plan);
    const rows = programmeRows(r, { stepKm: 1, sessionsPerPalier: 2 });
    assert.deepEqual(rows[0], { index: 1, km: 2, startN: 1, endN: 8, current: true, tag: 'current' });
    assert.deepEqual(rows.slice(1, 3).map((x) => [x.index, x.km, x.startN, x.endN]), [[2, 3, 9, 10], [3, 4, 11, 12]]);
  });
  test('en attente de décision : le palier est « terminé », les projections partent de la suite', () => {
    const s = [1, 2, 3, 4].map((d) => run(2026, 10, d));
    const rows = programmeRows(replay(s, [], plan), settings);
    assert.equal(rows[0].tag, 'done');
    assert.deepEqual([rows[1].index, rows[1].startN], [2, 5]);
  });
});

describe('scénario recette (§16, points 4 à 6)', () => {
  test('4e séance valide → fin de palier ; « Passer » = +500 m ; « Rester » = +4 séances', () => {
    const s = [1, 2, 3, 4].map((d) => run(2026, 10, d));
    const r = replay(s, [], plan);
    assert.equal(r.state, 'awaiting_decision');
    const up = makeDecision(r, 'up', { stepKm: 0.5, sessionsPerPalier: 4 }, []);
    assert.deepEqual(replay(s, [up], plan).palier, { index: 2, km: 2.5, target: 4, done: 0 });
    const stay = makeDecision(r, 'stay', { stepKm: 0.5, sessionsPerPalier: 4 }, []);
    const rs = replay(s, [stay], plan);
    assert.deepEqual([rs.palier.km, rs.remaining, rs.nextN], [2, 4, 5]);
  });
  test('modifier une séance : totaux, statut et plan recalculés', () => {
    const s = [1, 2, 3, 4].map((d) => run(2026, 10, d));
    assert.equal(replay(s, [], plan).state, 'awaiting_decision');
    s[2] = editSession(s[2], { distanceKm: 1 }, plan);
    const r = replay(s, [], plan);
    assert.equal(r.state, 'ready');
    assert.equal(r.nextN, 4);
  });
});
