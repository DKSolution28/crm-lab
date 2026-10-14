# Backlog MVP

Statuts : `TODO` → `READY` → `IN_PROGRESS` → `IN_REVIEW` → `FAILED` | `BLOCKED` | `PASSED` → `DONE`.

Branche d'intégration : `cursor/mvp-integration-2cf0`, créée depuis `origin/cursor/phase3-accounts-reconstruction-2cf0` (`c520ce1`). Aucune fusion vers `main` sans accord explicite.

Les agents de la première vague écrivent uniquement les fichiers indiqués. Ils ne modifient pas `prisma/schema.prisma`, `src/` ni les tests existants.

| Id | Statut | Agent | Livrable exclusif | Dépend de |
| --- | --- | --- | --- | --- |
| MVP-ARCH | IN_PROGRESS | Architecte | `docs/mvp/architecture.md` | spec Contacts intégrée |
| MVP-REA-CONTACTS | PASSED | Analyste REA | `docs/reverse-engineering/contacts/` | — |
| MVP-QA-ACCEPT | PASSED | QA | `docs/mvp/acceptance-tests.md`, `docs/mvp/test-gaps.md` | — |
| MVP-SEC-IDENTITY | PASSED | Auditeur sécurité | `docs/mvp/security-identity.md` | — |
| MVP-CI | TODO | QA + backend | `.github/workflows/` workflow PR, Postgres jetable | contrats d'architecture |
| MVP-SCHEMA | TODO | Architecte puis backend | migration unique Contacts enrichi, Lead, Opportunity, Activity, RecentlyViewed généralisé | MVP-ARCH, MVP-REA-CONTACTS, MVP-SEC-IDENTITY |
| MVP-B-CONTACTS | TODO | Backend et frontend | module Contacts | MVP-SCHEMA, MVP-QA-ACCEPT |
| MVP-C-LEADS | TODO | Backend puis frontend | module Leads et conversion | MVP-SCHEMA, Contacts stables |
| MVP-D-OPP | TODO | Backend et frontend | module Opportunities et Kanban | MVP-SCHEMA |
| MVP-E-ACT | TODO | Backend et frontend | tâches et historique | MVP-SCHEMA, fiches existantes |
| MVP-F-DASH | TODO | Backend et frontend | dashboard lu en base | Contacts, Leads, Opportunities, Activities persistés |
| MVP-G-AUTH | TODO | Backend + auditeur | sessions vérifiées, ou maintien de l'étiquette démonstration locale | MVP-SEC-IDENTITY |
| MVP-VERIFY | TODO | Vérificateur indépendant | verdict PASS / FAIL / BLOCKED | parcours E2E exécutés |

## Ordre d'implémentation

1. Vague 1, en parallèle : architecture, reconnaissance Contacts, acceptation, audit d'identité. Aucun code produit.
2. Une seule migration partagée, posée par l'architecte puis implémentée par un seul agent backend.
3. Au plus trois workstreams de code ensuite. Contacts et Opportunities peuvent diverger une fois le schéma mergé. La conversion de Lead attend Account et Contact. Le dashboard attend les quatre objets. Les activités attendent les fiches auxquelles elles s'accrochent.
4. CI sur la branche d'intégration dès que les scripts de test du premier module ajouté existent.
5. Vérification indépendante de chaque lot avant de le déclarer `DONE`.

## Fichiers réservés au coordinateur

`docs/mvp/requirements.md`, `docs/mvp/backlog.md`, `docs/mvp/status.md`, `docs/mvp/blockers.md`, `docs/mvp/coverage.md`, `.cursor/agents/`. Les agents de vague 1 ne les modifient pas.
