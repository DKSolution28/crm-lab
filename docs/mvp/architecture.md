# Contrats d'architecture — MVP Contacts, Leads, Opportunities, Activities

Contrat d'implémentation parallèle. Il complète `docs/architecture.md` (module Accounts déjà livré) et `docs/mvp/requirements.md`. Il ne remplace pas la classification Accounts de `docs/coverage.md`.

Chaque champ et chaque règle porte l'un de ces statuts :

- **OBSERVED** : vu dans l'org Salesforce documentée (`docs/reverse-engineering/accounts/`, en particulier INT-5).
- **INFERRED** : déduit d'un comportement Account déjà établi, sans capture propre au nouvel objet.
- **DESIGNED** : choix CRM Lab. Ce n'est pas une valeur Salesforce. Aucune picklist absente des preuves n'est présentée comme observée.

Base de code : branche `cursor/mvp-integration-2cf0` au commit `217b165` ou ultérieur. Ce document ne modifie ni `prisma/schema.prisma`, ni `src/`, ni les tests.

## 1. Principes repris d'Accounts

Le module Accounts reste la référence de structure. Les quatre objets s'y branchent.

1. **Domaine dans `src/lib`.** Validation, autorisation, filtres, agrégats et persistance vivent dans des modules TypeScript purs, appelés par les pages, les server actions, les route handlers et les tests `node --test`. Aucune règle métier ne naît dans un composant ou une route.
2. **Deux écritures, un service.** La server action et la route REST appellent la même fonction (`createContact`, `convertLead`, `updateTask`, etc.).
3. **Liste pilotée par l'URL.** Les pages de liste sont `force-dynamic`. Le client ne garde pas l'état de liste : il passe par `useListUrl` (`src/components/accounts/use-list-url.ts`), déjà indépendant de l'objet. Paramètres des nouveaux modules : `q`, `sort`, `dir`, `page`, `pageSize`, `scope`, `filters`, `filterLogic`, et pour les opportunités `display`. Le paramètre `view` reste réservé aux vues Account (`ListView`).
4. **Argent en `Decimal`.** `Opportunity.amount` reste `Decimal(18, 2)`. L'API et les DTO l'exposent en **chaîne décimale**. Le JSON n'accepte pas un nombre pour ce champ. Les sommes passent par SQL ou par `Prisma.Decimal` / arithmétique décimale. `Number()`, `parseFloat` et `BigInt` sont impropres : `BigInt` convient au revenu Account (échelle 0) et perd les centimes.
5. **Tests qui écrivent.** Toute suite d'intégration, API ou E2E qui écrit en base passe par `assertTestDatabaseUrl` (`tests/test-database.ts`). `TEST_DATABASE_URL` est obligatoire, `DATABASE_URL` est ignoré, l'hôte est local, et les noms `crm_lab`, `postgres`, `template0`, `template1` ainsi que les noms de production sont refusés. Voir `docs/phase3-2-test-isolation.md`.
6. **Erreurs déjà en place.** `ValidationError` et `REQUIRED_MESSAGE` (`src/lib/accounts/validation.ts`), `AuthorizationError` (`src/lib/auth/policies.ts`), `NotFoundError` (`src/lib/accounts/service.ts`), `FilterError` (`src/lib/accounts/filters.ts`). Les routes passent par `errorResponse` (`src/lib/http.ts`).
7. **Identité de démonstration.** Cookie `crm-lab-user` (interface) et en-tête `x-crm-lab-user` (API) choisissent un utilisateur seedé par alias ou id, avec repli sur le premier administrateur (`src/lib/auth/current-user.ts`). Ce mécanisme est **DESIGNED** et limité à la démo locale. Ce n'est pas une authentification de production : pas de session vérifiée, pas de secret, un client peut envoyer l'identifiant qu'il veut.

Hors de ce contrat : Chatter, import CSV, actions de masse, édition en ligne, suppression d'Account, détection de doublons, vues de liste clonables pour les nouveaux objets, Split View et Kanban Settings des nouveaux objets.

## 2. Propriétaire du schéma et migration unique

Un seul agent, le propriétaire du schéma, modifie `prisma/schema.prisma`, le dossier de migration ci-dessous et `prisma/seed.ts`. Il est aussi le seul à toucher les points de code partagés listés au §2.3. Les workstreams Contacts, Opportunities et Leads/Activities/Dashboard consomment le client Prisma après fusion de cette migration sur la branche d'intégration. Ils n'ajoutent pas de seconde migration, même pour un index ou une colonne.

### 2.1 Nom

Dossier exact :

`prisma/migrations/20261014200000_mvp_crm_modules/`

Il se place après `20261014124145_accounts_module`. Si `prisma migrate dev` propose un autre horodatage, le propriétaire renomme le dossier avant de committer. Un second dossier de migration dans la même livraison est un écart au contrat.

### 2.2 Contenu

Une migration additive :

- enrichir `Contact` sans retirer les colonnes seedées ;
- ajouter `Lead`, `Task` et les enums ;
- convertir `Opportunity.stageName` de `String` vers l'enum `OpportunityStage` ;
- ajouter sur `Opportunity` la probabilité et le contact principal ;
- élargir `RecentlyViewed` sans retirer la clé Account ;
- ajouter les relations nommées sur `User`, `Account`, `Contact`, `Opportunity`.

`LabNote`, `ListView`, les enums Account et les 27 champs Account ne changent pas.

Colonnes seedées à conserver telles quelles :

| Modèle | Colonnes déjà écrites par `prisma/seed.ts` |
| --- | --- |
| `Contact` | `id`, `firstName`, `lastName`, `email`, `phone`, `title`, `accountId`, `ownerId`, `createdAt`, `updatedAt` |
| `Opportunity` | `id`, `name`, `stageName`, `amount`, `closeDate`, `accountId`, `ownerId`, `createdAt`, `updatedAt` |
| `RecentlyViewed` | `userId`, `accountId`, `viewedAt` via l'upsert `userId_accountId` |

Le seed actuel écrit `stageName` avec les chaînes `Qualification`, `Proposal`, `Negotiation`. L'enum reprend ces trois identifiants. Toute autre valeur déjà en base fait échouer le `USING ("stageName"::"OpportunityStage")`. Le propriétaire s'arrête et le signale. Il n'invente pas de correspondance.

Les nouvelles colonnes d'audit obligatoires sont ajoutées nullables, remplies, puis contraintes :

```sql
UPDATE "Contact" SET "createdById" = "ownerId", "lastModifiedById" = "ownerId";
UPDATE "Opportunity" SET "createdById" = "ownerId", "lastModifiedById" = "ownerId";
```

`ownerId` est déjà obligatoire sur ces deux tables. Le seed doit ensuite fournir `createdById` et `lastModifiedById` à la création, avec la même valeur que `ownerId` pour les lignes `[demo]`. L'ordre de reset du seed devient : tâches, leads, opportunités, contacts, comptes. Les consultations récentes Account restent sur `userId_accountId`.

### 2.3 Code partagé autorisé dans la même livraison de schéma

Uniquement ces fichiers, et uniquement pour les raisons suivantes :

| Fichier | Changement |
| --- | --- |
| `prisma/seed.ts` | Renseigner l'audit, respecter le nouvel enum, supprimer les enfants avant les parents. |
| `src/lib/auth/policies.ts` | Ajouter `canEditRecord`. `canEditAccount` devient un appel à `canEditRecord`. Les règles Account ne changent pas. |
| `src/lib/errors.ts` | Nouveau fichier : `ConflictError`. |
| `src/lib/http.ts` | Une branche : `ConflictError` → HTTP 409. Le corps est `{ error, conversion? }`. |
| `src/lib/recent/service.ts` | Nouveau fichier : `recordRecentView`. |
| `src/lib/accounts/service.ts` | `recordView` délègue à `recordRecentView("Account", ...)`. `createAccount(input, user, db = prisma)` accepte un `Prisma.TransactionClient` et l'utilise pour l'insert et la consultation récente. Les appelants actuels omettent `db`. Si le type `account` devient nullable, resserrer le filtre Recently Viewed pour que `toDto` reçoive un compte. Le résultat de la vue Recent Account ne change pas. |

Aucun workstream ne modifie ces fichiers ensuite.

## 3. Modèle de données

Les identifiants restent des `cuid()`. Les dates API sont des chaînes ISO-8601. Une date de calendrier reçue en `YYYY-MM-DD` est stockée à minuit UTC. Les relations `onDelete` nouvelles sont **DESIGNED** : la suppression d'Account est hors produit, mais les tests d'intégration effacent des comptes par `deleteMany`.

### 3.1 Enums

Aucun de ces enums n'a été lu dans l'org. Ce sont des jeux fermés **DESIGNED**. L'interface affiche l'identifiant. Elle n'invente pas de libellé Salesforce.

| Enum | Valeurs, dans l'ordre d'affichage | Rôle |
| --- | --- | --- |
| `Salutation` | `Mr`, `Ms`, `Dr`, `Mx` | Civilité du contact. Le combobox INT-5 était replié : les valeurs Salesforce sont inconnues. |
| `LeadStatus` | `New`, `Working`, `Unqualified`, `Converted` | Statut du lead. Défaut `New`. |
| `OpportunityStage` | `Qualification`, `Proposal`, `Negotiation`, `ClosedWon`, `ClosedLost` | Les trois premières sont les chaînes déjà seedées, pas une picklist observée. Les deux dernières ferment le pipeline. |
| `TaskStatus` | `NotStarted`, `InProgress`, `Completed` | Défaut `NotStarted`. Seul `Completed` est clos. |
| `TaskPriority` | `Low`, `Normal`, `High` | Défaut `Normal`. |
| `RecentObject` | `Account`, `Contact`, `Lead`, `Opportunity` | Cible d'une consultation. Défaut `Account`, pour les lignes et le seed existants. |

`OpportunityStage` remplace le `String` libre. Un PATCH dont l'étape est hors enum est une `ValidationError` 400, pas une valeur libre.

### 3.2 Contact

Point de départ : le modèle minimal actuel. On n'en retire rien. INT-5 (`/lightning/o/Contact/new`, fiche et arbre d'accessibilité `evidence/2026-10-14-INT-5.json`) fournit les champs de formulaire. Last Name est le seul champ dont `required` vaut `true` et dont l'état `invalid` est `true` à vide. Le groupe s'appelle « Name required ».

| Champ | Type Prisma | Null | Statut | Règle |
| --- | --- | --- | --- | --- |
| `id` | `String` `@id` | non | DESIGNED | Déjà présent. |
| `salutation` | `Salutation` | oui | OBSERVED (champ) / DESIGNED (valeurs) | Combobox INT-5, non requis. |
| `firstName` | `String` | oui | OBSERVED | Textbox INT-5, `required=false`. Déjà seedé. Max 80, **DESIGNED**. |
| `lastName` | `String` | non | OBSERVED | Seul requis observé. Déjà seedé. Max 80, **DESIGNED**. |
| `title` | `String` | oui | OBSERVED | Textbox INT-5, non requis. Déjà seedé. Max 128, **DESIGNED**. |
| `description` | `String` `@db.VarChar(32000)` | oui | OBSERVED (champ) / INFERRED (longueur) | Textarea INT-5. Longueur copiée du champ Description d'Account (SET-1), non mesurée sur Contact. |
| `phone` | `String` | oui | OBSERVED | Non requis. Pas de masque : Account n'en a pas, et aucun masque Contact n'a été vu. Max 40, **DESIGNED**. Déjà seedé. |
| `email` | `String` | oui | OBSERVED | Non requis. Pas de contrôle de format (non observé). Max 255, **DESIGNED**. Pas d'unicité. Déjà seedé. |
| `accountId` | `String` FK `Account` | oui | OBSERVED | Lookup « Account Name », au plus un compte. `onDelete: SetNull` déjà en place. La fiche INT-5 et `requirements.md` le laissent optionnel. L'arbre a11y porte aussi `required=true` sur ce combobox, mais `invalid=false` à vide : voir §11. La validation MVP suit l'exigence : optionnel. |
| `reportsToId` | `String` FK `Contact` | oui | OBSERVED | Lookup « Reports To ». Relation nommée `ContactReportsTo`, `onDelete: SetNull`. |
| `mailingStreet` | `String` | oui | OBSERVED | « Mailing Street », multiline, non requis. |
| `mailingCity` | `String` | oui | OBSERVED | « Mailing City », non requis. |
| `mailingPostalCode` | `String` | oui | OBSERVED | « Mailing Zip/Postal Code », non requis. |
| `mailingCountryCode` | `String` | oui | OBSERVED (contrôle) / INFERRED (codes) | Combobox « Mailing Country ». Les codes réutilisent le sous-ensemble Account (`COUNTRY_OPTIONS`), déjà documenté comme partiel. |
| `mailingCountry` | `String` | oui | INFERRED | Libellé résolu comme `billingCountry` sur Account. |
| `mailingStateCode` | `String` | oui | OBSERVED (contrôle) / INFERRED (dépendance) | Combobox « Mailing State/Province ». La dépendance pays → état n'a pas été exercée sur Contact ; on réutilise la règle Account. |
| `mailingState` | `String` | oui | INFERRED | Libellé résolu. |
| `ownerId` | `String` FK `User` | non | DESIGNED | Absent du formulaire INT-5. Colonne déjà seedée. Même règle que le propriétaire Account. |
| `createdById` | `String` FK `User` | non | DESIGNED | Aligné sur Account. Backfill = `ownerId`. |
| `lastModifiedById` | `String` FK `User` | non | DESIGNED | Aligné sur Account. Backfill = `ownerId`. |
| `createdAt` | `DateTime` | non | DESIGNED | Déjà présent. |
| `updatedAt` | `DateTime` | non | DESIGNED | Déjà présent. |
| `lastActivityDate` | `DateTime` | oui | DESIGNED | Aligné sur Account. Le service des tâches le met à jour à la création et à la clôture d'une tâche dont le parent est ce contact. |

Index conservé : `accountId`. Index ajoutés : `ownerId`, `reportsToId`, `lastName`.

Champ inverse obligatoire pour Prisma : `directReports Contact[]` sur la relation `ContactReportsTo`. Les relations User (`owner`, `createdBy`, `lastModifiedBy`) portent des noms explicites, y compris `ContactOwner` sur la relation déjà en place : dès qu'un second lien User ↔ Contact existe, Prisma exige un nom sur chacun.

Règle **DESIGNED** sur Reports To : un contact ne se référence pas lui-même, et la chaîne ne boucle pas. Même algorithme que `resolveParent` des comptes. Message de champ : `A contact cannot report to itself.` ou `This contact would create a loop in the reporting line.` Un responsable d'un autre compte est accepté : aucun filtre de compte n'a été observé.

Le lookup Account réutilise `GET /api/accounts/lookup`. Pas de second lookup comptes.

### 3.3 Lead

Aucune fiche Lead n'est dans `docs/reverse-engineering/`. Tout le modèle est **DESIGNED**.

| Champ | Type Prisma | Null | Statut | Règle |
| --- | --- | --- | --- | --- |
| `id` | `String` `@id` | non | DESIGNED | |
| `firstName` | `String` | oui | DESIGNED | Max 80. |
| `lastName` | `String` | non | DESIGNED | Requis, message `Complete this field.` Max 80. |
| `company` | `String` | non | DESIGNED | Requis. Devient le nom du compte à la conversion si `accountName` est absent. Max 255. |
| `title` | `String` | oui | DESIGNED | Max 128. |
| `email` | `String` | oui | DESIGNED | Max 255, pas de format, pas d'unicité. |
| `phone` | `String` | oui | DESIGNED | Max 40, pas de masque. |
| `description` | `String` `@db.VarChar(32000)` | oui | DESIGNED | |
| `status` | `LeadStatus` | non | DESIGNED | Défaut `New`. `Converted` n'est écrit que par `convertLead`. |
| `qualified` | `Boolean` | non | DESIGNED | Défaut `false`. Porte la qualification, distincte du statut. |
| `ownerId` | `String` FK `User` | non | DESIGNED | Propriétaire. Défaut : utilisateur courant. |
| `createdById` | `String` FK `User` | non | DESIGNED | Utilisateur courant à la création. |
| `lastModifiedById` | `String` FK `User` | non | DESIGNED | |
| `createdAt` / `updatedAt` | `DateTime` | non | DESIGNED | |
| `convertedAt` | `DateTime` | oui | DESIGNED | Horodatage de conversion. Null tant que le lead n'est pas converti. Source de vérité de l'idempotence. |
| `convertedAccountId` | `String` FK `Account` | oui | DESIGNED | `onDelete: SetNull`, relation `LeadConvertedAccount`. |
| `convertedContactId` | `String` FK `Contact` | oui | DESIGNED | `onDelete: SetNull`, relation `LeadConvertedContact`. |
| `convertedOpportunityId` | `String` FK `Opportunity` | oui | DESIGNED | `onDelete: SetNull`, relation `LeadConvertedOpportunity`. Reste null si la conversion ne crée pas d'opportunité. |

`onDelete: SetNull` évite de bloquer le `account.deleteMany` des tests. L'idempotence ne dépend pas de ces clés : elle dépend de `convertedAt`.

Index : `ownerId`, `status`, `convertedAt`, `convertedAccountId`, `convertedContactId`.

Champs inverses : `convertedFromLeads Lead[]` sur Account (`LeadConvertedAccount`), Contact (`LeadConvertedContact`) et Opportunity (`LeadConvertedOpportunity`). Les trois liens User portent des noms de relation.

Contrainte SQL **DESIGNED** :

```sql
CHECK (
  ("status" = 'Converted' AND "convertedAt" IS NOT NULL)
  OR ("status" <> 'Converted' AND "convertedAt" IS NULL
      AND "convertedAccountId" IS NULL
      AND "convertedContactId" IS NULL
      AND "convertedOpportunityId" IS NULL)
)
```

Un lead `Converted` peut donc perdre un id si la cible est supprimée en test, et il reste converti.

Transitions de statut autorisées par PATCH, **DESIGNED** : entre `New`, `Working` et `Unqualified`. Passer à `Converted`, écrire `convertedAt` ou écrire un id converti via PATCH renvoie 400, `fieldErrors.status = "Convert the lead with the convert action."`. Un lead déjà converti est gelé : tout PATCH renvoie 409 (même corps que la seconde conversion). `qualified: true` est refusé quand le statut est `Unqualified` (`fieldErrors.qualified = "An unqualified lead cannot be qualified."`). La conversion n'implique pas la qualification : le parcours exige les deux étapes.

### 3.4 Opportunity

Point de départ : le modèle minimal. `amount` est déjà `Decimal(18, 2)`. On ne change pas sa précision.

| Champ | Type Prisma | Null | Statut | Règle |
| --- | --- | --- | --- | --- |
| `id` | `String` `@id` | non | DESIGNED | Déjà présent. |
| `name` | `String` | non | DESIGNED | Déjà présent et seedé. Requis. Max 120, **DESIGNED**. |
| `stageName` | `OpportunityStage` | non | DESIGNED | Déjà présent comme `String` seedé. Voir l'enum. Toute transition vers toute étape est autorisée : aucune règle de chemin n'a été observée. |
| `amount` | `Decimal(18, 2)` | oui | DESIGNED | Déjà présent. Null autorisé en base pour le seed. La somme SQL ignore les nulls. |
| `closeDate` | `DateTime` | non | DESIGNED | Déjà présent. Requis. Saisie `YYYY-MM-DD`, minuit UTC. |
| `probability` | `Int` | oui | DESIGNED | Entier de 0 à 100 inclus, ou null. Pas de table de probabilité par étape (non observée). |
| `accountId` | `String` FK `Account` | oui | DESIGNED | Déjà présent, `onDelete: SetNull`. La création et la modification via le service exigent un compte existant (`fieldErrors.accountId`). La colonne reste nullable pour ne pas réécrire les lignes qui auraient un null. Le seed actuel renseigne toujours le compte. |
| `primaryContactId` | `String` FK `Contact` | oui | DESIGNED | Contact principal, `onDelete: SetNull`, relation `OpportunityPrimaryContact`. Optionnel. S'il est renseigné, le contact doit exister. Aucune obligation qu'il appartienne au même compte (non observé). |
| `ownerId` | `String` FK `User` | non | DESIGNED | Déjà présent. |
| `createdById` | `String` FK `User` | non | DESIGNED | Backfill = `ownerId`. |
| `lastModifiedById` | `String` FK `User` | non | DESIGNED | Backfill = `ownerId`. |
| `createdAt` / `updatedAt` | `DateTime` | non | DESIGNED | Déjà présents. |

Index conservé : `accountId`. Index ajoutés : `ownerId`, `stageName`, `primaryContactId`, `closeDate`.

`createOpportunity(input, user, db = prisma)` accepte un client de transaction, comme `createAccount`. La relation `owner` déjà présente prend le nom `OpportunityOwner`. Champ inverse du contact principal : `Opportunity.primaryContact` / `Contact` côté `OpportunityPrimaryContact`.

Saisie du montant, **DESIGNED** : chaîne correspondant à `^-?\d{1,16}(\.\d{1,2})?$` (précision 18, échelle 2). Un nombre JSON, un exposant ou plus de deux décimales produit `fieldErrors.amount = "Enter the amount as a decimal string with up to 2 decimal places."`. La réponse renvoie la chaîne canonique de `Prisma.Decimal` (`toString()`), jamais un nombre JSON.

### 3.5 Task (Activities)

Le layout Account cite les listes associées « Open Activities » et « Activity History » (SET-1, métadonnées). Le formulaire de tâche n'a pas été vu. Un seul objet `Task` couvre les deux listes : ouvertes si `status <> Completed`, historique si `status = Completed`. Cette coupure est **DESIGNED**.

Une tâche a exactement un parent parmi Account, Contact, Lead, Opportunity.

| Champ | Type Prisma | Null | Statut | Règle |
| --- | --- | --- | --- | --- |
| `id` | `String` `@id` | non | DESIGNED | |
| `subject` | `String` | non | DESIGNED | Requis, `Complete this field.` Max 255. |
| `description` | `String` `@db.VarChar(32000)` | oui | DESIGNED | |
| `status` | `TaskStatus` | non | DESIGNED | Défaut `NotStarted`. |
| `priority` | `TaskPriority` | non | DESIGNED | Défaut `Normal`. |
| `dueDate` | `DateTime` `@db.Date` | oui | DESIGNED | Échéance calendaire. Null = pas en retard. |
| `completedAt` | `DateTime` | oui | DESIGNED | Posé quand le statut devient `Completed`, remis à null sinon. |
| `assigneeId` | `String` FK `User` | non | DESIGNED | Attribution. Défaut : utilisateur courant. N'importe quel utilisateur existant. Relation `TaskAssignee`. |
| `ownerId` | `String` FK `User` | non | DESIGNED | Porte l'autorisation, comme sur Account. Défaut : utilisateur courant. Relation `TaskOwner`. |
| `accountId` | `String` FK `Account` | oui | DESIGNED | Parent. `onDelete: Cascade`. |
| `contactId` | `String` FK `Contact` | oui | DESIGNED | Parent. `onDelete: Cascade`. |
| `leadId` | `String` FK `Lead` | oui | DESIGNED | Parent. `onDelete: Cascade`. |
| `opportunityId` | `String` FK `Opportunity` | oui | DESIGNED | Parent. `onDelete: Cascade`. |
| `createdById` / `lastModifiedById` | `String` FK `User` | non | DESIGNED | |
| `createdAt` / `updatedAt` | `DateTime` | non | DESIGNED | |

`onDelete: Cascade` est **DESIGNED** pour que `account.deleteMany` dans les tests d'intégration continue de passer. Ce n'est pas une règle de suppression Salesforce.

Contrainte SQL, exactement un parent :

```sql
CHECK (
  (CASE WHEN "accountId" IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN "contactId" IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN "leadId" IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN "opportunityId" IS NOT NULL THEN 1 ELSE 0 END)
  = 1
)
```

La même règle est appliquée dans le service avant l'insert. L'API ne reçoit pas quatre clés : elle reçoit un discriminant `parent`. Le service pose une seule colonne. Message si l'id est inconnu : `fieldErrors.parent = "The related record was not found."`.

Index : `accountId`, `contactId`, `leadId`, `opportunityId`, `assigneeId`, `ownerId`, `dueDate`, `status`.

Champs inverses sur les parents : `tasks Task[]`, un nom de relation par clé (`TaskAccount`, `TaskContact`, `TaskLead`, `TaskOpportunity`).

L'attributaire qui n'est pas le propriétaire ne modifie pas la tâche, sauf s'il est administrateur. C'est la politique « propriétaire ou admin » appliquée à `ownerId`, pas à `assigneeId`.

À la création et quand le statut passe à `Completed`, le service écrit `lastActivityDate = now()` sur le parent s'il s'agit d'un Account (colonne existante) ou d'un Contact (colonne ajoutée). Lead et Opportunity n'ont pas cette colonne dans ce contrat.

### 3.6 RecentlyViewed généralisé

La table actuelle alimente la vue Account Recently Viewed : `accountId` obligatoire, `@@unique([userId, accountId])`, upsert `where: { userId_accountId }`, `onDelete: Cascade`. Cette clé et cet upsert restent. Le modèle n'est pas renommé. Les lignes Account ne sont pas réécrites vers une table polymorphique.

Élargissement :

| Champ | Type | Null | Statut | Règle |
| --- | --- | --- | --- | --- |
| `id`, `userId`, `viewedAt` | inchangés | | DESIGNED | |
| `accountId` | `String` FK `Account` | oui | DESIGNED | Était obligatoire. `DROP NOT NULL` seulement. L'index unique `RecentlyViewed_userId_accountId_key` reste. PostgreSQL autorise plusieurs `accountId` nuls, donc les consultations des autres objets n'entrent pas en collision avec les comptes. |
| `objectType` | `RecentObject` | non | DESIGNED | Défaut `Account`. Les inserts du seed, qui ne passent pas ce champ, restent des consultations Account. |
| `contactId` | `String` FK `Contact` | oui | DESIGNED | `@@unique([userId, contactId])`, `onDelete: Cascade`. |
| `leadId` | `String` FK `Lead` | oui | DESIGNED | `@@unique([userId, leadId])`, `onDelete: Cascade`. |
| `opportunityId` | `String` FK `Opportunity` | oui | DESIGNED | `@@unique([userId, opportunityId])`, `onDelete: Cascade`. |

Contrainte SQL, une cible cohérente avec `objectType` :

```sql
CHECK (
  ("objectType" = 'Account' AND "accountId" IS NOT NULL AND "contactId" IS NULL AND "leadId" IS NULL AND "opportunityId" IS NULL)
  OR ("objectType" = 'Contact' AND "contactId" IS NOT NULL AND "accountId" IS NULL AND "leadId" IS NULL AND "opportunityId" IS NULL)
  OR ("objectType" = 'Lead' AND "leadId" IS NOT NULL AND "accountId" IS NULL AND "contactId" IS NULL AND "opportunityId" IS NULL)
  OR ("objectType" = 'Opportunity' AND "opportunityId" IS NOT NULL AND "accountId" IS NULL AND "contactId" IS NULL AND "leadId" IS NULL)
)
```

`recordRecentView(objectType, recordId, user, db = prisma)` fait l'upsert sur la clé de cet objet et rafraîchit `viewedAt`. `db` est le client global ou le client de la transaction de conversion. `recordView(accountId, user)` du service Account appelle `recordRecentView("Account", accountId, user)` et conserve sa signature. La requête de la vue Recent Account continue de filtrer `userId` et la relation `account`. Les lignes dont `accountId` est null n'y entrent pas. Le propriétaire du schéma ajoute `objectType: "Account"` à ce filtre et resserre le type pour `toDto`.

Les GET fiche Contact, Lead et Opportunity appellent `recordRecentView` après une lecture réussie. Les listes acceptent `scope=recent` (**DESIGNED**) : consultations de l'utilisateur courant, tri `viewedAt` descendant, non triable autrement, comme la portée `RECENT` des comptes.

### 3.7 Relations User

Ajouter les collections suivantes. Les relations Account déjà générées et `pinnedAccountViewId` restent.

| Collection sur `User` | Cible | Nom de relation |
| --- | --- | --- |
| `ownedContacts` | `Contact.owner` | `ContactOwner` (nom ajouté sur le lien déjà seedé) |
| `createdContacts` | `Contact.createdBy` | `ContactCreatedBy` |
| `modifiedContacts` | `Contact.lastModifiedBy` | `ContactLastModifiedBy` |
| `ownedLeads` | `Lead.owner` | `LeadOwner` |
| `createdLeads` | `Lead.createdBy` | `LeadCreatedBy` |
| `modifiedLeads` | `Lead.lastModifiedBy` | `LeadLastModifiedBy` |
| `ownedOpportunities` | `Opportunity.owner` | `OpportunityOwner` (nom ajouté sur le lien déjà seedé) |
| `createdOpportunities` | `Opportunity.createdBy` | `OpportunityCreatedBy` |
| `modifiedOpportunities` | `Opportunity.lastModifiedBy` | `OpportunityLastModifiedBy` |
| `ownedTasks` | `Task.owner` | `TaskOwner` |
| `assignedTasks` | `Task.assignee` | `TaskAssignee` |
| `createdTasks` | `Task.createdBy` | `TaskCreatedBy` |
| `modifiedTasks` | `Task.lastModifiedBy` | `TaskLastModifiedBy` |

`ListView` ne reçoit pas de lignes Contact, Lead ou Opportunity dans cette migration. Les nouveaux modules ne créent pas de vues système.

## 4. Contrats HTTP et server actions

Préfixe d'identité : en-tête `x-crm-lab-user: <alias|id>` ou cookie `crm-lab-user`. Voir §6.

Forme de liste commune (pas de clé `view`, contrairement à `GET /api/accounts`) :

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 50,
  "sortField": "lastName",
  "sortDirection": "asc",
  "scope": "all"
}
```

`page` défaut 1, `pageSize` défaut 50, maximum 200. `sortDirection` vaut `asc` ou `desc`.

`filters` est un paramètre de requête : JSON d'un tableau `{ "field", "operator", "value" }`. `value` est une chaîne ou un tableau de chaînes. Les opérateurs et `filterLogic` sont ceux de `src/lib/accounts/filters.ts` (`equals`, `not_equal_to`, `less_than`, `greater_than`, `less_or_equal`, `greater_or_equal`, `contains`, `does_not_contain`, `starts_with`, expression du type `1 AND (2 OR 3)`). Chaque module compile vers son propre `WhereInput`. Un filtre invalide renvoie 400 `{ "error": "<message FilterError>" }`.

`scope` : `all` (défaut), `mine` (propriétaire = utilisateur courant), `recent`.

Les DTO embedent `owner: { "id", "alias", "firstName", "lastName" }`. Les dates sont des chaînes. `amount` est une chaîne ou `null`. `GET` fiche ajoute `canEdit: boolean`.

Les POST réussis renvoient 201 et le DTO. Les PATCH réussis renvoient 200 et le DTO. Il n'y a pas de DELETE.

### 4.1 Contacts

| Méthode | Chemin | Corps requête | Succès |
| --- | --- | --- | --- |
| GET | `/api/contacts` | Query : `q`, `sort`, `dir`, `page`, `pageSize`, `scope`, `filters`, `filterLogic` | 200, liste |
| POST | `/api/contacts` | JSON Contact ci-dessous | 201, DTO |
| GET | `/api/contacts/:id` | | 200, DTO + `account`, `reportsTo`, `directReports`, `canEdit`. Enregistre la consultation. |
| PATCH | `/api/contacts/:id` | JSON partiel fusionné avec l'existant, même règle que `PATCH /api/accounts/:id` | 200, DTO |
| GET | `/api/contacts/lookup?q=&exclude=` | | 200, `{ "items": [{ "id", "firstName", "lastName" }] }`, 8 lignes maximum |

Recherche **DESIGNED** : `firstName`, `lastName`, `email`, `phone`, `title`, insensible à la casse. Tri par défaut : `lastName` asc, puis `id`.

JSON d'écriture :

```json
{
  "salutation": "Ms",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "title": "Purchasing Lead",
  "description": null,
  "phone": null,
  "email": "ada@northwind.example",
  "accountId": null,
  "reportsToId": null,
  "mailingStreet": null,
  "mailingCity": null,
  "mailingStateCode": null,
  "mailingPostalCode": null,
  "mailingCountryCode": null,
  "ownerId": null
}
```

`ownerId` null ou omis : utilisateur courant. Seul un administrateur peut désigner un autre propriétaire (`Only an administrator can assign another owner.`). Compte ou responsable inconnu : 400 sur le champ, pas 404.

GET fiche, relations :

```json
{
  "account": { "id": "…", "name": "Northwind Traders" },
  "reportsTo": { "id": "…", "firstName": "Grace", "lastName": "Hopper" },
  "directReports": [{ "id": "…", "firstName": "Grace", "lastName": "Hopper" }]
}
```

Objets null si absents. `directReports` est un tableau, éventuellement vide.

Server actions dans `src/app/contacts/actions.ts` :

- `createContactAction(previous, formData)` appelle `createContact`.
- `updateContactAction(id, previous, formData)` appelle `updateContact`.

Champs de formulaire : les clés du JSON. `intent` vaut `save` ou `save-new`. Succès : redirection `/contacts/:id` ou `/contacts/new`, avec le query `toast` déjà utilisé par Accounts. Erreur : l'état de formulaire du §5, sans redirection.

Pages : `/contacts`, `/contacts/new`, `/contacts/:id`, `/contacts/:id/edit`. La fiche affiche le compte lié. L'onglet Related du compte affiche déjà les contacts ; le workstream Contacts ajoute le lien vers `/contacts/:id` sur cette ligne, et seulement ce lien, dans `src/components/accounts/account-details.tsx`.

Domaine : `src/lib/contacts/`. `createContact(input, user, db = prisma)` accepte un `Prisma.TransactionClient` dès la première version : la conversion de lead le passe et n'a pas de second insert.

### 4.2 Leads

| Méthode | Chemin | Corps requête | Succès |
| --- | --- | --- | --- |
| GET | `/api/leads` | Même query que les contacts, plus le filtre de champ `qualified` et `status` | 200, liste |
| POST | `/api/leads` | JSON ci-dessous | 201, DTO |
| GET | `/api/leads/:id` | | 200, DTO + `canEdit` + bloc `conversion`. Enregistre la consultation. |
| PATCH | `/api/leads/:id` | JSON partiel | 200, ou 409 si `convertedAt` est déjà posé |
| POST | `/api/leads/:id/convert` | JSON de conversion, §4.2.1 | 201, résultat. 409 si déjà converti. |

JSON d'écriture :

```json
{
  "firstName": "Ada",
  "lastName": "Lovelace",
  "company": "Analytical Engines",
  "title": null,
  "email": null,
  "phone": null,
  "description": null,
  "status": "Working",
  "qualified": true,
  "ownerId": null
}
```

Tri par défaut : `lastName` asc. Recherche **DESIGNED** : `firstName`, `lastName`, `company`, `email`, `phone`.

DTO fiche, lead non converti : `"conversion": null`. Lead converti :

```json
{
  "conversion": {
    "accountId": "…",
    "contactId": "…",
    "opportunityId": null,
    "convertedAt": "2026-10-14T18:00:00.000Z"
  }
}
```

Server actions dans `src/app/leads/actions.ts` : `createLeadAction`, `updateLeadAction`, `convertLeadAction(id, previous, formData)`. La conversion appelle `convertLead`. Succès : redirection vers `/leads/:id`. Pages : `/leads`, `/leads/new`, `/leads/:id`, `/leads/:id/edit`. Pas de page d'édition pour un lead converti : le formulaire n'est pas proposé, et le POST/PATCH reste rejeté.

Domaine : `src/lib/leads/`.

#### 4.2.1 Conversion

`convertLead(id, input, user)` est la seule fonction qui crée le compte, le contact et l'opportunité facultative issus d'un lead. Elle appelle `createAccount`, `createContact` et, si demandé, `createOpportunity`, en leur passant le client de la transaction. Ces trois fonctions prennent `db: Prisma.TransactionClient | typeof prisma` en dernier argument, avec `prisma` par défaut. `recordRecentView` prend le même argument. Aucun insert Prisma de compte, de contact ou d'opportunité n'est écrit dans `convertLead` à côté de ces services. Un appel qui ignore `db` et utilise le client global engage les lignes hors transaction : un rollback du lead les laisserait en place.

Corps :

```json
{
  "createOpportunity": true,
  "accountName": "Analytical Engines",
  "opportunity": {
    "name": "Analytical Engines — first deal",
    "amount": "1200.50",
    "closeDate": "2026-12-31",
    "stage": "Qualification"
  }
}
```

| Champ | Règle DESIGNED |
| --- | --- |
| `createOpportunity` | Booléen. Défaut `false`. `false` : aucun enregistrement Opportunity, `opportunityId` null. |
| `accountName` | Optionnel. Sinon `lead.company`. Vide après trim : `Complete this field.` sur `accountName`. |
| `opportunity` | Ignoré si `createOpportunity` est faux. Obligatoire sinon. |
| `opportunity.name` | Optionnel. Sinon `"{company} — Opportunity"`. |
| `opportunity.amount` | Optionnel. Même règle décimale que l'opportunité. |
| `opportunity.closeDate` | Obligatoire si une opportunité est créée. |
| `opportunity.stage` | Optionnel. Défaut `Qualification`. Valeur hors enum, ou `ClosedWon` / `ClosedLost` : 400 sur `opportunity.stage`. |

La conversion est refusée avant toute écriture si :

- le lead n'existe pas : 404 `Lead not found` ;
- l'utilisateur n'est ni propriétaire ni admin : 403 `You can only edit leads you own.` ;
- `qualified` est faux ou le statut n'est pas `New` ou `Working` : 400 `fieldErrors.qualified = "Qualify the lead before converting it."` ;
- le corps est invalide : 400, sans écriture.

Transaction, dans cet ordre, une seule `prisma.$transaction` interactive :

1. `UPDATE "Lead" SET "status" = 'Converted', "convertedAt" = now(), "lastModifiedById" = :user WHERE "id" = :id AND "convertedAt" IS NULL AND "qualified" = true AND "status" IN ('New', 'Working')`.
2. Zéro ligne : rollback. Relire le lead. S'il est absent, 404. Si `convertedAt` est posé, 409 et **aucune** création. Sinon 400 (qualification ou statut), **aucune** création.
3. Une ligne : avec le même client, `createAccount` (`name`, `ownerId` = propriétaire du lead, `createdById` = utilisateur courant), puis `createContact` (`firstName`, `lastName`, `email`, `phone`, `title`, `description` copiés du lead, `accountId` du compte créé, même propriétaire et même `createdById`), puis `createOpportunity` si demandée (`accountId`, `primaryContactId` = contact créé, `ownerId` du lead).
4. `UPDATE` du lead avec `convertedAccountId`, `convertedContactId`, `convertedOpportunityId`.
5. Commit.

Un échec à l'étape 3 ou 4 annule aussi la prise de l'étape 1. Deux requêtes concurrentes : une seule passe l'étape 1. L'autre reçoit 409 et ne laisse ni compte, ni contact, ni opportunité.

Réponse 201 :

```json
{
  "leadId": "…",
  "accountId": "…",
  "contactId": "…",
  "opportunityId": "…",
  "convertedAt": "2026-10-14T18:00:00.000Z"
}
```

`opportunityId` est `null` quand `createOpportunity` est faux.

Réponse 409, seconde conversion ou PATCH d'un lead converti. Le corps de la seconde requête est ignoré. Les compteurs Account, Contact et Opportunity ne bougent pas.

```json
{
  "error": "This lead is already converted.",
  "conversion": {
    "accountId": "…",
    "contactId": "…",
    "opportunityId": null,
    "convertedAt": "2026-10-14T18:00:00.000Z"
  }
}
```

La conversion ne rapproche pas d'un compte existant. Le rapprochement Salesforce est inconnu (§11). Chaque conversion réussie crée un compte et un contact neufs.

### 4.3 Opportunities

| Méthode | Chemin | Corps requête | Succès |
| --- | --- | --- | --- |
| GET | `/api/opportunities` | Query liste, plus `display=table` (défaut) ou `display=kanban` | 200, liste. En kanban, le corps ajoute `columns` (§7). |
| POST | `/api/opportunities` | JSON ci-dessous | 201, DTO |
| GET | `/api/opportunities/:id` | | 200, DTO + `account` + `primaryContact` + `canEdit`. Enregistre la consultation. |
| PATCH | `/api/opportunities/:id` | JSON partiel fusionné | 200, DTO |

```json
{
  "name": "Northwind — Renewal FY27",
  "stageName": "Negotiation",
  "amount": "240000.00",
  "closeDate": "2026-11-13",
  "probability": 60,
  "accountId": "…",
  "primaryContactId": null,
  "ownerId": null
}
```

Tri par défaut : `closeDate` asc. Recherche **DESIGNED** : `name`.

`account` dans le DTO : `{ "id", "name" }`. `primaryContact` : `{ "id", "firstName", "lastName" }` ou `null`.

Server actions : `src/app/opportunities/actions.ts`, `createOpportunityAction`, `updateOpportunityAction`. Pages : `/opportunities`, `/opportunities/new`, `/opportunities/:id`, `/opportunities/:id/edit`. La fiche montre le compte et le contact principal. Le workstream Opportunities ajoute le lien `/opportunities/:id` sur la ligne déjà rendue dans l'onglet Related du compte, et seulement ce lien.

Domaine : `src/lib/opportunities/`.

### 4.4 Tasks

| Méthode | Chemin | Corps requête | Succès |
| --- | --- | --- | --- |
| GET | `/api/tasks?parentType=Account&parentId=:id` | `parentType` ∈ `Account`, `Contact`, `Lead`, `Opportunity` | 200, `{ "open": [], "history": [] }` |
| POST | `/api/tasks` | JSON ci-dessous | 201, DTO |
| GET | `/api/tasks/:id` | | 200, DTO + `canEdit` |
| PATCH | `/api/tasks/:id` | JSON partiel. Le parent n'est pas modifiable. | 200, DTO |

`parentType` ou `parentId` absent ou incohérent : 400 `{ "error": "A parent record is required." }`. Parent inconnu : 404 `{ "error": "Record not found" }`.

```json
{
  "subject": "Call the buyer",
  "description": null,
  "status": "NotStarted",
  "priority": "High",
  "dueDate": "2026-10-20",
  "assigneeId": null,
  "ownerId": null,
  "parent": { "type": "Account", "id": "…" }
}
```

`open` contient les statuts autres que `Completed`, tri `dueDate` asc puis `id`. `history` contient `Completed`, tri `completedAt` desc. Le DTO inclut `parent: { "type", "id" }` et `assignee` au même gabarit que `owner`.

Clôture : `PATCH` avec `"status": "Completed"`. Rouvrir : un autre statut, ce qui efface `completedAt`.

Server actions : `src/app/activities/actions.ts`, `createTaskAction`, `updateTaskAction`. Pas de page d'accueil des tâches. Le composant `src/components/activities/related-tasks.tsx` est inséré sur les fiches Account, Contact, Lead et Opportunity par le workstream Activities, après que la fiche parente existe sur la branche d'intégration.

Domaine : `src/lib/activities/`.

### 4.5 Dashboard

| Méthode | Chemin | Succès |
| --- | --- | --- |
| GET | `/api/dashboard` | 200, objet §7.2 |

Pas de filtre, pas d'écriture. Page `/dashboard`. L'accueil `/` et `LabNote` restent en place.

Domaine : `src/lib/dashboard/service.ts`. Les chiffres viennent des requêtes du §7.2. Le service n'additionne pas les lignes en JavaScript.

## 5. Validation et erreurs

Réutiliser les classes existantes. Ne pas en déclarer de nouvelles avec le même nom.

| Situation | Classe | HTTP | Corps |
| --- | --- | --- | --- |
| Champ requis vide, ou règle de champ | `ValidationError` | 400 | `{ "error": "Validation failed", "fieldErrors": { "lastName": "Complete this field." } }` |
| JSON illisible | `SyntaxError` | 400 | `{ "error": "Invalid JSON body" }` |
| Filtre ou opérateur illégal | `FilterError` | 400 | `{ "error": "<message>" }` |
| Lecteur qui modifie un enregistrement dont il n'est pas propriétaire | `AuthorizationError` | 403 | `{ "error": "You can only edit contacts you own." }` (ou `leads`, `opportunities`, `tasks`) |
| Id inconnu | `NotFoundError` ou le 404 déjà écrit dans la route Account | 404 | `{ "error": "Contact not found" }` (ou `Lead not found`, `Opportunity not found`, `Task not found`, `Record not found`) |
| Lead déjà converti | `ConflictError` | 409 | Corps du §4.2.1 |
| Autre exception | | 500 | `{ "error": "Internal server error" }` |

Le message requis est exactement `Complete this field.`, constante `REQUIRED_MESSAGE`.

État de formulaire, identique à `AccountFormState` :

```json
{ "ok": false, "error": "Review the errors on this page.", "fieldErrors": { "lastName": "Complete this field." }, "values": {} }
```

Autorisation ou introuvable dans une action : `{ "ok": false, "error": "<message de l'exception>", "values": {} }`. `ConflictError` suit le même chemin, avec le message `This lead is already converted.`

`canEditRecord(user, record)` est vrai si `user.role === "ADMIN"` ou si `record.ownerId === user.id`. La lecture de toutes les listes et de toutes les fiches est accordée à tout utilisateur résolu, y compris le repli administrateur. La création est accordée à tout utilisateur résolu. Ces deux phrases sont **DESIGNED**, alignées sur `canEditAccount` et sur le commentaire de `src/lib/auth/policies.ts`.

## 6. Autorisation de démonstration

**DESIGNED.** Ce n'est pas le modèle de droits Salesforce (un seul profil a été vu pendant l'exploration Accounts).

- Cookie `crm-lab-user` et en-tête `x-crm-lab-user` sont des sélecteurs de démo. Les documenter comme une session, un jeton ou un contrôle d'accès de production est une erreur de contrat.
- Un identifiant inconnu retombe sur le premier administrateur (`resolveUser`). Les tests d'autorisation envoient un alias seedé réel (`demoadm`, `demostd`), pas une valeur au hasard.
- Lecture : tous les objets de ce MVP, pour tout utilisateur résolu.
- Création : tout utilisateur résolu. Il devient propriétaire, `createdBy` et, pour une tâche, attributaire, sauf précision contraire dans le corps.
- Modification : propriétaire ou `ADMIN`.
- Changement de `ownerId` vers un autre utilisateur : `ADMIN` seulement, message `Only an administrator can assign another owner.`
- Conversion : même critère que la modification du lead.
- Les vues `ListView` Account gardent leurs règles actuelles. Les nouveaux modules n'ont pas de vues à partager.

L'étiquette « démonstration locale » reste tant que cette identité n'a pas été remplacée. Ce remplacement est le sujet du module G dans `requirements.md`. Il est hors des trois workstreams de ce contrat.

## 7. Pipeline Kanban et dashboard

### 7.1 Kanban des opportunités

`display=kanban` sur `/opportunities` et sur `GET /api/opportunities`. Le regroupement est fixe : `stageName`. Pas d'écran Kanban Settings. L'ordre des colonnes est celui de l'enum, y compris les colonnes vides.

Chaque colonne :

```json
{
  "stage": "Qualification",
  "label": "Qualification",
  "count": 1,
  "amount": "60000.00",
  "items": []
}
```

`count` et `amount` sont le résultat SQL de **toutes** les opportunités du filtre de liste (recherche, scope, filtres), pas la somme des cartes de la page. `items` est la page d'enregistrements (`pageSize` 200 en kanban, comme Accounts). La somme SQL est `COALESCE(SUM("amount"), 0)::text`. Le service normalise cette chaîne avec `new Prisma.Decimal(text).toFixed(2)`. Une opportunité sans montant compte dans `count` et n'ajoute rien à la somme. Le JSON porte toujours deux décimales (`0.00`, `240000.00`).

Requête de référence (le `WHERE` de liste s'ajoute aux deux côtés) :

```sql
SELECT s.stage::text AS stage,
       COALESCE(agg.count, 0)::int AS count,
       COALESCE(agg.amount, 0)::text AS amount
FROM unnest(ARRAY['Qualification','Proposal','Negotiation','ClosedWon','ClosedLost']::"OpportunityStage"[]) AS s(stage)
LEFT JOIN (
  SELECT "stageName" AS stage, COUNT(*) AS count, SUM("amount") AS amount
  FROM "Opportunity"
  GROUP BY "stageName"
) agg ON agg.stage = s.stage;
```

`::text` sur la somme est obligatoire pour que le driver ne renvoie pas un nombre flottant. Le service vérifie que la valeur reçue est une chaîne.

Les étapes `ClosedWon` et `ClosedLost` restent visibles sur le tableau. Elles sont exclues de `pipelineAmount`.

### 7.2 Dashboard

`GET /api/dashboard` et la page `/dashboard` lisent une seule fois les agrégats suivants. Aucune constante métier, aucun décompte de tableau en mémoire.

```sql
SELECT COUNT(*)::int FROM "Account";
SELECT COUNT(*)::int FROM "Contact";
SELECT COUNT(*)::int FROM "Lead";

SELECT s.stage::text AS stage,
       COALESCE(agg.count, 0)::int AS count,
       COALESCE(agg.amount, 0)::text AS amount
FROM unnest(ARRAY['Qualification','Proposal','Negotiation','ClosedWon','ClosedLost']::"OpportunityStage"[]) AS s(stage)
LEFT JOIN (
  SELECT "stageName" AS stage, COUNT(*) AS count, SUM("amount") AS amount
  FROM "Opportunity"
  GROUP BY "stageName"
) agg ON agg.stage = s.stage;

SELECT COALESCE(SUM("amount"), 0)::text
FROM "Opportunity"
WHERE "stageName" IN ('Qualification', 'Proposal', 'Negotiation');

SELECT COUNT(*)::int
FROM "Task"
WHERE "dueDate" < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
  AND "status" <> 'Completed';
```

Une tâche due aujourd'hui n'est pas en retard. Une tâche sans `dueDate` n'est pas en retard. `Deferred` n'existe pas : tout statut autre que `Completed` reste ouvert.

Réponse :

```json
{
  "accounts": 0,
  "contacts": 0,
  "leads": 0,
  "opportunitiesByStage": [
    { "stage": "Qualification", "count": 0, "amount": "0.00" },
    { "stage": "Proposal", "count": 0, "amount": "0.00" },
    { "stage": "Negotiation", "count": 0, "amount": "0.00" },
    { "stage": "ClosedWon", "count": 0, "amount": "0.00" },
    { "stage": "ClosedLost", "count": 0, "amount": "0.00" }
  ],
  "pipelineAmount": "0.00",
  "overdueTasks": 0
}
```

Les zéros viennent du `COALESCE` SQL et du `unnest` des cinq étapes. `pipelineAmount` et chaque `amount` sont des chaînes produites par `Prisma.Decimal(text).toFixed(2)`. Le client les affiche. Il ne les recalcule pas.

Le total de pipeline du dashboard ignore les filtres de la liste Opportunities. Le total d'une colonne Kanban les respecte. Ce sont deux requêtes.

## 8. Ordre et trois workstreams

```text
propriétaire du schéma
  migration 20261014200000_mvp_crm_modules
  + canEditRecord, ConflictError, recordRecentView, seed
        |
        +---> Workstream 1  Contacts
        |
        +---> Workstream 2  Opportunities et Kanban
        |
        +---> Workstream 3  Leads (CRUD)
                  |
                  +---> conversion, seulement après createAccount et createContact
                  |
                  +---> Activities, seulement après les fiches parentes présentes
                  |
                  +---> Dashboard
```

Trois workstreams de code au plus, après la fusion de la migration. Pas d'un quatrième flux « schéma » pendant qu'ils tournent, et pas d'un flux Activities séparé.

| Flux | Livrable | Dépend de |
| --- | --- | --- |
| 1 | `src/lib/contacts/`, `/api/contacts`, `/contacts`, lien sur la ligne Contact du compte | Migration fusionnée |
| 2 | `src/lib/opportunities/`, `/api/opportunities`, `/opportunities`, Kanban, lien sur la ligne Opportunity du compte | Migration fusionnée. `primaryContactId` est optionnel : le flux 2 n'attend pas le flux 1. Le lookup contact appelle `/api/contacts/lookup` dès qu'il existe. |
| 3a | CRUD Lead, sans conversion | Migration fusionnée, en parallèle de 1 et 2 |
| 3b | `POST /api/leads/:id/convert` | `createAccount` et `createContact` acceptent le client de transaction sur la branche. Pas de copie de leur persistance. |
| 3c | Tâches, listes Open / History, insertion de `RelatedTasks` | Fiche parente déjà sur la branche. La fiche Account existe. Les fiches Contact, Opportunity et Lead sont celles des flux 1, 2 et 3a. |
| 3d | `src/lib/dashboard/`, `/api/dashboard`, `/dashboard` | Comptes, contacts, leads, opportunités et tâches persistables. |

Fichiers partagés, pour limiter les collisions :

- `src/components/shell/nav-links.tsx` : chaque flux active ou ajoute uniquement son entrée (`/contacts`, `/opportunities`, `/leads`, `/dashboard`). Pas de seconde coque. Les tâches n'ont pas d'entrée de navigation.
- `account-details.tsx` : le flux 1 pose le lien Contact, le flux 2 le lien Opportunity, le flux 3c le bloc tâches. Chacun rebase sur la branche d'intégration avant d'éditer ce fichier.
- `src/lib/http.ts`, `policies.ts`, `schema.prisma`, `seed.ts`, `recent/service.ts` : propriétaire du schéma, une fois.

Chaque flux ajoute ses tests en réutilisant `tests/test-database.ts`. Il ne pointe pas une suite d'écriture vers `crm_lab`.

## 9. À réutiliser, sans seconde copie

| Déjà en place | Usage |
| --- | --- |
| `useListUrl` | Seul helper d'URL de liste. Import depuis `@/components/accounts/use-list-url`. Pas de déplacement dans ces workstreams. |
| `FILTER_OPERATORS`, `normalizeFilters`, `parseFilterLogic`, `FilterError`, `operatorsForField` | Seul catalogue d'opérateurs. Chaque module écrit son compilateur de `where`. `filtersToWhere` Account reste celui des comptes. |
| `ValidationError`, `REQUIRED_MESSAGE`, `AuthorizationError`, `NotFoundError`, `errorResponse`, `readJson` | Seules formes d'erreur. |
| `canEditRecord` / `resolveUser` / `getCurrentUser` / `getRequestUser` | Seule identité et seule politique de modification. |
| `COUNTRY_OPTIONS` et la résolution pays → état | Adresse postale du contact. |
| `GET /api/accounts/lookup` | Lookup Account Name du contact et choix du compte d'opportunité. |
| `createAccount`, `createContact`, `createOpportunity` | Seuls chemins d'insertion utilisés par la conversion. Chacun accepte le client de transaction. |
| `recordRecentView` | Seul écriture dans `RecentlyViewed`. |
| Coque `src/components/shell/` | On active des liens. On n'ajoute pas de layout. |
| `buttonClasses`, `ToastFromQuery`, `parseToast` | Formulaires et retours. |
| Garde `TEST_DATABASE_URL` | Toutes les suites qui écrivent. |

Le formatage monétaire des opportunités affiche la chaîne décimale. Il ne passe pas par un `number` intermédiaire. Le formateur Account (`format.ts`) peut être appelé pour une devise entière ; il n'est pas recopié ni étendu pour arrondir un montant à échelle 2 via `Number`.

## 10. Emplacements

| Objet | Domaine | Routes | Pages | Actions |
| --- | --- | --- | --- | --- |
| Contacts | `src/lib/contacts/` | `src/app/api/contacts/` | `src/app/contacts/` | `src/app/contacts/actions.ts` |
| Leads | `src/lib/leads/` | `src/app/api/leads/` | `src/app/leads/` | `src/app/leads/actions.ts` |
| Opportunities | `src/lib/opportunities/` | `src/app/api/opportunities/` | `src/app/opportunities/` | `src/app/opportunities/actions.ts` |
| Tasks | `src/lib/activities/` | `src/app/api/tasks/` | composant seul | `src/app/activities/actions.ts` |
| Dashboard | `src/lib/dashboard/service.ts` | `src/app/api/dashboard/route.ts` | `src/app/dashboard/page.tsx` | aucune |
| Consultations | `src/lib/recent/service.ts` | aucune | aucune | aucune |

## 11. Inconnues laissées à l'analyste REA

L'implémentation utilise les jeux **DESIGNED** de ce document. Elle n'attend pas une nouvelle capture pour démarrer. Un changement de picklist observée plus tard est une décision de schéma du propriétaire unique, pas une migration ajoutée par un workstream.

1. Valeurs du combobox Salutation (INT-5, contrôle replié). Jeu actuel : `Mr`, `Ms`, `Dr`, `Mx`.
2. « Account Name » sur New Contact : la fiche et l'exigence MVP le disent optionnel ; l'arbre d'accessibilité porte `required=true` alors que `invalid` reste `false` à vide. Le schéma garde `accountId` nullable. La validation le laisse optionnel. Si le REA conclut qu'il est obligatoire, seule la validation change.
3. Dépendance Mailing Country → Mailing State/Province : les deux combobox sont présents, l'interaction n'a pas été jouée. Les codes pays/états du contact ne sont pas une liste observée.
4. Longueurs, masque téléphonique et format e-mail du contact. Aucun n'a été mesuré. Pas de règle de doublon observée sur Contact.
5. Propriétaire, audit et Reports To hors du même compte : absents de la capture fonctionnelle. Le cycle « Reports To » est une règle copiée des comptes.
6. Objet Lead entier : statuts, qualification, champs requis, rapprochement de compte existant, opportunité obligatoire ou non. Le produit exige une opportunité facultative et une transaction atomique ; le reste du §3.3 est **DESIGNED**.
7. Étapes d'opportunité et probabilités. `Qualification`, `Proposal`, `Negotiation` sont les valeurs du seed, pas une picklist lue dans l'org. Aucun chemin d'étape n'a été observé : le contrat autorise toutes les transitions.
8. Formulaire de tâche, valeurs de priorité et de statut, possibilité Salesforce de lier à la fois un WhoId et un WhatId. Ici, exactement un parent, jeu **DESIGNED**.
9. Critère réel qui sépare Open Activities et Activity History. Le contrat coupe sur `status = Completed`.
10. Colonnes, filtres et vues de liste Contacts, Leads, Opportunities : non capturés. Les listes MVP sont des listes simples à état dans l'URL, sans `ListView`.
11. Droits réels (profil standard, partage, OWD). La politique propriétaire ou admin reste celle de la démo.

## 12. Décisions qui bloquent un workstream

Ces points arrêtés empêchent de coder en parallèle tant qu'ils ne sont pas respectés. Les picklists **DESIGNED** ne bloquent pas : elles sont le jeu à implémenter.

1. **Une migration, un propriétaire.** Tant que `20261014200000_mvp_crm_modules` n'est pas sur la branche d'intégration, aucun workstream n'ajoute de modèle, de colonne ou de migration. Une seconde migration est un blocage de revue.
2. **Clé Recently Viewed des comptes.** `@@unique([userId, accountId])` et l'upsert `userId_accountId` restent. Rendre `accountId` obligatoire pour les quatre objets, ou fusionner les cibles dans `recordId` en supprimant cette clé, casse la vue Recent et le seed Account.
3. **Enum d'étape sans valeur inconnue.** La migration s'arrête si un `stageName` hors enum existe. Le propriétaire ne mappe pas silencieusement.
4. **Conversion après les services Account et Contact, sur le même client SQL.** `convertLead` n'est pas livrable avant `createAccount(input, user, db)` et `createContact(input, user, db)`. Le propriétaire du schéma ajoute l'argument `db` à `createAccount` et à `recordRecentView`. Les workstreams 1 et 2 exposent le même argument dès la première version de `createContact` et `createOpportunity`. Un insert écrit à côté de ces fonctions, ou un appel qui ignore `db`, laisse des comptes orphelins quand la transaction du lead annule la prise.
5. **409 avant les créations.** La prise (`convertedAt IS NULL`) précède les inserts dans la même transaction. Une implémentation qui crée le compte puis détecte le doublon laisse des orphelins et ne respecte pas le parcours 2.
6. **Montants.** Un `amount` transporté en nombre JSON ou sommé avec `Number` / `BigInt` ne satisfait pas le module D ni le dashboard. Ce n'est pas un blocage de démarrage ; c'est un critère de rejet de la revue Opportunities et Dashboard.
