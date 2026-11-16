# Running

Application web installable (PWA) de suivi d'un plan d'entraînement running pour débutante.
HTML + CSS + JavaScript (modules ES), sans framework ni étape de build : GitHub Pages sert les fichiers tels quels.

En ligne : https://dcryoan.github.io/running/

## Développement local

```bash
npm install          # dépendances de dev uniquement (sharp, pour les images)
npm run serve        # http://localhost:8080/ (service worker en mode dev, sans cache)
npm test             # tests unitaires (node:test)
```

## Avant chaque mise en ligne

```bash
npm run sw           # recalcule la liste de précache et la version du service worker
```

Puis commit + push sur `main`. Les téléphones prennent la nouvelle version **à la prochaine ouverture** de l'app (jamais au milieu d'une saisie).

## Structure

- `index.html`, `manifest.webmanifest`, `sw.js`, `config.js` (clé publique Supabase uniquement)
- `css/` : `tokens.css` (couleurs, police), `glass.css` (effet verre + repli), `screens.css`
- `js/` : `app.js` (routeur, ouverture), `state.js` (stockage local), `glass.js`, `backgrounds.js`, `screens/`
- `data/` : plan, anecdotes, messages, fonds (JSON publics)
- `assets/` : polices Nunito (licence OFL, `assets/fonts/OFL.txt`), icônes, fonds, illustrations
- `tools/` : scripts Node (serveur local, icônes, service worker, conversion des fonds)
- `tests/` : tests `node:test`

Le guide de maintenance complet (plan, anecdotes, fonds) sera ajouté au jalon M7.

Aucune donnée personnelle dans ce dépôt : elles restent sur le téléphone et dans la sauvegarde Supabase.
