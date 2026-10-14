# Statut MVP

Cycle : schéma unique intégré et rejoué. Trois modules démarrent. Le MVP n'est pas terminé. Étiquette produit : **démonstration locale**.

## Déjà vérifié avant cette vague

| Élément | Preuve |
| --- | --- |
| Module Accounts sur la branche de reconstruction | Merge `c520ce1` de la PR #1 dans `cursor/phase3-accounts-reconstruction-2cf0` |
| PR #2 vers `main` | Ouverte, brouillon, non fusionnée. `main` n'a pas le module Accounts |
| Isolation des tests | `docs/phase3-2-test-isolation.md`, `tests/test-database.ts`. Dernière exécution consignée en phase 3.2 : unitaires 35, intégration 16, e2e 24, lint 0, typecheck et build passés. Ces chiffres ne sont pas rejoués dans ce cycle |
| GitHub Actions | Aucun workflow dans `.github/workflows` |

## Terminé et vérifié dans ce cycle

Documents seulement. Aucun module métier n'est livré.

| Tâche | Preuve relue | Commit d'origine |
| --- | --- | --- |
| MVP-REA-CONTACTS | `docs/reverse-engineering/contacts/`. Last Name `required: true` et `invalid: true`, Account Name `required: true` dans `docs/reverse-engineering/accounts/evidence/2026-10-14-INT-5.json`. Aucune écriture Salesforce | `f11d5cd` sur `cursor/mvp-rea-contacts-2cf0` |
| MVP-QA-ACCEPT | `docs/mvp/acceptance-tests.md` marque les cinq parcours **NOT RUN**. `docs/mvp/test-gaps.md` ne déclare aucune exécution | `46735ca` sur `cursor/mvp-qa-acceptance-2cf0` |
| MVP-SEC-IDENTITY | `docs/mvp/security-identity.md`. Le repli `ensureDefaultUser`, l'en-tête prioritaire et `switchUser` correspondent à `src/lib/auth/current-user.ts` et `src/app/actions.ts`. `GET /api/accounts/lookup` ne résout pas d'utilisateur | `051843d` sur `cursor/mvp-security-identity-2cf0` |
| MVP-ARCH | `docs/mvp/architecture.md`. `accountId` reste nullable. Une seule migration `20261014200000_mvp_crm_modules`. Conversion 201 puis 409. Montants en chaîne décimale | `5bdf392` sur `cursor/mvp-architect-contracts-2cf0` |
| MVP-SCHEMA | Migration unique, `canEditRecord`, `ConflictError` → 409, `recordRecentView`, `createAccount(..., db)`. Rejoué par le coordinateur, pas seulement déclaré par l'auteur | `4b9163f` sur `cursor/mvp-schema-2cf0` |
| MVP-C-LEADS | CRUD sans conversion. `POST /api/leads` 201. PATCH vers `Converted` refusé. Lead déjà converti : 409. Pas de route `/convert` | `225ecc0` sur `cursor/mvp-leads-2cf0` |

## En cours

| Tâche | Agent | Branche attendue | Périmètre |
| --- | --- | --- | --- |
| MVP-B-CONTACTS | [Contacts](https://cursor.com/agents/bc-485a4cf6-72bc-5f82-823d-c46cdec6f99b) | `cursor/mvp-contacts-2cf0` | Branche poussée, pas encore relue. |
| MVP-D-OPP | [Opportunities](https://cursor.com/agents/bc-22496455-8523-5621-a17e-1e397d4e3dec) | `cursor/mvp-opportunities-2cf0` | Branche poussée, pas encore relue. |

La pull request d'intégration n'est pas ouverte : la création reste en attente d'approbation manuelle (base `cursor/phase3-accounts-reconstruction-2cf0`, tête `cursor/mvp-integration-2cf0`).

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

`crm_lab` avant et après : 12 comptes, `max(Account.updatedAt)` = `2026-10-14 12:49:22.245`, aucune table `Lead` ni `Task`.

## Bugs ouverts

| Gravité | Sujet | Preuve |
| --- | --- | --- |
| HIGH | Usurpation d'identité par cookie `crm-lab-user` ou en-tête `x-crm-lab-user` ; identifiant inconnu → premier administrateur | `src/lib/auth/current-user.ts` |
| MEDIUM | Pas de workflow CI | `.github/workflows` absent |

Le défaut HIGH est connu, hérité du mode démonstration. Il bloque uniquement l'étiquette « prêt pour utilisateurs réels ». Il ne bloque pas la conception des modules.

## Prochaine tâche

Relire et intégrer Contacts et Opportunities. La conversion de lead reste en attente de `createContact`. Les activités et le dashboard ne sont pas commencés.

## Liens

- Intégration : `cursor/mvp-integration-2cf0`
- Accounts : [PR #2](https://github.com/DKSolution28/crm-lab/pull/2) (ne pas fusionner)
