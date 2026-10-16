# Fiches d'écran — module Accounts (exploration du 2026-10-14)

Chaque fiche suit le gabarit de `01-plan-exploration-accounts.md`. Les identifiants reprennent le plan ; les écrans ajoutés en cours d'exploration (NAV-0, LST-5 à LST-7, INT-5, SET-1) sont signalés. Les preuves sont dans `evidence/2026-10-14-<Id>.json` (résumé REA `inspect-web-page`) et `evidence/2026-10-14-<Id>.png` (REA `capture-web-screenshot`, prise après masquage local des données personnelles).

Contexte commun à toutes les fiches :

- Org : Salesforce **trial** (bandeau « Days left in your Trial: 25 »), application Lightning à navigation verticale : Home, Contacts, Accounts, Sales, Service, Marketing, Commerce, Your Account, Automation, Lifecycle Center (DevOps Center).
- Jeu de données : **0 enregistrement Account et 0 Contact**. Toutes les listes sont vides ; aucune donnée n'a été créée, modifiée ni supprimée pendant l'exploration (vérifié après chaque formulaire : « 0 items • Sorted by Account Name • Filtered by All accounts »).
- Observation : REA 6.4.0 en CLI (`scripts/sf-observe.sh`), `completeness.status = policy_filtered` sur tous les écrans (sections scripts/console/corps réseau exclues par la politique REA ; arbre d'accessibilité et DOM complets). Les requêtes réseau ne sont pas disponibles car REA s'attache après le chargement (`prior_activity_available: false`) et la fenêtre d'observation (2 s) n'a vu aucune nouvelle requête.

## Index des preuves

| Id | Heure (UTC) | `evidence_id` inspect | `evidence_id` capture | sha256 PNG (début) | Route |
| --- | --- | --- | --- | --- | --- |
| NAV-0 | 11:00:17 | `ev_08923fc0…` | `ev_dc706f34…` | `7216be1fec88` | `/lightning/page/home` |
| NAV-1 | 11:01:20 | `ev_3788bca1…` | `ev_68909303…` | `6de0b8605f91` | `/lightning/o/Account/list?filterName=AllAccounts` |
| LST-1 | 11:02:35 | `ev_1e8f5f2e…` | `ev_4ed24ddf…` | `654d4d891c89` | `/lightning/o/Account/list?filterName=Recent` |
| LST-2 | 11:04:06 | `ev_bef35bf9…` | `ev_0ca94031…` | `a3006ae6c8e5` | liste All Accounts, sélecteur de vues ouvert |
| LST-3 | 11:04:23 | `ev_7e2569fd…` | `ev_30a7c0dd…` | `4c0ba6a38f06` | liste All Accounts, menu d'affichage ouvert |
| LST-4 | 11:04:31 | `ev_ffd726eb…` | `ev_9a0d9e46…` | `be4e31f31d6d` | liste All Accounts, menu List View Controls ouvert |
| FLT-1 | 11:04:49 | `ev_503bcc5d…` | `ev_b8e8006e…` | `4a694abbe2cd` | panneau Filters ouvert |
| FLT-2 | 11:05:03 | `ev_19f6c3f3…` | `ev_df8fafb6…` | `e2ba6f15271f` | panneau Filters, « Add Filter » |
| FLT-3 | 11:14:25 | `ev_cd487c30…` | `ev_57f56aec…` | `bfa70ae890ce` | filtre Industry equals (non enregistré) |
| FLT-4 | 11:15:07 | `ev_07134883…` | `ev_a92d4ec3…` | `9f20353e6e05` | filtres retirés, recherche dans la liste |
| LST-5 | 11:15:25 | `ev_1fc45ca6…` | `ev_6e86d72d…` | `b3e579f1d3bd` | modale Kanban Settings |
| LST-6 | 11:15:50 | `ev_0d889144…` | `ev_d9b70735…` | `54449aeca1b9` | mode Split view |
| LST-7 | 11:16:11 | `ev_9997a18f…` | `ev_706bd744…` | `f8963fc58c8f` | retour mode Table, « Search this list » rempli |
| FRM-1 | 11:16:35 | `ev_6e4bbb7e…` | `ev_6caedfe6…` | `df9af08a7233` | `/lightning/o/Account/new` (modale New Account) |
| FRM-2 | 11:20:09 | `ev_d97b796f…` | `ev_89a9907f…` | `65a73ebc80c3` | New Account, Website saisi, Account Name vide |
| FRM-3 | 11:20:19 | `ev_340bc698…` | `ev_d33e5511…` | `08c7078defcb` | New Account, message « Complete this field. » |
| INT-1 | 11:20:50 | `ev_d8edbbf0…` | `ev_e5b7a6ca…` | `70ffe24dfad6` | toast d'erreur « Assign Label » sans sélection |
| INT-2 | 11:21:10 | `ev_0c4bca87…` | `ev_66447a2f…` | `bee54d9b8bcb` | toast d'erreur « Add to an Actionable List » sans sélection |
| NAV-3a | 11:21:27 | `ev_5998758d…` | `ev_468b5fda…` | `d451d000b40b` | recherche globale, suggestions |
| NAV-3b | 11:21:40 | `ev_bee43649…` | `ev_ef29d627…` | `14899b6b6a08` | recherche globale, terme saisi |
| NAV-3c | 11:21:50 | `ev_d99076af…` | `ev_3b4c80d4…` | `d783381215c7` | `/one/one.app` page de résultats |
| INT-3 | 11:22:55 | `ev_e051deca…` | `ev_68c5ebc1…` | `a56fc282af4d` | assistant Import Accounts |
| INT-4 | 11:24:35 | `ev_ba5c95e6…` | `ev_75890f5b…` | `65dfa76ce16a` | dialogue « Leave Import Data » |
| INT-5 | 11:25:27 | `ev_2d4fd452…` | `ev_59e3530e…` | `5144b6aa66f3` | `/lightning/o/Contact/new` (relation Contact → Account) |
| SET-1 | 11:28:00 | `ev_53d88571…` | `ev_022473d6…` | `6211f6517ff4` | Setup › Object Manager › Account › Fields & Relationships |

Les identifiants complets figurent dans chaque JSON (`inspect_evidence_id`, `screenshot_evidence_id`, `screenshot.sha256`).

---

## NAV-0 — Page d'accueil (ajouté)

Route observée : `/lightning/page/home`

### Comportement observé
- Page Home de l'application : en-tête « Welcome, <user> », bloc de suggestions (« Check out these suggestions to kick off your day. »), cartes de rapports (My Leads, My Opportunities, My Contacts, All New Cases By Priority) avec sélecteur de rapport et « View Report », section « Recent Records » (vide), « Make It Your Home ».
- Barre supérieure commune : recherche globale (« Search... »), Agentforce, Guidance Center, Salesforce Help, Quick Settings, Notifications, View profile.
- Bouton « New » global et « Edit nav items » (personnalisation de la navigation).

### Éléments d'interface
| Rôle | Libellé | Remarque |
| --- | --- | --- |
| link | Home, Contacts, Accounts, Sales, Service, Marketing, Commerce, Your Account, Automation, Lifecycle Center (DevOps Center) | Navigation verticale |
| combobox | Select a Leads report…, Select an Opportunities report…, Select a Contacts report…, Select a Cases report… | Cartes de rapports |
| button | View All Recent Records, View All Cards, Hide suggestions, Dismiss this suggestion, Refresh | |

### Inconnues
- Contenu de « Recent Records » avec des données (liste vide ici).

---

## NAV-1 — Accès au module Accounts

Route observée : `/lightning/o/Account/list?filterName=AllAccounts` (l'onglet « Accounts » de la barre de navigation ouvre directement la vue épinglée ; `/lightning/o/Account/home` redirige vers la dernière vue utilisée).

### Comportement observé
- L'onglet « Accounts » ouvre la **vue de liste épinglée** (ici All Accounts, bouton d'état « This list is pinned. »).
- En-tête d'objet : icône Accounts, fil « Accounts › All Accounts », sélecteur « Select a List View: Accounts », bouton de dictée.
- Barre d'actions de l'objet (ordre observé) : **New**, **Import**, **Add to an Actionable List**, **Assign Label**.
- Barre d'outils de liste : « Search this list... », List View Controls (engrenage), Select list display, Refresh, Edit List (crayon), Charts, Filters.
- Résumé de liste : « 0 items • Sorted by Account Name • Filtered by All accounts • ».
- État vide : illustration + « Accounts show where your contacts work » / « Improve your reporting and deal tracking with accounts. » / bouton **Add an Account**.

### Règles métier visibles
- Une seule vue peut être épinglée par objet et par utilisateur ; elle devient le point d'entrée de l'onglet.

### Inconnues
- Application Lightning hôte exacte (nom non affiché ; navigation Starter/Pro). App Launcher non ouvert.

---

## LST-1 — Vue « Recently Viewed »

Route observée : `/lightning/o/Account/list?filterName=Recent`

### Comportement observé
- Colonnes : Item Number, Account Name, Phone, Account Owner Alias, Action (menu de ligne).
- Bouton « Pin this list view. » (la vue n'est pas épinglée), même barre d'actions que NAV-1.
- Le libellé du bouton de tri est « Column sort is unavailable for this object. » et le résumé n'affiche pas « Sorted by » : la vue Recently Viewed n'est pas triable (ordre = dernière consultation).

### Inconnues
- Contenu réel (aucun enregistrement consulté dans l'org).

---

## LST-2 — Sélecteur de vues de liste

### Comportement observé
- Le sélecteur ouvre un combobox « Search lists... » avec groupe « List Views ».
- Vues disponibles : **All Accounts (Pinned list)**, **My Accounts**, **New This Week**, **Recently Viewed**, **Recently Viewed Accounts**.
- Colonnes de All Accounts : Item Number, Account Name, Phone, Website, Billing City, Billing State/Province (text only), Account Owner Alias, Action ; chaque colonne a « Sort <colonne> » et « Show <colonne> Column Actions ».

### Règles métier visibles
- Les vues standard appliquent un filtre implicite : All (tous les comptes visibles), My (propriétaire = utilisateur), New This Week (date de création dans la semaine), Recent (consultés récemment).

---

## LST-3 — Modes d'affichage

### Comportement observé
- Bouton « Select list display » : menu **Table** / **Kanban** / **Split View** (confirmé par LST-5 et LST-6).

---

## LST-4 — List View Controls

### Comportement observé
- Menu « List View Controls » : **New**, **Clone**, **Rename**, **Sharing Settings**, **Select Fields to Display**, **Delete**, **Reset Column Widths**.
- Aucune entrée n'a été activée (Delete interdit par le garde-fou de `scripts/sf-act.mjs`).

### Règles métier visibles
- Une vue de liste est un objet gérable (créer, cloner, renommer, partager, supprimer) distinct des enregistrements.

### Inconnues
- Formulaire « New list view » (nom, API name, visibilité privée / groupe / tous) non ouvert pour éviter toute création.

---

## LST-5 — Kanban Settings (ajouté)

### Comportement observé
- Passage en Kanban ouvre une modale **Kanban Settings** : « Summarize By » (combobox) et « Group By * » (obligatoire).
- Options « Group By » : -- None --, **Account Owner**, **Billing Country Code**, **Billing State/Province Code**, **Shipping Country Code**, **Shipping State/Province Code**, **Type**.
- Boutons Cancel / Save ; la modale a été annulée.

### Règles métier visibles
- Le Kanban ne regroupe que sur des champs picklist ou référence (Owner, codes pays/état, Type). « Summarize By » attend un champ numérique/devise (Annual Revenue, Employees) — liste non déroulée.

### Inconnues
- Rendu des colonnes et glisser-déposer entre colonnes (aucune donnée).

---

## LST-6 — Split view (ajouté)

### Comportement observé
- Le mode Split view affiche à gauche une grille « Select an item from this list to open it. » (« No items to display. ») et à droite « No record selected ».
- Barre réduite : Split view mode, Select list display, Refresh, « Show more actions », Help.

---

## LST-7 — Recherche dans la liste (ajouté)

### Comportement observé
- Le champ « Search this list... » filtre la vue courante (terme de test « Acme »), bouton « Clear » apparaît ; résultat « 0 items ».
- Le tri par colonne est présent sur All Accounts (boutons « Sort … ») mais, liste vide, le bouton général indique « Column sort is unavailable for this object. ».

---

## FLT-1 — Panneau Filters

### Comportement observé
- Le bouton « Filters » ouvre un panneau latéral « Filters » avec **Add Filter**, **Remove All**, « Close Filters ».
- Sur une vue standard, le filtre implicite de la vue reste appliqué (« Filtered by All accounts »).

---

## FLT-2 — Ajout d'un filtre

### Comportement observé
- « Add Filter » crée une ligne avec **Field** (combobox), **Operator** (combobox, valeur par défaut « equals »), **Value** (textbox), bouton **Done**, bouton **Remove**, titre « Matching all of these filters », lien **Add Filter Logic**.
- Champs filtrables (liste complète observée) : Account Name, Account Owner Alias, Account Source, Annual Revenue, Billing City, Billing Country, Billing Country (text only), Billing State/Province, Billing State/Province (text only), Billing Street, Billing Zip/Postal Code, Buyer Account, Created By Alias, Created Date, Customer Portal Account, Data.com Key, Employees, Fax, Industry, Last Activity, Last Modified By Alias, Last Modified Date, Owner First Name, Owner Last Name, Parent Account, Phone, Shipping City, Shipping Country, Shipping Country (text only), Shipping State/Province, Shipping State/Province (text only), Shipping Street, Shipping Zip/Postal Code, SIC Description, Type, Website.
- Opérateurs pour un champ texte : **equals, not equal to, less than, greater than, less or equal, greater or equal, contains, does not contain, starts with**.

### Règles métier visibles
- La logique par défaut est un ET de tous les filtres ; « Add Filter Logic » permet une expression (1 AND (2 OR 3)).

---

## FLT-3 — Filtre sur picklist

### Comportement observé
- Avec Field = **Industry**, le champ Value devient un bouton multi-sélection « Value 0 options selected » (valeurs de la picklist, ex. Entertainment visible) ; un bouton « More Filter Options » apparaît.
- Boutons **Cancel** / **Save** apparaissent en bas du panneau dès qu'un filtre est modifié (la sauvegarde modifierait la vue partagée All Accounts : non effectuée).

### Règles métier visibles
- Les filtres sur picklist sont des « equals l'une de » (multi-valeurs) ; les filtres non enregistrés ne s'appliquent pas tant que « Save » n'est pas cliqué.

---

## FLT-4 — Retrait des filtres

### Comportement observé
- « Remove All » puis « Close Filters » rétablit « Filtered by All accounts » sans modification ; la liste reste « 0 items ».

---

## FRM-1 — Formulaire « New Account »

Route observée : `/lightning/o/Account/new?count=1&nooverride=1&useRecordTypeCheck=1&navigationLocation=LIST_VIEW&backgroundContext=/lightning/o/Account/list?filterName=AllAccounts`

### Comportement observé
- Ouverture en **modale** (`dialog` « New Account ») au-dessus de la liste ; pas d'écran de choix de type d'enregistrement (0 record type).
- Légende « * = Required Information ».
- Section **About** : **Account Name** (obligatoire), Website, Type (picklist, « --None-- »), Description (zone de texte longue), Parent Account (lookup Account), **Account Owner** (lecture seule, pré-rempli avec l'utilisateur courant).
- Section **Get in Touch** : Phone, groupe **Billing Address** (Billing Country, Billing Street, Billing City, Billing State/Province, Billing Zip/Postal Code), groupe **Shipping Address** (mêmes composantes Shipping).
- Pays et État/Province sont des **picklists** (State/Country picklists activées) ; State dépend de Country.
- Boutons : **Cancel**, **Save & New**, **Save**, « Cancel and close » (croix).
- Valeurs par défaut : toutes vides sauf Account Owner.

### Règles métier visibles
- Seul **Account Name** est obligatoire côté interface.
- Les champs Industry, Employees, Annual Revenue, Rating, Ownership, Account Source, SIC, Ticker Symbol, Fax, Account Number, Account Site existent sur l'objet (SET-1) mais **ne sont pas sur le layout de création**.

### Inconnues
- Options de « Type » dans le formulaire (liste déroulante LWC non capturée ; valeurs connues par SET-1).
- Dropdown « Parent Account » : vide faute d'enregistrements ; présence d'un item « New Account » non confirmée.

---

## FRM-2 / FRM-3 — Validation côté client sans enregistrement

### Comportement observé
- FRM-2 : saisie d'un Website de test fait apparaître un bouton **Undo Website** (annulation champ par champ).
- FRM-3 : quitter le champ Account Name vide déclenche immédiatement le message **« Complete this field. »** sous le champ, sans cliquer Save.
- Le formulaire a ensuite été fermé par **Cancel** ; la liste affiche toujours 0 items.

### Règles métier visibles
- Validation du requis au blur, message standard Lightning ; l'URL du Website n'a pas été validée au blur (format libre).

### Inconnues
- Messages d'erreur serveur (règles de validation, doublons) : non observables sans Save. L'org n'a **aucune règle de validation** ni **règle de doublon visible** (SET-1 ; onglet Validation Rules : 0).

---

## INT-1 / INT-2 — Actions de masse sans sélection (toasts d'erreur)

### Comportement observé
- « Assign Label » sans ligne cochée : toast **Error** « Select at least one record and try again. ».
- « Add to an Actionable List » sans sélection : toast **Error** « Select at least one record to add to an Actionable List. ».
- Les toasts sont annoncés (« Error notification. »), fermables (bouton Close), avec l'astuce clavier « Press Control + F6 to navigate to the next toast notification ».

### Règles métier visibles
- Les actions de masse exigent une sélection via la case « Select All » ou les cases de ligne.

---

## INT-3 / INT-4 — Assistant Import Accounts

### Comportement observé
- « Import » ouvre une modale **Import Accounts** à 4 étapes : **Choose How to Import accounts** (active), Upload Your File, Match Fields, Import Started.
- Méthodes : **Import from File** (« Upload accounts using a CSV file. ») et **Import, Update, or Export** (Data Import Wizard, « supports multiple objects, including custom objects ») ; lien « Create custom fields. ».
- Boutons Next / Cancel and close. La fermeture déclenche le dialogue **Leave Import Data** : « Are you sure you want to leave Import Data? You will lose any unsaved changes. » (Cancel / Confirm). Confirmé pour quitter sans importer.

---

## INT-5 — Relation Contact → Account (ajouté)

Route observée : `/lightning/o/Contact/new?…`

### Comportement observé
- Le formulaire New Contact contient le lookup **Account Name** (combobox) dans la section About, avec Reports To (lookup Contact), Salutation, First Name, **Last Name** (groupe « Name required »), Title, Description, Phone, Email, Mailing Address.
- Fermé par Cancel ; All Contacts reste « 0 items ».

### Règles métier visibles
- Un Contact référence au plus un Account (lookup, non obligatoire sur ce layout) ; côté Account, la liste associée **Contacts** est présente dans le layout (SET-1).

---

## NAV-3a / NAV-3b / NAV-3c — Recherche globale

### Comportement observé
- Le champ « Search Accounts and more » (le contexte Accounts est pré-sélectionné depuis l'onglet) ouvre une boîte de dialogue « Search... » avec un combobox « Search by object type » et une liste **Suggestions**.
- Suggestions à vide : requêtes en langage naturel (« accounts with account type analyst », « accounts with industry agriculture », « accounts with account source advertisement »), rapports récents, vues de liste (All Accounts, All Open Leads, All Contacts). Encarts « Do more with Search! », « Get insights ».
- Avec un terme (« Acme ») : option « Show more results for "Acme" », bouton Clear.
- Entrée ouvre `/one/one.app` « Acme - Search » : **Top Results**, compteurs par objet (Accounts 0, Reports 0, Dashboards 0), message « We searched the objects you use most and didn't find any matches for "Acme" » et conseil « Know which object you're looking for? Select it in the dropdown next to the search box, or in the sidebar. ».

### Règles métier visibles
- La recherche est globale et multi-objets, avec filtrage secondaire par objet ; les suggestions exploitent les picklists (Type, Industry, Account Source).

---

## SET-1 — Object Manager › Account (métadonnées, ajouté)

Route observée : `https://<mydomain>.my.salesforce-setup.com/lightning/setup/ObjectManager/Account/FieldsAndRelationships/view` (domaine Setup distinct du domaine Lightning).

### Comportement observé
- Onglets de l'objet : Details, Fields & Relationships, Page Layouts, Lightning Record Pages, Buttons, Links, and Actions, Compact Layouts, Field Sets, Object Limits, Record Types, Related Lookup Filters, Search Layouts, List View Button Layout, Slack Record Layouts, Hierarchy Columns, Object Access, Field Access, Triggers, Flow Triggers, Validation Rules, URL Slugs, Conditional Field Formatting, SmartFill.
- **Fields & Relationships : 27 champs** (tableau complet dans `spec-accounts.md`), actions New Custom Field, Deleted Fields, Field Dependencies, Set History Tracking.
- **Details** : Track Activities = False, Track Field History = False, Enable Reports = False (valeurs de la trial).
- **Validation Rules : 0**, **Record Types : 0**, **Compact Layouts : 2**, **Page Layouts : Account Layout, Commerce Account Layout**, **Lightning Record Pages : Commerce Account Record Page**.
- Picklists lues sur les pages de champ (Rating, Ownership, Type, Industry, Account Source) : valeurs dans `spec-accounts.md` ; aucune dépendance de champ définie.

### Inconnues
- Contenu détaillé de « Buttons, Links, and Actions » (36 éléments, lecture partielle) et des compact layouts.
