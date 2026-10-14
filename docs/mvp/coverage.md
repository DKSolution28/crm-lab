# Couverture MVP

Légende : `NON` pas implémenté, `PARTIEL` modèle ou UI préparatoire seulement, `OUI` parcours vérifié par un test exécuté dans ce cycle. Aucun `OUI` n'est posé sans exécution.

## Parcours

| Parcours | État | Preuve |
| --- | --- | --- |
| 1. Account et Contact | PARTIEL | Account complet sur la branche Accounts. Spec Contacts OBSERVED intégrée (INT-5). Modèle minimal et seed seulement : pas d'UI ni d'API. Parcours 1 NOT RUN |
| 2. Lead et conversion | PARTIEL | CRUD Leads vérifié (liste, création, qualification, recherche). Pas de conversion |
| 3. Opportunity, pipeline, dashboard | PARTIEL | Modèle Opportunity minimal et seed. Pas de Kanban, pas de dashboard |
| 4. Activité et historique | NON | Pas de modèle Activity. RecentlyViewed ne couvre que Account |
| 5. Autorisation | PARTIEL | Politique propriétaire ou admin sur Account. Identité démonstration, défaut HIGH ouvert |

## Modules

| Module | Données | API | UI | Tests dédiés |
| --- | --- | --- | --- | --- |
| Accounts | OUI | OUI | OUI | Exécutés en phase 3.2, non rejoués ici |
| Contacts | PARTIEL | NON | NON | NON |
| Leads | NON | NON | NON | NON |
| Opportunities | PARTIEL | NON | NON | NON |
| Activities | NON | NON | NON | NON |
| Dashboard | NON | NON | NON | NON |
| Auth réelle | NON | NON | NON | NON |

## Suites actuelles

Commandes présentes dans `package.json` : `test:unit`, `test:integration`, `test:api`, `test:e2e`, `lint`, `typecheck`, `build`. Pas de workflow GitHub Actions. Le détail des trous de scénarios est le livrable QA `docs/mvp/test-gaps.md`.
