# Plan d'exploration — module Accounts (à exécuter après authentification)

Pré-requis : blocages B1 (MCP) et B2 (org authentifiée) levés — voir
`00-preparation-report.md`. Exécution en lecture seule d'abord ;
aucune écriture sans consigne explicite.

## A. Navigation

- [ ] A1 — Atteindre l'onglet Accounts depuis le lanceur d'application / navigation Lightning.
- [ ] A2 — Relever l'URL, le titre d'onglet et l'ID d'objet (`Account`) via `inspect_web_page`.
- [ ] A3 — Noter les vues de liste standard disponibles (ex. « Recently Viewed », « All Accounts »).

## B. Listes (List Views)

- [ ] B1 — Colonnes affichées par défaut : noms de champs, ordre, tri actif.
- [ ] B2 — Pagination / chargement : taille de page, scroll infini ou pager.
- [ ] B3 — Recherche dans la liste et portée (cette liste vs globale).
- [ ] B4 — Actions par ligne (menu déroulant : Edit, Delete, Change Owner…).

## C. Fiches (Records)

- [ ] C1 — Ouvrir une fiche : sections, onglets (Activity, Chatter, Details, Related).
- [ ] C2 — Champs de la section Details : libellés, types, valeurs d'exemple non sensibles.
- [ ] C3 — Listes associées : Contacts, Opportunities, Cases, Files — colonnes et actions.
- [ ] C4 — Boutons et chemins (Path) : New Task, Log a Call, étapes de statut.

## D. Formulaires (New / Edit)

- [ ] D1 — Champs requis vs optionnels, valeurs par défaut, picklists et dépendances.
- [ ] D2 — Règles de validation visibles (messages d'erreur déclenchés par saisie invalide).
- [ ] D3 — Boutons Save / Save & New / Cancel et redirections après soumission.

## E. Filtres

- [ ] E1 — Filtres de vue de liste : champs filtrables, opérateurs, portée.
- [ ] E2 — Graphiques / Kanban éventuels sur l'objet Account.
- [ ] E3 — Persistance : le filtre survit-il à la navigation ?

## F. Interactions dynamiques

- [ ] F1 — Requêtes réseau XHR observées pendant navigation/filtrage (formes JSON, pas de données).
- [ ] F2 — Composants Lightning vs Visualforce : relever les noms de bundles scripts.
- [ ] F3 — Découverte WebMCP : `discover-webmcp-tools` si la page expose des outils.

## Preuves à enregistrer (non sensibles)

Pour chaque étape : `evidence_id` REA, URL normalisée (sans IDs de session),
structure (colonnes, champs, opérateurs) — jamais de données client réelles.
Destination : compléter ce dossier (`04-accounts-findings.md` à créer lors de l'exécution).
