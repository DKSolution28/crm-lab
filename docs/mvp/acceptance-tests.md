# Tests d'acceptation du MVP

Cycle QA du 2026-10-14. Branche lue : `cursor/mvp-integration-2cf0`. Aucun scénario de ce document n'a été exécuté.

**Statut de chaque parcours : NOT RUN.** Aucun test nouveau n'est déclaré passé. Les comptages de la phase 3.2 sont historiques, consignés dans `docs/phase3-2-test-isolation.md` : unitaires 35, intégration 16, e2e 24. Ce cycle ne les a pas rejoués.

Les cinq parcours reprennent `docs/mvp/requirements.md`. Les codes HTTP des modules qui n'existent pas encore sont le contrat DESIGNED de l'acceptation. Ils ne sont pas observés dans Salesforce. Le module Accounts déjà en place garde ses codes actuels.

## Préconditions communes

- Base PostgreSQL jetable, une par environnement de travail, sur `127.0.0.1`, `localhost` ou `::1`. `TEST_DATABASE_URL` est obligatoire pour l'intégration, l'API Playwright et l'e2e. `DATABASE_URL` est ignoré par ces commandes.
- Nom de base refusé par la garde actuelle : `crm_lab`, `postgres`, `template0`, `template1`, et un nom de production (`prod`, `production`, `live`). La garde ne refuse pas un nom qui contient seulement la sous-chaîne `crm_lab`. L'acceptation exige quand même un nom jetable qui n'est pas la base de développement.
- Utilisateurs de démonstration présents : `demoadm` (ADMIN), `demostd` (STANDARD). Les données seedées (Northwind Traders, contacts Demo-*, opportunités seed) ne portent pas les préfixes de test et doivent rester.
- Playwright, si la suite propriétaire ou compagne est e2e ou API : `127.0.0.1:3100`, `reuseExistingServer: false`, `NEXT_DIST_DIR=.next-e2e`, `webServer.env.DATABASE_URL` égal à `TEST_DATABASE_URL`. Le port 3000 est refusé.
- Identité de démonstration, tant que les sessions réelles n'existent pas : cookie `crm-lab-user` ou en-tête `x-crm-lab-user`. Ce mécanisme n'est pas le contrat cible du parcours 5.
- Les modules Contact (API et UI), Lead, Activity et Dashboard ne sont pas livrés. Opportunity n'a qu'un modèle minimal. L'absence de ces parcours est la raison du NOT RUN, pas un échec d'exécution.

## Règles de nettoyage

- Intégration : préfixe `[test] ` (avec l'espace final), comme `tests/integration/accounts.test.ts`.
- E2E et API Playwright : préfixe `[e2e] ` (avec l'espace final), comme `e2e/helpers/db.ts`. Les specs actuelles resserrent en `[e2e] UI `, `[e2e] API ` et `[e2e] ISO `. Les parcours ci-dessous utilisent `[e2e] QA ` ou `[test] QA `, qui commencent par ces préfixes.
- `assertCleanupPrefix` refuse un préfixe dont la longueur trimée est inférieure à 3. Le nettoyage appelle `assertConnectedTestDatabase` immédiatement avant chaque `deleteMany`, et s'arrête si `current_database()` n'est pas exactement le nom porté par `TEST_DATABASE_URL`.
- Le helper actuel ne supprime que `Account.name` et `ListView.label`. Un test qui crée un Contact, un Lead, une Opportunity ou une tâche supprime aussi ces lignes par le même préfixe, dans le même nettoyage gardé. Les lignes seedées ne matchent pas le préfixe.
- Les utilisateurs créés pour un cas sont supprimés par identifiant, jamais par un `deleteMany` sans filtre.
- `npm run db:seed` lit `DATABASE_URL` via `.env` et peut écrire dans `crm_lab`. Il ne fait pas partie du nettoyage.

## Parcours 1 — Account, Contact, association, recherche, modification, relation des deux côtés

**Statut : NOT RUN.**

**Suite propriétaire : e2e.** Suites compagnes obligatoires avant un PASS : API pour les codes HTTP, intégration pour les clés étrangères. La Definition of Done exige le parcours en e2e. L'assertion décisive est la relation visible sur les deux fiches.

Hors couverture. L'e2e Accounts historique attend `Contacts (0)` et `Opportunities (0)` sur la fiche. L'API historique vérifie seulement que `contacts` et `opportunities` sont des tableaux. Cela ne crée, ne cherche et ne modifie aucun Contact.

### Préconditions

- Préconditions communes.
- Appelant : `demostd`.
- Noms exacts, uniques par exécution : Account `[e2e] QA Account <stamp>`, Contact nom de famille `[e2e] QA Contact <stamp>`. En intégration, les mêmes libellés avec `[test] QA `.
- Last Name est le seul champ requis observé sur New Contact (INT-5). Le prénom peut rester vide.

### Étapes

1. Créer l'Account.
2. Créer le Contact associé à cet Account.
3. Rechercher le Contact par son nom de famille dans la liste Contacts.
4. Modifier le titre en `QA Buyer` sans retirer l'association.
5. Ouvrir la fiche Account, liste associée Contacts.
6. Ouvrir la fiche Contact.

### Résultat HTTP et UI attendu

- `POST /api/accounts` : 201. Corps : `name` exact, `owner.alias` = `demostd`.
- `POST /api/contacts` : 201. Corps : `lastName` exact, `accountId` égal à l'id du compte créé.
- Recherche liste : 200, une ligne, lien vers ce Contact. L'UI affiche cette unique ligne.
- `PATCH /api/contacts/:id` avec le titre : 200, `title` = `QA Buyer`, `accountId` inchangé.
- Fiche Account : le Contact apparaît dans la relation, avec le titre modifié.
- Fiche Contact : le nom de l'Account est affiché et son lien ouvre la fiche du même id.
- Un second Contact du même nom n'est pas créé par la modification.

### Lignes attendues en base

Après l'étape 4, pour les noms exacts du scénario :

- `Account` : 1 ligne, `name` exact, `ownerId` = id de `demostd`.
- `Contact` : 1 ligne, `lastName` exact, `accountId` = id de cette ligne Account, `title` = `QA Buyer`, `ownerId` = id de `demostd`.
- Les compteurs globaux des tables ne sont pas le critère : le seed contient déjà des contacts. Le critère est le compte des lignes aux noms exacts, plus la clé étrangère.

### Nettoyage

Préfixe `[e2e] QA ` pour e2e et API, `[test] QA ` pour l'intégration. Supprimer le Contact puis l'Account. Ne pas s'appuyer sur le seul `deleteMany` Account du helper actuel : le schéma présent fait `onDelete: SetNull` sur `Contact.accountId`, ce qui détacherait le contact au lieu de le supprimer.

## Parcours 2 — Lead fictif, qualification, conversion, pas de doublon

**Statut : NOT RUN.**

**Suite propriétaire : intégration.** Suites compagnes obligatoires avant un PASS : e2e pour l'écran, API pour les codes HTTP. L'assertion décisive est le comptage des lignes et l'absence de second enregistrement à la reconversion.

Aucune fiche Lead n'est dans `docs/reverse-engineering/`. Il n'y a pas de modèle Lead. Les statuts et le code 409 sont DESIGNED.

### Préconditions

- Préconditions communes.
- Appelant : `demostd`.
- Lead fictif, nom exact `[e2e] QA Lead <stamp>` ou `[test] QA Lead <stamp>`. Ce n'est pas un compte du seed.
- Relever, avant la conversion, les `COUNT(*)` de Account, Contact, Opportunity et Lead.

### Étapes

1. Créer le Lead. Il n'est pas converti.
2. Le qualifier. Il n'est toujours pas converti.
3. Le convertir en demandant une Opportunity optionnelle. Nom d'Opportunity fourni : `[e2e] QA Converted Opp <stamp>` (ou `[test] QA `).
4. Reconvertir le même Lead avec le même corps.
5. Cas d'erreur, chacun sur un Lead distinct du même préfixe : identifiant inconnu ; corps invalide (nom vide) ; conversion demandée avec une Opportunity invalide.
6. Variante sans Opportunity : convertir un autre Lead qualifié sans demander d'Opportunity.

### Résultat HTTP et UI attendu

- Création : 201, un id, indicateur de conversion vide.
- Qualification : 200, statut qualifié, toujours non converti. L'UI de fiche montre ce statut.
- Première conversion avec Opportunity : 200, corps liant un `accountId`, un `contactId` et un `opportunityId`, tous non nuls. L'écran de résultat ouvre ces trois fiches.
- Reconversion du même Lead : 409, message d'erreur de Lead déjà converti. Pas un 200 ni un 201.
- Lead inconnu : 404. Aucune fiche créée.
- Nom vide : 400. Aucune fiche créée.
- Opportunity invalide alors que la conversion la demande : 4xx de validation, et aucune des fiches Account, Contact ou Opportunity de cette tentative n'est conservée.
- Conversion sans Opportunity : 200, `accountId` et `contactId` non nuls, `opportunityId` nul.

### Lignes attendues en base

Comparer des `COUNT(*)` SQL, pas des longueurs calculées en JavaScript après un `findMany` non filtré qui oublierait le seed. Les deltas sont pris entre le relevé initial et la fin de l'étape.

- Après la création : Lead +1. Account, Contact, Opportunity inchangés.
- Après la qualification : tous les comptes inchangés. La ligne Lead reste unique et non convertie.
- Après la première conversion avec Opportunity : Account +1, Contact +1, Opportunity +1, Lead inchangé à +1. La ligne Lead référence les trois ids. Le Contact référence l'Account. L'Opportunity référence l'Account. Une seule ligne de chaque nom exact.
- Après la reconversion : delta 0 sur Account, Contact, Opportunity et Lead. Les trois ids renvoyés la première fois sont inchangés.
- Après chaque cas d'erreur : delta 0 sur les quatre tables par rapport au relevé pris juste avant l'appel.
- Après la variante sans Opportunity : Account +1, Contact +1, Opportunity +0 pour ce Lead, Lead +1.

La création des trois fiches et le marquage du Lead sont une seule transaction. Un échec au milieu laisse les comptes au relevé d'avant l'appel.

### Nettoyage

Même préfixe que le parcours 1. Ordre : Opportunity, Contact, Account, puis Lead, tous filtrés par le préfixe ou par les ids créés dans le cas. Le helper Account seul est insuffisant.

## Parcours 3 — Opportunity, montant Decimal, étape, pipeline égal au dashboard et à PostgreSQL

**Statut : NOT RUN.**

**Suite propriétaire : intégration.** Suite compagne obligatoire avant un PASS : e2e, pour le pipeline et le dashboard. L'assertion décisive est l'égalité numérique entre l'écran, l'API et PostgreSQL, sans passer par `Number()`.

Le modèle actuel `Opportunity.amount` est `Decimal(18, 2)`. Les étapes seedées Qualification, Proposal et Negotiation ne sont pas une picklist observée. Les tests historiques de revenu portent sur `Account.annualRevenue` en `Decimal(18, 0)`, entier. Ils ne couvrent pas ce parcours.

### Préconditions

- Préconditions communes.
- Appelant : `demostd`, propriétaire de l'Account support `[e2e] QA Pipe Account <stamp>`.
- Montant envoyé comme chaîne JSON exacte `9007199254740993.01`, jamais comme nombre JSON. Cette valeur tient dans `Decimal(18, 2)` (16 chiffres avant la virgule, 2 après). Elle n'est pas un entier sûr JavaScript : `Number("9007199254740993.01")` vaut `9007199254740994` sur le moteur Node utilisé pour cette lecture. Un total qui vaut ce nombre arrondi est un échec.
- Date de clôture soumise : `2026-12-31`.
- Deux étapes distinctes du contrat. Tant que le contrat n'a pas remplacé le seed, les valeurs préparatoires `Qualification` puis `Proposal` servent de couple. Ce ne sont pas des libellés observés.
- Relever avant l'insertion : `SELECT COALESCE(SUM(amount), 0) FROM "Opportunity"` et `SELECT "stageName", COALESCE(SUM(amount), 0) FROM "Opportunity" GROUP BY "stageName"`.

### Étapes

1. Créer l'Account support.
2. Créer l'Opportunity sur cet Account, nom `[e2e] QA Pipe <stamp>`, étape initiale, montant chaîne, date de clôture.
3. Lire le total de pipeline et le dashboard.
4. Envoyer le même montant comme nombre JSON.
5. Changer uniquement l'étape vers la seconde valeur.
6. Relire le total de pipeline, les totaux par étape et le dashboard.

### Résultat HTTP et UI attendu

- Création Account : 201.
- Création Opportunity : 201. Le corps renvoie le montant comme chaîne décimale `9007199254740993.01`, la date de clôture `2026-12-31`, l'étape initiale, et `accountId` du support.
- Le nombre JSON pour le montant : 400. La ligne n'est pas créée, ou, si l'appel est un PATCH, le montant stocké ne change pas.
- Après création, le total de pipeline affiché et le champ de valeur du dashboard sont égaux entre eux et égaux au `SUM(amount)` SQL relevé après insertion.
- Changement d'étape : 200. Le montant renvoyé est encore la même chaîne. Le total global de pipeline ne change pas. Le seau de l'étape initiale baisse de ce montant et le seau de la nouvelle étape augmente du même montant. Le dashboard montre les mêmes seaux.

### Lignes attendues en base

- Une ligne `Opportunity`, `name` exact, `accountId` du support, `stageName` final égal à la seconde étape.
- Comparaison faite dans PostgreSQL, pas en nombre JavaScript : `amount = '9007199254740993.01'::numeric`.
- `("closeDate" AT TIME ZONE 'UTC')::date = DATE '2026-12-31'` si la colonne reste un horodatage stocké à minuit UTC. Si le contrat devient une date pure, l'égalité est sur la date. L'écran, l'API et la colonne désignent le même jour calendaire.
- `(somme_après - somme_avant) = '9007199254740993.01'::numeric` pour le `SUM` global. Après le changement d'étape, ce delta global reste le même.
- Pour chaque étape, le total affiché par le pipeline et par le dashboard est égal au `SUM(amount)` SQL de cette étape. Les autres opportunités seedées restent dans la somme : le test ne suppose pas une table vide, il compare à la requête.

### Nettoyage

Préfixe `[e2e] QA ` ou `[test] QA `. Supprimer l'Opportunity du scénario puis l'Account support. Ne pas supprimer les trois opportunités seedées.

## Parcours 4 — Tâche liée, attribution, statut, historique de la fiche

**Statut : NOT RUN.**

**Suite propriétaire : e2e.** Suites compagnes obligatoires avant un PASS : API pour les codes, intégration pour la ligne unique. L'assertion décisive est la tâche visible sur la fiche parente avec le statut mis à jour.

Il n'y a pas de modèle Activity. Le contenu du formulaire de tâche n'a pas été observé. Les listes Open Activities et Activity History sont des métadonnées du layout Account (SET-1) : le partage ouvert / historique est INFERRED. Les codes de statut et de priorité sont DESIGNED.

### Préconditions

- Préconditions communes.
- Parent du cas principal : un Account `[e2e] QA Task Parent <stamp>`, propriétaire `demoadm`.
- Attributaire de la tâche : `demostd`.
- Échéance future, pour que la tâche ne soit pas dans l'indicateur « en retard » du dashboard (échéance passée et statut non clos).
- Sujet exact : `[e2e] QA Task <stamp>`.

### Étapes

1. Créer l'Account parent.
2. Créer la tâche liée à cet Account, assignée à `demostd`, avec une priorité non vide et un statut non clos.
3. Changer le statut vers un statut clos.
4. Rouvrir la fiche Account, zone d'historique.
5. Le même enchaînement, une fois le schéma posé, doit accepter un parent Contact, Lead ou Opportunity. Le cas mesuré ici fixe un seul parent Account. Une tâche a exactement une cible.

### Résultat HTTP et UI attendu

- Création de la tâche : 201. Corps : sujet exact, id du parent Account, attributaire `demostd`, statut non clos.
- Changement de statut : 200. Même id de tâche. Statut clos. Le sujet et le parent sont inchangés.
- Fiche Account : la tâche apparaît dans l'historique avec le statut clos et l'attributaire `demostd`.
- Si l'UI sépare Open Activities et Activity History : après clôture, la tâche est dans Activity History et absente des activités ouvertes. Cette séparation est INFERRED depuis SET-1. L'obligation mesurée est la présence sur la fiche parente avec le statut clos.
- Un second POST n'est pas produit par le changement de statut.

### Lignes attendues en base

- 1 ligne de tâche pour le sujet exact.
- Clé étrangère vers l'Account parent égale à son id. Les clés vers Contact, Lead et Opportunity sont nulles dans ce cas.
- `ownerId` ou colonne d'attribution = id de `demostd`.
- Statut persisté = statut clos envoyé. Échéance = échéance envoyée.
- `COUNT(*)` des tâches de ce sujet = 1 avant et après le changement de statut.

### Nettoyage

Préfixe `[e2e] QA ` ou `[test] QA `. Supprimer la tâche puis l'Account parent.

## Parcours 5 — Édition autorisée, 403 du non-propriétaire, identité qui ne devient pas administrateur

**Statut : NOT RUN.**

**Suite propriétaire : API.** Suite compagne obligatoire avant un PASS : e2e pour le refus affiché au standard non propriétaire sur Account. L'assertion décisive est le couple 200 / 403 sur une identité réelle, et le refus d'une identité absente ou inconnue. Le repli administrateur actuel n'est pas un résultat attendu.

Le 403 propriétaire est le comportement actuel du module Account. Le repli vers l'administrateur est le défaut HIGH déjà décrit dans `docs/mvp/blockers.md`. Ce cycle ne rejoue pas le test API historique `PATCH /api/accounts/:id merges partial updates and enforces ownership`, ni l'e2e `Authorization (designed): a standard user cannot edit an account owned by the administrator`.

La lecture interdite entre utilisateurs, exigée par le module G pour de vrais utilisateurs, n'est pas une étape de ce parcours. Le parcours mesure l'écriture.

### Préconditions

- Préconditions communes.
- Account `[e2e] QA Owned <stamp>`, propriétaire `demoadm`, téléphone initial `+1 555 0101`.
- `demostd` est STANDARD et n'est pas propriétaire.
- Relever `phone` et `updatedAt` avant chaque appel refusé.

### Étapes

1. `demoadm` modifie le téléphone en `+1 555 0177`.
2. `demostd`, identifié de façon explicite, envoie la même modification vers `+1 555 0188`.
3. Une fois les sessions réelles en place : répéter une écriture sans identité, puis avec un alias qui n'existe pas (`nobody`).
4. Ne pas ajouter de test dont le succès serait « l'inconnu a modifié la fiche en tant qu'administrateur ».

### Résultat cible, sessions réelles

Ce bloc est le comportement désiré. Il n'est pas le comportement du code actuel. Il reste NOT RUN.

- Étape 1 : 200. Corps : téléphone `+1 555 0177`, `ownerId` toujours l'id de `demoadm`.
- Étape 2 : 403, corps `{ "error": "You can only edit accounts you own." }` pour un Account. L'UI Account, déjà écrite pour ce cas, masque le lien Edit et affiche `You can only edit accounts you own.` L'écran ne montre pas `+1 555 0188`.
- Étape 3 : 401 pour l'identité absente et 401 pour `nobody`. Aucune session n'est ouverte. L'appelant n'est pas `demoadm`. Aucune ligne `User` n'est insérée. Le téléphone en base reste celui de l'étape 1.

### Échec connu actuel — à affirmer plus tard, pas comme comportement désiré

Tant que l'identité est le cookie `crm-lab-user` ou l'en-tête `x-crm-lab-user`, `getCurrentUser` et `getRequestUser` appellent `resolveUser` dans `src/lib/auth/current-user.ts`.

- Un identifiant qui correspond à un `id` ou un `alias` sélectionne cet utilisateur. C'est le sélecteur de démonstration.
- Un identifiant absent, vide, ou sans correspondance appelle `ensureDefaultUser`.
- `ensureDefaultUser` renvoie le premier utilisateur `orderBy role asc, createdAt asc`. L'enum `UserRole` place `ADMIN` avant `STANDARD`, donc ce premier utilisateur est l'administrateur le plus ancien. Avec le seed, c'est `demoadm`.
- Si la table `User` est vide, `ensureDefaultUser` insère `{ alias: "demoadm", role: "ADMIN" }`.

Conséquence présente : un `PATCH` sans en-tête, ou avec `x-crm-lab-user: nobody`, s'exécute comme cet administrateur et peut répondre 200 sur une fiche dont l'appelant n'est pas propriétaire. C'est un échec connu. Un test qui attend 200 dans ce cas figerait le défaut. Il est interdit. Quand les sessions réelles existeront, le test de l'étape 3 devra échouer tant que ce repli répond 200, puis passer sur le 401 décrit au bloc cible.

Le 403 de l'étape 2, lui, est le comportement désiré dès maintenant pour un standard authentifié qui n'est pas propriétaire. Il est quand même NOT RUN dans ce cycle, parce qu'aucun test n'a été lancé.

### Lignes attendues en base

- Après l'étape 1 : la ligne Account a `phone` = `+1 555 0177`. `ownerId` inchangé. Une seule ligne de ce nom.
- Après l'étape 2 : `phone` et `updatedAt` égaux au relevé pris après l'étape 1.
- Après l'étape 3, contrat cible : `phone` et `updatedAt` encore inchangés. `COUNT(*)` de `User` inchangé.
- L'échec connu ne doit pas être traduit par une attente de ligne modifiée par `demoadm`.

### Nettoyage

Préfixe `[e2e] QA ` ou `[test] QA ` sur le nom de l'Account. Ne pas supprimer `demoadm` ni `demostd`.
