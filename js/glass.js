// Effet verre : Auto / Activé / Désactivé (§9.3).
// En mode Auto, on coupe le flou si le téléphone risque de ramer.

export function staticGlassChecks() {
  const reasons = [];
  const css = globalThis.CSS;
  const supported = css?.supports?.('backdrop-filter', 'blur(1px)') || css?.supports?.('-webkit-backdrop-filter', 'blur(1px)');
  if (!supported) reasons.push('backdrop-filter non pris en charge');
  const mem = navigator.deviceMemory;
  if (typeof mem === 'number' && mem <= 2) reasons.push(`mémoire faible (${mem} Go)`);
  if (globalThis.matchMedia?.('(prefers-reduced-transparency: reduce)').matches) reasons.push('transparence réduite demandée');
  return reasons;
}

// Mesure simple d'images par seconde via requestAnimationFrame.
// On ignore les premières images (chargement), puis on compte pendant `duration` ms.
export function measureFps({ warmup = 400, duration = 1000 } = {}) {
  return new Promise((resolve) => {
    if (document.visibilityState !== 'visible' || !globalThis.requestAnimationFrame) return resolve(null);
    const t0 = performance.now();
    let start = null;
    let frames = 0;
    function tick(now) {
      if (document.visibilityState !== 'visible') return resolve(null);
      if (now - t0 < warmup) return requestAnimationFrame(tick);
      if (start === null) start = now;
      frames += 1;
      if (now - start >= duration) return resolve(Math.round((frames * 1000) / (now - start)));
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

const LOW_FPS = 30;

// Décide si le verre est actif. `fps` peut être null (pas encore mesuré).
export function decideGlass(mode, { reasons = [], fps = null } = {}) {
  if (mode === 'on') return { enabled: true, reasons: [] };
  if (mode === 'off') return { enabled: false, reasons: ['désactivé dans les réglages'] };
  const why = [...reasons];
  if (typeof fps === 'number' && fps < LOW_FPS) why.push(`animation lente (${fps} images/s)`);
  return { enabled: why.length === 0, reasons: why };
}

export function applyGlass(enabled, root = document.documentElement) {
  root.classList.toggle('no-glass', !enabled);
}
