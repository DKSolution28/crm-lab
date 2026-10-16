# Trous de tests du MVP

Lecture du 2026-10-14 sur `cursor/mvp-integration-2cf0`. Aucune suite n'a été exécutée pour écrire cette carte. Les totaux unitaires 35, intégration 16 et e2e 24 viennent de `docs/phase3-2-test-isolation.md`. Ils sont historiques.

Les tests qui écrivent n'ont pas été lancés. Aucune base n'a été créée.

## Carte des suites vers les modules

| Suite | Fichiers | Modules couverts | Modules non couverts |
| --- | --- | --- | --- |
| Unitaire `npm run test:unit` | `tests/unit/validation.test.ts`, `tests/unit/picklists-format.test.ts`, `tests/unit/filters.test.ts`, `tests/unit/test-database.test.ts` | Accounts (validation, picklists, filtres, format, garde d'isolation) | Contacts, Leads, Opportunities, Activities, Dashboard, session réelle |
| Intégration `npm run test:integration` | `tests/integration/accounts.test.ts` | Accounts : vues système, cycle de vie, vues personnelles, autorisation propriétaire ou admin au niveau service | Contacts, Leads, Opportunities, Activities, Dashboard |
| API `npm run test:api` | `e2e/api.spec.ts` | Accounts HTTP et vues de liste HTTP | Contacts, Leads, Opportunities, Activities, Dashboard |
| E2E `npm run test:e2e` | `e2e/accounts.spec.ts`, `e2e/api.spec.ts`, `e2e/database-isolation.spec.ts`, `e2e/lab.spec.ts` | Accounts UI, API Accounts, isolement Playwright / Next, note de labo hors CRM | Contacts, Leads, Opportunities, Activities, Dashboard |

`npm test` enchaîne `test:unit`, `test:integration` et `test:e2e`. `test:api` est le sous-ensemble Playwright `e2e/api.spec.ts`. Il est déjà inclus dans `test:e2e`, donc dans le total historique 24. Il n'ajoute pas une quatrième couche de modules.

`e2e/lab.spec.ts` crée une `LabNote` depuis la page d'accueil. Ce n'est pas un module A à G. Le titre `Observation <timestamp>` n'utilise pas le préfixe `[e2e] `, et le spec n'a pas de nettoyage.

## Ce que les cas existants affirment

Comptage des `it` lus dans les fichiers. Non rejoué.

### Unitaire — 35

`tests/unit/validation.test.ts` (9) : nom obligatoire, compte minimal, picklists et valeurs inactives, entiers revenu et effectif, revenu à 18 chiffres conservé et JSON numérique refusé, picklist historique inactive, pays et état dépendants, longueurs, booléens.

`tests/unit/picklists-format.test.ts` (7) : jeux de valeurs observés, valeurs actives et inactives, états dans leur pays, 27 champs Account, formatage, lundi UTC, `orderBy`, sommes Kanban. `lastActivityDate` y est un champ Account nul dans une fixture, pas une activité.

`tests/unit/filters.test.ts` (13) : normalisation, champs et opérateurs refusés, JSON numérique dangereux, opérateurs par type, logique de filtre, conditions Prisma.

`tests/unit/test-database.test.ts` (6) : `TEST_DATABASE_URL` obligatoire, `DATABASE_URL` ignoré, noms et hôtes refusés, base jetable sur loopback, `current_database()` comparé au nom attendu, préfixe de nettoyage et refus du port 3000.

### Intégration — 16

`tests/integration/accounts.test.ts`, préfixe `[test] `, utilisateurs jetables `tstadm` / `tststd` supprimés par id :

- Vues système (3) : base connectée égale à `TEST_DATABASE_URL` et différente de `crm_lab` ; Recent, All Accounts, My Accounts, New This Week ; vue épinglée.
- Cycle de vie (9) : création et Recently Viewed ; nom vide ; recherches All / My / New This Week, téléphone, recherche globale, lookup ; tri et pagination ; édition propriétaire, refus d'un autre standard, admin ; revenu entier exact ; réassignation réservée à l'admin ; hiérarchie parent sans boucle ; compte inconnu et vue récente idempotente.
- Vues personnelles (4) : filtres avec logique ; égalité décimale du revenu annuel Account ; partage ; protection des vues système.

Le revenu couvert est `Account.annualRevenue` en `Decimal(18, 0)`. `Opportunity.amount` en `Decimal(18, 2)` n'a aucun cas.

### API et e2e — 24 au total historique

`e2e/api.spec.ts` (13) : picklists, utilisateurs démo, validation POST Account, création, liste et pagination, fiche avec tableaux `contacts` et `opportunities`, PATCH et 403 d'un standard sur un compte admin, lookup, puis vues de liste (liste, clone, filtres, pin, suppression). Préfixe `[e2e] API `.

`e2e/accounts.spec.ts` (9) : navigation, création avec pays et état, Save & New, recherches liste et globale, édition, filtres de vue, Table / Kanban / Split View, refus d'édition UI pour le standard, compte inconnu. La fiche attend `Contacts (0)` et `Opportunities (0)`. Préfixe `[e2e] UI `.

`e2e/database-isolation.spec.ts` (1) : le helper Prisma et l'API voient la même base jetable et le même `demoadm`, puis un Account créé en direct est relu par l'API. Préfixe `[e2e] ISO `.

`e2e/lab.spec.ts` (1) : note de labo. Hors modules CRM.

`playwright.config.ts` fixe le port 3100, `reuseExistingServer: false`, un worker, et injecte `TEST_DATABASE_URL` comme `DATABASE_URL` du serveur. La garde est dans `tests/test-database.ts`, appelée au chargement de la config et par `tests/preload-test-database.ts`.

## Lacunes explicites

### Pas de tests Contact, Lead, Opportunity, Activity, ni dashboard

Aucun fichier sous `tests/` ou `e2e/` ne crée ou ne modifie un Contact, un Lead, une Opportunity ou une activité. Aucune route dashboard n'existe dans `src/`, et aucun spec ne la lit.

Les seules mentions sont négatives ou structurelles : tableaux vides sur la fiche Account, et `lastActivityDate` dans une fixture de formatage. Le schéma a déjà `Contact` et `Opportunity`. Lead, Activity et dashboard n'ont pas de modèle dédié. L'absence de tests n'est donc pas seulement l'absence d'UI.

Les cinq parcours de `docs/mvp/acceptance-tests.md` restent NOT RUN.

### Pas de workflow CI

Aucun fichier sous `.github/`. `package.json` expose `test:unit`, `test:integration`, `test:api`, `test:e2e`, `lint`, `typecheck` et `build`, sans workflow qui les lance. Un push ne prouve pas que ces commandes ont tourné.

### L'intégration exige `TEST_DATABASE_URL`

`npm run test:integration` précharge `tests/preload-test-database.ts`, qui appelle `applyTestDatabaseUrl()`. Sans `TEST_DATABASE_URL`, la garde lève `UnsafeTestDatabaseError` et n'ouvre pas Prisma. `DATABASE_URL`, y compris celle de `.env`, est ignorée.

`npm run test:e2e` et `npm run test:api` passent par `playwright.config.ts`, qui appelle la même fonction au chargement. Eux aussi s'arrêtent sans `TEST_DATABASE_URL`. `npm run test:unit` ne touche pas à la base.

### `npm run db:seed` suit `DATABASE_URL` et peut écrire `crm_lab`

Le script est `tsx --env-file=.env prisma/seed.ts`. Il n'appelle pas `assertTestDatabaseUrl`. Lancé sans surcharger `DATABASE_URL`, il utilise la valeur de `.env`, qui est la base de développement `crm_lab` dans la procédure de la phase 3.2. Le seed écrit des utilisateurs, des Accounts, des Contacts et des Opportunities.

`npm run db:migrate` (`prisma migrate deploy`) lit aussi l'environnement, pas `TEST_DATABASE_URL`.

Préparer une base jetable exige de surcharger `DATABASE_URL` pour la migration et le seed, puis d'exporter `TEST_DATABASE_URL` pour les tests. Oublier la surcharge écrit dans `crm_lab`.

### Un nom qui contient seulement la sous-chaîne `crm_lab` est autorisé

`assertDatabaseNameAllowed` dans `tests/test-database.ts` compare le nom, en minuscules, à l'ensemble exact `crm_lab`, `postgres`, `template0`, `template1`, puis au motif de production `(^|_)(prod|production|live)(_|$)`.

`crm_lab` et `CRM_LAB` sont refusés. `crm_lab_copy`, `backup_crm_lab` et `crm_laboratory` passent cette fonction : la sous-chaîne n'est pas un critère. Un test destructif peut donc viser une base dont le nom ressemble à la base de développement.

## Tests destructifs et base jetable

L'intégration et l'e2e insèrent puis suppriment des lignes. Chaque environnement de travail utilise sa propre base jetable sur loopback : machine locale, job CI, agent cloud. Cette base n'est pas `crm_lab`, n'est pas une base de production, et n'est pas partagée comme copie unique entre environnements.

Le nettoyage actuel ne retire que les Accounts et les vues de liste du préfixe. Des Contacts ou Opportunities créés sous le même préfixe survivraient. Les futurs tests destructifs étendent le nettoyage à ces tables, appellent `assertConnectedTestDatabase` avant le `deleteMany`, et gardent le préfixe `[test] ` ou `[e2e] `.

Ce document ne lance pas ces tests et n'en crée pas la base.
