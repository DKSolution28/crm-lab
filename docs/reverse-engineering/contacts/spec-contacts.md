# Spécification fonctionnelle — module Contacts

Passe du 2026-10-14, limitée aux preuves déjà dans le dépôt. Source principale : écran **INT-5** (`/lightning/o/Contact/new`), fiche `docs/reverse-engineering/accounts/03-fiches-ecrans-accounts.md`, capture et résumé REA `docs/reverse-engineering/accounts/evidence/2026-10-14-INT-5.*`. Contexte produit : `docs/mvp/requirements.md` module B. Modèle actuel : `prisma/schema.prisma` modèle `Contact`.

Chaque ligne porte un niveau **OBSERVED**, **INFERRED** ou **DESIGNED**. Le détail des preuves est dans `evidence-index.md`.

## 1. Périmètre observé

| Comportement | Niveau |
| --- | --- |
| Route ouverte : `/lightning/o/Contact/new`. Le titre de l'onglet est « New Contact \| Salesforce ». | OBSERVED |
| Paramètres d'URL retenus : `count=1`, `nooverride=1`, `useRecordTypeCheck=1`, `navigationLocation=LIST_VIEW`, `backgroundContext` = liste `/lightning/o/Contact/list?filterName=AllContacts`. Le paramètre `uid` n'est pas recopié. | OBSERVED |
| L'écran est une boîte de dialogue modale « New Contact » (rôle dialog, focusable, modale), titre de niveau 2. | OBSERVED |
| La liste en arrière-plan est la vue **All Contacts**. Après Cancel, elle reste « 0 items ». | OBSERVED |
| Aucun enregistrement Contact n'a été créé. Cancel a été utilisé. Save, Save & New, Delete, Change Owner, Submit, Merge et Next n'ont pas été actionnés. | OBSERVED |
| `useRecordTypeCheck=1` est présent dans l'URL. Aucun sélecteur de type d'enregistrement n'est dans l'arbre d'accessibilité. L'existence de record types Contact est inconnue. Le « 0 record type » d'Account ne s'applique pas à Contact. | OBSERVED pour le paramètre et l'absence de sélecteur ; inconnu pour les record types |

## 2. Navigation

| Comportement | Niveau |
| --- | --- |
| Dans l'application Lightning observée, **Contacts** est un lien de la navigation verticale (NAV-0 et les autres écrans du 2026-10-14), au même titre que Home et Accounts. | OBSERVED |
| La recherche globale, ouverte depuis Accounts, propose la vue « All Contacts » parmi les suggestions (NAV-3a, option « All Contacts Contacts List »). La liste Contacts elle-même n'a pas été ouverte sans la modale New Contact. | OBSERVED |
| L'accueil Lightning propose un sélecteur « Select a Contacts report... » et un lien « View Report: My Contacts » (NAV-0). Le contenu de ces rapports n'a pas été ouvert. | OBSERVED pour la présence des contrôles ; inconnu pour le contenu |
| CRM Lab affiche Contacts dans la navigation (`src/components/shell/nav-links.tsx`) avec `enabled: false` : élément non cliquable, `aria-disabled`, titre « Module à venir ». Il n'existe pas de route `src/app/contacts/`. | OBSERVED (code du dépôt) |
| Écart : Salesforce expose Contacts comme un onglet actif ; CRM Lab le marque désactivé. Rendre l'entrée active fait partie du module B, pas de l'observation de la fiche. | DESIGNED pour l'activation future ; OBSERVED pour l'écart |

## 3. Formulaire New Contact

### 3.1 Chrome du formulaire

| Contrôle | Détail | Niveau |
| --- | --- | --- |
| Légende | « \* = Required Information » visible en haut à droite de la modale. | OBSERVED |
| Sections nommées | Titres « About » et « Get in Touch » (niveau 3) dans l'arbre d'accessibilité. | OBSERVED |
| About, partie visible | Salutation, First Name, Last Name, Account Name, Title, Reports To. | OBSERVED |
| Champs sous la ligne de flottaison | Description, Phone, Email, Mailing Street, Mailing City, Mailing Zip/Postal Code, Mailing Country, Mailing State/Province sont dans l'arbre d'accessibilité. La capture ne les montre pas dans la zone visible. Leur rattachement à About ou à Get in Touch n'est pas établi. | OBSERVED pour l'existence ; inconnu pour la section |
| Boutons | Cancel, Save & New, Save, et « Cancel and close » (croix). Tous focusables. | OBSERVED |
| Effet de Save et de Save & New | Non déclenché. Le libellé est observé ; la persistance, la redirection et l'enchaînement « enregistrer puis rouvrir » sont inconnus. | OBSERVED pour la présence ; inconnu pour l'effet |
| Cancel | Ferme le formulaire. All Contacts reste « 0 items ». | OBSERVED |

### 3.2 Champs

Les drapeaux `required`, `invalid`, `multiline` viennent de l'arbre d'accessibilité INT-5. Les libellés de placeholder viennent de la lecture de la capture.

| Libellé | Contrôle observé | Requis (a11y) | Autre état observé | Niveau |
| --- | --- | --- | --- | --- |
| Name | Groupe accessible nommé « Name required ». L'astérisque du groupe est visible. | Le groupe porte ce nom ; le composant requis est Last Name. | — | OBSERVED |
| Salutation | Combobox, popup listbox, non étendu. Valeur affichée « --None-- ». | non | required=false, invalid=false | OBSERVED pour le contrôle et « --None-- » ; **valeurs de picklist inconnues** |
| First Name | Zone de texte une ligne. | non | required=false, invalid=false | OBSERVED |
| Last Name | Zone de texte une ligne. Astérisque visible. | oui | required=true, invalid=true alors que le champ est vide. Message visible : « Complete this field. » | OBSERVED |
| Account Name | Combobox lookup, saisie libre, autocomplete list, popup listbox, placeholder « Search Accounts... ». Astérisque visible. | oui dans l'arbre (`required: true`) | invalid=false, liste non ouverte | OBSERVED pour le contrôle et le marqueur ; **règle à l'enregistrement inconnue** (voir § 3.3) |
| Reports To | Combobox lookup, autocomplete list, popup listbox, placeholder « Search Contacts... ». | non | required=false, invalid=false, liste non ouverte | OBSERVED |
| Title | Zone de texte une ligne. | non | required=false | OBSERVED |
| Description | Zone de texte multiligne. | non | required=false | OBSERVED |
| Phone | Zone de texte une ligne. | non | required=false. Aucun format imposé observé. | OBSERVED |
| Email | Zone de texte une ligne. | non | required=false. Aucune validation de format observée. | OBSERVED |
| Mailing Address | Groupe accessible « Mailing Address ». | non | invalid=false | OBSERVED |
| Mailing Street | Zone de texte multiligne. | non | required=false | OBSERVED |
| Mailing City | Zone de texte une ligne. | non | required=false | OBSERVED |
| Mailing Zip/Postal Code | Zone de texte une ligne. | non | required=false | OBSERVED |
| Mailing Country | Combobox, saisie libre, autocomplete list, popup listbox. | non | liste non ouverte | OBSERVED pour le contrôle ; **valeurs inconnues** |
| Mailing State/Province | Combobox, saisie libre, autocomplete list, popup listbox. | non | liste non ouverte | OBSERVED pour le contrôle ; **dépendance pays/état inconnue** |

Aucun champ Contact Owner, Created By ou Last Modified By n'apparaît dans l'arbre du formulaire New Contact.

### 3.3 Account Name : marqueur requis et textes antérieurs

| Fait | Niveau |
| --- | --- |
| La capture montre un astérisque sur Account Name. L'accessibilité dit `required: true`. | OBSERVED |
| La fiche INT-5 et `spec-accounts.md` (relation Contact → Account) écrivent que le lookup n'est pas obligatoire sur ce layout. Le module B des exigences demande une association optionnelle. | OBSERVED comme textes du dépôt |
| Ces textes et le marqueur de la capture ne disent pas la même chose. Cette spécification garde le marqueur comme fait observé. | OBSERVED |
| Save n'a pas été utilisé. On ne sait pas si l'enregistrement sans compte est refusé, ni quel message apparaîtrait. | Inconnu |
| Traiter l'association comme optionnelle dans CRM Lab reprend le module B. C'est un choix de produit, distinct du marqueur observé. | DESIGNED |
| Les implémenteurs n'imposent pas une règle de sauvegarde sur Account Name tant que la divergence n'est pas tranchée. Ils peuvent afficher le lookup. | DESIGNED (consigne de cette spec) |

### 3.4 Ce qui n'a pas été exercé

| Sujet | Niveau |
| --- | --- |
| Ouverture des listes Salutation, Account Name, Reports To, Mailing Country, Mailing State/Province. | Inconnu |
| Dépendance State/Province selon Country. La dépendance Billing/Shipping d'Account (`spec-accounts.md`) ne vaut pas pour Mailing Address. | Inconnu |
| Règles de validation Contact, règles de doublon, formats e-mail et téléphone, longueur maximale. | Inconnu |
| Filtre du lookup Reports To (même compte, tout contact, exclusion de soi-même). | Inconnu |
| Contact Owner sur la création, valeur par défaut, partage. | Inconnu |

## 4. Relations

| Relation | Ce qui est prouvé | Niveau |
| --- | --- | --- |
| Contact → Account (Account Name) | Un seul combobox. Au plus un compte. Le marqueur requis est observé ; l'obligation à l'enregistrement ne l'est pas. | OBSERVED pour « au plus un » et pour le marqueur |
| Contact → Contact (Reports To) | Un seul combobox dont le placeholder est « Search Contacts... ». La fiche INT-5 le nomme lookup Contact. | OBSERVED pour le contrôle et la cible Contact ; **INFERRED** pour la cardinalité 0..1 (un champ, pas une liste) |
| Reports To et le compte | Aucune contrainte croisée observée. | Inconnu |
| Account → Contacts (liste associée) | Le layout Account prévoit une liste associée Contacts (`spec-accounts.md`, métadonnées SET-1). Aucune ligne n'a été vue : 0 contact dans l'org. | OBSERVED comme métadonnée Account ; contenu et colonnes Salesforce inconnus |
| Fiche Contact → compte | Le module B demande que le compte apparaisse sur la fiche Contact. La fiche Contact n'a pas été ouverte. | DESIGNED |
| Fiche Account → contacts dans CRM Lab | La page compte CRM Lab liste déjà les contacts liés (Name, Title, Email) ou l'état vide « No contacts are linked to this account yet. » Colonnes choisies dans le code, pas observées dans Salesforce. | DESIGNED |

## 5. Liste, fiche, filtres

| Sujet | État | Niveau |
| --- | --- | --- |
| Nom de vue All Contacts / `filterName=AllContacts` | Présent dans l'URL d'arrière-plan et dans les suggestions de recherche. | OBSERVED |
| Comptage | « 0 items » après ouverture et après Cancel. | OBSERVED |
| Colonnes, tri, résumé « Sorted by », recherche dans la liste, sélecteur de vues, modes Table / Kanban / Split View | La modale couvrait la liste. L'org n'avait aucun contact. Inventaire non établi. | Inconnu |
| Autres vues (Recently Viewed, My Contacts, etc.) | Non ouvertes. « My Contacts » vu seulement comme libellé de rapport sur l'accueil. | Inconnu |
| Filtres de liste Contact | Non ouverts. | Inconnu |
| Page d'enregistrement `/lightning/r/Contact/<id>/view`, onglets, bandeau (highlights), actions Edit / Delete / Change Owner | Aucun enregistrement. | Inconnu |
| Historique de consultation par utilisateur | Demandé par le module B. Le modèle `RecentlyViewed` actuel ne porte que des Accounts. Aucune liste Recent Contacts n'a été ouverte. | DESIGNED pour l'exigence ; inconnu côté Salesforce |

## 6. Modèle CRM Lab actuel

Modèle `Contact` lu dans `prisma/schema.prisma` (non modifié) :

| Champ Prisma | Correspondance observée | Niveau de l'écart |
| --- | --- | --- |
| `lastName` String obligatoire | Last Name requis | OBSERVED, aligné |
| `firstName` String? | First Name facultatif | OBSERVED, aligné |
| `email` String? | Email facultatif, format non observé | OBSERVED pour le caractère facultatif |
| `phone` String? | Phone facultatif, format non observé | OBSERVED pour le caractère facultatif |
| `title` String? | Title facultatif | OBSERVED, aligné |
| `accountId` String? (onDelete SetNull) | Lookup Account Name présent. Le schéma le laisse nul. Le layout observé porte un astérisque. | DESIGNED côté schéma ; marqueur OBSERVED côté Salesforce |
| `ownerId` String obligatoire vers User | Aucun champ Owner sur New Contact. | Inconnu côté formulaire ; DESIGNED dans le schéma |
| `id`, `createdAt`, `updatedAt` | Non montrés sur New Contact. | DESIGNED |
| Absents : Salutation, Reports To, Description, Mailing Street / City / State / Postal Code / Country | Présents sur le formulaire observé. | OBSERVED comme écart de modèle |

Le module B demande de documenter cet écart avant d'exiger les champs. Étendre le schéma est un travail ultérieur, hors de ce dossier.

## 7. Ce que les implémenteurs peuvent construire maintenant

Uniquement à partir de l'OBSERVED, plus les choix DESIGNED déjà écrits au module B et signalés comme tels.

| Peut démarrer | Garde-fou |
| --- | --- |
| Activer l'entrée Contacts de la navigation CRM Lab et une route dédiée. L'onglet Salesforce est actif ; l'entrée CRM Lab est désactivée. | DESIGNED pour le produit. Ne pas copier l'URL Lightning. |
| Formulaire de création en modale, titres New Contact, About, Get in Touch, boutons Cancel, Save, Save & New. | L'effet Salesforce de Save / Save & New est inconnu. Le comportement d'enregistrement CRM Lab reste un choix DESIGNED (persistance locale), à spécifier dans le module, pas à déduire d'un clic non fait. |
| Champs observés : Salutation (combobox sans valeurs), First Name, Last Name, Account Name (lookup), Reports To (lookup Contact), Title, Description, Phone, Email, adresse postale (rue, ville, code, pays, état). | Ne pas inventer les valeurs de Salutation, de pays ou d'état. Une liste vide ou un contrôle désactivé en attendant l'observation est le seul rendu fidèle. |
| Last Name obligatoire, avec refus du vide. Le message observé est « Complete this field. » | OBSERVED. |
| First Name, Title, Description, Phone, Email et les composantes d'adresse facultatifs sur ce layout. | OBSERVED. Pas de regex e-mail ou téléphone. |
| Lookup Account vers un Account existant, au plus un. Lookup Reports To vers un Contact, au plus un. | OBSERVED pour les contrôles. Contraintes de filtre : inconnues, donc non implémentées. |
| Afficher le contact lié sur la fiche Account. CRM Lab a déjà une liste Name / Title / Email. | Les colonnes Salesforce de la liste associée sont inconnues. Garder les colonnes actuelles est DESIGNED. |
| Laisser `accountId` nullable tant que la divergence du § 3.3 n'est pas tranchée, et l'écrire dans la doc d'implémentation. | Le marqueur requis est observé. L'optionnalité est DESIGNED (module B). |

## 8. Ce qui doit attendre une observation

| Sujet | Pourquoi |
| --- | --- |
| Page d'enregistrement, bandeau, onglets, actions de ligne | 0 contact. Aucune fiche ouverte. |
| Colonnes, tri, vues de liste, recherche dans la liste, filtres, opérateurs | Liste vide et couverte par la modale. Seuls le nom All Contacts et « 0 items » sont connus. |
| Valeurs de Salutation | Combobox fermée sur « --None-- ». |
| Valeurs et dépendance Mailing Country / State | Combobox fermées. Ne pas recopier les picklists Account. |
| Règles de validation, doublons, longueurs, formats | Non lues. Object Manager Contact non ouvert. |
| Obligation réelle d'Account Name à la sauvegarde | Astérisque observé, Save non utilisé. |
| Filtre de Reports To, propriétaire à la création, record types | Non observés. |
| Historique de consultation Contacts | Exigence DESIGNED du module B, sans liste Recent observée. |
| Édition, suppression, changement de propriétaire, fusion | Interdits pendant l'exploration et non montrés. |

## 9. Hors de cette spécification

Chatter, rapports avancés, import, actions de masse et règles de partage Contact ne figurent pas dans INT-5. Les nommer comme absents du MVP est déjà le rôle de `docs/mvp/requirements.md`. Ce dossier ne les spécifie pas.
