# Architecture de CRM Lab — module Accounts

CRM Lab est une application Next.js (App Router, React 19, TypeScript, Tailwind CSS v4) adossée à PostgreSQL via Prisma 6.19. Le module Accounts reconstruit, en local et avec des données fictives, le comportement observé du module Accounts d'une Salesforce Developer Org (voir `docs/reverse-engineering/accounts/`). Rien ne communique avec Salesforce : aucune API, aucun jeton, aucune donnée réelle.

## 1. Vue d'ensemble

```
Navigateur ──► Next.js (App Router)
               ├─ Pages serveur (RSC)        src/app/accounts/**, src/app/search
               ├─ Server actions             src/app/accounts/actions.ts, src/app/actions.ts
               ├─ Route handlers (REST)      src/app/api/**
               └─ Composants client          src/components/**
                           │
                           ▼
               Couche domaine (TypeScript pur, testable sans HTTP)
                 src/lib/accounts/*  src/lib/auth/*  src/lib/http.ts
                           │
                           ▼
               Prisma Client ──► PostgreSQL local (crm_lab)
```

Principes :

- **Domaine d'abord** : toute règle (validation, filtres, autorisations, vues) vit dans `src/lib`, importée à la fois par les pages, les server actions, les route handlers et les tests Node (`node --test`).
- **État de liste piloté par l'URL** : la vue, le mode d'affichage, la recherche, le tri, la page, le regroupement Kanban, l'enregistrement sélectionné et l'ouverture du panneau Filters sont des paramètres de requête (`view, display, q, sort, dir, page, groupBy, summarizeBy, selected, filters, toast`). Les pages sont `force-dynamic`, rendues côté serveur à chaque requête ; les composants client ne font que modifier l'URL (`useListUrl`).
- **Deux surfaces d'écriture équivalentes** : server actions (formulaires, menus) et API REST (tests, intégrations). Elles appellent les mêmes fonctions du domaine.
- **Classification des comportements** : chaque fonctionnalité est classée *observée* (vue dans Salesforce et documentée dans `03-fiches-ecrans-accounts.md`), *déduite* (induite de métadonnées ou de conventions visibles) ou *conçue* (choix CRM Lab). La classification complète est dans `docs/coverage.md`.

## 2. Modèle de données (Prisma)

Fichier : `prisma/schema.prisma`, migration `prisma/migrations/20261014124145_accounts_module/`.

| Modèle | Rôle | Origine |
| --- | --- | --- |
| `Account` | Les 27 champs de l'objet Account observés dans Object Manager (SET-1) : identité (name, accountNumber, site, type, industry, rating, ownership, accountSource, annualRevenue, numberOfEmployees, tickerSymbol, sic, sicDesc, jigsaw, tier, isBuyer, isCustomerPortal, description, website), contact (phone, fax), adresses composées Billing/Shipping (street, city, state + stateCode, postalCode, country + countryCode), hiérarchie (`parentId` auto-référence « AccountHierarchy »), audit (owner, createdBy, lastModifiedBy, createdAt, updatedAt, lastActivityDate). | Observé (types et longueurs de SET-1) |
| Enums `AccountType`, `Industry`, `AccountSource`, `Rating`, `Ownership` | Valeurs des picklists. `Industry` conserve les 3 valeurs inactives (AerospaceDefense, BusinessServices, Advertising) ; l'activité est portée par `src/lib/accounts/picklists.ts`, pas par la base. | Observé |
| `User` (+ `UserRole` ADMIN/STANDARD) | Utilisateurs de démonstration : propriétaire, créateur, modificateur, vue épinglée (`pinnedAccountViewId`). | Conçu (un seul profil observé) |
| `ListView` | Vues de liste de l'objet Account : `developerName` unique pour les vues système (Recent, AllAccounts, MyAccounts, NewThisWeek), `scope` (ALL, MINE, RECENT, NEW_THIS_WEEK), `columns`, tri par défaut, `filters` (JSON) et `filterLogic`, `visibility` (PRIVATE/EVERYONE), `isSystem`, propriétaire. | Observé (vues, colonnes, gestion) / déduit (stockage) |
| `RecentlyViewed` | Consultations par utilisateur (`@@unique([userId, accountId])`, `viewedAt`) alimentant la vue Recently Viewed. | Déduit |
| `Contact`, `Opportunity` | Modèles minimaux pour matérialiser les relations observées (Contact → Account, listes associées Contacts / Opportunities) ; aucune interface dédiée. | Observé (relation) / conçu (champs minimaux) |
| `LabNote` | Fonctionnalité antérieure de CRM Lab, inchangée. | — |

Les adresses stockent à la fois le code (`billingCountryCode`, `billingStateCode`) et le libellé (`billingCountry`, `billingState`) : le code sert aux filtres et au Kanban (« Billing Country Code »), le libellé à l'affichage et aux filtres texte « (text only) », comme dans la liste des champs filtrables observée.

## 3. Couche domaine (`src/lib`)

| Module | Responsabilité |
| --- | --- |
| `accounts/picklists.ts` | Valeurs/labels/activité des 5 picklists ; pays et états dépendants (`COUNTRY_OPTIONS`, sous-ensemble déduit : US, CA avec états, FR, DE, GB, CI, SN, MA sans états). |
| `accounts/fields.ts` | Catalogue des champs (`ACCOUNT_FIELDS`) avec type, chemin Prisma, filtrable / triable / affichable en colonne, origine ; colonnes par défaut des vues ; champs de regroupement et de synthèse Kanban. |
| `accounts/validation.ts` | `validateAccountInput` : Account Name obligatoire (« Complete this field. »), picklists valides et actives, entiers pour Annual Revenue (18 chiffres) et Employees (8), dépendance pays/état avec résolution des libellés, longueurs maximales observées. Aucune autre règle : l'org observée n'a aucune règle de validation ni de doublon. |
| `accounts/filters.ts` | 9 opérateurs observés, opérateurs autorisés par type de champ (déduit), normalisation des filtres, analyseur de logique « 1 AND (2 OR 3) », compilation en `Prisma.AccountWhereInput`. |
| `accounts/list-views.ts` | Vues système (création idempotente), visibilité, vue par défaut (épinglée ou All Accounts), New / Clone / Rename / Sharing Settings / Select Fields to Display / tri / filtres / Delete / Pin, avec les interdits observés (Recently Viewed non triable et non filtrable). |
| `accounts/service.ts` | Liste (portée de la vue + filtres + recherche + tri + pagination), lecture avec relations, création, modification, consultation récente, recherche globale, lookup Parent Account, regroupement Kanban en mémoire. |
| `accounts/format.ts` | Formatage d'affichage (devise, nombre, dates UTC, adresses, libellés). |
| `auth/current-user.ts` | Utilisateur courant de démonstration : cookie `crm-lab-user` (interface) ou en-tête `x-crm-lab-user` (API) ; repli sur le premier administrateur. |
| `auth/policies.ts` | Autorisations conçues : lecture pour tous, modification par le propriétaire ou un administrateur, vues système réservées aux administrateurs, vues privées visibles de leur propriétaire (et des administrateurs). |
| `http.ts` | Conversion des erreurs de domaine en réponses HTTP (400 validation/filtre/vue, 403 autorisation, 404 introuvable, 500). |

## 4. Interface (`src/app`, `src/components`)

| Zone | Fichiers | Contenu |
| --- | --- | --- |
| Coque applicative | `components/shell/*`, `app/layout.tsx` | Navigation verticale (Home, Accounts ; Contacts / Opportunities désactivés « Module à venir »), recherche globale, sélecteur d'utilisateur de démonstration, fournisseur de toasts. |
| Liste | `app/accounts/page.tsx`, `components/accounts/*` | Sélecteur de vues (« Search lists... », épinglage), résumé « N items • Sorted by • Filtered by », recherche dans la liste, List View Controls (New, Clone, Rename, Sharing Settings, Select Fields to Display, Delete ; Reset Column Widths désactivé), modes Table / Kanban (Kanban Settings : Group By obligatoire, Summarize By) / Split View, Refresh, panneau Filters, pagination, états vide / chargement / erreur. |
| Formulaire | `components/accounts/account-form.tsx`, `app/accounts/new`, `app/accounts/[id]/edit` | Sections About et Get in Touch telles qu'observées, pays → état dépendants, validation du requis au blur, « Undo <champ> », Save / Save & New / Cancel / « Cancel and close » ; groupe repliable « Additional Information » (conçu) pour les champs hors layout de création. |
| Fiche | `app/accounts/[id]/page.tsx`, `components/accounts/account-details.tsx` | Panneau de synthèse, onglets Details (About / Get in Touch / History, déduits du layout) et Related (Contacts, Opportunities, Child Accounts). |
| Recherche globale | `app/search/page.tsx` | « Top Results », compteurs par objet, message « didn't find any matches ». |

## 5. API REST (`src/app/api`)

| Route | Méthodes | Rôle |
| --- | --- | --- |
| `/api/accounts` | GET `?view&q&sort&dir&page&pageSize`, POST | Liste selon une vue ; création. |
| `/api/accounts/[id]` | GET, PATCH | Fiche avec relations et `canEdit` ; modification partielle (fusion avec l'existant). |
| `/api/accounts/lookup` | GET `?q&exclude` | Suggestions Parent Account. |
| `/api/list-views` | GET, POST | Vues visibles + vue épinglée ; création. |
| `/api/list-views/[id]` | GET, PATCH, POST `{action:"clone"}`, DELETE | Lecture, renommage / partage / colonnes / filtres / tri, clonage, suppression. |
| `/api/list-views/[id]/pin` | POST | Épinglage. |
| `/api/picklists` | GET | Picklists, pays/états, opérateurs, catalogue des champs. |
| `/api/users` | GET | Utilisateur courant et utilisateurs de démonstration. |
| `/api/notes`, `/api/health` | — | Existants, inchangés. |

L'utilisateur est fourni par l'en-tête `x-crm-lab-user: <alias|id>` ou par le cookie de l'interface.

## 6. Données de démonstration

`prisma/seed.ts` (`npm run db:seed`) est idempotent : il crée les utilisateurs `demoadm` (ADMIN) et `demostd` (STANDARD), 12 comptes fictifs marqués `[demo]` dans leur description (dont une hiérarchie parent/enfant), 4 contacts et 3 opportunités fictifs, et quelques consultations récentes. Les enregistrements `[demo]` sont supprimés puis recréés à chaque exécution ; aucune donnée personnelle réelle.

## 7. Tests

| Niveau | Commande | Contenu |
| --- | --- | --- |
| Unitaires | `npm run test:unit` | `tests/unit/*.test.ts` — filtres (normalisation, logique, where), validation, picklists, formatage, regroupement Kanban. |
| Intégration Prisma | `npm run test:integration` | `tests/integration/*.test.ts` — cycle de vie des comptes, portées des vues, recherche, tri/pagination, autorisations, hiérarchie, vues personnelles et filtres contre la base locale (enregistrements `[test]` nettoyés). |
| API | `npm run test:api` | `e2e/api.spec.ts` (Playwright `request`) — contrats REST et codes d'erreur. |
| E2E navigateur | `npm run test:e2e` | `e2e/accounts.spec.ts`, `e2e/lab.spec.ts` — parcours utilisateur complets. |
| Tout | `npm test` | Unitaires + intégration + Playwright (un seul worker : base partagée). |

## 8. Limites connues

- Pas d'authentification réelle : le sélecteur d'utilisateur est un outil de démonstration.
- Pas de suppression de compte, d'édition en ligne, d'import CSV, d'actions de masse ni de Chatter (non observés ou hors périmètre).
- Les pays/états sont un sous-ensemble ; Salesforce propose les listes complètes.
- La page d'enregistrement n'a pas été observée dans Salesforce : sa structure est déduite du layout et conçue pour CRM Lab.
