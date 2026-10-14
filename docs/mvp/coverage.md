# Couverture MVP

Légende : `NON` pas implémenté, `PARTIEL` modèle ou UI préparatoire seulement, `OUI` parcours vérifié par un test exécuté dans ce cycle. Aucun `OUI` n'est posé sans exécution.

## Parcours

| Parcours | État | Preuve |
| --- | --- | --- |
| 1. Account et Contact | OUI | E2E `e2e/contacts.spec.ts` : 4 pass le 2026-10-14 sur `crm_mvp_schema_verify` |
| 2. Lead et conversion | PARTIEL | CRUD Leads vérifié (liste, création, qualification, recherche). Pas de conversion |
| 3. Opportunity, pipeline, dashboard | PARTIEL | E2E opportunité : montant `9007199254740993.01` conservé après changement d'étape. Dashboard absent |
| 4. Activité et historique | NON | Le modèle `Task` est dans la migration. Pas d'API, pas de liste Open/History |
| 5. Autorisation | PARTIEL | Politique propriétaire ou admin sur Account. Identité démonstration, défaut HIGH ouvert |

## Modules

| Module | Données | API | UI | Tests dédiés |
| --- | --- | --- | --- | --- |
| Accounts | OUI | OUI | OUI | Rejoués le 2026-10-14 avec la suite complète (unitaires 61, intégration 40, e2e 30) |
| Contacts | OUI | OUI | OUI | unitaires, intégration, e2e parcours 1 |
| Leads | OUI | OUI | OUI | CRUD seulement, pas de conversion |
| Opportunities | OUI | OUI | OUI | liste, fiche, Kanban, e2e montant exact |
| Activities | NON | NON | NON | NON |
| Dashboard | NON | NON | NON | NON |
| Auth réelle | NON | NON | NON | NON |

## Suites actuelles

Commandes présentes dans `package.json` : `test:unit`, `test:integration`, `test:api`, `test:e2e`, `lint`, `typecheck`, `build`. Pas de workflow GitHub Actions. Le détail des trous de scénarios est le livrable QA `docs/mvp/test-gaps.md`.
