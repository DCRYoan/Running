// Effet verre en mode Auto : quand le couper (§9.3).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { decideGlass, staticGlassChecks, LOW_FPS } from '../js/glass.js';

describe('effet verre automatique', () => {
  test('fluide et sans raison : verre actif', () => {
    assert.equal(decideGlass('auto', { reasons: [], fps: 60 }).enabled, true);
  });
  test(`sous ${LOW_FPS} images/s : verre coupé`, () => {
    const d = decideGlass('auto', { fps: 40 });
    assert.equal(d.enabled, false);
    assert.match(d.reasons[0], /40 images/);
  });
  test('Activé / Désactivé forcent le choix', () => {
    assert.equal(decideGlass('on', { fps: 10 }).enabled, true);
    assert.equal(decideGlass('off', { fps: 60 }).enabled, false);
  });
  test('Android à 4 cœurs : processeur modeste', () => {
    const r = staticGlassChecks({ userAgent: 'Mozilla/5.0 (Linux; Android 13)', hardwareConcurrency: 4, deviceMemory: 4 });
    assert.ok(r.some((x) => x.includes('processeur modeste')));
  });
  test('iPhone : le nombre de cœurs ne compte pas', () => {
    const r = staticGlassChecks({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)', hardwareConcurrency: 4 });
    assert.ok(!r.some((x) => x.includes('processeur')));
  });
});
