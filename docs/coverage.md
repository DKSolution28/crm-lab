# Couverture fonctionnelle — module Accounts de CRM Lab

Référence : `docs/reverse-engineering/accounts/spec-accounts.md` (spécification observée) et `03-fiches-ecrans-accounts.md` (fiches d'écran). Chaque ligne est classée :

- **Observé** : comportement vu dans Salesforce (identifiant de fiche entre parenthèses) et reproduit.
- **Déduit** : induit de métadonnées (Object Manager, layout) ou de conventions visibles, non vu en fonctionnement.
- **Conçu** : choix propre à CRM Lab, nécessaire au fonctionnement local ou au périmètre de la mission ; ce n'est pas un comportement Salesforce vérifié.

Statut : ✅ implémenté et testé · ◐ partiel · ✖ non implémenté.

## 1. Modèle de données

| Exigence (spec §1, §8.1-8.2) | Classification | Statut | Implémentation / test |
| --- | --- | --- | --- |
| 27 champs Account avec types et longueurs | Observé (SET-1) | ✅ | `prisma/schema.prisma`, `validation.ts` (longueurs) ; `tests/unit/validation.test.ts`, `picklists-format.test.ts` |
| Account Name obligatoire, seule règle de validation | Observé (FRM-3, SET-1 : 0 règle) | ✅ | `validation.ts` ; unitaires, intégration, API, E2E |
| Owner par défaut = utilisateur courant | Observé (FRM-1) | ✅ | `service.ts` `resolveOwner` ; intégration |
| Adresses composées Billing / Shipping, pays → état dépendants | Observé (FRM-1) | ✅ | `picklists.ts`, `validation.ts`, `account-form.tsx` ; unitaires + E2E |
| Liste des pays/états | Déduit (sous-ensemble : US/CA avec états, FR/DE/GB/CI/SN/MA sans) | ◐ | Salesforce propose les listes complètes ; CRM Lab un sous-ensemble documenté |
| Parent Account (auto-référence) | Observé (champ) | ✅ | relation `AccountHierarchy`, lookup, détection de boucle (conçu) ; intégration + API |
| Picklists Type (10), Industry (32 + 3 inactives), Account Source (11), Rating (3), Ownership (4), sans valeur par défaut | Observé (SET-1) | ✅ | `picklists.ts` ; valeurs inactives refusées à la saisie mais affichées si présentes (déduit) |
| Relations Contact → Account, listes associées Contacts / Opportunities | Observé (INT-5) / Métadonnées | ◐ | Modèles minimaux `Contact`, `Opportunity`, affichage en onglet Related ; pas d'interface de saisie (hors périmètre) |
| Cases, Partners, Activités, Files, Notes & Attachments | Métadonnées | ✖ | Non modélisés (hors périmètre Accounts) |

## 2. Navigation

| Exigence (spec §2) | Classification | Statut | Implémentation / test |
| --- | --- | --- | --- |
| Onglet Accounts → vue épinglée | Observé (NAV-1) | ✅ | `app-shell.tsx`, `resolveDefaultView` ; E2E NAV-1 |
| Fil d'Ariane « Accounts › <vue> », sélecteur de vue, épinglage | Observé (NAV-1, LST-2) | ✅ | `view-selector.tsx` ; E2E, API pin |
| Actions d'objet New | Observé | ✅ | lien New → `/accounts/new` |
| Import, Add to an Actionable List, Assign Label | Observé (INT-1…INT-4) | ✖ | Non reproduits : assistant d'import et actions de masse hors périmètre ; les toasts d'erreur observés ne sont donc pas réimplémentés |
| Recherche globale, page de résultats avec compteurs et message sans résultat | Observé (NAV-3a/b/c) | ◐ | `app/search/page.tsx` ; champ de l'en-tête sans suggestions en langage naturel (non reproduites) ; E2E |
| Page d'enregistrement (highlights, Details / Related) | Déduit du layout (sections About / Get in Touch / History) + conçu | ✅ | `app/accounts/[id]/page.tsx` ; E2E |
| Onglets Activity / Chatter | Inconnu | ✖ | Non implémentés |

## 3. Vues de liste

| Exigence (spec §3) | Classification | Statut | Implémentation / test |
| --- | --- | --- | --- |
| Recently Viewed (non triable, colonnes Name / Phone / Owner Alias) | Observé (LST-1) | ✅ | `list-views.ts`, `service.ts` ; intégration, API |
| All Accounts (épinglée par défaut, colonnes observées, tri Account Name) | Observé (LST-2) | ✅ | idem |
| My Accounts, New This Week | Observé (noms) / déduit (filtre implicite Owner = moi, Created Date = cette semaine, semaine débutant le lundi UTC) | ✅ | `scopeWhere`, `startOfWeek` ; unitaires + intégration |
| « Recently Viewed Accounts » (variante) | Observé (nom seulement) | ✖ | Non créée (doublon fonctionnel de Recent) |
| Résumé « N items • Sorted by • Filtered by » | Observé | ✅ | `page.tsx` ; E2E |
| « Updated N minutes ago », Refresh | Observé | ◐ | Refresh ✅ ; horodatage de rafraîchissement non affiché |
| Search this list... + Clear | Observé (LST-7) | ✅ | `list-search.tsx` ; champs recherchés : nom, numéro, téléphone, site web, villes, site, ticker (conçu) ; E2E |
| Tri par en-tête, Select All, cases de ligne, colonne Action | Observé (LST-4) | ✅ | `accounts-table.tsx` ; Column Actions / menu de ligne réduits à « Edit » (conçu) |
| Edit List (édition en ligne) | Inconnu | ✖ | Non implémenté |
| Table / Kanban / Split View | Observé (LST-3, LST-5, LST-6) | ✅ | `display-switcher.tsx`, `kanban-board.tsx`, split dans `page.tsx` ; E2E |
| Kanban Settings : Group By obligatoire (Owner, codes pays/état, Type), Summarize By optionnel | Observé (LST-5) | ✅ | Summarize By sur Annual Revenue / Employees (déduit) ; cartes et glisser-déposer non observés : cartes conçues, pas de glisser-déposer |
| List View Controls : New, Clone, Rename, Sharing Settings, Select Fields to Display, Delete | Observé (menu LST-4) / déduit (contenu des dialogues) | ✅ | `list-view-controls.tsx` ; E2E + API |
| Reset Column Widths | Observé | ✖ | Présent mais désactivé (largeurs non persistées) |
| Charts | Observé (bouton) | ✖ | Non implémenté |
| Pagination | Conçu | ✅ | 50 par page (200 en Kanban) |
| État vide « Accounts show where your contacts work » + Add an Account | Observé (LST-2) | ✅ | `EmptyState` ; variante « No items to display. » pour liste filtrée (conçu) ; E2E |
| États chargement / erreur | Conçu | ✅ | `loading.tsx`, `error.tsx`, `not-found.tsx` |

## 4. Filtres

| Exigence (spec §4) | Classification | Statut | Implémentation / test |
| --- | --- | --- | --- |
| Panneau Filters : Add Filter, Remove All, Add Filter Logic, Cancel / Save | Observé (FLT-1…FLT-4) | ✅ | `filter-panel.tsx` ; E2E |
| Ligne Field / Operator / Value, Remove | Observé (FLT-2) | ✅ | Édition directe dans la ligne (Salesforce : popover + Done) |
| 36 champs filtrables | Observé | ◐ | 40 clés dans `fields.ts` couvrant les champs observés ; les champs « Owner First/Last Name » et « (text only) » sont présents |
| 9 opérateurs texte | Observé | ✅ | `FILTER_OPERATORS` ; unitaires |
| Opérateurs pour picklists, nombres, dates, cases à cocher | Inconnu → déduit | ✅ | `operatorsForField` : equals / not equal to pour picklists et booléens, comparateurs pour nombres et dates |
| Multi-sélection picklist (« N options selected ») | Observé (FLT-3) | ✅ | E2E |
| Logique ET par défaut, expression personnalisée | Observé | ✅ | `parseFilterLogic` ; unitaires, intégration, API, E2E |
| « More Filter Options » | Observé (libellé) | ✖ | Non reproduit |
| Filtres sur vues système interdits aux non-administrateurs | Conçu | ✅ | panneau en lecture seule + API 403 |

## 5. Formulaire de création / modification

| Exigence (spec §5) | Classification | Statut | Implémentation / test |
| --- | --- | --- | --- |
| Modale « New Account » depuis New / Add an Account, sans choix de type d'enregistrement | Observé (FRM-1) | ✅ | Page `/accounts/new` rendue comme dialogue (conçu : adressable par URL) ; E2E |
| Sections About (Account Name*, Website, Type, Description, Parent Account, Account Owner lecture seule) et Get in Touch (Phone, Billing Address, Shipping Address) | Observé | ✅ | `account-form.tsx` ; Owner modifiable uniquement par un administrateur (conçu) |
| Autres champs (Industry, Employees, Annual Revenue, Rating, Ownership, Account Source, SIC, Ticker, Fax, Account Number, Site, Buyer, Customer Portal, Data.com Key, Tier) | Métadonnées (absents du layout New) | ✅ | Groupe repliable « Additional Information » (conçu) |
| Save, Save & New, Cancel, « Cancel and close » | Observé | ✅ | E2E (Save & New) |
| « Complete this field. » au blur | Observé (FRM-3) | ✅ | client + serveur ; E2E, unitaires |
| « Undo <champ> » | Observé (FRM-2) | ✅ | E2E |
| Modification (Edit) | Inconnu → conçu | ✅ | Même formulaire pré-rempli ; E2E, intégration, API |
| Édition en ligne, suppression, clonage, changement de propriétaire, fusion | Inconnu | ✖ / ◐ | Changement de propriétaire : administrateur uniquement (conçu) ; le reste non implémenté |
| Doublons | Inconnu (0 règle visible) | ✖ | Aucune détection, conformément à l'org observée |

## 6. Backend et autorisations

| Exigence (mission §4) | Classification | Statut | Implémentation / test |
| --- | --- | --- | --- |
| Création, lecture, modification, recherche / filtrage, persistance PostgreSQL | — | ✅ | `service.ts`, API, server actions ; 13 tests d'intégration, 13 tests API |
| Gestion des erreurs | Conçu | ✅ | `http.ts` (400 / 403 / 404 / 500), `toFormState` côté formulaire |
| Relations préparatoires Contacts / Opportunités | — | ✅ | Prisma + onglet Related |
| Contrôles d'autorisation | Conçu (un seul profil observé) | ✅ | `policies.ts` : propriétaire ou administrateur ; vues système réservées ; intégration + API 403 + E2E |

## 7. Résultats des tests (exécutés le 2026-10-14)

| Suite | Commande | Résultat |
| --- | --- | --- |
| Unitaires (Node test runner) | `npm run test:unit` | 35 tests, 35 réussis (Phase 3.2, base non requise) |
| Intégration Prisma | `npm run test:integration` | 16 tests, 16 réussis sur `TEST_DATABASE_URL` |
| API + E2E navigateur (Playwright, Chromium, port 3100) | `npm run test:e2e` | 24 tests, 24 réussis (`e2e/accounts.spec.ts` 9, `e2e/api.spec.ts` 13, `e2e/database-isolation.spec.ts` 1, `e2e/lab.spec.ts` 1) |
| Lint / types / build | `npm run lint`, `npm run typecheck`, `npm run build` | 0 erreur |

Les suites d'intégration et E2E exigent `TEST_DATABASE_URL` (base jetable sur la boucle locale). Elles refusent `crm_lab` et ne réutilisent pas le serveur du port 3000. Voir `docs/phase3-2-test-isolation.md`.

## 8. Inconnues et différences notables

1. Page d'enregistrement, Activity, Chatter, actions rapides : non observées ; CRM Lab propose une fiche déduite du layout.
2. Édition en ligne (liste et fiche), suppression, fusion, doublons : non observées, non implémentées.
3. Import CSV, actions de masse (Assign Label, Actionable List) et leurs toasts d'erreur : observés mais hors périmètre de la reconstruction.
4. Suggestions de recherche en langage naturel : observées, non reproduites.
5. Listes complètes pays/états et opérateurs réels des champs non texte : inconnus, remplacés par des sous-ensembles / déductions documentés.
6. Permissions réelles (profil standard vs administrateur) : non observables ; le modèle propriétaire/administrateur est une conception CRM Lab.

Comparaison écran par écran avec les captures REA : `docs/reverse-engineering/accounts/05-reconstruction-crm-lab.md`.
