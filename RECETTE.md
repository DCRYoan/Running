# Recette finale — Running (§16 du cahier des charges + évolutions visuelles)

À dérouler sur le téléphone, application **installée depuis l'icône** (pas dans un onglet).
Adresse : https://dcryoan.github.io/Running/ — la référence de version est en bas de Réglages.

**Version à recetter : réf. `cd49cb13f1dd` ou plus récente.** Avant de commencer : ferme
complètement l'app puis rouvre-la (deux fois si besoin) jusqu'à voir cette référence.

Colonne « Vérifié par Claude » : ce qui a déjà été contrôlé par les tests automatiques
(`npm test`, 128 tests) ou dans le navigateur de développement (écrans de 320 à 375 px de large,
jour et soir). Ta validation sur téléphone reste la référence : coche chaque ligne au fur et à mesure.

Astuce : ajouter `?time=matin`, `?time=jour` ou `?time=soir` à l'adresse dans Safari / Chrome
permet de voir une ambiance sans attendre l'heure (dans un onglet, pas dans l'app installée).

## A. Fonctionnement (§16 du cahier des charges)

| # | Critère | Vérifié par Claude | Comment le tester sur le téléphone | OK |
|---|---|---|---|---|
| 1 | Premier lancement : prénom + ville, puis séance 1 (2 km) | Navigateur, origine vierge : Bienvenue → Accueil « 0 séance, premier cap 5 km » | Réinstalle l'app → prénom + ville (choisie dans la liste) → Commencer → « Voir ma séance » : « Séance 1 · palier 1 · 1re », 2 km | ☐ |
| 2 | 3 séances dont une < 90 % → écran incomplet, même séance reproposée | Tests (seuil 90 %, replay) + navigateur | Séance 1 : 2,1 km · Séance 2 : 1,2 km → « Bien joué d'être sortie ! », « On retente la séance 2 » · Séance 3 : 2 km → « Séance 2 validée » | ☐ |
| 3 | Après la 2e sortie de la semaine : Repos ; « séance en plus » ; la semaine repart le lundi | Tests (lundi 00:00, dimanche 23:59, changement d'heure) + navigateur | Après la 2e sortie : écran Repos, 2 sur 2 → « Faire une séance en plus » ouvre la séance. Lundi suivant : l'onglet Séance propose de nouveau la séance | ☐ |
| 4 | 4e séance valide du palier : Fin de palier ; « Passer » = +500 m ; « Rester » = +4 séances | Tests + navigateur | À la « 4e et dernière » : écran Fin de palier, bouton grisé tant que rien n'est choisi. Passer → 2,5 km. (Sur un autre palier : Rester → même distance, 4 séances de plus dans Mon programme) | ☐ |
| 5 | Changer la progression n'affecte que les paliers à venir | Tests + navigateur | Réglages : 700 m / 3 séances → la séance en cours ne change pas, Mon programme projette +700 m toutes les 3 séances. Remets 500 m / 4 | ☐ |
| 6 | Modifier une séance recalcule totaux, statut et plan ; pas de suppression | Tests + navigateur | Historique → crayon → change la distance d'une séance incomplète pour la rendre valide → numéros, Accueil, Stats et séance proposée se mettent à jour. Aucun bouton supprimer | ☐ |
| 7 | Franchir 5 km cumulés déclenche le jalon | Tests (jalons, y compris 2 caps en une sortie) + navigateur | La séance qui fait passer le total au-delà de 5 km : sur l'écran Bravo, **médaille dorée gravée « 5 km »**, rayons dorés + « Cap des 5 km ! » | ☐ |
| 8 | Case douleur : message prudent, séance enregistrée | Navigateur (parcours complet douleur → Bravo → code) | Coche la case (le cœur bat) → message « Prends soin de toi » → puis Bravo / Incomplète ; la séance est dans l'Historique avec « Douleur signalée » | ☐ |
| 9 | Anecdotes « de A à B » qui grandissent ; jamais deux fois la même ; tons alternés ; aucun « X fois » | Tests (500 tirages, 60 anecdotes vérifiées) + navigateur | Ferme / rouvre l'app plusieurs fois : l'anecdote change, le ton aussi, parfois « depuis ta ville ». La pastille du lieu est entière, sous le texte | ☐ |
| 10 | Nouveau fond à chaque ouverture, jamais le même d'affilée ; texte lisible sur chaque fond | Tests (1 000 ouvertures) + contrôle visuel des 27 fonds | Ferme / rouvre (balayer l'app dans le sélecteur) : le fond change. Signale un fond où un texte se lit mal | ☐ |
| 11 | Mode avion : tout fonctionne ; au retour du réseau la sauvegarde se met à jour | Service worker de production testé serveur coupé + tests de la file d'attente | Mode avion → ferme / rouvre → tous les écrans (police des chiffres comprise), enregistre une séance → Réglages : « En attente de réseau ». Réseau revenu, rouvre : point vert, heure à jour | ☐ |
| 12 | Restauration sur un autre téléphone avec le code : historique complet | Navigateur (2e origine vierge) + test de séparation n°4 | Sur un 2e appareil : « J'ai déjà un code de récupération » → ton code → « N séances retrouvées » | ☐ |
| 13 | Les 5 tests de séparation (§10.4) passent | `node tools/test-separation.mjs` contre le vrai projet : **5/5** | — (relançable à tout moment) | ☐ |
| 14 | Effet verre désactivé : lisible et fluide | Navigateur (repli opaque, jour et soir) ; ≤ 4 éléments floutés visibles par écran | Réglages → Effet verre → Désactivé : cartes opaques, tout se lit, le fond ne bouge plus. Remets Auto | ☐ |
| 15 | Aucun texte en anglais, aucun texte au masculin, aucune clé secrète dans le dépôt | Recherche automatique dans le code et les données ; tests sur les messages | Parcours tous les écrans. **Exception validée** : le fond « Continue » dit « fort » (ton choix) | ☐ |

## B. Évolutions visuelles

| # | Critère | Vérifié par Claude | Comment le tester sur le téléphone | OK |
|---|---|---|---|---|
| 16 | Écran d'ouverture « Monogramme » : 2 s, un appui le passe, pas de doublon après une mise à jour | Navigateur (fin d'animation, appui, réouverture) | Ferme complètement puis rouvre : logo framboise, « Running », ligne champagne, puis l'Accueil. Rouvre et touche l'écran : il disparaît tout de suite | ☐ |
| 17 | Fond « cinéma » : un seul zoom lent par ouverture | Navigateur (une seule itération, coupé sans effet verre) | À l'ouverture le fond bouge très lentement, puis s'immobilise au bout d'environ 20 s | ☐ |
| 18 | Ambiance selon l'heure : matin (avant 11 h), journée, soir (dès 19 h) | Navigateur, tous les écrans principaux en jour et en soir | Ouvre l'app après 19 h : fond prune, cartes sombres à liseré champagne, textes clairs. **Parcours tous les écrans le soir**, y compris Douleur, Bravo, Code, Fin de palier (pas encore vérifiés à l'œil le soir) | ☐ |
| 19 | Barre d'onglets : icônes bonbon, lentille qui glisse, écrans en fondu | Navigateur (jour / soir, icônes champagne le soir) | Change d'onglet : la lentille glisse en s'étirant, l'icône active passe en baie, l'écran apparaît en fondu | ☐ |
| 20 | Accueil : anneau de progression et chiffres qui défilent | Navigateur (calcul de l'anneau vérifié) | L'anneau se remplit jusqu'au prochain cap, « Plus que X km avant le cap des Y km » est juste ; les chiffres défilent à l'ouverture | ☐ |
| 21 | Séance : parcours qui se dessine, frise des étapes, grands chiffres | Navigateur (structure ; l'animation n'a pas pu être chronométrée) | L'aller se dessine en baie, le drapeau apparaît, puis le retour en pointillés dorés ; 3 étapes avec icônes ; champs distance / temps en grands chiffres | ☐ |
| 22 | Visages de ressenti vivants | Navigateur | Touche un visage : il rebondit, les autres s'estompent. (Android : petite vibration) | ☐ |
| 23 | Bravo : médaille qui tombe et se balance, chiffres qui défilent, bouton jamais collé | Navigateur (jour, jalon doré, contenu plus haut que l'écran) | Enregistre une séance : la médaille tombe, se balance, brille ; les rayons font 2 tours puis s'arrêtent. Le bouton Continuer garde un espace au-dessus | ☐ |
| 24 | Historique en carnet : calendrier, semaines, caps dans le fil | Tests (jalons rattachés à la bonne sortie) + navigateur (avec 2 sorties seulement) | Calendrier du mois avec tes jours en baie ; sorties groupées par semaine ; « Cap des 5 km » et « Cap des 10 km » à la bonne place dans le fil ; crayon de modification présent | ☐ |
| 25 | Stats en bento + vitrine de médailles | Navigateur (0 médaille sur 3 avec les données de test) | Grandes et petites tuiles justes ; « Mes médailles » : tes médailles dorées avec leur date, les suivantes en silhouette (« encore X km ») ; toucher une médaille la fait retomber | ☐ |
| 26 | Réglages façon iPhone | Navigateur (320 px : les boutons + / − passent à la ligne sans déborder) | Chaque rubrique a sa pastille colorée ; rien ne dépasse ; les chevrons se voient aussi le soir | ☐ |
| 27 | Lisibilité : petites étiquettes sur la photo | Navigateur (aucun texte < 11,5 px hors référence de version) | Sur plusieurs fonds clairs : « Semaine du… », « Mes médailles », rubriques de Réglages et en-têtes se lisent sans effort | ☐ |
| 28 | Illustrations au trait fin | Contrôle visuel d'une planche de 12 illustrations | Les dessins des anecdotes sont en traits fins prune et aplats doux, sans élément manquant | ☐ |

## C. Spécifique Android (téléphone de Camille)

- Installation : Chrome → menu ⋮ → **Installer l'application** (ou « Ajouter à l'écran d'accueil »).
  L'icône framboise apparaît, découpée en rond ou en carré selon le téléphone (icône « maskable »).
- Au lancement, Android affiche d'abord son propre écran (icône sur fond crème), puis le Monogramme
  de 2 s : vérifier que l'enchaînement ne paraît pas trop long.
- Le clavier numérique de la distance propose la virgule ; pour le temps, taper `1830` donne `18:30`.
- **Fluidité** (jamais testée sur un vrai Android) : faire défiler l'Historique et les Stats,
  changer d'onglet plusieurs fois, laisser l'app ouverte 5 minutes. Rien ne doit saccader ni
  chauffer. L'effet verre en **Auto** se coupe tout seul sur un téléphone modeste (mémoire ≤ 2 Go,
  Android à 4 cœurs ou moins, ou moins de 45 images/s) ; Réglages → Effet verre indique pourquoi.
  S'il rame quand même : Réglages → Effet verre → Désactivé.
- **Taille de police** : dans les réglages du téléphone, agrandir la taille de police, rouvrir l'app.
  Noter si l'app suit ce réglage ou non (point encore à vérifier) et si un texte est coupé.

## D. Avant de confier l'app à Camille

1. Finir les parties A, B et C sur la dernière version (toutes les cases cochées).
2. Dans Supabase → SQL Editor : exécuter `supabase/purge-test-data.sql` (supprime **toutes** les
   sauvegardes de test : « Test Navigateur », « Essai », la tienne). Ton propre téléphone recréera
   sa sauvegarde tout seul à la prochaine ouverture. Ne plus ouvrir de version de test après la purge.
3. Sur le téléphone de Camille : installer depuis l'adresse, saisir **son** prénom et **sa** ville.
4. Après sa première séance, l'écran « Une dernière chose » lui montre son code : l'envoyer par
   message à elle-même (bouton Partager).
