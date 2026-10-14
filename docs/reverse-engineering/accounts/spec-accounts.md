# Spécification fonctionnelle — module Accounts (synthèse observée)

Synthèse des observations REA du 2026-10-14 (fiches dans `03-fiches-ecrans-accounts.md`, preuves dans `evidence/`). Cette spécification décrit le **comportement visible** du module Accounts d'une org Salesforce trial sans données, complété par les métadonnées lues en lecture seule dans Setup › Object Manager. Elle servira de base à la reconstruction dans CRM Lab, qui **n'a pas commencé**.

Statut de chaque élément : **Observé** (vu dans l'interface), **Métadonnées** (lu dans Object Manager, non vu en situation), **Inconnu** (non observable dans cet environnement, voir `04-rapport-couverture-accounts.md`).

## 1. Modèle de données visible

Source : Object Manager › Account › Fields & Relationships (27 champs, SET-1). « Layout » indique la présence dans le formulaire de création observé (FRM-1).

| Libellé | API | Type | Indexé | Layout New | Statut |
| --- | --- | --- | --- | --- | --- |
| Account Name | Name | Name (texte, **obligatoire**) | oui | oui | Observé |
| Account Number | AccountNumber | Text(40) | | non | Métadonnées |
| Account Owner | OwnerId | Lookup(User) | oui | lecture seule, défaut = utilisateur courant | Observé |
| Account Site | Site | Text(80) | | non | Métadonnées |
| Account Source | AccountSource | Picklist | | non | Métadonnées |
| Annual Revenue | AnnualRevenue | Currency(18, 0) | | non | Métadonnées |
| Billing Address | BillingAddress | Address composée (Street, City, State/Province, Zip/Postal Code, Country) | | oui | Observé |
| Buyer Account | IsBuyer | Checkbox | | non | Métadonnées |
| Created By | CreatedById | Lookup(User) | | système | Métadonnées |
| Customer Portal Account | IsCustomerPortal | Checkbox | | non | Métadonnées |
| Data.com Key | Jigsaw | Text(20) | | non | Métadonnées |
| Description | Description | Long Text Area(32000) | | oui | Observé |
| Einstein Account Tier | Tier | Text(2) | | non | Métadonnées |
| Employees | NumberOfEmployees | Number(8, 0) | | non | Métadonnées |
| Fax | Fax | Phone | | non | Métadonnées |
| Industry | Industry | Picklist | | non | Métadonnées (filtrable, FLT-3) |
| Last Modified By | LastModifiedById | Lookup(User) | | système | Métadonnées |
| Ownership | Ownership | Picklist | | non | Métadonnées |
| Parent Account | ParentId | Hierarchy (auto-référence Account) | oui | oui | Observé |
| Phone | Phone | Phone | | oui | Observé |
| Rating | Rating | Picklist | | non | Métadonnées |
| Shipping Address | ShippingAddress | Address composée | | oui | Observé |
| SIC Code | Sic | Text(20) | | non | Métadonnées |
| SIC Description | SicDesc | Text(80) | | non | Métadonnées |
| Ticker Symbol | TickerSymbol | Text(20) | | non | Métadonnées |
| Type | Type | Picklist | | oui | Observé |
| Website | Website | URL(255) | | oui | Observé |

Champs dérivés exposés dans les filtres de liste (FLT-2) : Account Owner Alias, Owner First Name, Owner Last Name, Created By Alias, Created Date, Last Modified By Alias, Last Modified Date, Last Activity, Billing/Shipping Country (text only), Billing/Shipping State/Province (text only).

### Picklists (valeurs actives, aucune dépendance de champ définie)

| Champ | Valeurs |
| --- | --- |
| Type (10) | Analyst, Competitor, Customer, Integrator, Investor, Partner, Press, Prospect, Reseller, Other |
| Industry (32 actives) | Agriculture, Apparel, Banking, Biotechnology, Chemicals, Communications, Construction, Consulting, Education, Electronics, Energy, Engineering, Entertainment, Environmental, Finance, Food & Beverage, Government, Healthcare, Hospitality, Insurance, Machinery, Manufacturing, Media, Not For Profit, Other, Recreation, Retail, Shipping, Technology, Telecommunications, Transportation, Utilities |
| Industry (3 inactives) | Aerospace & Defense, Business Services, Advertising |
| Account Source (11) | Advertisement, Employee Referral, External Referral, Partner, Public Relations, Seminar - Internal, Seminar - Partner, Trade Show, Web, Word of mouth, Other |
| Rating (3) | Hot, Warm, Cold |
| Ownership (4) | Public, Private, Subsidiary, Other |

Aucune valeur par défaut n'est définie sur ces picklists (colonne « Default » vide). Pays et État/Province des adresses sont des picklists dépendantes (State dépend de Country).

### Relations

| Relation | Cardinalité | Statut |
| --- | --- | --- |
| Account → Account (Parent Account) | hiérarchie 0..1 parent, n enfants | Observé (champ) ; vue hiérarchique Inconnu |
| Account → User (Owner, Created By, Last Modified By) | n..1 | Observé (Owner) |
| Contact → Account (Account Name) | n..1, lookup non obligatoire sur le layout Contact | Observé (INT-5) |
| Account ← Opportunities, Cases, Partners, Open Activities / Activity History, Files, Notes & Attachments | 1..n (listes associées du layout) | Métadonnées |

## 2. Navigation et structure

- Point d'entrée : onglet **Accounts** de la navigation verticale → vue de liste épinglée (`/lightning/o/Account/list?filterName=<vue>`). (Observé)
- Fil d'Ariane objet « Accounts › <vue> », sélecteur de vue, bouton d'épinglage (une vue épinglée par utilisateur). (Observé)
- Actions d'objet dans l'en-tête : **New**, **Import**, **Add to an Actionable List**, **Assign Label**. (Observé)
- Recherche globale contextualisée sur l'objet courant (« Search Accounts and more »), avec suggestions en langage naturel basées sur les picklists, rapports et vues récents ; page de résultats multi-objets avec compteurs. (Observé)
- Page d'enregistrement (`/lightning/r/Account/<id>/view`), onglets Details / Related / Activity : **Inconnu** (aucun enregistrement). Le layout « Account Layout » prévoit les sections **About**, **Get in Touch**, **History**, et les listes associées Contacts, Open Activities, Activity History, Opportunities, Cases, Partners, Files, Notes & Attachments. (Métadonnées)

## 3. Vues de liste

| Vue | Filtre implicite | Colonnes observées | Triable |
| --- | --- | --- | --- |
| Recently Viewed (`Recent`) | enregistrements consultés récemment par l'utilisateur | Account Name, Phone, Account Owner Alias | non |
| All Accounts (`AllAccounts`, épinglée) | tous les comptes accessibles | Account Name, Phone, Website, Billing City, Billing State/Province (text only), Account Owner Alias | oui (tri par défaut Account Name) |
| My Accounts | Owner = utilisateur | non ouverte | — |
| New This Week | Created Date = cette semaine | non ouverte | — |
| Recently Viewed Accounts | variante de Recent | non ouverte | — |

Fonctions de liste observées :

- Résumé « N items • Sorted by <colonne> • Filtered by <vue> » ; bouton Refresh ; recherche « Search this list... » (filtre instantané de la vue, bouton Clear).
- Colonnes : tri par en-tête, menu « Column Actions », case « Select All » et cases de ligne, colonne « Action » (menu de ligne).
- Modes d'affichage : **Table**, **Kanban** (regroupement obligatoire sur Account Owner, Billing/Shipping Country Code, Billing/Shipping State/Province Code ou Type ; « Summarize By » optionnel), **Split View** (liste compacte à gauche, fiche à droite).
- Gestion des vues (List View Controls) : New, Clone, Rename, Sharing Settings, Select Fields to Display, Delete, Reset Column Widths.
- Autres outils : Edit List (édition en ligne — **Inconnu** sans données), Charts.
- État vide : message « Accounts show where your contacts work », bouton « Add an Account » (équivalent de New).

## 4. Filtres

- Panneau latéral « Filters » : Add Filter, Remove All, Add Filter Logic, Cancel / Save (la sauvegarde modifie la définition de la vue).
- Ligne de filtre : Field, Operator, Value, Done, Remove.
- 36 champs filtrables (liste complète dans la fiche FLT-2).
- Opérateurs texte : equals, not equal to, less than, greater than, less or equal, greater or equal, contains, does not contain, starts with.
- Picklist : sélection multiple de valeurs (« N options selected »), « More Filter Options ».
- Logique : ET par défaut, expression personnalisable via « Add Filter Logic ».
- Opérateurs pour dates, nombres, cases à cocher et lookups : **Inconnu** (non déroulés).

## 5. Formulaire de création

- Modale « New Account » ouverte depuis New / Add an Account ; pas de choix de type d'enregistrement (0 record type).
- Sections et champs : **About** — Account Name*, Website, Type, Description, Parent Account, Account Owner (lecture seule) ; **Get in Touch** — Phone, Billing Address (Country, Street, City, State/Province, Zip/Postal Code), Shipping Address (idem).
- Boutons : Save, Save & New, Cancel, croix « Cancel and close ».
- Validation client : « Complete this field. » sur Account Name dès la perte de focus ; bouton « Undo <champ> » après modification d'un champ.
- Règles serveur (validation rules, doublons) : aucune règle de validation définie ; comportement de doublon **Inconnu**.
- Modification (Edit), édition en ligne, suppression, changement de propriétaire, clonage : **Inconnu** (aucun enregistrement) ; les actions standard correspondantes figurent dans le layout (Métadonnées).

## 6. Actions de masse et messages système

| Action | Précondition | Message observé |
| --- | --- | --- |
| Assign Label | ≥ 1 ligne sélectionnée | toast Error « Select at least one record and try again. » |
| Add to an Actionable List | ≥ 1 ligne sélectionnée | toast Error « Select at least one record to add to an Actionable List. » |
| Import | — | assistant 4 étapes (Choose How to Import, Upload Your File, Match Fields, Import Started) ; méthodes Import from File (CSV) / Data Import Wizard ; sortie protégée par « Leave Import Data » (Cancel / Confirm) |

Les toasts sont de type Error, fermables, annoncés aux lecteurs d'écran, avec raccourci Ctrl+F6.

## 7. Paramétrage de l'org observée (Métadonnées)

- Validation Rules : 0 ; Record Types : 0 ; Compact Layouts : 2 ; Page Layouts : Account Layout, Commerce Account Layout ; Lightning Record Pages : Commerce Account Record Page.
- Details : Track Activities = False, Track Field History = False, Enable Reports = False.
- Les écrans Setup sont servis sur `https://<mydomain>.my.salesforce-setup.com` (domaine distinct de `https://<mydomain>.lightning.force.com`), ce qui impacte les filtres d'origine des outils d'observation.

## 8. Exigences dérivées pour CRM Lab (à valider avant reconstruction)

1. Entité Account avec les 27 champs ci-dessus, Account Name obligatoire, Owner par défaut = utilisateur courant, adresses composées Billing/Shipping avec pays/état dépendants, auto-référence Parent Account.
2. Picklists Type, Industry (avec notion de valeur inactive), Account Source, Rating, Ownership — sans valeur par défaut.
3. Vues de liste : Recently Viewed (non triable), All Accounts, My Accounts, New This Week ; épinglage ; colonnes configurables ; recherche dans la liste ; tri par colonne ; modes Table / Kanban / Split View.
4. Filtres : champs, opérateurs et logique ET/expression ; sauvegarde dans la vue.
5. Formulaire de création en modale, validation requis au blur, Save / Save & New / Cancel.
6. Actions de masse avec garde « sélection requise » et toasts d'erreur ; assistant d'import CSV.
7. Recherche globale multi-objets avec suggestions.
8. Éléments à spécifier après observation complémentaire : page d'enregistrement, listes associées peuplées, édition/édition en ligne, hiérarchie, Kanban avec cartes, doublons, permissions.
