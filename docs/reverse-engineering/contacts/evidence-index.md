# Index des preuves — Contacts

Passe en lecture seule du 2026-10-14. Aucune nouvelle capture Salesforce : la session du coordinateur n'est pas sur cette VM. Les fichiers Accounts sont cités, pas modifiés.

## 1. Preuve primaire INT-5

| Élément | Valeur |
| --- | --- |
| Fiche | `docs/reverse-engineering/accounts/03-fiches-ecrans-accounts.md`, section INT-5 |
| Résumé REA | `docs/reverse-engineering/accounts/evidence/2026-10-14-INT-5.json` |
| Capture | `docs/reverse-engineering/accounts/evidence/2026-10-14-INT-5.png` |
| Heure | 2026-10-14T11:25:27.386Z |
| Titre | New Contact \| Salesforce |
| Route | `/lightning/o/Contact/new` avec `navigationLocation=LIST_VIEW` et `backgroundContext` vers `/lightning/o/Contact/list?filterName=AllContacts` |
| Confiance déclarée dans le JSON | `observed` |
| Inspect `evidence_id` | `ev_2d4fd452216fbc645144f5bac1ad8fa62cc095ff4c580d3f0970d3045b60e0bc` |
| Capture `evidence_id` | `ev_59e3530e036bbcb166dc90269e3da94bf021e68269ce04114e07ff9ce868518f` |
| sha256 PNG | `5144b6aa66f382ff99e9fe24b3dae430e9d980c873cf9a9512cb468e65bac7ef` (129474 octets, viewport 1388×706) |
| Fournisseur | `rea-cdp-browser` version 2 |
| Complétude | `policy_filtered` (scripts, console, corps réseau et métadonnées exclus). `network.request_count` = 0, `prior_activity_available` = false. Valeurs de stockage `values_redacted: true` (non recopiées). |
| Commandes citées par le JSON | `bash scripts/sf-observe.sh INT-5` puis `node scripts/sf-redact-evidence.mjs INT-5` |
| Note de capture | Masquage local après coup. Le JSON indique qu'aucune donnée Salesforce n'a été modifiée. |

Le garde-fou de `scripts/sf-act.mjs` refuse les clics Save, Save & New, Delete, Change Owner, Submit, Merge et Next. La fiche INT-5 indique que Cancel a fermé le formulaire.

### Contrôles résumés (sans donnée personnelle)

L'arbre d'accessibilité (752 nœuds, texte capturé inclus) et la capture montrent :

- Dialogue modal « New Contact », titres « About » et « Get in Touch ».
- Boutons Cancel, Save & New, Save, Cancel and close.
- Groupe « Name required ». Last Name : `required` true, `invalid` true. First Name : requis false. La capture montre « Complete this field. » sous Last Name. Cette phrase n'est pas un nom accessible distinct ; l'état `invalid` l'est.
- Salutation : combobox fermée, valeur visible « --None-- », `required` false. Valeurs non listées.
- Account Name : combobox lookup, placeholder « Search Accounts... », autocomplete list, `required` true, astérisque visible, liste non ouverte.
- Reports To : combobox lookup, placeholder « Search Contacts... », `required` false, liste non ouverte.
- Title (une ligne), Description (multiligne), Phone, Email : requis false.
- Groupe Mailing Address : Mailing Street (multiligne), Mailing City, Mailing Zip/Postal Code, Mailing Country (combobox), Mailing State/Province (combobox). Tous requis false. Listes de pays et d'état non ouvertes.
- Légende visible « \* = Required Information ».

La fiche de session ajoute : fermeture par Cancel, All Contacts reste « 0 items ». Le rapport de couverture Accounts confirme 0 contact et l'absence de création.

### Écart avec la synthèse Accounts

`spec-accounts.md` (table Relations) et la règle métier de la fiche INT-5 qualifient Account Name de lookup non obligatoire. L'arbre INT-5 et l'astérisque de la capture portent le contraire pour le marqueur de layout. `spec-contacts.md` § 3.3 garde les deux et n'en déduit pas une règle de sauvegarde.

## 2. Preuves lues en appui

| Source | Apport pour Contacts | Niveau |
| --- | --- | --- |
| `evidence/2026-10-14-NAV-0.json` (et NAV-1, LST-*, FLT-*, INT-1, INT-2) | Lien accessible « Contacts » dans la navigation verticale Lightning. | OBSERVED |
| `03-fiches-ecrans-accounts.md` contexte commun | Application : Home, Contacts, Accounts, Sales, Service, Marketing, Commerce, Your Account, Automation, Lifecycle Center. Org trial, 0 Account et 0 Contact. | OBSERVED |
| `evidence/2026-10-14-NAV-0.json` | Contrôles « Select a Contacts report... » et « View Report: My Contacts » sur l'accueil. Rapports non ouverts. | OBSERVED |
| `evidence/2026-10-14-NAV-3a.json` | Suggestion « All Contacts Contacts List ». | OBSERVED |
| `spec-accounts.md` relations et § 2 | Contact → Account cité comme observé via INT-5. Liste associée Contacts prévue par le layout Account (métadonnées). Page d'enregistrement Account inconnue. | OBSERVED / métadonnées Account |
| `04-rapport-couverture-accounts.md` | Vérification « All Contacts : 0 items » après les formulaires. | OBSERVED |
| `docs/mvp/requirements.md` module B | Liste, CRUD, association, Last Name requis, champs INT-5 à documenter, historique de consultation, relation dans les deux fiches, API et tests. Écart Prisma déjà signalé. | DESIGNED (exigences) |
| `prisma/schema.prisma` modèle `Contact` | `firstName`, `lastName`, `email`, `phone`, `title`, `accountId` nullable, `ownerId` obligatoire, horodatages. Pas de salutation, reports-to, description, ni adresse. | OBSERVED comme état du schéma |
| `src/components/shell/nav-links.tsx` | Contacts `enabled: false`, titre « Module à venir ». | OBSERVED (code) |
| `src/components/shell/app-shell.tsx` | Commentaire : Contacts et Opportunities sont des emplacements sans module dédié. | OBSERVED (code) |
| `src/app/accounts/[id]/page.tsx` | Liste associée CRM Lab Name / Title / Email, état vide explicite. Pas une colonne Salesforce. | DESIGNED |
| Absence de `src/app/contacts/` | Aucune page Contacts dans le dépôt au moment de la lecture. | OBSERVED (code) |

Les picklists Account (Type, Industry, Rating, Ownership, Account Source) et la dépendance pays/état de facturation ne sont pas réutilisées pour Contact.

## 3. Rapport de capacité REA (cette VM)

Commande : `npm run rea:doctor` (`rea-agents doctor --json`), le 2026-10-14, dans ce dépôt.

| Contrôle | Résultat |
| --- | --- |
| Code de sortie | 1 |
| `healthy` / `environment_healthy` | false / false |
| Paquet CLI | rea-agents 6.4.0 (dépendance du dépôt) |
| Node | 24.21.0, sain |
| Hôte | ubuntu 24.04, sain |
| Hopper | manquant (`missing_analysis_engine`) |
| Ghidra | `GHIDRA_INSTALL_DIR` non défini |
| IDA | enregistrement MCP absent |
| Skill REA installé | manquant (version attendue 37) |
| Enregistrement Cursor | `/home/ubuntu/.cursor/mcp.json` absent |
| Catalogue annoncé | 127 commandes CLI, 170 outils MCP, 6 invites |

Le catalogue du paquet inclut des outils d'observation web (`inspect_web_page`, `capture_web_screenshot`, `list_browser_targets`). Ils n'ont pas été lancés : aucun navigateur Salesforce authentifié n'est disponible ici. Les outils qui modifient une cible, installent un paquet ou capturent une session native sont hors sujet et n'ont pas été appelés.

Un doctor antérieur du 2026-10-13 est archivé dans `docs/reverse-engineering/accounts/evidence/2026-10-13-rea-doctor.json` (même famille d'échecs). Il n'a pas été régénéré dans ce dossier.

**Blocage :** doctor en échec et session Salesforce absente. La spécification s'appuie sur les preuves du 2026-10-14 déjà versionnées.

## 4. Inconnues (ne pas inventer de valeurs)

| Id | Sujet |
| --- | --- |
| U1 | Page d'enregistrement Contact, onglets, bandeau, actions. |
| U2 | Valeurs de la picklist Salutation. |
| U3 | Valeurs de Mailing Country et Mailing State/Province, et leur dépendance. |
| U4 | Règles de validation et règles de doublon Contact. |
| U5 | Inventaire des vues de liste, colonnes, tri, recherche, filtres et opérateurs. |
| U6 | Application du marqueur requis d'Account Name au moment de Save. |
| U7 | Filtre du lookup Reports To. |
| U8 | Record types Contact (`useRecordTypeCheck=1` sans sélecteur visible). |
| U9 | Propriétaire, partage, et champs système sur la création et la fiche. |
| U10 | Formats et longueurs de Phone, Email, Title, Description, adresse. |
| U11 | Colonnes Salesforce de la liste associée Contacts sur Account. |
| U12 | Historique de consultation des contacts (liste Recent non ouverte). |

## 5. Limite de jeu de données

L'org trial de la session avait 0 contact. Conséquences directes : pas de ligne pour lire les colonnes, pas de fiche pour lire le bandeau, pas de lookup peuplé pour lire les colonnes de résultat de Account Name ou Reports To. « 0 items » est le seul résumé de liste retenu.
