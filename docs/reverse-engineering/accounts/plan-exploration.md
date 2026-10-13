# Plan d'exploration — module Accounts (Salesforce Lightning)

Pré-requis : REA MCP accessible, navigateur Salesforce (`scripts/start-salesforce-browser.sh`, CDP `127.0.0.1:9223`) connecté par un humain à la Developer Org autorisée. Sans ces deux conditions, ne rien exécuter.

## Règles

- Org de développement autorisée uniquement. Pas de contournement d'authentification, pas de saisie d'identifiants par l'agent. En cas de MFA/SSO ou d'expiration de session, s'arrêter et demander une intervention humaine.
- Toujours passer `allowed_origins` avec les seules origines de l'org (`https://<domaine>.develop.lightning.force.com`, `https://<domaine>.develop.my.salesforce.com`).
- Observation passive d'abord (`inspect_web_page`, `observe_web_session`). Les scénarios actifs (`capture_browser_scenario`) se limitent à des données de démonstration. Jamais de suppression ou de modification en masse.
- Ne jamais activer `include_storage_keys`, `include_storage_fingerprints` ou `include_console_text` sans besoin précis. Ne pas versionner de cookies, jetons, ID de session, en-têtes `Authorization`, HAR bruts ou données personnelles réelles.
- Les captures brutes vont dans `docs/reverse-engineering/accounts/raw/` (ignoré par git). Seuls les résumés anonymisés vont dans `evidence/`.

## Outils REA par activité

| Activité | Outil MCP (CLI équivalente) |
|----------|-----------------------------|
| Trouver l'onglet | `list_browser_targets` (`list-browser-targets`) |
| Structure DOM / accessibilité / requêtes | `inspect_web_page` + `include_accessibility_text`, `include_json_body_shapes` |
| Capture d'écran d'une vue | `capture_web_screenshot` |
| Suivre une navigation pilotée par l'humain | `observe_web_session` |
| Scénario borné (clic, saisie de démo) | `capture_browser_scenario` |
| Comparer deux états (avant/après filtre) | `compare_web_captures`, `compare_web_screenshots` |
| Écouteurs d'événements d'un élément | `inspect_web_event_listeners` |
| Analyse statique du bundle Lightning | `analyze_web_bundle` (en option, volumineux) |

## Inventaire à produire

### A. Navigation
- Accès : App Launcher → Sales → onglet Accounts ; URL `/lightning/o/Account/home` ; navigation récente.
- Fil d'Ariane, onglets de console (si app console), raccourcis clavier.
- Livrable : `specs/navigation.md` + captures d'écran.

### B. Vues de liste
- Vues standard (Recently Viewed, All Accounts, My Accounts) et personnalisées.
- Colonnes, tri, pagination/défilement infini, nombre d'éléments, sélection multiple, actions de masse, édition inline.
- Recherche dans la liste, « List View Controls » (créer/renommer/partager/colonnes).
- Contrats réseau (formes JSON uniquement) : endpoints `aura`/`ui-api` appelés, paramètres de tri/filtre.
- Livrable : `specs/list-views.md`.

### C. Filtres
- Panneau de filtres : champs filtrables, opérateurs, logique de filtre, propriétaire (« My/All »).
- Comparer la liste avant et après chaque filtre (`compare_web_captures`).
- Livrable : section « Filtres » de `specs/list-views.md`.

### D. Fiche Account (record page)
- Highlights panel (champs compacts), boutons d'action (Edit, Delete, Change Owner, New Contact…).
- Onglets Details / Related / Activity / Chatter, composants Lightning présents.
- Listes associées : Contacts, Opportunities, Cases, Notes & Attachments. Colonnes et actions.
- Hiérarchie de comptes (Parent Account, View Account Hierarchy).
- Livrable : `specs/record-page.md`.

### E. Formulaires (New / Edit)
- Modal « New Account » : sections, champs, types (texte, picklist, lookup, adresse, téléphone, URL, devise), obligatoires, valeurs par défaut, aides.
- Validation côté client et messages d'erreur serveur (déclencher volontairement un champ obligatoire vide).
- Lookups (Parent Account) : recherche, création rapide.
- « Save », « Save & New », « Cancel ». Détection de doublons (Duplicate Rules).
- Livrable : `specs/forms.md` avec un tableau champ par champ.

### F. Interactions transverses
- Toasts, modales, confirmation de suppression, édition inline, raccourcis, états vides, états de chargement, erreurs de permission.
- Livrable : `specs/interactions.md`.

## Modèle de fiche de spécification

```markdown
## <Écran / composant>
- Chemin d'accès :
- URL / route :
- Objectif utilisateur :
- Éléments (rôle ARIA, libellé, type) :
- Données affichées (champ API → libellé → format) :
- Actions et résultats observés :
- Règles et validations :
- Contrats réseau (forme uniquement) :
- Preuves : evidence_id REA, capture anonymisée
- Questions ouvertes :
```

## Critères de sortie de la phase d'exploration

- Les six sections ci-dessus ont une spécification relue.
- Chaque affirmation renvoie à un `evidence_id` REA ou à une capture anonymisée.
- Aucun secret ni donnée personnelle dans le dépôt (`git grep -i -E "sid=|authorization|bearer|oauth"` vide).
- Validation explicite du demandeur avant toute reconstruction.
