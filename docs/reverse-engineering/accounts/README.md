# Reverse engineering fonctionnel — module Accounts (Salesforce)

Dossier de travail pour l'analyse fonctionnelle autorisée du module **Accounts** d'une Salesforce Developer Org, réalisée avec REA 6.4.0 (observation passive par Chrome DevTools Protocol) pilotée depuis Cursor Cloud Agent.

## Contenu

| Fichier | Rôle |
| --- | --- |
| `00-rapport-preparation.md` | Rapport de préparation (phase 2) : tests réussis, blocages réels, étapes suivantes. |
| `01-plan-exploration-accounts.md` | Plan d'exploration du module Accounts : navigation, listes, fiches, formulaires, filtres, interactions, et protocole de capture. |
| `02-session-navigateur-salesforce.md` | Procédure de la session navigateur distincte, authentification Salesforce (SSO/MFA) et règles de non-contournement. |
| `03-fiches-ecrans-accounts.md` | Fiches d'écran de l'exploration du 2026-10-14 (NAV, LST, FLT, FRM, INT, SET) avec index des preuves. |
| `spec-accounts.md` | Synthèse fonctionnelle observée : modèle de données, picklists, relations, listes, filtres, formulaires, messages, exigences dérivées pour CRM Lab. |
| `04-rapport-couverture-accounts.md` | Rapport de couverture : vérifications, fonctionnalités observées, inconnues, blocages, interventions requises. |
| `05-reconstruction-crm-lab.md` | Phase 3 : comparaison écran par écran entre les captures REA et le module Accounts reconstruit dans CRM Lab, différences et limites. |
| `evidence/` | Preuves non sensibles (JSON REA résumés, captures d'écran) horodatées `AAAA-MM-JJ-*`. |
| `reconstruction/` | Captures du module Accounts de CRM Lab (données fictives du seed), en regard des preuves Salesforce. |

La couverture fonctionnelle de la reconstruction (observé / déduit / conçu, résultats de tests) est dans `docs/coverage.md` ; l'architecture dans `docs/architecture.md`.

## Reproduire une observation

```bash
# 1. Session Salesforce ouverte par une personne (scripts/start-salesforce-browser.sh, CDP 9223)
# 2. Amener l'écran voulu (lecture seule ; Save/Delete refusés par le script)
node scripts/sf-act.mjs '[{"goto":"/lightning/o/Account/list?filterName=AllAccounts"},{"wait":4000},{"mask":true}]'
# 3. Observer avec REA (sorties brutes hors dépôt, /tmp/sf-explore)
bash scripts/sf-observe.sh LST-2
# 4. Déposer la preuve anonymisée (règles de redaction hors dépôt : SF_REDACTION_FILE)
node scripts/sf-redact-evidence.mjs LST-2
```

## Règles du dossier

- Aucun secret : pas d'identifiant, mot de passe, jeton, cookie, `sid`, URL `frontdoor.jsp`, ni identifiant d'organisation ou d'utilisateur Salesforce.
- Aucune donnée métier réelle : les captures Salesforce ne doivent contenir que des données de démonstration d'une Developer Org, ou être anonymisées avant dépôt.
- Les preuves REA sont des résumés (`evidence_id`, cible, complétude, compteurs, landmarks d'accessibilité). Le JSON complet reste hors dépôt sauf relecture explicite.
- Chaque preuve indique la commande qui l'a produite ; les `evidence_id` permettent de recouper avec les sorties REA d'origine.
- Les spécifications fonctionnelles décrivent le comportement observé (quoi), jamais une reproduction du code Salesforce (comment interne).
