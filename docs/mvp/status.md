# Statut MVP

Cycle du 2026-10-15 : sessions signées, cinq parcours e2e, build, et workflow CI dans le dépôt. Étiquette : **sessions signées en local**. Ce n'est pas « prêt pour production ». Rien n'est fusionné vers `main`.

Le vérificateur indépendant n'a pas encore rendu de PASS dans ce document : il est lancé après le push, et son verdict ne peut pas être écrit avant qu'il ait exécuté les tests.

## Déjà vérifié avant cette vague

| Élément | Preuve |
| --- | --- |
| Module Accounts sur la branche de reconstruction | Merge `c520ce1` de la PR #1 dans `cursor/phase3-accounts-reconstruction-2cf0` |
| PR #2 vers `main` | Ouverte, brouillon, non fusionnée. `main` n'a pas le module Accounts |
| Isolation des tests | `docs/phase3-2-test-isolation.md`, `tests/test-database.ts`. Dernière exécution consignée en phase 3.2 : unitaires 35, intégration 16, e2e 24, lint 0, typecheck et build passés. Ces chiffres ne sont pas rejoués dans ce cycle |
| GitHub Actions | `.github/workflows/mvp.yml` est dans le dépôt. GitHub ne l'a pas exécuté dans cette session |

## Terminé et vérifié dans ce cycle

Accounts, Contacts, Leads avec conversion, Opportunities, activités et dashboard sont sur la branche. L'identité reste celle de la démonstration.

| Tâche | Preuve relue | Commit d'origine |
| --- | --- | --- |
| MVP-REA-CONTACTS | `docs/reverse-engineering/contacts/`. Last Name `required: true` et `invalid: true`, Account Name `required: true` dans `docs/reverse-engineering/accounts/evidence/2026-10-14-INT-5.json`. Aucune écriture Salesforce | `f11d5cd` sur `cursor/mvp-rea-contacts-2cf0` |
| MVP-QA-ACCEPT | `docs/mvp/acceptance-tests.md` marque les cinq parcours **NOT RUN**. `docs/mvp/test-gaps.md` ne déclare aucune exécution | `46735ca` sur `cursor/mvp-qa-acceptance-2cf0` |
| MVP-SEC-IDENTITY | `docs/mvp/security-identity.md`. Le repli `ensureDefaultUser`, l'en-tête prioritaire et `switchUser` correspondent à `src/lib/auth/current-user.ts` et `src/app/actions.ts`. `GET /api/accounts/lookup` ne résout pas d'utilisateur | `051843d` sur `cursor/mvp-security-identity-2cf0` |
| MVP-ARCH | `docs/mvp/architecture.md`. `accountId` reste nullable. Une seule migration `20261014200000_mvp_crm_modules`. Conversion 201 puis 409. Montants en chaîne décimale | `5bdf392` sur `cursor/mvp-architect-contracts-2cf0` |
| MVP-SCHEMA | Migration unique, `canEditRecord`, `ConflictError` → 409, `recordRecentView`, `createAccount(..., db)`. Rejoué par le coordinateur, pas seulement déclaré par l'auteur | `4b9163f` sur `cursor/mvp-schema-2cf0` |
| MVP-C-LEADS | CRUD sans conversion. `POST /api/leads` 201. PATCH vers `Converted` refusé. Lead déjà converti : 409. Pas de route `/convert` | `225ecc0` sur `cursor/mvp-leads-2cf0` |
| MVP-B-CONTACTS | Liste, fiche, API. `createContact(input, user, db)`. `accountId` optionnel. Lien contact sur la fiche Account. Intégration `9929474` | `d93c2e7` sur `cursor/mvp-contacts-2cf0` |
| MVP-D-OPP | Liste, fiche, Kanban. `amount` en chaîne décimale. `createOpportunity(..., db)`. Montant `9007199254740993.01` conservé. Intégration `87a1986` | `e1aa3f8` sur `cursor/mvp-opportunities-2cf0` |
| MVP-F-DASH | `GET /api/dashboard` et `/dashboard`. Sommes en chaîne `Prisma.Decimal`. Pipeline `480000.00` sur le seed, étapes fermées exclues. Intégration `3b4493f`, correctif de delta `bf9d191` | `a4c2434` sur `cursor/mvp-dashboard-2cf0` |
| MVP-E-ACT | Une tâche, un parent. Ouvert contre historique. `lastActivityDate` sur Account et Contact. Intégration `d106947` | `51c2d16` sur `cursor/mvp-activities-2cf0` |
| MVP-C-CONVERT | Une transaction, 201 puis 409. `ClosedWon` annule la prise. Le bouton Convert n'apparaît qu'après qualification. Intégration `a4aac21` | `e97e5cf` sur `cursor/mvp-lead-convert-2cf0` |

## En cours

Le vérificateur indépendant, après le push de cette branche. Il ne doit pas être l'auteur du code de session.

La pull request d'intégration vise `cursor/phase3-accounts-reconstruction-2cf0`. Elle n'est pas fusionnée. La PR #2 vers `main` reste un brouillon ouvert, non fusionné.

Écart accepté : l'audit proposait `onDelete: Restrict` sur les clés de conversion. Le contrat pose `SetNull` pour que les `deleteMany` de test continuent, et fait reposer l'idempotence sur `convertedAt`. Les parcours d'acceptation qui attendent HTTP 200 sur la conversion suivent le contrat : **201**, puis **409**.

## Tests de ce cycle

Rejoués le 2026-10-14 sur `crm_mvp_schema_verify` (`127.0.0.1`), avec `DATABASE_URL` pointant vers `crm_lab` pour les tests afin de vérifier que la garde l'ignore.

| Commande | Résultat |
| --- | --- |
| `prisma migrate deploy` sur base vide | 3 migrations appliquées, dont `20261014200000_mvp_crm_modules` |
| `npm run test:unit` | 37 pass, 0 fail |
| `npm run test:integration` | 18 pass, 0 fail |
| `npm run test:e2e` après le schéma | 24 pass, 0 fail |
| `npm run test:unit` après Leads | 46 pass, 0 fail |
| `npm run test:integration` après Leads | 25 pass, 0 fail |
| `npm run test:e2e` après Leads | Premier passage : 3 échecs navigateur (`accounts` NAV-1, `lab`, `leads`) avec `The destination stream errored while writing data` pendant que le serveur de dev compilait. Second passage, port 3100 libre : 11 pass (`accounts`, `lab`, `leads`). API du premier passage : 14 pass |
| `npm run lint` et `npm run typecheck` après Leads | exit 0 |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run test:unit` après Contacts et Opportunities | 61 pass, 0 fail |
| `npm run test:integration` après Contacts et Opportunities | 40 pass, 0 fail |
| `npm run test:e2e` après Contacts et Opportunities | 30 pass, 0 fail (35,3 s), dont `e2e/contacts.spec.ts` (4) et l'opportunité au montant exact |
| `npm run lint` et `npm run typecheck` après ces deux fusions | exit 0 |
| `npm run test:unit` après le dashboard | 66 pass, 0 fail |
| `npm run test:integration` après le dashboard | 46 pass, 0 fail, dont les 6 agrégats |
| `npm run test:e2e` lancé par Playwright | Deux passages : la navigation ne se stabilise pas (`accounts` NAV-1, `contacts`, `dashboard`, `lab`, `leads`, `opportunities`) pendant que le serveur de dev démarre. Ce n'est pas une assertion métier |
| Playwright sur le serveur déjà chaud, port 3100 | 31 pass, 0 fail (36,5 s), dont `e2e/dashboard.spec.ts` |
| `npm run lint` et `npm run typecheck` après le dashboard | exit 0 |
| `npm run test:unit` après conversion et activités | 78 pass, 0 fail |
| `npm run test:integration` après conversion et activités | 62 pass, 0 fail, dont conversion 201/409/rollback et activités |
| Playwright sur le serveur déjà chaud, port 3100, après ces deux fusions | 33 pass, 0 fail (34,6 s), dont `e2e/lead-conversion.spec.ts` et `e2e/activities.spec.ts` |
| `npm run lint` et `npm run typecheck` après ces deux fusions | exit 0 |

`crm_lab` avant et après : 12 comptes, `max(Account.updatedAt)` = `2026-10-14 12:49:22.245`. Cette base de développement n'a pas reçu la migration MVP : pas de table `Lead` ni `Task`. Les suites écrivent dans `crm_mvp_schema_verify`.

## Tests du 2026-10-15

Base jetable `crm_mvp_finalize` sur `127.0.0.1`. `DATABASE_URL` pointait vers `crm_lab` pendant les tests, pour vérifier que la garde l'ignore. `crm_lab` après les suites : 12 comptes, `max(Account.updatedAt)` = `2026-10-14 12:49:22.245`, pas de table `Lead`.

| Commande | Résultat |
| --- | --- |
| `npm run test:unit` | 81 pass, 0 fail |
| `npm run test:integration` | 64 pass, 0 fail, dont sessions 401/403 |
| `npm run test:e2e` | 36 pass, 0 fail (35,0 s). Serveur `next build` puis `next start` sur le port 3100, `reuseExistingServer: false` |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0, `NEXT_DIST_DIR=.next-mvp-build` |

Les cinq parcours e2e de cette exécution : `e2e/contacts.spec.ts`, `e2e/lead-conversion.spec.ts`, `e2e/dashboard.spec.ts`, `e2e/activities.spec.ts`, `e2e/auth.spec.ts`.

## Bugs ouverts

| Gravité | Sujet | Preuve |
| --- | --- | --- |
| MEDIUM | Notes, lookup et recherche sans session ; pas de contrôle d'origine sur les routes à cookie ; `db:seed` suit `DATABASE_URL` ; PostgreSQL local en trust | `docs/mvp/security-identity.md` |

Le défaut HIGH d'usurpation (cookie `crm-lab-user`, en-tête `x-crm-lab-user`, repli administrateur) est fermé dans le code du 2026-10-15. Le workflow CI est écrit. GitHub ne l'a pas encore exécuté ici.

## Prochaine tâche

Verdict du vérificateur indépendant, puis revue de la pull request. Pas de fusion vers `main` sans instruction.

## Liens

- Intégration : `cursor/mvp-integration-2cf0`
- Accounts : [PR #2](https://github.com/DKSolution28/crm-lab/pull/2) (ne pas fusionner)
