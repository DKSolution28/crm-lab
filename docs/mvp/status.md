# Statut MVP

Cycle : vague 1 lancée. Le MVP n'est pas terminé. Étiquette produit : **démonstration locale**.

## Déjà vérifié avant cette vague

| Élément | Preuve |
| --- | --- |
| Module Accounts sur la branche de reconstruction | Merge `c520ce1` de la PR #1 dans `cursor/phase3-accounts-reconstruction-2cf0` |
| PR #2 vers `main` | Ouverte, brouillon, non fusionnée. `main` n'a pas le module Accounts |
| Isolation des tests | `docs/phase3-2-test-isolation.md`, `tests/test-database.ts`. Dernière exécution consignée en phase 3.2 : unitaires 35, intégration 16, e2e 24, lint 0, typecheck et build passés. Ces chiffres ne sont pas rejoués dans ce cycle |
| GitHub Actions | Aucun workflow dans `.github/workflows` |

## Terminé et vérifié dans ce cycle

Rien. Les documents de coordination (exigences, backlog, ce statut, blocages, couverture, agents réutilisables) sont posés. Ils ne constituent pas une fonctionnalité métier.

## En cours

| Tâche | Agent | Branche attendue | Fichiers |
| --- | --- | --- | --- |
| MVP-ARCH | Architecte | `cursor/mvp-architect-contracts-2cf0` | `docs/mvp/architecture.md` |
| MVP-REA-CONTACTS | Analyste REA | `cursor/mvp-rea-contacts-2cf0` | `docs/reverse-engineering/contacts/` |
| MVP-QA-ACCEPT | QA | `cursor/mvp-qa-acceptance-2cf0` | `docs/mvp/acceptance-tests.md`, `docs/mvp/test-gaps.md` |
| MVP-SEC-IDENTITY | Auditeur | `cursor/mvp-security-identity-2cf0` | `docs/mvp/security-identity.md` |

Les identifiants d'agents et les SHA seront ajoutés quand les branches existeront. Aucun de ces travaux n'est `PASSED`.

## Tests de ce cycle

Non exécutés. Aucune modification de code applicatif.

## Bugs ouverts

| Gravité | Sujet | Preuve |
| --- | --- | --- |
| HIGH | Usurpation d'identité par cookie `crm-lab-user` ou en-tête `x-crm-lab-user` ; identifiant inconnu → premier administrateur | `src/lib/auth/current-user.ts` |
| MEDIUM | Pas de workflow CI | `.github/workflows` absent |

Le défaut HIGH est connu, hérité du mode démonstration. Il bloque uniquement l'étiquette « prêt pour utilisateurs réels ». Il ne bloque pas la conception des modules.

## Prochaine tâche

Intégrer les quatre livrables de la vague 1 sur `cursor/mvp-integration-2cf0`, puis ouvrir le schéma unique (MVP-SCHEMA) avant tout code Contacts, Leads, Opportunities ou Activities.

## Liens

- Intégration : `cursor/mvp-integration-2cf0`
- Accounts : [PR #2](https://github.com/DKSolution28/crm-lab/pull/2) (ne pas fusionner)
