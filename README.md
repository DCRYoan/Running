# Running

Application web installable (PWA) de suivi d'un plan d'entraînement running pour débutante :
2 sorties par semaine, un plan infini par paliers, des anecdotes qui grandissent avec les kilomètres,
une sauvegarde en ligne sans compte (code de récupération).

**En ligne : https://dcryoan.github.io/Running/** (attention à la majuscule).

HTML + CSS + JavaScript (modules ES), sans framework ni étape de build : GitHub Pages sert les
fichiers tels quels. Aucune dépendance au runtime (pas de CDN), tout fonctionne hors ligne.
Les dépendances npm (`sharp`) ne servent qu'aux outils de préparation des images.

---

## Sommaire

1. [Développer en local](#1-développer-en-local)
2. [Publier une mise à jour](#2-publier-une-mise-à-jour)
3. [Modifier le plan, les conseils et les messages](#3-modifier-le-plan-les-conseils-et-les-messages)
4. [Ajouter une anecdote](#4-ajouter-une-anecdote)
5. [Ajouter un fond d'écran](#5-ajouter-un-fond-décran)
6. [Sauvegarde en ligne (Supabase)](#6-sauvegarde-en-ligne-supabase)
7. [Structure du code](#7-structure-du-code)
8. [Tests](#8-tests)

---

## 1. Développer en local

```bash
npm install            # une fois : outils de préparation des images
npm run serve          # http://localhost:8080/  (service worker en mode dev, sans cache)
node tools/serve.mjs 8081 --prod   # vrai service worker : pour tester hors ligne et les mises à jour
npm test               # tests unitaires (node:test)
```

Astuces de test :
- `?reopenMs=5000` dans l'adresse : une « nouvelle ouverture » (nouveau fond, nouvelle anecdote)
  après 5 s en arrière-plan au lieu de 30 min.
- Dans la console du navigateur : `(await import('./js/app.js')).app.reopen()` simule une ouverture.
- `?time=matin`, `?time=jour` ou `?time=soir` dans l'adresse : force l'ambiance du moment
  (sinon : matin de 5 h à 11 h, soir à partir de 19 h).
- Les sources des images (`../backgrounds-sources`, `../cartes-motivation`) et le cahier des charges
  restent **à côté** du dépôt, jamais dedans (`.gitignore`).

## 2. Publier une mise à jour

```bash
npm test               # tout doit passer
npm run sw             # recalcule la liste de précache et la version (empreinte du contenu)
git add -A
git commit -m "…"
git push
```

`npm run sw` est **indispensable** : sans lui, les téléphones gardent l'ancienne version en cache.
GitHub Pages publie en 1 à 2 minutes. Chaque téléphone prend la nouvelle version **à sa prochaine
ouverture** (jamais au milieu d'une saisie). La référence affichée en bas de Réglages
(`réf. …`) permet de vérifier quelle version tourne sur un téléphone.

## 3. Modifier le plan, les conseils et les messages

### `data/plan.json`

| Champ | Effet | Modifiable ? |
|---|---|---|
| `tips` | Conseils du jour (écran Séance), un par jour | ✅ librement |
| `rules`, `safetyNote` | Règles d'or et encadré sécurité (Mon programme) | ✅ librement |
| `warmupMin`, `cooldownMin` | Minutes de marche avant / après | ✅ |
| `sessionsPerWeek` | Sorties par semaine avant l'écran Repos | ✅ |
| `milestoneEveryKm` | Écart entre deux jalons (5 km) | ✅ |
| `startKm`, `defaultSessionsPerPalier` | **Premier** palier (2 km, 4 séances) | ⚠️ pas après le début : le plan est recalculé depuis l'historique et l'interpréterait autrement |
| `completeThreshold` | Seuil de séance valide (0,9 = 90 %) | ⚠️ ne s'applique qu'aux séances enregistrées ou modifiées ensuite |

Le pas (+500 m) et le nombre de séances par palier se règlent dans l'app (Réglages > Progression) ;
ils ne touchent que les paliers à venir.

### `data/messages.json`

Messages d'accueil par contexte (`welcome.*`, plusieurs variantes chacun, jamais deux fois de suite),
encouragements de fin de séance, message douleur, suggestion de fin de palier.
Toujours **au féminin** et **encourageants**. Variables : `{x}` (km avant le jalon), `{quand}`
(« d'hier », « de samedi »), `{J}` (jalon).

## 4. Ajouter une anecdote

1. Dans `data/anecdotes.json`, ajouter une entrée à `anecdotes` :
   ```json
   { "id": "toulon-porquerolles", "kind": "fixed", "km": 30.5, "verified": true, "zone": "Var",
     "text": "aller du port de Toulon jusqu'à l'île de Porquerolles", "place": "Porquerolles",
     "image": "assets/anecdotes/toulon-porquerolles.svg", "tones": ["encourageant", "sobre"],
     "source": "Itinéraire OpenStreetMap : 30,5 km" }
   ```
   - `text` se lit après « c'est comme… » : un verbe à l'infinitif, un trajet « de A à B ».
     **Jamais de « X fois ».** Distance à vol d'oiseau : terminer par « , à vol d'oiseau ».
   - **Vérifier la distance** (itinéraire OpenStreetMap, Wikipédia…) et noter la source.
   - `tones` : 2 tons parmi `encourageant`, `humour`, `sobre`.
2. Illustration : ajouter une scène portant le même `id` dans `SCENES` de
   `tools/build-anecdote-art.mjs` (des briques sont prêtes : mer, port, route, montagne…), puis
   `npm run build:art`. Sans scène, l'image générique est utilisée.
3. `npm test` (vérifie l'identifiant unique, la source, l'image, l'absence de « X fois »), puis
   [publier](#2-publier-une-mise-à-jour).

Les anecdotes « depuis ta ville » sont calculées à vol d'oiseau vers les communes de
`data/communes-ref.json` (reconstruire avec `npm run build:communes`).

## 5. Ajouter un fond d'écran

1. Déposer l'image (PNG ou JPG, portrait de préférence) dans `../backgrounds-sources/`
   (photos) ou `../cartes-motivation/` (images avec texte : elles reçoivent un voile plus fort).
   **Pas de texte, de logo ni de marque** sur les photos.
2. `npm run build:backgrounds` : conversion en WebP 1080 × 1920 (≤ 400 Ko), recadrage 9:16 centré à
   46 % pour les images non portrait, mise à jour de `data/backgrounds.json`. Les fonds existants
   gardent leur numéro.
3. Vérifier la lisibilité (la planche contact aide :
   `node tools/build-backgrounds.mjs --contact planche.jpg`).
4. Pour écarter une image : l'ajouter dans `tools/backgrounds-exclude.json` avec la raison.
5. [Publier](#2-publier-une-mise-à-jour).

## 6. Sauvegarde en ligne (Supabase)

- **Aucun compte** : le code de récupération (12 caractères, `XXXX-XXXX-XXXX`) est généré sur le
  téléphone. Le serveur n'en garde que l'empreinte SHA-256.
- `supabase/schema.sql` : à exécuter dans *SQL Editor* (ré-exécutable sans danger). Tables fermées
  (RLS sans policy), accès uniquement par `backup_register`, `backup_load`, `backup_save`,
  limites anti-abus (10 échecs / minute, 20 enregistrements / heure par source).
- `config.js` ne contient que l'URL et la clé **publique** (`sb_publishable_…`), publique par
  conception. **Ne jamais** y mettre la clé `service_role` / `sb_secret_…`.
- Tests de séparation du §10.4 contre le vrai projet : `node tools/test-separation.mjs`
  (bloque la lecture depuis ta connexion pendant 1 minute : c'est voulu).
- Repartir d'une base vide (données de test) : exécuter `supabase/purge-test-data.sql`.
  Les téléphones déjà utilisés se réenregistrent tout seuls à leur prochaine ouverture.
- Projet gratuit : Supabase peut le mettre en pause après une semaine sans activité. L'app contacte
  Supabase à chaque ouverture, ce qui limite le risque. En cas de pause : tableau de bord Supabase →
  *Restore project*. Pendant ce temps, tout reste enregistré sur le téléphone et la sauvegarde
  repart seule ensuite (Réglages > Sauvegarde indique l'état).

## 7. Structure du code

```
index.html  manifest.webmanifest  sw.js  config.js
css/      tokens.css (palette, police, voile) · glass.css (verre + repli) · screens.css
js/
  app.js          routeur, ouvertures, enchaînement après une séance, mises à jour
  state.js        stockage local (localStorage « running:v1 »), migrations
  plan.js         replay() et toute la logique du plan (fonctions pures)
  format.js       nombres, durées, dates en français, saisie
  messages.js     messages d'accueil       anecdotes.js   sélection des anecdotes
  backgrounds.js  rotation des fonds       glass.js       effet verre Auto / Activé / Désactivé
  sync.js         sauvegarde Supabase, fusion          backup-code.js  code de récupération
  geo.js · city-field.js   communes (geo.api.gouv.fr)  charts.js  graphiques SVG
  screens/        un fichier par écran
data/     plan · messages · anecdotes · backgrounds · communes-ref (JSON)
assets/   fonts (Nunito + Barlow Semi Condensed pour les chiffres, licences OFL) · icons · backgrounds · anecdotes (SVG)
supabase/ schema.sql · purge-test-data.sql
tools/    serve, build-sw, build-backgrounds, build-anecdote-art, build-communes,
          build-icons, test-separation
tests/    node:test
```

**Règle d'or** : l'état du plan n'est jamais stocké. `replay(sessions, decisions, plan)` le
recalcule depuis l'historique ; c'est ce qui rend fiables la modification d'une séance et la fusion
de deux appareils.

## 8. Tests

```bash
npm test                          # 120 tests : plan, formats, état, anecdotes, fonds, sauvegarde…
node tools/test-separation.mjs    # séparation des données, contre le vrai Supabase
```

Aucune donnée personnelle dans ce dépôt : elles restent sur le téléphone et dans Supabase.
