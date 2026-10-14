# Couverture MVP

Légende : `NON` pas implémenté, `PARTIEL` modèle ou UI préparatoire seulement, `OUI` parcours vérifié par un test exécuté dans ce cycle. Aucun `OUI` n'est posé sans exécution.

## Parcours

| Parcours | État | Preuve |
| --- | --- | --- |
| 1. Account et Contact | OUI | E2E `e2e/contacts.spec.ts` : 4 pass le 2026-10-14 sur `crm_mvp_schema_verify` |
| 2. Lead et conversion | PARTIEL | CRUD Leads vérifié (liste, création, qualification, recherche). Pas de conversion |
| 3. Opportunity, pipeline, dashboard | OUI | E2E `e2e/dashboard.spec.ts` : montant exact, date de clôture, étape Proposal, pipeline et tâche en retard. 31 pass le 2026-10-14 |
| 4. Activité et historique | NON | Le modèle `Task` est dans la migration. Pas d'API, pas de liste Open/History |
| 5. Autorisation | PARTIEL | Politique propriétaire ou admin sur Account. Identité démonstration, défaut HIGH ouvert |

## Modules

| Module | Données | API | UI | Tests dédiés |
| --- | --- | --- | --- | --- |
| Accounts | OUI | OUI | OUI | Rejoués le 2026-10-14 avec la suite complète (unitaires 66, intégration 46, e2e 31) |
| Contacts | OUI | OUI | OUI | unitaires, intégration, e2e parcours 1 |
| Leads | OUI | OUI | OUI | CRUD seulement, pas de conversion |
| Opportunities | OUI | OUI | OUI | liste, fiche, Kanban, e2e montant exact |
| Activities | NON | NON | NON | NON |
| Dashboard | OUI | OUI | OUI | unitaires, intégration SQL, e2e parcours 3 |
| Auth réelle | NON | NON | NON | NON |

## Suites actuelles

Commandes présentes dans `package.json` : `test:unit`, `test:integration`, `test:api`, `test:e2e`, `lint`, `typecheck`, `build`. Pas de workflow GitHub Actions. Le détail des trous de scénarios est le livrable QA `docs/mvp/test-gaps.md`.
