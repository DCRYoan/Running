// Tests des formats français et des saisies (§4.4, §4.9).
process.env.TZ = 'Europe/Paris';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  fmtKm2, fmtKm1, fmtKmShort, fmtInt, fmtStep, half, fmtOutAndBack,
  fmtDuration, fmtLongDuration, fmtHMin, paceSec, fmtPace, paceLooksOdd,
  parseKm, parseDuration, maskDuration,
  fmtDateShort, fmtWeekday, fmtDayMonth, fmtRelativeDateTime, daysBetween, toLocalIso, toDateInput,
  ordinal, plural,
} from '../js/format.js';

const NNBSP = ' '; // espace fine insécable utilisée par Intl fr-FR

describe('distances', () => {
  test('formats', () => {
    assert.equal(fmtKm2(2.5), '2,50');
    assert.equal(fmtKm2(2.6), '2,60');
    assert.equal(fmtKm1(15.7), '15,7');
    assert.equal(fmtKm1(0), '0,0');
    assert.equal(fmtKmShort(2), '2');
    assert.equal(fmtKmShort(2.5), '2,5');
    assert.equal(fmtKmShort(1.25), '1,25');
    assert.equal(fmtInt(149600000), `149${NNBSP}600${NNBSP}000`);
  });
  test('pas de progression', () => {
    assert.equal(fmtStep(0.5), '500 m');
    assert.equal(fmtStep(0.1), '100 m');
    assert.equal(fmtStep(1), '1 km');
    assert.equal(fmtStep(1.5), '1,5 km');
    assert.equal(fmtStep(2), '2 km');
  });
  test('aller / retour (§4.4)', () => {
    assert.equal(half(2.5), 1.25);
    assert.equal(half(2.3), 1.15);
    assert.equal(fmtOutAndBack(2.5), "2,5 km (1,25 km à l'aller, 1,25 km au retour)");
    assert.equal(fmtOutAndBack(3), "3 km (1,5 km à l'aller, 1,5 km au retour)");
    assert.equal(fmtOutAndBack(2.3), "2,3 km (1,15 km à l'aller, 1,15 km au retour)");
  });
  test('toutes les moitiés des pas de 100 m sont exactes à 50 m', () => {
    for (let m = 2000; m <= 30000; m += 100) {
      const h = half(m / 1000);
      assert.equal(Math.round(h * 1000) % 50, 0, `${m} m`);
    }
  });
});

describe('durées et allures', () => {
  test('mm:ss', () => {
    assert.equal(fmtDuration(1110), '18:30');
    assert.equal(fmtDuration(65), '1:05');
    assert.equal(fmtDuration(4505), '75:05');
  });
  test('durées longues', () => {
    assert.equal(fmtLongDuration(7020), '1 h 57 min');
    assert.equal(fmtLongDuration(2700), '45 min');
    assert.equal(fmtLongDuration(7200), '2 h');
    assert.equal(fmtHMin(7020), '1 h 57');
    assert.equal(fmtHMin(1005), '17 min');
  });
  test('allure', () => {
    assert.equal(fmtPace(paceSec(1110, 2.5)), '7:24');
    assert.equal(fmtPace(null), '–');
    assert.equal(paceSec(100, 0), null);
  });
  test('garde-fou anti-faute de frappe', () => {
    assert.equal(paceLooksOdd(149), true);
    assert.equal(paceLooksOdd(150), false);
    assert.equal(paceLooksOdd(444), false);
    assert.equal(paceLooksOdd(1200), false);
    assert.equal(paceLooksOdd(1201), true);
  });
});

describe('saisies', () => {
  test('distance : virgule ou point', () => {
    assert.equal(parseKm('2,5'), 2.5);
    assert.equal(parseKm('2.50'), 2.5);
    assert.equal(parseKm(' 3 '), 3);
    assert.equal(parseKm(',5'), 0.5);
    assert.equal(parseKm('2,'), 2);
    assert.equal(parseKm('0'), null);
    assert.equal(parseKm(''), null);
    assert.equal(parseKm('abc'), null);
    assert.equal(parseKm('2,5,1'), null);
    assert.equal(parseKm('-2'), null);
    assert.equal(parseKm('42,2'), 42.2, 'aucune limite de distance');
  });
  test('temps', () => {
    assert.equal(parseDuration('18:30'), 1110);
    assert.equal(parseDuration('18.30'), 1110);
    assert.equal(parseDuration('18,30'), 1110);
    assert.equal(parseDuration('1830'), 1110);
    assert.equal(parseDuration('930'), 570);
    assert.equal(parseDuration('18'), 1080);
    assert.equal(parseDuration('599:59'), 35999);
    assert.equal(parseDuration('600:00'), null);
    assert.equal(parseDuration('18:60'), null);
    assert.equal(parseDuration('18:5'), null, 'secondes sur 2 chiffres');
    assert.equal(parseDuration('0:00'), null);
    assert.equal(parseDuration(''), null);
  });
  test('masque de saisie du temps', () => {
    assert.equal(maskDuration('1'), '1');
    assert.equal(maskDuration('18'), '18');
    assert.equal(maskDuration('183'), '1:83');
    assert.equal(maskDuration('1830'), '18:30');
    assert.equal(maskDuration('18:30'), '18:30');
    assert.equal(maskDuration('123456'), '123:45');
  });
});

describe('dates', () => {
  test('formats français', () => {
    assert.equal(fmtDateShort('2026-11-14T09:30:00+01:00'), 'sam. 14 nov.');
    assert.equal(fmtWeekday('2026-11-14T09:30:00+01:00'), 'samedi');
    assert.equal(fmtDayMonth('2026-10-19T09:30:00+02:00'), '19 oct.');
  });
  test('relatif', () => {
    const now = new Date(2026, 10, 16, 15, 0);
    assert.equal(fmtRelativeDateTime(new Date(2026, 10, 16, 14, 41), now), "aujourd'hui, 14:41");
    assert.equal(fmtRelativeDateTime(new Date(2026, 10, 15, 9, 5), now), 'hier, 09:05');
    assert.equal(daysBetween(new Date(2026, 10, 14, 23), new Date(2026, 10, 16, 1)), 2);
  });
  test('ISO avec fuseau local', () => {
    assert.equal(toLocalIso(new Date(2026, 10, 14, 9, 30)), '2026-11-14T09:30:00+01:00');
    assert.equal(toLocalIso(new Date(2026, 6, 14, 9, 30)), '2026-07-14T09:30:00+02:00');
    assert.equal(new Date(toLocalIso(new Date(2026, 10, 14, 9, 30))).getTime(), new Date(2026, 10, 14, 9, 30).getTime());
    assert.equal(toDateInput(new Date(2026, 10, 14, 23, 59)), '2026-11-14');
  });
});

describe('textes', () => {
  test('ordinaux', () => {
    assert.equal(ordinal(1), '1re');
    assert.equal(ordinal(2), '2e');
    assert.equal(ordinal(4), '4e');
  });
  test('pluriel', () => {
    assert.equal(plural(1, 'séance'), 'séance');
    assert.equal(plural(7, 'séance'), 'séances');
  });
});
