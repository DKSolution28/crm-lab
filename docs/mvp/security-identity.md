# Audit d'identité et de sécurité — MVP CRM Lab

Mise à jour du 2026-10-15 : le cookie `crm-lab-user`, l'en-tête `x-crm-lab-user` et le repli administrateur ne sont plus une identité. La session est le cookie signé `crm-lab-session`. Un vérificateur qui n'est pas l'auteur a exécuté les suites et a rendu PASS (81 unitaires, 64 intégration, 36 e2e, lint, typecheck, build). Restent sans session : notes, `GET /api/dashboard`, les lookup et `/search`. Le produit n'est pas prêt pour une production.

Date de lecture : 2026-10-14.  
Base lue : `cursor/mvp-integration-2cf0` à `217b165`.  
Périmètre écrit : ce document seulement. Aucune modification de `src/`, `prisma/`, des tests ou des workflows. Aucun système d'authentification n'est implémenté ici. Aucun secret n'est recopié.

Étiquette produit, inchangée : **démonstration locale**. Ce dépôt n'est pas prêt pour des utilisateurs réels, ni pour un déploiement joignable hors de la machine de l'opérateur.

## Verdict

Aucun constat **CRITICAL** dans le code lu.

Le mécanisme d'identité décrit au module G est **vérifié dans le source**. Pour un serveur joignable au-delà de la boucle locale, il est **HIGH**. Il reste un risque de démonstration accepté seulement tant que le produit porte l'étiquette « démonstration locale ». Retirer cette étiquette exige le plan de migration ci-dessous, y compris les tests d'accès, exécutés et verts.

Les règles d'édition (propriétaire ou `ADMIN`) sont bien appliquées dans la couche service, partagée par les server actions et les routes API qui passent par cette couche. Elles ne compensent pas l'absence de session : l'appelant choisit lui-même l'utilisateur au nom duquel ces règles s'exécutent.

## Méthode

Lecture statique du code et des documents cités. Les preuves sont des fichiers et des fonctions. Ce document ne contient pas de procédure d'attaque, de charge utile, ni de valeur lue dans `.env`.

Fichiers d'identité lus en entier : `src/lib/auth/current-user.ts`, `src/lib/auth/policies.ts`, `src/app/api/users/route.ts`, `src/components/shell/user-switcher.tsx`, `src/components/shell/app-shell.tsx`, `src/app/actions.ts`, `prisma/seed.ts` (utilisateurs et effet du seed), `docs/mvp/requirements.md` (module G), `docs/phase3-2-test-isolation.md`, `.env.example`, `tests/test-database.ts`.

## Identité actuelle — point de départ vérifié

`src/lib/auth/current-user.ts` documente lui-même l'absence d'authentification réelle. Le comportement suivant est celui du code, pas seulement du commentaire.

| Affirmation | Vérification |
| --- | --- |
| Le cookie `crm-lab-user` sélectionne l'utilisateur | Constante `USER_COOKIE`. `getCurrentUser` lit ce cookie via `cookies()` et appelle `resolveUser`. |
| L'en-tête `x-crm-lab-user` sélectionne l'utilisateur | Constante `USER_HEADER`. `getRequestUser` le lit en premier. |
| La sélection se fait par id ou par alias | `resolveUser` : `findFirst` avec `OR: [{ id }, { alias }]`. |
| L'en-tête l'emporte sur le cookie | `getRequestUser` : si l'en-tête est non vide, la fonction retourne tout de suite. Le cookie n'est pas consulté, y compris quand l'en-tête ne désigne personne. |
| Un identifiant inconnu retombe sur un administrateur | `resolveUser` appelle `ensureDefaultUser` quand la recherche ne trouve rien, et aussi quand l'identifiant est vide. |
| Aucun mot de passe, aucune signature de session, aucune preuve serveur | Aucune occurrence de mot de passe, JWT, HMAC ou secret de session dans `src/`. `switchUser` écrit l'id tel quel. |

### Repli `ensureDefaultUser`

`ensureDefaultUser` ne filtre pas `role: "ADMIN"`. Il prend `findFirst` trié par `role` ascendant puis `createdAt` ascendant.

L'enum `UserRole` dans `prisma/schema.prisma` déclare `ADMIN` puis `STANDARD`. Prisma ordonne les enums selon cet ordre de déclaration : un administrateur précède un utilisateur standard. Quand au moins un `ADMIN` existe, le repli est donc le plus ancien administrateur. Le seed crée `demoadm` avant `demostd` (`prisma/seed.ts`, `users`, puis `prisma.user.upsert`).

Deux écarts par rapport à la phrase « le premier administrateur », à garder pour la migration :

- S'il n'existe aucun `ADMIN`, le repli est le plus ancien utilisateur, quel que soit son rôle.
- Si la table `User` est vide, `ensureDefaultUser` **crée** `DEFAULT_ADMIN` (`alias: "demoadm"`, `role: "ADMIN"`). Une requête anonyme sur une base vide est une écriture.

Il n'existe aucun chemin 401. `src/lib/http.ts`, fonction `errorResponse`, traduit `AuthorizationError` en **403**. Ce code n'est atteint qu'après `resolveUser`, donc après le repli.

### Cookie posé par le sélecteur

`UserSwitcher` (`src/components/shell/user-switcher.tsx`) envoie l'id choisi à la server action `switchUser` (`src/app/actions.ts`). `switchUser` vérifie que l'id existe, puis exécute `cookies().set(USER_COOKIE, user.id, { path: "/", sameSite: "lax", httpOnly: true })`.

Attributs présents : `httpOnly`, `SameSite=Lax`, `path=/`. Attributs absents : `Secure`, `Max-Age` / expiration, signature, lien avec une preuve serveur. `resolveUser` accepte aussi un alias dans ce cookie : le sélecteur écrit un id, un client HTTP peut écrire un alias.

`switchUser` ne lit pas l'appelant. N'importe quel invocateur de l'action peut fixer le cookie sur n'importe quel utilisateur existant. C'est le fonctionnement prévu de la démonstration.

### Annuaire

`GET` de `src/app/api/users/route.ts` appelle `getRequestUser` et `listUsers`. `listUsers` retourne chaque utilisateur (`id`, `alias`, nom, `role`, vue épinglée), sans filtre de rôle. Les identifiants renvoyés sont exactement les clés acceptées par `resolveUser`.

### Appelants

`getCurrentUser` (cookie seul) :

- `AppShell` dans `src/components/shell/app-shell.tsx`
- pages `src/app/accounts/page.tsx`, `src/app/accounts/new/page.tsx`, `src/app/accounts/[id]/page.tsx`, `src/app/accounts/[id]/edit/page.tsx`
- server actions de `src/app/accounts/actions.ts` : `createAccountAction`, `updateAccountAction`, `createViewAction`, `cloneViewAction`, `renameViewAction`, `setVisibilityAction`, `setColumnsAction`, `setSortAction`, `saveFiltersAction`, `deleteViewAction`, `pinViewAction`

`getRequestUser` (en-tête, sinon cookie) :

- `GET` et `POST` de `src/app/api/accounts/route.ts`
- `GET` et `PATCH` de `src/app/api/accounts/[id]/route.ts`
- `GET` et `POST` de `src/app/api/list-views/route.ts`
- `GET`, `PATCH`, `POST` et `DELETE` de `src/app/api/list-views/[id]/route.ts`
- `POST` de `src/app/api/list-views/[id]/pin/route.ts`
- `GET` de `src/app/api/users/route.ts`

Il n'y a pas de `src/middleware.ts`.

Chemins qui ne passent ni par `getCurrentUser` ni par `getRequestUser` :

- `createNote` dans `src/app/actions.ts`, formulaire de `src/app/page.tsx`
- `GET` et `POST` de `src/app/api/notes/route.ts`
- `GET` de `src/app/api/accounts/lookup/route.ts` (`lookupAccounts`)
- `SearchPage` dans `src/app/search/page.tsx` (`globalSearch`)
- `GET` de `src/app/api/picklists/route.ts` (métadonnées statiques)
- `GET` de `src/app/api/health/route.ts` (`SELECT 1`)

`globalSearch` et `lookupAccounts` vivent dans `src/lib/accounts/service.ts`. Aucune des deux ne reçoit de `CurrentUser`.

## Politique d'autorisation — vérifiée, et son écart futur

`src/lib/auth/policies.ts` :

- `canEditAccount` : `ADMIN`, ou `account.ownerId === user.id`
- `canManageListView` : vue système réservée à `ADMIN` ; vue personnelle pour le propriétaire ou `ADMIN`
- `canSeeListView` : vue système, visibilité `EVERYONE`, propriétaire, ou `ADMIN`
- `assert` lève `AuthorizationError`

Il n'existe pas de `canCreateAccount`. `createAccount` (`src/lib/accounts/service.ts`) enregistre le compte au nom de l'utilisateur résolu. `scopeWhere` ne restreint la liste que pour les portées `MINE`, `RECENT` et `NEW_THIS_WEEK`. La portée par défaut (`ALL`, vue All Accounts) ajoute un filtre vide : tout utilisateur résolu lit tous les comptes.

`updateAccount` refuse avec `AuthorizationError` quand `canEditAccount` est faux. `requireManageable` dans `src/lib/accounts/list-views.ts` fait de même pour les vues. `resolveOwner` refuse à un non-admin de désigner un autre propriétaire.

C'est le comportement conçu du module G aujourd'hui. L'exigence future du même module (« un utilisateur ne lit pas les enregistrements d'un autre sans permission ») n'est pas satisfaite. Cet écart est accepté sous l'étiquette « démonstration locale ». Il bloque le retrait de l'étiquette, au même titre que l'identité.

### API et server actions : même politique, identité différente

Les deux entrées Accounts et vues de liste appellent les mêmes fonctions (`createAccount`, `updateAccount`, `createView`, `updateView`, `deleteView`, `cloneView`, `pinView`). La décision d'écriture est dans `policies.ts`, exécutée côté serveur.

| Action | Server action | Route API | Contrôle serveur |
| --- | --- | --- | --- |
| Créer un compte | `createAccountAction` | `POST /api/accounts` | `createAccount` (tout utilisateur résolu) |
| Modifier un compte | `updateAccountAction` | `PATCH /api/accounts/:id` | `updateAccount` → `canEditAccount` |
| Lire un compte | page fiche | `GET /api/accounts/:id` | lecture ouverte ; `canEdit` est un indicateur |
| Vues de liste | actions `*ViewAction` | `/api/list-views` | `canSeeListView` / `canManageListView` |

Écarts de forme, pas de règle métier :

- L'UI calcule aussi `canEditAccount` (`EditAccountPage`) et `canManageListView` (`toViewDto` dans `src/components/accounts/list-metadata.ts`). Le client reçoit un booléen et désactive des boutons. La server action et la route API recalculent la règle. Modifier le booléen affiché ne traverse pas `updateAccount` ni `requireManageable`.
- `ownerOptions` (`src/components/accounts/form-support.ts`) masque la liste des propriétaires pour un non-admin. `resolveOwner` réapplique la même limite à l'écriture.
- Les actions renvoient l'erreur dans l'état du formulaire. Les routes passent par `errorResponse` et un statut HTTP. Les deux s'appuient sur la même classe `AuthorizationError`.
- `GET /api/accounts/lookup` et la page `/search` ne prennent pas d'utilisateur. Le jour où les lectures seront filtrées, ces deux chemins resteront ouverts si on ne les raccorde pas à `policies.ts`.

Les tests existants prouvent la **politique**, avec un utilisateur déjà choisi :

- `tests/integration/accounts.test.ts` : `updateAccount` lève `AuthorizationError` pour un autre utilisateur standard, et un admin peut modifier.
- `e2e/api.spec.ts` : `PATCH` avec l'en-tête `x-crm-lab-user: demostd` sur un compte créé sous `demoadm` reçoit 403. Le même fichier protège la vue système All Accounts (403) .

Ces tests envoient l'alias dans l'en-tête. Ils ne prouvent pas une session. Ils ne couvrent ni le 401, ni l'absence de repli administrateur.

## Constats

Gravité pour un déploiement joignable hors de la machine de l'opérateur. Sous l'étiquette « démonstration locale », SEC-ID-01 et SEC-ID-02 sont le risque de démo accepté. Ils restent ouverts. Ils interdisent de déclarer le MVP prêt pour des utilisateurs réels.

| Id | Gravité | Preuve en une ligne |
| --- | --- | --- |
| SEC-ID-01 | HIGH | `getRequestUser` / `switchUser` : cookie `crm-lab-user` ou en-tête `x-crm-lab-user` choisit tout utilisateur par id ou alias, sans signature ; l'en-tête gagne |
| SEC-ID-02 | HIGH | `resolveUser` → `ensureDefaultUser` : identifiant absent ou inconnu devient le premier utilisateur selon `role` asc (ADMIN en tête) ou crée `demoadm` ; aucun 401 |
| SEC-NOTE-01 | MEDIUM | `createNote` et `POST` de `src/app/api/notes/route.ts` écrivent `LabNote` sans résoudre d'utilisateur |
| SEC-LOOK-01 | MEDIUM | `lookupAccounts` (`GET /api/accounts/lookup`) et `globalSearch` (`SearchPage`) lisent les comptes sans `CurrentUser` ni `policies.ts` |
| SEC-CSRF-01 | MEDIUM | Les server actions qui lisent le cookie ont le contrôle d'Origin de Next.js 16, avec exception si `Origin` est absent ; les routes API qui relisent le même cookie n'ont pas ce contrôle |
| SEC-POL-01 | MEDIUM | `canEditAccount` limite l'édition au propriétaire ou à `ADMIN` ; `createAccount` et `scopeWhere` (portée `ALL`) laissent tout utilisateur résolu lire et créer |
| SEC-SEED-01 | MEDIUM | `assertTestDatabaseUrl` exige `TEST_DATABASE_URL` pour les tests ; `db:seed` (`package.json`) charge `.env` et suit `DATABASE_URL` |
| SEC-PG-01 | MEDIUM | `scripts/ensure-database.sh` pose `trust` sur `127.0.0.1/32` et `::1/128` et crée le rôle `ubuntu` en `SUPERUSER` |
| SEC-XSS-01 | LOW | Aucun `dangerouslySetInnerHTML` dans `src/` ; `description` est un nœud texte React ; `website` va dans `href` sans liste de schémas |
| SEC-GET-01 | LOW | `recordView` s'exécute dans `AccountRecordPage` et dans `GET` de `src/app/api/accounts/[id]/route.ts` |

### SEC-ID-01 — Sélection d'identité par cookie ou en-tête

HIGH pour un déploiement public. Risque accepté uniquement avec l'étiquette « démonstration locale ».

Preuve : `USER_COOKIE`, `USER_HEADER`, `resolveUser`, `getCurrentUser`, `getRequestUser` dans `src/lib/auth/current-user.ts` ; écriture du cookie dans `switchUser`. Le seed publie les alias `demoadm` (ADMIN) et `demostd` (STANDARD). L'en-tête non vide court-circuite le cookie. Rien ne signe la valeur, rien ne la lie à un secret serveur, rien ne demande un mot de passe.

`e2e/api.spec.ts` construit l'identité de test avec cet en-tête (`asAdmin`, `asStandard`). C'est le contrat actuel de l'API de démonstration.

### SEC-ID-02 — Repli administrateur

HIGH, même classification que SEC-ID-01. Le repli est le point qui transforme une identité illisible en administrateur quand un `ADMIN` existe, et qui crée `demoadm` sur une table vide.

Preuve : `ensureDefaultUser` et l'appel inconditionnel en fin de `resolveUser`. `errorResponse` n'a pas de branche 401.

### SEC-NOTE-01 — Notes sans identité

`createNote` insère `title` et `detail` dans `LabNote` dès que le titre est non vide. `POST` de `src/app/api/notes/route.ts` fait la même écriture. `GET` de cette route liste toutes les notes. Le cookie de démonstration n'est même pas lu : ces chemins resteront anonymes si l'on ne fait que remplacer `resolveUser`.

Gravité MEDIUM : écriture et lecture ouvertes, données de laboratoire, hors du contrôle `policies.ts`. À fermer avant de retirer l'étiquette.

### SEC-LOOK-01 — Lectures sans utilisateur

`lookupAccounts` renvoie `id`, `name`, `billingCity`. `globalSearch` renvoie les comptes de `searchWhere` (nom et champs clés), plafonnés à 25. Aucune des deux fonctions ne consulte `policies.ts`.

Aujourd'hui, le reste de l'API lit déjà tous les comptes pour tout utilisateur résolu (SEC-POL-01). Ces deux chemins sont plus fragiles : un futur garde « session obligatoire » placé seulement autour de `getRequestUser` ne les verra pas.

`GET /api/picklists` expose des métadonnées de formulaire, pas des enregistrements. `GET /api/health` répond `{ ok, database }` après `SELECT 1`. Ces deux routes peuvent rester anonymes.

### SEC-CSRF-01 — Actions qui font confiance au cookie

Constat de conception, sans essai d'appel inter-site.

Les mutations d'interface sont des server actions (`"use server"` dans `src/app/actions.ts` et `src/app/accounts/actions.ts`). Next.js 16.4.0 (`package.json`) compare l'hôte de `Origin` à `Host` ou `X-Forwarded-Host` et rejette l'écart. La documentation de cette version (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md`) précise qu'une requête **sans** en-tête `Origin` est laissée passer avec un avertissement. `next.config.ts` ne définit pas `serverActions.allowedOrigins`.

Le cookie est `SameSite=Lax` et `httpOnly`. Un navigateur actuel ne l'attache pas à un POST inter-site ordinaire. Il l'attache aux navigations de premier niveau. Il n'est pas marqué `Secure` : sur un déploiement HTTP autre que la boucle locale, il circule en clair. `Secure` casserait le `next dev` HTTP actuel ; il fait partie de la sortie de la démonstration locale, pas d'un correctif à poser dans ce cycle.

Les route handlers n'ont pas le contrôle d'Origin des server actions. Ceux qui appellent `getRequestUser` acceptent le cookie quand l'en-tête est absent. Un en-tête custom n'est pas attaché automatiquement par un formulaire inter-site ; le cookie, lui, l'est selon les règles `SameSite`.

Tant que l'identité est libre (SEC-ID-01), le CSRF n'ajoute presque rien : l'appelant n'a pas besoin du navigateur de quelqu'un d'autre. Le jour où le cookie devient une session, SEC-CSRF-01 devient le défaut à fermer en même temps. Recommandation de conception, dans le plan de migration.

`recordView` sur un `GET` (SEC-GET-01) est la seule mutation de lecture identifiée. Avec `SameSite=Lax`, une navigation de premier niveau envoie le cookie. L'effet est une ligne `RecentlyViewed`, pas une modification de compte.

### SEC-POL-01 — Lecture et création ouvertes

MEDIUM. Ce n'est pas un contournement de `canEditAccount`. C'est la politique conçue, confirmée dans `policies.ts`, `createAccount` et `scopeWhere`, et reprise par les deux entrées HTTP.

Elle contredit l'exigence future du module G sur la lecture. Elle reste acceptable pour des fiches fictives marquées `[demo]`. Elle est insuffisante dès que la base contient autre chose, ou dès que l'étiquette « démonstration locale » tombe.

L'édition, elle, est alignée entre l'UI, les server actions et l'API : propriétaire ou `ADMIN`. Un standard qui modifie le compte d'un autre reçoit `AuthorizationError` / 403, à condition que l'identité résolue soit vraiment la sienne. Aujourd'hui cette condition n'est pas garantie (SEC-ID-01).

### SEC-SEED-01 — Garde de test, et seed qui suit `DATABASE_URL`

Le garde est en place et doit le rester.

`tests/test-database.ts`, `assertTestDatabaseUrl` : `TEST_DATABASE_URL` est obligatoire ; `DATABASE_URL` est ignoré. Hôte limité à `127.0.0.1`, `localhost`, `::1`. Noms refusés : `crm_lab`, `postgres`, `template0`, `template1`, et un nom de production (`prod`, `production`, `live`). Protocole `postgresql:` ou `postgres:`. `assertConnectedTestDatabase` relit `current_database()` avant un nettoyage. `playwright.config.ts` impose cette URL au serveur du port 3100 (`reuseExistingServer: false`). Détail d'exécution : `docs/phase3-2-test-isolation.md`.

Risque résiduel, MEDIUM opérationnel : `package.json` définit `db:seed` comme `tsx --env-file=.env prisma/seed.ts`. La clé `prisma.seed` est la même commande. Ce chemin ne lit pas `TEST_DATABASE_URL`. Sans surcharge de `DATABASE_URL`, il vise la base de `.env`, documentée dans `.env.example` comme `crm_lab`.

Effet du seed (`prisma/seed.ts`, `main`) : upsert de `demoadm` et `demostd`, puis `deleteMany` des opportunités, contacts et comptes dont la description commence par `[demo]`, puis recréation. Lancer le seed sur la mauvaise base réécrit ces enregistrements de démonstration. Le garde des tests ne l'empêche pas.

`npm run db:migrate` (`prisma migrate deploy`) suit aussi `DATABASE_URL`.

### SEC-PG-01 — PostgreSQL local sans mot de passe

`scripts/ensure-database.sh` réécrit `pg_hba.conf` pour `trust` sur `127.0.0.1/32` et `::1/128`, puis crée le rôle `ubuntu` avec `LOGIN SUPERUSER` s'il manque, et la base `crm_lab`. `.env.example` décrit cette authentification sans mot de passe, limitée à la boucle locale.

C'est cohérent avec une démonstration sur une seule machine. Le copier tel quel vers un hôte qui écoute au-delà de la boucle locale donnerait à tout client du réseau un superutilisateur sans secret. Le script, dans son état lu, ne modifie que les lignes de boucle locale. La règle de sortie : ne pas réutiliser `trust` ni ce rôle superutilisateur hors de cette machine.

### SEC-XSS-01 — Texte React, description, lien site web

Aucune occurrence de `dangerouslySetInnerHTML` ni de `innerHTML` dans `src/`.

`description` (`VarChar(32000)` dans `prisma/schema.prisma`) est affichée comme texte dans `AccountDetails` (`whitespace-pre-line`) et saisie par un `<textarea>` dans `account-form.tsx`. `detail` des notes est un texte `whitespace-pre-wrap` dans `src/app/page.tsx`. React échappe ces nœuds.

`website` est recopié dans `href` sur la fiche (`AccountRecordPage`, `AccountDetails`) après un contrôle de longueur dans `src/lib/accounts/validation.ts` (255 caractères), sans liste `http` / `https`. React 19 bloque les URL `javascript:` au rendu (chaîne de précaution présente dans `react-dom`). Cette protection appartient au framework. Elle disparaît si un futur rendu HTML de `description` ou de `website` contourne React.

Recommandation, sans changement de code dans ce cycle : conserver le texte React pour `description` ; avant tout rendu HTML, assainir avec une bibliothèque maintenue ; restreindre `website` aux schémas `http` et `https` dans `validation.ts`.

### SEC-GET-01 — Écriture au fil d'une lecture

`recordView` insère ou met à jour `RecentlyViewed` pour l'utilisateur résolu. Appelée par la page fiche et par `GET /api/accounts/[id]`. Gravité LOW : intégrité de l'historique de consultation, pas du compte. À rendre idempotente et rattachée à une session avant un déploiement plus large. Les autres mutations Accounts et vues sont des `POST`, `PATCH`, `DELETE` ou des server actions.

## Injection SQL

Aucun défaut ouvert.

Les lectures et écritures métier passent par le client Prisma (`findMany`, `create`, `update`, `deleteMany`, clauses `where`). Les filtres (`filtersToWhere` dans `src/lib/accounts/filters.ts`) construisent un `Prisma.AccountWhereInput`. Le champ vient du catalogue `ACCOUNT_FIELDS` (`getField`, drapeau `filterable`). L'opérateur vient de `FILTER_OPERATORS`. La logique « 1 AND (2 OR 3) » est un petit parseur qui produit `AND` / `OR` Prisma. Elle n'interpole pas de SQL.

SQL brut trouvé, toujours en template étiqueté Prisma (paramétré), jamais `$queryRawUnsafe` ni `$executeRawUnsafe` :

- `src/app/page.tsx` et `src/app/api/health/route.ts` : `SELECT 1`
- `tests/integration/accounts.test.ts` et `e2e/helpers/db.ts` : `SELECT current_database() AS name`

`orderByFor` et `setPath` n'acceptent un chemin que s'il appartient au catalogue de champs. Conserver cette liste fermée. Ne pas introduire de SQL concaténé pour la recherche ou pour le verrou de conversion décrit plus bas : un template étiqueté Prisma, ou une transaction interactive Prisma, suffit.

## Secrets

`.gitignore` ignore `.env*` et réautorise `.env.example`. Il ignore aussi `*.pem`. Un fichier `.env` est présent sur la machine de lecture. Il n'est pas suivi par git. Le seul nom de variable qu'il contient est `DATABASE_URL`. La valeur n'a pas été lue pour ce rapport et ne doit pas être collée dans un document, un ticket ou un prompt.

`.env.example` ne contient qu'une URL locale sans mot de passe, et une ligne commentée pour `TEST_DATABASE_URL`. C'est un modèle, pas un secret. Ne pas y ajouter de valeur réelle.

Ne jamais committer :

- `.env`, toute `DATABASE_URL` avec mot de passe, hôte non local, ou base autre que la base de laboratoire ;
- un futur secret de session, un secret OAuth, un jeton Salesforce, un cookie `sid`, une URL `frontdoor.jsp` ;
- une clé privée PEM ;
- un dump de base.

Les preuves d'exploration dans `docs/reverse-engineering/` restent soumises à la règle déjà écrite dans `docs/reverse-engineering/accounts/README.md` : pas d'identifiant, mot de passe, jeton, cookie ou identifiant d'organisation Salesforce.

### Variables proposées pour une session future

Noms seulement. Aucune valeur dans git. Les ajouter plus tard à `.env.example` comme clés vides ou commentées, dans un autre changement.

| Variable | Rôle |
| --- | --- |
| `CRM_LAB_DEMO_AUTH` | Présente et égale à `1` : autorise le sélecteur et les alias `demoadm` / `demostd`. Absente ou autre valeur : ces alias sont refusés. |
| `CRM_LAB_SESSION_SECRET` | Secret serveur qui signe (ou chiffre) le cookie de session. Obligatoire dès que `CRM_LAB_DEMO_AUTH` n'est pas `1`. Longueur suffisante pour la primitive choisie (32 octets aléatoires est un plancher raisonnable). Généré hors du dépôt. |
| `CRM_LAB_SESSION_TTL_SECONDS` | Durée de vie de la session. Valeur bornée côté serveur, avec un défaut explicite si la variable est absente. |

Rotation : le serveur peut accepter un secret précédent, `CRM_LAB_SESSION_SECRET_PREVIOUS`, le temps de laisser expirer les cookies déjà émis. Le précédent a les mêmes règles de non-commit. Aucun des deux ne va dans le client, dans les logs, ni dans ce document.

## Intégrité référentielle — conversion de lead

Conception seulement. Il n'y a pas de modèle `Lead` (`docs/mvp/coverage.md`, `prisma/schema.prisma`). Ne pas implémenter la conversion dans le cycle d'identité.

État des clés actuelles, à ne pas recopier pour les liens de conversion :

- `Contact.accountId` et `Opportunity.accountId` sont `onDelete: SetNull`. Effacer un compte détache les fils au lieu de les refuser.
- `Account.ownerId`, `createdById` et `lastModifiedById` sont obligatoires, sans `onDelete` : le défaut Prisma est Restrict. On ne supprime pas un utilisateur qui possède encore des comptes.
- `RecentlyViewed` est en Cascade. La vue épinglée est en SetNull.

Une conversion qui enchaîne plusieurs `create` hors transaction peut laisser un compte sans contact si le second écrit échoue. C'est le défaut à éviter.

Recommandation :

1. Une seule transaction interactive Prisma pour toute la conversion. Annulation complète si une étape échoue. Aucun compte orphelin visible hors de la transaction.
2. Ordre dans la transaction : verrouiller la ligne Lead, créer le Account, créer le Contact avec `accountId`, créer l'Opportunity seulement si elle est demandée, puis marquer le Lead converti avec les trois clés (l'opportunity reste nulle si elle n'a pas été demandée).
3. Colonnes de résultat portées par le Lead, avec clés étrangères : `convertedAccountId`, `convertedContactId`, `convertedOpportunityId` nullable. `onDelete: Restrict` sur ces trois liens. Effacer le compte, le contact ou l'opportunité issus d'une conversion est refusé tant que le Lead pointe dessus. SetNull masquerait une conversion déjà faite.
4. Unicité : une contrainte unique sur l'identifiant du Lead converti, et un statut terminal. La seconde demande relit les clés déjà écrites et n'insère rien. Le test d'état et la contrainte unique sont les deux : le test sert la réponse fonctionnelle, la contrainte sert la course entre deux transactions.
5. Le verrou de ligne se prend dans la transaction, avant les insertions, sur la seule ligne du Lead. Rester sur une API paramétrée. Pas de SQL construit par concaténation.
6. Les propriétaires référencent des `User` déjà présents. La conversion ne crée pas d'utilisateur et n'appelle pas `ensureDefaultUser`.
7. L'autorisation est `canConvertLead` dans `policies.ts`, évaluée sur le serveur après le verrou, sur le même modèle que `canEditAccount` (propriétaire du lead ou `ADMIN`, décision à figer quand le module Leads sera spécifié). Le client affiche le bouton ; il ne décide pas.
8. Les enregistrements créés restent soumis aux clés Restrict déjà utilisées pour `ownerId`. Aligner les nouveaux objets du schéma unique (MVP-SCHEMA) sur cette transaction avant d'écrire le service de conversion.

## Plan de migration — de la démo vers une session vérifiée

Conception seulement. Pas de code, pas de mot de passe, pas de jeton dans git.

Le MVP reste « démonstration locale » jusqu'à ce que les tests du paragraphe suivant existent et passent. Une suite verte actuelle, qui s'authentifie par `x-crm-lab-user`, ne compte pas.

1. **Garder `demoadm` et `demostd` seulement avec le drapeau.** `CRM_LAB_DEMO_AUTH=1` est le seul interrupteur. Il est réservé aux processus de test et au serveur de laboratoire local. Le sélecteur `UserSwitcher` et `switchUser` ne s'enregistrent que dans ce mode. Hors de ce mode, le seed peut encore créer les deux lignes pour les tests, mais ni le cookie ni l'en-tête ne peuvent les choisir. Le drapeau absent est le défaut sûr : la démonstration est éteinte.
2. **Retirer l'usurpation.** `getCurrentUser` et `getRequestUser` cessent d'accepter un id ou un alias fourni par le client. `USER_HEADER` n'est plus une identité. `switchUser` disparaît hors drapeau. `ensureDefaultUser` ne crée plus d'administrateur au fil d'une requête, et ne sert plus de repli.
3. **Vérifier la session sur le serveur.** Le cookie de session contient un identifiant opaque de session, signé ou chiffré avec `CRM_LAB_SESSION_SECRET`. Chaque appel résout l'utilisateur en relisant la session côté serveur (présence, expiration `CRM_LAB_SESSION_TTL_SECONDS`, utilisateur encore en base, rôle lu en base). Attributs du cookie : `httpOnly`, `SameSite=Lax` (ou `Strict` si le produit n'a pas de navigation entrante), `Secure` dès que le service quitte le HTTP de boucle locale, `Path=/`. Le rôle affiché par le client n'est pas relu comme une autorité.
4. **Laisser l'autorisation dans `policies.ts`.** Les server actions et les routes API continuent d'appeler les fonctions de service qui appellent `canEditAccount`, `canManageListView`, `canSeeListView`. Les booléens envoyés au client restent de l'affichage. Ajouter les futures règles (`canConvertLead`, lecture restreinte) dans ce module, pas dans `user-switcher.tsx` ni dans un composant client. Raccorder `globalSearch`, `lookupAccounts`, `createNote` et `/api/notes` au même utilisateur résolu.
5. **Tests bloquants, exécutés.** Voir la liste ci-dessous. Ils échouent sur le code actuel : c'est attendu. On ne les déclare pas verts par lecture.
6. **L'étiquette ne tombe qu'ensuite.** Tant que ces tests ne sont pas dans le dépôt et verts sur `TEST_DATABASE_URL`, le statut MVP, le README et ce document disent « démonstration locale ». Aucun déploiement public, aucun partage du port au-delà de la machine de l'opérateur.

Compléments au moment où le cookie devient une vraie session (SEC-CSRF-01) :

- Conserver le contrôle d'Origin de Next.js sur les server actions. Traiter l'absence d'`Origin` comme un refus pour les actions qui modifient des données, au lieu de s'appuyer sur l'exception documentée.
- Appliquer le même critère d'origine aux route handlers qui acceptent le cookie de session, ou ne plus authentifier ces routes par cookie. Un jeton que le navigateur n'attache pas tout seul évite le CSRF ; il demande alors une politique CORS explicite, liste fermée, sans reflet de l'origine appelante.
- Ne pas élargir `allowedOrigins` au-delà des hôtes qui servent réellement l'application.

PostgreSQL, le jour où le service quitte la machine de labo : mot de passe ou équivalent, rôle sans `SUPERUSER`, `pg_hba.conf` sans `trust` hors boucle locale, `DATABASE_URL` seulement dans l'environnement du processus.

## Tests qui doivent exister avant de retirer l'étiquette

À écrire dans un cycle ultérieur, contre `TEST_DATABASE_URL`, sans réutiliser `crm_lab`. Ils visent le comportement cible. Les noms sont des intentions, pas des fichiers à créer maintenant.

| Test | Résultat attendu une fois la session en place |
| --- | --- |
| Requête sans cookie de session et sans identité de démo | **401**. Aucune ligne `User` créée. Le corps n'est pas celui de `demoadm`. |
| Cookie ou en-tête portant un id ou un alias inconnu, drapeau de démo éteint | **401**. `ensureDefaultUser` n'est pas appelé. Le premier administrateur n'est pas substitué. |
| Session d'un utilisateur standard, `PATCH` du compte d'un autre propriétaire | **403**. La ligne en base est inchangée. |
| Même scénario pour une vue de liste dont il n'est pas propriétaire | **403** ou 404 déjà utilisé pour masquer l'existence (`deleteView` / `findView`). Le choix 403 ou 404 reste celui de `policies.ts`, documenté, et identique entre l'action et la route. |
| `CRM_LAB_DEMO_AUTH` absent | L'en-tête `x-crm-lab-user: demoadm` et un cookie `crm-lab-user` égal à cet alias ou à cet id sont ignorés. Réponse 401. |
| `CRM_LAB_DEMO_AUTH=1`, réservé au test | Le sélecteur ne propose que les utilisateurs de démo prévus. Ce mode ne fait pas passer les tests 401/403 ci-dessus : ils s'exécutent drapeau éteint. |

Le test d'intégration actuel sur `updateAccount` et le 403 de `e2e/api.spec.ts` restent utiles comme preuves de `canEditAccount`. Ils ne remplacent pas le tableau : ils authentifient l'appelant par l'en-tête libre.

Aucun de ces tests n'est vert aujourd'hui, parce que le comportement cible n'est pas celui du code. Le MVP reste donc « démonstration locale ».

## Ce que cet audit ne fait pas

- Il n'ajoute pas de login, de hash de mot de passe, de jeton, ni de variable secrète.
- Il ne modifie pas `canEditAccount` et ne ferme pas les routes.
- Il ne fusionne pas de branche et n'ouvre pas de pull request.
- Il ne rejoue pas la suite de tests : aucun code applicatif n'a changé. Les chiffres de `docs/phase3-2-test-isolation.md` restent ceux de cette phase.
