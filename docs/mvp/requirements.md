# Exigences du MVP CRM Lab

CRM Lab est un CRM local, inspiré des comportements Salesforce **observés** dans ce dépôt. Ce n'est pas une copie de l'infrastructure Salesforce. Tant que l'authentification réelle n'est pas en place, le produit est une **démonstration locale**, jamais « prêt pour production ».

Base de travail : `cursor/phase3-accounts-reconstruction-2cf0` (`c520ce1`), parce que la PR [#2](https://github.com/DKSolution28/crm-lab/pull/2) vers `main` n'est pas fusionnée et que `main` ne contient pas le module Accounts.

Classification obligatoire de chaque comportement : **OBSERVED**, **INFERRED**, **DESIGNED**.

## Module A — Accounts

Conserver le module déjà validé : CRUD, API, vues, filtres, Kanban, Split View, relations préparatoires, tests d'isolation `TEST_DATABASE_URL`.

- Aucune régression des parcours Accounts existants.
- Les montants et filtres numériques restent exacts (pas de `Number()` sur des entiers hors domaine sûr).
- Les tests qui écrivent refusent `crm_lab`, les bases de production et les hôtes non locaux.

## Module B — Contacts

- Liste avec recherche, tri et filtres.
- Création, consultation, modification.
- Association optionnelle à un Account (lookup observé sur New Contact, INT-5).
- Last Name requis sur le layout observé ; les autres champs du formulaire observé sont documentés avant d'être exigés.
- Champs, picklists et validations classés OBSERVED / INFERRED / DESIGNED.
- Historique de consultation par utilisateur.
- Le contact apparaît sur la fiche Account, et le compte apparaît sur la fiche Contact.
- API REST et tests.

Champs déjà observés sur `/lightning/o/Contact/new` (INT-5) : Account Name, Reports To, Salutation, First Name, Last Name (requis), Title, Description, Phone, Email, Mailing Address. Le modèle Prisma actuel est plus petit (`firstName`, `lastName`, `email`, `phone`, `title`, `accountId`, `ownerId`) : l'écart est un sujet de conception, pas une invention silencieuse.

## Module C — Leads

- Liste, création, modification.
- Statuts et qualification.
- Attribution à un utilisateur.
- Conversion en Account et Contact, Opportunity facultative.
- Transaction atomique.
- Une conversion réussie ne peut pas être rejouée.
- Tests des erreurs (lead inconnu, déjà converti, champs invalides) et du résultat lié, sans doublon accidentel.

Aucune fiche Lead n'est encore dans `docs/reverse-engineering/`. Les règles non observées sont DESIGNED et listées comme telles.

## Module D — Opportunities

- Liste et fiche.
- Création et modification.
- Lien vers Account et vers Contact.
- Pipeline Kanban.
- Étape, montant, date de clôture, probabilité.
- Totaux de pipeline exacts (`Decimal`, jamais un flottant).
- Tests de transition d'étape et de validation.

Le modèle actuel (`name`, `stageName`, `amount Decimal(18,2)`, `closeDate`, `accountId`, `ownerId`) est préparatoire. Les étapes seedées (Qualification, Proposal, Negotiation) ne sont pas une picklist observée.

## Module E — Activities

Périmètre simple :

- Tâche liée à un Account, un Contact, un Lead ou une Opportunity.
- Attribution, échéance, priorité, statut.
- Création, modification, clôture.
- Historique visible sur la fiche parente.

Les listes associées Open Activities et Activity History sont des métadonnées du layout Account (SET-1). Le contenu des formulaires de tâche n'a pas été observé.

## Module F — Dashboard

Indicateurs lus dans PostgreSQL, sans constante métier :

- Nombre d'Accounts, de Contacts et de Leads.
- Opportunités par étape.
- Valeur du pipeline (somme exacte des montants).
- Tâches en retard (échéance passée et statut non clos).

## Module G — Identité et sécurité

État actuel, conçu et non sûr pour une exposition publique (`src/lib/auth/current-user.ts`) :

- Cookie `crm-lab-user` et en-tête `x-crm-lab-user` choisissent l'utilisateur par alias ou id.
- Un identifiant inconnu retombe sur le premier administrateur.
- Rôles `ADMIN` et `STANDARD`. Lecture générale ; modification du compte par le propriétaire ou un administrateur.

Pour de vrais utilisateurs, exigé avant de retirer l'étiquette « démonstration locale » :

- Session vérifiée, pas un cookie ou un en-tête libre.
- Autorisation contrôlée sur le serveur pour chaque écriture et chaque lecture sensible.
- Un utilisateur ne lit pas les enregistrements d'un autre sans permission.
- Tests d'accès refusé.
- Secrets hors du dépôt, documentés par variables d'environnement.

Les utilisateurs `demoadm` et `demostd` restent des données de test.

## Parcours obligatoires

1. Créer un Account, créer un Contact, l'associer, le retrouver par recherche, le modifier, voir la relation sur les deux fiches.
2. Créer un Lead fictif, le qualifier, le convertir, vérifier Account, Contact et Opportunity optionnelle, sans second enregistrement si l'on reconvertit.
3. Créer une Opportunity sur un Account, fixer montant et échéance, changer l'étape, voir le pipeline et le dashboard changer.
4. Créer une tâche liée, l'assigner, changer son statut, la voir dans l'historique de la fiche.
5. Une opération autorisée réussit. Un utilisateur non autorisé ne modifie pas la donnée protégée.

## Hors périmètre

Chatter, Einstein, Flow Builder, reporting avancé, CPQ, marketplace, personnalisation complète, import CSV, actions de masse, édition en ligne, suppression de compte. Ces absences sont documentées, elles ne bloquent pas le MVP.

## Definition of Done

Le MVP n'est pas terminé tant que tous les points suivants ne sont pas vrais, avec des exécutions réelles :

- Les cinq parcours passent en E2E.
- Les écritures API persistent dans PostgreSQL.
- Les tests unitaires et d'intégration applicables passent.
- `npm run lint`, `npm run typecheck` et `npm run build` passent.
- Les migrations s'appliquent sur une base vide.
- Les bases de test sont isolées (`TEST_DATABASE_URL`).
- Aucun défaut CRITICAL ou HIGH exploitable ne reste ouvert.
- Accounts ne régresse pas.
- Les manques sont écrits dans `docs/mvp/blockers.md` et `docs/mvp/coverage.md`.
- Le vérificateur indépendant rend PASS.
- Une démonstration reproductible existe.

Une suite verte ne remplace pas un parcours métier absent.
