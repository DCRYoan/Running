// Copier / Partager le code de récupération (écran Code et Réglages).

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Repli : sélection d'un champ temporaire.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

export async function shareCode(code) {
  const text = `Mon code de récupération Running : ${code}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Running', text });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  return (await copyText(text)) ? 'copied' : 'failed';
}

/** Branche les boutons [data-copy] et [data-share] d'un bloc, avec un retour visuel. */
export function bindCodeButtons(root, code) {
  const flash = (btn, label) => {
    const old = btn.textContent;
    btn.textContent = label;
    setTimeout(() => { btn.textContent = old; }, 1800);
  };
  root.querySelector('[data-copy]')?.addEventListener('click', async (e) => {
    flash(e.currentTarget, (await copyText(code)) ? 'Copié !' : 'Copie impossible');
  });
  root.querySelector('[data-share]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const r = await shareCode(code);
    if (r === 'copied') flash(btn, 'Copié !');
    if (r === 'failed') flash(btn, 'Impossible');
  });
}
