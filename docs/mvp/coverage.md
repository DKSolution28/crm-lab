# Couverture MVP

Légende : `NON` pas implémenté, `PARTIEL` modèle ou UI préparatoire seulement, `OUI` parcours vérifié par un test exécuté dans ce cycle. Aucun `OUI` n'est posé sans exécution.

## Parcours

| Parcours | État | Preuve |
| --- | --- | --- |
| 1. Account et Contact | OUI | E2E `e2e/contacts.spec.ts` : 4 pass le 2026-10-14 sur `crm_mvp_schema_verify` |
| 2. Lead et conversion | OUI | E2E `e2e/lead-conversion.spec.ts` et intégration : 201, seconde conversion 409, rollback `ClosedWon` |
| 3. Opportunity, pipeline, dashboard | OUI | E2E `e2e/dashboard.spec.ts` : montant exact, date de clôture, étape Proposal, pipeline et tâche en retard. 31 pass le 2026-10-14 |
| 4. Activité et historique | OUI | E2E `e2e/activities.spec.ts` : tâche créée sur le compte, passage à Completed, visible dans l'historique |
| 5. Autorisation | PARTIEL | Politique propriétaire ou admin sur Account. Identité démonstration, défaut HIGH ouvert |

## Modules

| Module | Données | API | UI | Tests dédiés |
| --- | --- | --- | --- | --- |
| Accounts | OUI | OUI | OUI | Rejoués le 2026-10-14 avec la suite complète (unitaires 78, intégration 62, e2e 33) |
| Contacts | OUI | OUI | OUI | unitaires, intégration, e2e parcours 1 |
| Leads | OUI | OUI | OUI | CRUD, qualification, conversion 201 puis 409 |
| Opportunities | OUI | OUI | OUI | liste, fiche, Kanban, e2e montant exact |
| Activities | OUI | OUI | OUI | unitaires, intégration, e2e parcours 4 |
| Dashboard | OUI | OUI | OUI | unitaires, intégration SQL, e2e parcours 3 |
| Auth réelle | NON | NON | NON | NON |

## Suites actuelles

Commandes présentes dans `package.json` : `test:unit`, `test:integration`, `test:api`, `test:e2e`, `lint`, `typecheck`, `build`. Pas de workflow GitHub Actions. Le détail des trous de scénarios est le livrable QA `docs/mvp/test-gaps.md`.
