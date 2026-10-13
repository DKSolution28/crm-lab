# Guide et Matrice d'Exploration Fonctionnelle — Module Accounts (Salesforce)

Ce document détaille le plan de reconnaissance fonctionnelle, les dimensions d'analyse, les commandes REA CDP à exécuter et les exigences de sécurité (sans contournement d'authentification) pour le module **Accounts** (Comptes) de Salesforce.

---

## 1. Principes et Sécurité

1. **Aucun contournement d'authentification** : L'accès à Salesforce Developer Org requiert une authentification légitime (credentials ou session SSO/MFA). Tout défi MFA ou SSO doit être signalé pour intervention humaine ou complété via une session interactive dédiée.
2. **Cloisonnement strict des profils** :
   - Session lab / dev local : port CDP 9222, profil `/tmp/crm-lab-cdp`.
   - Session Salesforce Org : port CDP 9223, profil `/tmp/salesforce-session-cdp`.
3. **Zéro fuite de secrets** : Aucun mot de passe, jeton OAuth (`access_token`, `refresh_token`), cookie de session ou secret n'est écrit dans le dépôt Git ni dans les fichiers de preuves d'observation.
4. **Preuves normalisées** : Les observations capturées via REA (`rea inspect-web-page`, `rea list-browser-targets`, `rea capture-web-screenshot`) filtrent et hachent par conception les valeurs sensibles tout en préservant la topologie du DOM, l'arbre d'accessibilité et les formes structurelles des payloads JSON.

---

## 2. Matrice d'Exploration Fonctionnelle du Module Accounts

| Axe d'analyse | Objectif fonctionnel | Éléments d'interface et techniques cibles | Probes REA CDP |
|---|---|---|---|
| **1. Navigation & App Launcher** | Comprendre l'intégration dans Lightning Experience (OneApp / LEX) | App Launcher (`9 dots`), onglet "Accounts" / "Comptes", navigation items (`one-app-nav-bar`), URL route (`/lightning/o/Account/list`) | `rea list-browser-targets`, `rea inspect-web-page` (navigation context, DOM roots) |
| **2. List Views (Vues de listes)** | Cartographier les listes standards et personnalisées | Sélecteur de vue (ex. "All Accounts", "My Accounts", "Recently Viewed"), filtres rapides, recherche inline, boutons d'action de liste ("New", "Import", "Change Owner") | `rea inspect-web-page` avec `--include-accessibility-text`, capture DOM des tables/grilles |
| **3. Fiche Compte (Record Detail)** | Modéliser la disposition des données et la hiérarchie | Highlights Panel (En-tête clé avec champs compacts et actions rapides), Tabs (Détails, Activités, Fil Chatter, Historique), Related Lists (Contacts, Opportunités, Requêtes/Cases) | `rea inspect-web-page` (arborescence des onglets et panneaux Lightning Layout) |
| **4. Formulaires de création & édition** | Identifier le schéma de données, validations et champs obligatoires | Modal `force-record-edit-form` / `lightning-record-form`, types de champs (Texte, Picklist hiérarchique, Devise, Téléphone, Recherche/Lookup Relation Compte Parent), boutons Save / Save & New / Cancel | Inspection des inputs, attributs `aria-required`, picklists de statut/secteur, validation messages |
| **5. Filtres & Recherches** | Modéliser les critères de filtrage et recherche | Filtres de liste (opérateurs equals, contains, etc.), Global Search et lookup modals pour la résolution d'entités parentes | Événements de frappe, inspection des dropdowns de filtrage |
| **6. Interactions & Actions Rapides** | Cartographier les flux de travail standards | Actions globales et d'objet : "Log a Call", "New Contact", "New Opportunity", "New Task", inline edit dans les list views | `rea inspect-web-page` des action bars et modals d'actions rapides |

---

## 3. Procédure Opérationnelle d'Observation avec REA

### Étape 1 : Démarrer la session Salesforce isolée
```bash
bash scripts/launch-salesforce-browser.sh "https://<votre-org-domain>.develop.lightning.force.com"
# ou port standard:
# SF_CDP_PORT=9223 bash scripts/launch-salesforce-browser.sh
```

### Étape 2 : Vérification de la cible dans REA
```bash
./node_modules/.bin/rea list-browser-targets http://127.0.0.1:9223
```

### Étape 3 : Inspection de la vue de liste Accounts
```bash
TARGET_ID="<id-obtenu-par-list-browser-targets>"
./node_modules/.bin/rea inspect-web-page http://127.0.0.1:9223 "${TARGET_ID}" \
  --include-accessibility-text \
  --include-console-text \
  --include-json-body-shapes \
  --include-storage-keys \
  --format json > docs/reverse-engineering/accounts/evidence_salesforce_accounts_list.json
```

### Étape 4 : Inspection du formulaire de création / édition
Une fois le modal "New Account" ouvert dans le navigateur :
```bash
./node_modules/.bin/rea inspect-web-page http://127.0.0.1:9223 "${TARGET_ID}" \
  --include-accessibility-text \
  --include-json-body-shapes \
  --format json > docs/reverse-engineering/accounts/evidence_salesforce_account_form.json
```

### Étape 5 : Capture visuelle non sensible
```bash
./node_modules/.bin/rea capture-web-screenshot http://127.0.0.1:9223 "${TARGET_ID}" \
  --format json > docs/reverse-engineering/accounts/evidence_salesforce_screenshot.json
```

---

## 4. Matrice de Correspondance Salesforce Account vers CRM Lab

Cette matrice servira de base lors de la phase de reconstruction du modèle de données local :

| Champ standard Salesforce (Account) | Type Salesforce | Rôle fonctionnel | Projection cible CRM Lab |
|---|---|---|---|
| `Id` | ID (18 chars) | Identifiant unique de compte | `id` (String CUID ou UUID) |
| `Name` | Text(255) | Raison sociale / Nom du compte | `name` (String, obligatoire) |
| `Type` | Picklist | Catégorie (Prospect, Customer, Partner, Other) | `type` (Enum ou String) |
| `Industry` | Picklist | Secteur d'activité | `industry` (String optionnel) |
| `Phone` | Phone | Téléphone principal | `phone` (String optionnel) |
| `Website` | URL(255) | Site web du compte | `website` (String optionnel) |
| `BillingAddress` | Compound (Street, City, PostalCode, Country) | Adresse de facturation | `billingAddress` (JSON ou champs séparés) |
| `ShippingAddress` | Compound | Adresse de livraison | `shippingAddress` (JSON ou champs séparés) |
| `AnnualRevenue` | Currency | Chiffre d'affaires annuel | `annualRevenue` (Decimal optionnel) |
| `NumberOfEmployees` | Number | Nombre d'employés | `numberOfEmployees` (Int optionnel) |
| `ParentId` | Lookup(Account) | Hiérarchie / Compte parent | `parentId` (Relation auto-référencée) |
| `OwnerId` | Lookup(User) | Propriétaire du compte | `ownerId` / assigné à |
| `CreatedDate` / `LastModifiedDate` | DateTime | Audit trail | `createdAt` / `updatedAt` |
