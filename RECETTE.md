# Recette finale — Running (§16 du cahier des charges)

À dérouler sur le téléphone, application **installée depuis l'icône** (pas dans un onglet).
Adresse : https://dcryoan.github.io/Running/ — la référence de version est en bas de Réglages.

Colonne « Vérifié par Claude » : ce qui a déjà été contrôlé par les tests automatiques
(`npm test`, 120 tests) ou dans le navigateur de développement. Ta validation sur téléphone reste
la référence.

| # | Critère | Vérifié par Claude | Comment le tester sur le téléphone |
|---|---|---|---|
| 1 | Premier lancement : prénom + ville, puis séance 1 (2 km) | Navigateur (parcours complet, ville tapée sans choix résolue en Toulon 83137) | Réinstalle l'app → prénom + ville (choisie dans la liste) → Commencer → « Voir ma séance » : « Séance 1 · palier 1 · 1re », 2 km |
| 2 | 3 séances dont une < 90 % → écran incomplet, même séance reproposée | Tests (seuil 90 %, replay) + navigateur | Séance 1 : 2,1 km · Séance 2 : 1,2 km → « Bien joué d'être sortie ! », « On retente la séance 2 » · Séance 3 : 2 km → « Séance 2 validée » |
| 3 | Après la 2e sortie de la semaine : Repos ; « séance en plus » ; la semaine repart le lundi | Tests (lundi 00:00, dimanche 23:59, changement d'heure) + navigateur | Après la 2e sortie : écran Repos, 2 sur 2 → « Faire une séance en plus » ouvre la séance. Lundi suivant : l'onglet Séance propose de nouveau la séance |
| 4 | 4e séance valide du palier : Fin de palier ; « Passer » = +500 m ; « Rester » = +4 séances | Tests + navigateur | À la « 4e et dernière » : écran Fin de palier, bouton grisé tant que rien n'est choisi. Passer → 2,5 km. (Sur un autre palier : Rester → même distance, 4 séances de plus dans Mon programme) |
| 5 | Changer la progression n'affecte que les paliers à venir | Tests + navigateur | Réglages : 700 m / 3 séances → la séance en cours ne change pas, Mon programme projette +700 m toutes les 3 séances. Remets 500 m / 4 |
| 6 | Modifier une séance recalcule totaux, statut et plan ; pas de suppression | Tests + navigateur | Historique → crayon → change la distance d'une séance incomplète pour la rendre valide → numéros, Accueil, Stats et séance proposée se mettent à jour. Aucun bouton supprimer |
| 7 | Franchir 5 km cumulés déclenche le jalon | Tests + navigateur | La séance qui fait passer le total au-delà de 5 km : beaucoup de confettis + « Cap des 5 km ! » |
| 8 | Case douleur : message prudent, séance enregistrée | Navigateur | Coche la case → message « Prends soin de toi » → puis Bravo / Incomplète ; la séance est dans l'Historique avec « Douleur signalée » |
| 9 | Anecdotes « de A à B » qui grandissent ; jamais deux fois la même ; tons alternés ; aucun « X fois » | Tests (500 tirages, 60 anecdotes vérifiées) + navigateur | Ferme / rouvre l'app plusieurs fois : l'anecdote change, le ton aussi (encourageant / humour / sobre), parfois « depuis ta ville » |
| 10 | Nouveau fond à chaque ouverture, jamais le même d'affilée ; texte lisible sur chaque fond | Tests (1 000 ouvertures) + contrôle visuel des 27 fonds | Ferme / rouvre (balayer l'app dans le sélecteur) : le fond change. Signale un fond où le texte se lit mal |
| 11 | Mode avion : tout fonctionne ; au retour du réseau la sauvegarde se met à jour | Service worker de production testé serveur coupé + tests de la file d'attente | Mode avion → ferme / rouvre → tous les écrans, enregistre une séance → Réglages : « En attente de réseau ». Réseau revenu, rouvre : point vert, heure à jour |
| 12 | Restauration sur un autre téléphone avec le code : historique complet | Navigateur (2e origine vierge) + test de séparation n°4 | Sur un 2e appareil : « J'ai déjà un code de récupération » → ton code → « N séances retrouvées » |
| 13 | Les 5 tests de séparation (§10.4) passent | `node tools/test-separation.mjs` contre le vrai projet : **5/5** | — (relançable à tout moment) |
| 14 | Effet verre désactivé : lisible et fluide | Navigateur (repli opaque) ; ≤ 5 éléments floutés visibles par écran | Réglages → Effet verre → Désactivé : cartes opaques, tout se lit. Remets Auto |
| 15 | Aucun texte en anglais, aucun texte au masculin, aucune clé secrète dans le dépôt | Recherche automatique dans le code et les données ; tests sur les messages | Parcours tous les écrans. **Exception validée** : la carte « Continue » dit « fort » (ton choix) |

## Spécifique Android (téléphone de Camille)

- Installation : Chrome → menu ⋮ → **Installer l'application** (ou « Ajouter à l'écran d'accueil »).
  L'icône framboise apparaît, découpée en rond ou en carré selon le téléphone (icône « maskable »).
- Le clavier numérique de la distance propose la virgule ; pour le temps, taper `1830` donne `18:30`.
- Effet verre en **Auto** : il se coupe tout seul sur un téléphone modeste (mémoire ≤ 2 Go ou
  animation lente). S'il rame quand même : Réglages → Effet verre → Désactivé.

## Avant de confier l'app à Camille

1. Dans Supabase → SQL Editor : exécuter `supabase/purge-test-data.sql` (supprime les sauvegardes
   de test). Ton propre téléphone recréera sa sauvegarde tout seul à la prochaine ouverture.
2. Sur le téléphone de Camille : installer depuis l'adresse, saisir **son** prénom et **sa** ville.
3. Après sa première séance, l'écran « Une dernière chose » lui montre son code : l'envoyer par
   message à elle-même (bouton Partager).
