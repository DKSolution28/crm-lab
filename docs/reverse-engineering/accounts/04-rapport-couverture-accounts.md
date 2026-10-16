# Rapport de couverture — exploration du module Accounts (2026-10-14)

Mission : exploration complète du module Accounts d'une org Salesforce autorisée (connexion et MFA effectuées par une personne), observation passive avec REA 6.4.0, sans créer, modifier ni supprimer de donnée, et avec anonymisation des preuves avant dépôt. La reconstruction CRM n'a pas commencé.

## 1. Vérifications préalables

| Vérification | Résultat |
| --- | --- |
| CDP `127.0.0.1:9223` joignable, page Lightning ouverte | OK — `list-browser-targets` retourne la page `…lightning.force.com/lightning/…` (plus iframe sessionserver, shared worker CometD). |
| Redécouverte du `target_id` à chaque capture | OK — fait par `scripts/sf-observe.sh` (`list-browser-targets` → `inspect-web-page` → `capture-web-screenshot`). |
| REA en MCP natif dans Cursor Cloud Agent | **Toujours indisponible** dans cette exécution (aucun espace de noms REA parmi les outils dynamiques) ; `.cursor/mcp.json` et `scripts/check-rea-mcp.mjs` prouvent que le serveur MCP fonctionne, mais l'enregistrement côté tableau de bord Cursor (Plugins & MCPs) n'a pas été fait. Conformément à la consigne, la CLI REA a été utilisée sans bloquer. |
| Domaine Setup | Les pages Object Manager sont servies sur `*.my.salesforce-setup.com` ; les scripts d'observation acceptent ce domaine en plus de `lightning.force.com`. |
| Aucune donnée créée | Vérifié après chaque formulaire : All Accounts « 0 items », All Contacts « 0 items ». Le garde-fou de `scripts/sf-act.mjs` refuse tout clic sur Save / Save & New / Delete / Change Owner / Submit / Merge / Next. |
| Anonymisation | Masquage DOM avant chaque capture (`mask`), puis redaction JSON par règles externes (`SF_REDACTION_FILE`, hors dépôt). Scan des 25 JSON déposés : aucun My Domain, identifiant d'org/utilisateur, e-mail ni nom de personne. Les 25 PNG ont été relus : pas de donnée personnelle (en-tête utilisateur masqué, « Welcome, <user> »). |

## 2. Couverture par rapport au plan

| Id plan | Écran | Couverture | Preuves |
| --- | --- | --- | --- |
| NAV-1 | Accès au module, onglet, application hôte | Observé | NAV-0, NAV-1 |
| NAV-2 | Fil d'Ariane de la fiche, retour à la liste | **Non observable** (aucun enregistrement) | — |
| NAV-3 | Recherche globale | Observé (suggestions, terme, page de résultats) | NAV-3a/b/c |
| LST-1 | Recently Viewed | Observé (vide) | LST-1 |
| LST-2 | Vues standard | Observé : liste des vues, All Accounts ; My Accounts / New This Week non ouvertes (identiques en structure, vides) | LST-2 |
| LST-3 | Table / Kanban / Split view | Observé (Kanban Settings, Split view vide) | LST-3, LST-5, LST-6 |
| LST-4 | Édition en ligne, sélection multiple | Partiel : contrôles présents (Edit List, Select All) ; comportement **non observable** sans lignes | LST-4, LST-7 |
| FIC-1…FIC-5 | Fiche, Details, Related, hiérarchie, Activity | **Non observable** (0 enregistrement). Compensé par les métadonnées du layout « Account Layout » (sections, listes associées) | SET-1 |
| FRM-1 | Création | Observé : champs, sections, obligatoire, validation client, Cancel | FRM-1/2/3 |
| FRM-2 | Modification | **Non observable** | — |
| FRM-3 | Édition en ligne sur la fiche | **Non observable** | — |
| FRM-4 | Suppression, duplication, changement de propriétaire | **Non observable** et interdit par la consigne | — |
| FRM-5 | Détection de doublons | **Non observable** (nécessite Save) | — |
| FLT-1 | Panneau de filtres | Observé : champs, opérateurs texte, picklist multi-valeurs, logique | FLT-1…FLT-4 |
| FLT-2 | Création / partage d'une vue | Partiel : menu List View Controls observé ; formulaire non ouvert (éviterait de justesse une création) | LST-4 |
| FLT-3 | Tri par colonne, recherche dans la liste | Observé (recherche) ; tri présent mais sans effet visible sur 0 ligne | LST-7 |
| INT-1 | Actions rapides depuis la fiche | **Non observable** ; relation Contact → Account observée via New Contact | INT-5 |
| INT-2 | Chatter / notes | **Non observable** | — |
| INT-3 | Messages système | Observé : 2 toasts d'erreur, dialogue « Leave Import Data », message de recherche sans résultat | INT-1, INT-2, INT-4, NAV-3c |
| INT-4 | Permissions (profil standard vs admin) | **Non observable** : un seul utilisateur disponible | — |
| Ajouts | Import Accounts, Object Manager (champs, picklists, layouts, règles) | Observé | INT-3, INT-4, SET-1 |

Bilan : 25 observations REA (écrans et états), 15 identifiants du plan couverts totalement ou partiellement, 9 non observables dans cet environnement.

## 3. Fonctionnalités observées (résumé)

- Navigation : onglet Accounts → vue épinglée ; actions d'objet New / Import / Add to an Actionable List / Assign Label ; recherche globale multi-objets avec suggestions en langage naturel.
- Listes : 5 vues (All Accounts, My Accounts, New This Week, Recently Viewed, Recently Viewed Accounts) ; colonnes différentes entre Recent et All ; résumé « items • Sorted by • Filtered by » ; recherche dans la liste ; modes Table / Kanban (regroupement par Owner, codes pays/état, Type) / Split view ; gestion des vues (New, Clone, Rename, Sharing Settings, Select Fields to Display, Delete, Reset Column Widths).
- Filtres : 36 champs, 9 opérateurs texte, multi-sélection pour picklists, logique ET / expression, enregistrement dans la vue.
- Formulaire New Account : modale, sections About / Get in Touch, Account Name obligatoire, Owner en lecture seule, adresses composées avec pays/état en picklists dépendantes, Save / Save & New / Cancel, validation au blur « Complete this field. », Undo par champ.
- Messages : toasts d'erreur pour actions de masse sans sélection ; dialogue de confirmation à la sortie de l'import ; message de recherche sans résultat.
- Modèle de données : 27 champs (types, indexation), 5 picklists avec valeurs (dont 3 valeurs Industry inactives), 0 règle de validation, 0 type d'enregistrement, layouts et listes associées (Contacts, Open Activities, Activity History, Opportunities, Cases, Partners, Files, Notes & Attachments).

## 4. Inconnues restantes

1. Page d'enregistrement Account : panneau de synthèse (highlights), onglets Details / Related / Activity / Chatter, actions rapides, champs en lecture seule.
2. Modification (Edit), édition en ligne (fiche et liste), Undo/Save groupé, messages d'erreur serveur.
3. Hiérarchie de comptes (View Account Hierarchy) et colonnes « Hierarchy Columns ».
4. Kanban avec cartes, glisser-déposer, « Summarize By ».
5. Détection de doublons et règles de correspondance.
6. Suppression, clonage, changement de propriétaire, fusion et effets sur les enregistrements liés.
7. Chatter, notes, fichiers, activités (Track Activities désactivé dans cette org).
8. Différences de permissions entre profils (un seul utilisateur).
9. Opérateurs de filtre pour dates, nombres, cases à cocher, lookups ; formulaire de création de vue (visibilité).
10. Options du lookup Parent Account (item « New Account » ?) et liste des 36 « Buttons, Links, and Actions » (lecture partielle).
11. Métadonnées réseau : REA s'attache après le chargement (`prior_activity_available: false`) ; aucune requête n'a été capturée pendant les fenêtres de 2 s. Une observation `observe-web-session` pendant une navigation reste à faire pour documenter les appels Aura/UI API.

## 5. Blocages

| Blocage | Impact | Action proposée |
| --- | --- | --- |
| **Org trial sans aucun enregistrement** (0 Account, 0 Contact) et interdiction de créer des données | Toute la partie fiche/édition/relations peuplées est non observable (items 1–7 ci-dessus) | Option A : la personne autorisée crée quelques comptes/contacts de démonstration (données fictives) dans l'org, puis relance de `scripts/sf-observe.sh` sur FIC/FRM-2/FRM-3 ; Option B : accès à une Developer Org avec données d'exemple (les Developer Orgs standard en contiennent). |
| **REA non enregistré comme MCP pour les agents cloud** | Les outils REA ne sont pas appelables nativement par l'agent ; la CLI est utilisée (fonctionnel mais hors contrat MCP) | Déclarer le serveur `npx -y rea-agents@6.4.0 mcp` (stdio) dans Cursor Dashboard › Plugins & MCPs (voir `00-rapport-preparation.md`). |
| **Un seul utilisateur / profil** | INT-4 (permissions) non observable | Créer un utilisateur de démonstration avec profil standard, ou documenter les permissions depuis Setup › Profiles en lecture seule. |
| Lenteur des pages Setup (35–45 s par navigation) et masque non appliqué dans l'iframe Setup | Les textes bruts des pages Setup restent hors dépôt (uniquement les valeurs métier ont été reportées) | Étendre `mask` aux frames si des captures Setup supplémentaires doivent être déposées. |

## 6. Interventions humaines requises

- Aucune intervention SSO/MFA supplémentaire n'a été nécessaire pendant l'exploration (session maintenue).
- Décision attendue : autoriser (ou non) la création de données de démonstration fictives dans l'org pour couvrir les inconnues 1–7, et enregistrer REA en MCP dans le tableau de bord Cursor.

## 7. Outils ajoutés

| Script | Rôle |
| --- | --- |
| `scripts/sf-act.mjs` | Actions de lecture (goto, click, fill, snapshot, mask, framesText) via Playwright connecté au CDP 9223 ; refuse Save/Delete/… |
| `scripts/sf-observe.sh <Id>` | Chaîne REA `list-browser-targets` → `inspect-web-page` → `capture-web-screenshot`, sorties brutes dans `/tmp/sf-explore`. |
| `scripts/sf-redact-evidence.mjs <Id…>` | Produit `evidence/<date>-<Id>.json|.png` anonymisés à partir des sorties brutes et d'un fichier de règles hors dépôt. |
