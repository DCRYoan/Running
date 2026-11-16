// Séance du jour (§5.3) — M0 : vitrine des composants (verre, champs, boutons).

export default {
  nav: true,
  render() {
    return `
      <div class="label">Séance 1 · palier 1 · 1re</div>
      <h1 class="h1">Ta séance du jour</h1>
      <div class="lg card t-rose" style="border-radius:26px">
        <div style="display:flex;align-items:baseline;gap:6px">
          <span style="font-size:56px;font-weight:900;line-height:1">2</span>
          <span style="font-size:20px;font-weight:900">km</span>
        </div>
        <p class="small" style="margin-top:6px">1 km à l'aller, 1 km au retour.</p>
      </div>
      <div class="lg card">
        <div class="label" style="margin-bottom:10px">Ma séance</div>
        <div class="field">
          <label for="demo-km">Distance (km)</label>
          <input class="lgi input" id="demo-km" type="text" inputmode="decimal" placeholder="2,0" autocomplete="off">
        </div>
        <p class="small" style="margin-top:10px">Aperçu des composants : la saisie arrive au jalon M2.</p>
      </div>
      <button class="lgb btn btn-primary" type="button" disabled>Enregistrer ma séance</button>
      <a class="lgg btn btn-secondary" href="#/reglages">Tester l'effet verre</a>`;
  },
};
