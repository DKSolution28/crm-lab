# Plan d'exploration — module Accounts (Lightning Experience)

Objectif : produire une spécification fonctionnelle du module Accounts à partir d'observations REA, sans toucher au code Salesforce ni aux données d'une org non autorisée. Ce plan s'exécute uniquement après validation du rapport de préparation (`00-rapport-preparation.md`) : REA joignable en MCP depuis l'agent cloud **et** session Salesforce authentifiée sur `127.0.0.1:9223`.

## Partage des rôles

| Action | Qui / quoi | Pourquoi |
| --- | --- | --- |
| Naviguer, cliquer, remplir, filtrer | Personne au contrôle du bureau distant, ou agent via Playwright **connecté au navigateur 9223** (`chromium.connectOverCDP`) une fois la session ouverte par une personne. | REA est passif : `inspect_web_page` / `observe_web_session` / `capture_web_screenshot` n'exécutent aucune action dans la page. |
| Observer et prouver | REA (`list_browser_targets` → `inspect_web_page`, `observe_web_session` pendant une interaction, `capture_web_screenshot`). | Chaque observation produit un `evidence_id`, une fenêtre de capture et une section `completeness`. |
| Rédiger | Agent, dans `docs/reverse-engineering/accounts/`. | Spécifications et preuves non sensibles versionnées. |

## Parcours à couvrir

Les URL ci-dessous sont les routes Lightning standard ; elles seront confirmées par `list_browser_targets` (champ `url`) lors de l'exploration.

### A. Navigation

| Id | Écran / action | Route attendue | Ce que l'on documente |
| --- | --- | --- | --- |
| NAV-1 | Accès au module depuis l'App Launcher et la barre de navigation | `/lightning/o/Account/home` | Point d'entrée, libellé d'onglet, application Lightning hôte (Sales, Service…). |
| NAV-2 | Fil d'Ariane, onglets de la fiche, retour à la liste | `/lightning/r/Account/<id>/view` | Structure de navigation, persistance de la vue de liste sélectionnée. |
| NAV-3 | Recherche globale « Accounts » | `/lightning/o/Account/list?…` via barre de recherche | Champs recherchés, résultats et suggestions. |

### B. Listes (list views)

| Id | Écran / action | Route attendue | Ce que l'on documente |
| --- | --- | --- | --- |
| LST-1 | Vue par défaut « Recently Viewed » | `/lightning/o/Account/list?filterName=Recent` | Colonnes, tri, pagination/infinite scroll, actions de ligne. |
| LST-2 | Vues standard (« All Accounts », « My Accounts », « New This Week ») | `?filterName=AllAccounts`, `MyAccounts`, `NewThisWeek` | Différences de filtre implicite, visibilité selon propriétaire. |
| LST-3 | Modes d'affichage (Table, Kanban, Split view) | contrôle d'affichage de la liste | Champs utilisés par le Kanban (regroupement, résumé), comportement Split view. |
| LST-4 | Édition en ligne et sélection multiple | double-clic cellule, cases à cocher | Champs éditables, enregistrement groupé, messages d'erreur. |

### C. Fiches (record pages)

| Id | Écran / action | Route attendue | Ce que l'on documente |
| --- | --- | --- | --- |
| FIC-1 | Fiche Account standard | `/lightning/r/Account/<id>/view` | En-tête (highlights panel), onglets Details / Related / News / Activity / Chatter, actions rapides. |
| FIC-2 | Section Details | onglet Details | Champs par section, types (texte, picklist, lookup, adresse composée), lecture seule vs éditable, champs obligatoires. |
| FIC-3 | Listes associées | onglet Related | Contacts, Opportunities, Cases, Notes & Attachments, Account Hierarchy : colonnes, actions « New », tri, « View All ». |
| FIC-4 | Hiérarchie de comptes | action « View Account Hierarchy » | Représentation parent/enfants, champs affichés. |
| FIC-5 | Chronologie d'activité | onglet Activity | Types d'activités, filtres, création de tâche/événement/appel. |

### D. Formulaires

| Id | Écran / action | Route attendue | Ce que l'on documente |
| --- | --- | --- | --- |
| FRM-1 | Création d'un compte | `/lightning/o/Account/new` (modale) | Choix du type d'enregistrement si plusieurs, champs, valeurs par défaut, validations côté client, boutons Save / Save & New / Cancel. |
| FRM-2 | Modification | action « Edit » (modale) | Champs verrouillés, règles de validation observables (messages), champs dépendants (picklists dépendantes). |
| FRM-3 | Modification en ligne sur la fiche | crayon sur un champ | Champs éditables individuellement, confirmation groupée. |
| FRM-4 | Suppression, duplication, changement de propriétaire | actions de la fiche | Confirmation, effets sur les enregistrements liés (contacts, opportunités), messages. |
| FRM-5 | Détection de doublons | création d'un compte homonyme | Alerte de doublon, options proposées. |

### E. Filtres et tri

| Id | Écran / action | Route attendue | Ce que l'on documente |
| --- | --- | --- | --- |
| FLT-1 | Panneau de filtres d'une vue | icône entonnoir sur la liste | Opérateurs par type de champ, logique de filtre, portée (My/All). |
| FLT-2 | Création et partage d'une vue de liste | « New » dans le contrôle de vue | Champs sélectionnables, visibilité (privée, groupe, tous). |
| FLT-3 | Tri par colonne et recherche dans la liste | en-têtes de colonnes, champ « Search this list » | Colonnes triables, comportement de la recherche dans la vue. |

### F. Interactions transverses

| Id | Écran / action | Ce que l'on documente |
| --- | --- | --- |
| INT-1 | Actions rapides (New Contact, New Opportunity, Log a Call, New Task) | Formulaires pré-remplis depuis le compte, champs liés. |
| INT-2 | Chatter / notes | Publication, mention, pièces jointes (comportement uniquement). |
| INT-3 | Messages système | Toasts de succès/erreur, libellés, durée. |
| INT-4 | Permissions | Différences visibles entre un profil admin et un profil standard (actions masquées, champs en lecture seule). Nécessite un second utilisateur de démonstration. |

## Protocole de capture par écran

1. `list_browser_targets` sur `http://127.0.0.1:9223` avec `allowed_origins` = origine My Domain de l'org (`https://<mydomain>.lightning.force.com`) ; noter `target_id` et `url`.
2. `capture_web_screenshot` (viewport visible, PNG + sha256) ; relecture et anonymisation avant dépôt.
3. `inspect_web_page` avec `include_accessibility_text: true` (libellés, rôles, états) et `observation_ms` 1500–3000. Ne pas activer `include_json_body_shapes`, `include_script_sources`, `include_storage_fingerprints` sans décision explicite (voir `02-session-navigateur-salesforce.md`).
4. Pour une interaction (filtre, sauvegarde, changement de vue) : lancer `observe_web_session` avec `observation_ms` ≈ 10000, effectuer l'action pendant la fenêtre, puis consigner navigations et requêtes observées (URL, méthode, statut, sans corps).
5. Consigner dans la fiche d'écran : `evidence_id`, horodatage, cible, `completeness.status`, limitations, et la spécification fonctionnelle déduite.
6. Noter chaque inconnue (comportement non observé, limité par les permissions ou par la politique de capture) dans une section « Inconnues » plutôt que de l'inférer.

## Gabarit de fiche d'écran

```markdown
# <Id> — <Nom de l'écran>

Route observée : …
Preuves : evidence/<date>-<id>-screenshot.png (sha256 …), evidence/<date>-<id>-inspect-summary.json (evidence_id …)

## Comportement observé
- …

## Éléments d'interface (depuis l'arbre d'accessibilité)
| Rôle | Libellé | État / remarque |

## Règles métier visibles
- Champs obligatoires, validations, valeurs par défaut…

## Inconnues
- …
```

## Livrables attendus à la fin de l'exploration

- Une fiche par identifiant du plan (NAV, LST, FIC, FRM, FLT, INT), avec preuves.
- `spec-accounts.md` : synthèse fonctionnelle (modèle de données visible, écrans, parcours, règles), base de la reconstruction CRM.
- Journal des inconnues et des écarts de permissions.
