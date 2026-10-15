# Couverture MVP

Légende : `NON` pas implémenté, `PARTIEL` modèle ou UI préparatoire seulement, `OUI` parcours vérifié par un test exécuté dans ce cycle. Aucun `OUI` n'est posé sans exécution.

## Parcours

| Parcours | État | Preuve |
| --- | --- | --- |
| 1. Account et Contact | OUI | E2E `e2e/contacts.spec.ts` : 4 pass le 2026-10-15 dans la suite de 36 |
| 2. Lead et conversion | OUI | E2E `e2e/lead-conversion.spec.ts` et intégration : 201, seconde conversion 409, rollback `ClosedWon` |
| 3. Opportunity, pipeline, dashboard | OUI | E2E `e2e/dashboard.spec.ts` le 2026-10-15 |
| 4. Activité et historique | OUI | E2E `e2e/activities.spec.ts` le 2026-10-15 |
| 5. Autorisation | OUI | E2E `e2e/auth.spec.ts` : formulaire de connexion, 401 sans session, 403 pour un standard sur le compte d'un autre, 200 pour le propriétaire |

## Modules

| Module | Données | API | UI | Tests dédiés |
| --- | --- | --- | --- | --- |
| Accounts | OUI | OUI | OUI | Rejoués le 2026-10-15 (unitaires 81, intégration 64, e2e 36) |
| Contacts | OUI | OUI | OUI | unitaires, intégration, e2e parcours 1 |
| Leads | OUI | OUI | OUI | CRUD, qualification, conversion 201 puis 409 |
| Opportunities | OUI | OUI | OUI | liste, fiche, Kanban, e2e montant exact |
| Activities | OUI | OUI | OUI | unitaires, intégration, e2e parcours 4 |
| Dashboard | OUI | OUI | OUI | unitaires, intégration SQL, e2e parcours 3 |
| Auth réelle | OUI | OUI | OUI | cookie signé, 401, 403, formulaire `/login` |

## Suites actuelles

Commandes présentes dans `package.json` : `test:unit`, `test:integration`, `test:api`, `test:e2e`, `lint`, `typecheck`, `build`. Le workflow `.github/workflows/mvp.yml` enchaîne ces commandes sur PostgreSQL `crm_mvp_ci`. GitHub ne l'a pas exécuté dans la session du 2026-10-15.
