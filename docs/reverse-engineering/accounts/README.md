# Module Accounts — reverse engineering fonctionnel (préparation)

Exploration autorisée d'une Salesforce Developer Org : module **Accounts**
(navigation, listes, fiches, formulaires, filtres, interactions).

## Statut Phase 2 — préparation uniquement

| Étape | Statut |
|---|---|
| Connexion REA MCP aux agents cloud | ❌ Bloquée — voir `00-preparation-report.md` |
| CLI REA 6.4.0 + outils navigateur via CDP | ✅ Validés sur page de test locale |
| Session navigateur dédiée Salesforce | 🟡 Emplacement préparé, en attente d'authentification manuelle |
| Exploration Accounts | ⏸️ Non démarrée — requiert une org authentifiée |

Aucune reconstruction du CRM n'a commencé (consigne Phase 2).

## Contenu

- `00-preparation-report.md` — **livrable Phase 2** : tests réussis, blocages réels, étapes suivantes.
- `01-environment-evidence.md` — preuves non sensibles (versions, CDP, tests CLI).
- `02-salesforce-session-prep.md` — procédure de session navigateur dédiée + interventions SSO/MFA attendues.
- `03-accounts-exploration-plan.md` — plan d'exploration du module Accounts (check-list d'exécution).

## Règle d'authentification

Ne jamais contourner l'authentification Salesforce. Aucun identifiant, jeton,
cookie de session ou URL d'org ne doit figurer dans ce dépôt. Les secrets
éventuels passent par les secrets d'environnement Cursor, jamais par git.
