# Reverse engineering fonctionnel — module Contacts

Dossier d'analyse du module **Contacts** pour CRM Lab. Il décrit le comportement visible déjà prouvé dans le dépôt, et sépare ce qui reste inconnu. Aucune reconstruction n'est faite ici : `prisma/`, `src/`, les tests et `docs/mvp/` ne sont pas modifiés.

## Contenu

| Fichier | Rôle |
| --- | --- |
| `README.md` | Périmètre, niveaux de confiance, blocages de cette passe. |
| `spec-contacts.md` | Spécification fonctionnelle. Chaque comportement est **OBSERVED**, **INFERRED** ou **DESIGNED**. |
| `evidence-index.md` | Index des preuves lues, contrôles résumés, rapport de capacité REA, inconnues. |

Les captures restent dans `docs/reverse-engineering/accounts/evidence/`. Ce dossier ne copie pas les binaires.

## Niveaux de confiance

| Niveau | Sens |
| --- | --- |
| **OBSERVED** | Vu dans une preuve du dépôt (arbre d'accessibilité, capture, fiche de la même session, ou code CRM Lab lu tel quel). |
| **INFERRED** | Déduit d'un fait observé, sans deuxième preuve directe. La déduction est écrite. |
| **DESIGNED** | Choix de produit ou état actuel de CRM Lab, absent de l'observation Salesforce. |

Une case vide, une liste à 0 ligne ou une picklist fermée ne fournit pas de valeurs. Ces valeurs restent inconnues.

## Blocages de cette passe

1. **Session Salesforce absente.** Cette VM n'a pas le navigateur Salesforce du coordinateur. Aucune connexion n'a été tentée. Aucune donnée Salesforce n'a été créée, modifiée ni supprimée.
2. **`npm run rea:doctor` a échoué** (code de sortie 1, `healthy: false`, `environment_healthy: false`) le 2026-10-14. Le détail est dans `evidence-index.md`. L'échec n'empêche pas la spécification à partir des preuves déjà déposées.
3. **Org trial vide.** La session du 2026-10-14 a vu **0 contact**. La liste All Contacts est restée « 0 items » après Cancel. Les colonnes de liste et le bandeau d'une fiche n'ont pas été observés.

## Règles

- Pas de secret, jeton, cookie, ni donnée personnelle. Les preuves existantes viennent d'une org trial vide ; les identifiants d'URL ne sont pas recopiés.
- Le comportement décrit est fonctionnel. Le code, le CSS et les binaires Salesforce ne sont pas reproduits.
