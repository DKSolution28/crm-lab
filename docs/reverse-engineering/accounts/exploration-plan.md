# Plan d'exploration du module Accounts (Salesforce Developer Org)

Prérequis (voir `README.md`) : outils MCP REA connectés à l'agent, session `127.0.0.1:9223` authentifiée par une personne autorisée, org confirmée comme Developer Org jetable.

## Règles

- Périmètre : Developer Org autorisée uniquement. Aucune autre org, aucun compte tiers.
- Pas de contournement de l'authentification. Si la page redirige vers la connexion, SSO ou MFA, arrêter et signaler.
- Toujours passer `--allowed-origins` / `allowed_origins` avec les deux origines de l'org.
- Les opérations REA d'observation passive sont les valeurs par défaut. N'activer `--include-storage-keys`, `--include-storage-fingerprints`, `--include-script-sources` et les corps JSON qu'après décision explicite. Ne jamais enregistrer de valeurs de cookies, de jetons de session, de `sid`, d'identifiants ou d'en-têtes `Authorization`.
- Données : n'utiliser que des enregistrements de démonstration. Pour les tests de formulaires, créer des enregistrements préfixés `RE-TEST-` et ne pas les enregistrer si la sauvegarde n'est pas nécessaire. Aucune suppression ni modification d'enregistrements existants.
- Preuves : texte structuré (JSON, Markdown) et captures d'écran après vérification qu'elles ne contiennent pas d'identifiants, d'e-mails réels ni d'ID de session. Masquer l'ID d'org et les noms d'utilisateurs réels.

## Séquence

| # | Zone | Observer | Outils REA | Livrable |
| --- | --- | --- | --- | --- |
| 1 | Navigation | Barre d'applications, onglet Accounts, URL (`/lightning/o/Account/list`), fil d'Ariane, actions globales | `list_browser_targets`, `inspect_web_page` | `01-navigation.md` |
| 2 | Vues de liste | Vues épinglées, sélecteur de vue, colonnes, tri, pagination et défilement infini, actions de masse, modification en ligne | `capture_browser_scenario`, `inspect_web_page` | `02-list-views.md` |
| 3 | Filtres | Filtres de vue (champ, opérateur, valeur), « Propriétaire », logique de filtre, filtres rapides, recherche dans la liste | `capture_browser_scenario` | `03-filters.md` |
| 4 | Fiche (record page) | En-tête (champs clés, actions), onglets Détails / Activité, volets Related, composants de mise en page, historique | `inspect_web_page`, `capture_web_screenshot` | `04-record-page.md` |
| 5 | Formulaires | Création et édition : sections, champs requis, types (texte, liste de choix, recherche, adresse, devise), valeurs par défaut, messages de validation, annulation | `capture_browser_scenario` | `05-forms.md` |
| 6 | Interactions | Raccourcis, modales, toasts, suivi, états vides, erreurs, chargements, comportement responsive | `capture_browser_scenario`, `observe_web_session` | `06-interactions.md` |
| 7 | Modèle de données | Champs de l'objet Account (nom API, type, obligatoire), relations (Contacts, Opportunities), vues de liste disponibles | pages Setup → Object Manager, lecture seule | `07-data-model.md` |

## Format d'une spécification

Chaque fichier contient :

1. Contexte : écran, URL (sans identifiants ni ID d'org), préconditions.
2. Comportement observé : éléments, états, transitions, règles de validation.
3. Preuve : référence à un fichier `evidence/…` (identifiant de preuve REA, capture, JSON filtré).
4. Équivalent à reconstruire : composant, données, règles métier, critère d'acceptation testable.
5. Inconnues : ce qui n'a pas pu être observé et pourquoi.

## Critères de fin d'exploration

- Les sept zones ont un fichier de spécification et au moins une preuve non sensible chacune.
- Chaque écart ou comportement non observé est listé dans les inconnues.
- Un contrôle final confirme qu'aucun secret ni aucune donnée personnelle n'est dans `docs/` (`rg -i "sid=|token|password|@"` et revue manuelle des captures).
