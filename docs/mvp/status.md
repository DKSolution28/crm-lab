# Statut MVP

Cycle : vague 1, trois livrables documentaires intégrés. Le MVP n'est pas terminé. Étiquette produit : **démonstration locale**.

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

## En cours

| Tâche | Agent | Branche attendue | Fichiers |
| --- | --- | --- | --- |
| MVP-ARCH | [Architecte](https://cursor.com/agents/bc-14bae628-a85f-5426-a3f6-8b00c67b0c43) | `cursor/mvp-architect-contracts-2cf0` | `docs/mvp/architecture.md` |

La branche d'architecture n'est pas encore sur origin. La pull request d'intégration n'est pas ouverte : la création reste en attente d'approbation manuelle (base `cursor/phase3-accounts-reconstruction-2cf0`, tête `cursor/mvp-integration-2cf0`).

## Tests de ce cycle

Non exécutés. Aucune modification de code applicatif.

## Bugs ouverts

| Gravité | Sujet | Preuve |
| --- | --- | --- |
| HIGH | Usurpation d'identité par cookie `crm-lab-user` ou en-tête `x-crm-lab-user` ; identifiant inconnu → premier administrateur | `src/lib/auth/current-user.ts` |
| MEDIUM | Pas de workflow CI | `.github/workflows` absent |

Le défaut HIGH est connu, hérité du mode démonstration. Il bloque uniquement l'étiquette « prêt pour utilisateurs réels ». Il ne bloque pas la conception des modules.

## Prochaine tâche

Intégrer `docs/mvp/architecture.md` dès qu'il est poussé. Le contrat doit reprendre la spec Contacts, en particulier le conflit Account Name (§ 3.3) : le marqueur d'accessibilité est requis, l'association reste optionnelle tant que Save n'a pas été observé. Ensuite seulement, une migration unique (MVP-SCHEMA). Pas de code Contacts, Leads, Opportunities ou Activities avant ce contrat.

## Liens

- Intégration : `cursor/mvp-integration-2cf0`
- Accounts : [PR #2](https://github.com/DKSolution28/crm-lab/pull/2) (ne pas fusionner)
