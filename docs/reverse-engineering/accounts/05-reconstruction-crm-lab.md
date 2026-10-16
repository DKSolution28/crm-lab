# Reconstruction du module Accounts dans CRM Lab — comparaison avec les observations REA (2026-10-14)

Phase 3 de la mission : reconstruire localement, avec des données fictives, le module Accounts à partir des fiches d'écran (`03-fiches-ecrans-accounts.md`) et de la spécification (`spec-accounts.md`). Les captures CRM Lab de ce document sont dans `reconstruction/` (Chromium 1280×800, données de démonstration du seed) ; les captures Salesforce de référence sont dans `evidence/2026-10-14-*.png`.

Aucune ressource Salesforce (icônes, feuilles de style, libellés d'aide, code) n'a été copiée : les captures servent de référence ergonomique (structure des écrans, libellés fonctionnels, enchaînements).

Classification : **Observé** (reproduit tel que vu), **Déduit** (métadonnées / convention), **Conçu** (choix CRM Lab). Vue d'ensemble dans `../../coverage.md`.

## 1. Tableau de correspondance écran par écran

| Fiche | Capture Salesforce | Capture CRM Lab | Correspondance | Différences et limites |
| --- | --- | --- | --- | --- |
| NAV-0 Accueil | `evidence/2026-10-14-NAV-0.png` | `reconstruction/NAV-0-home.png` | Conçu | CRM Lab garde sa page de notes existante et ajoute le lien « Ouvrir le module Accounts » ; pas d'accueil Salesforce (tableau de bord, To Do List). |
| NAV-1 Accès au module | `…-NAV-1.png` | `reconstruction/LST-2-view-selector.png` (sans menu) | Observé | Navigation verticale avec Home / Accounts ; Contacts et Opportunities sont présents mais désactivés (« Module à venir ») au lieu des 10 onglets Salesforce. Actions d'objet réduites à **New** (Import, Add to an Actionable List, Assign Label non reproduits). |
| LST-1 Recently Viewed | `…-LST-1.png` | `reconstruction/LST-1-recently-viewed.png` | Observé | Colonnes Account Name / Phone / Account Owner Alias, tri désactivé (info-bulle « Column sort is unavailable for this list view. »). Salesforce affichait une liste vide ; CRM Lab montre les consultations du seed. |
| LST-2 Sélecteur de vues | `…-LST-2.png` | `reconstruction/LST-2-view-selector.png` | Observé | Menu « Search lists... », liste des vues avec « (Pinned list) », bouton d'épinglage. Vue « Recently Viewed Accounts » (variante) non créée. État vide « Accounts show where your contacts work » + « Add an Account » reproduit (visible quand la base est vide ou via une vue sans résultat : « No items to display. », conçu). |
| LST-3 Modes d'affichage | `…-LST-3.png` | `reconstruction/LST-3-display-modes.png` | Observé | Menu Table / Kanban / Split View ; icônes textuelles au lieu d'icônes SLDS. |
| LST-4 List View Controls | `…-LST-4.png` | `reconstruction/LST-4-list-view-controls.png` | Observé (menu) / Déduit (dialogues) | New, Clone, Rename, Sharing Settings, Select Fields to Display, Delete implémentés ; Reset Column Widths présent mais désactivé ; « Edit List » et « Charts » absents. Le contenu des dialogues (nom, « Who sees this list view? », champs disponibles / visibles) est déduit, ces dialogues n'ayant pas été ouverts dans Salesforce. |
| LST-5 Kanban Settings | `…-LST-5.png` | `reconstruction/LST-5-kanban-settings.png`, `LST-5b-kanban-board.png` | Observé (paramètres) / Conçu (cartes) | Summarize By optionnel et Group By obligatoire (« Complete this field. » si vide), mêmes champs de regroupement (Account Owner, codes pays/état, Type). Les cartes (nom, ville/pays, propriétaire, total par colonne) n'ont pas été observées : conçues ; pas de glisser-déposer. |
| LST-6 Split View | `…-LST-6.png` | `reconstruction/LST-6-split-view-empty.png`, `LST-6b-split-view-selected.png` | Observé | Liste compacte à gauche, « No record selected » / « Select an item from this list to open it. », fiche à droite avec boutons Open / Edit (conçu). |
| LST-7 Recherche dans la liste | `…-LST-7.png` | `reconstruction/LST-7-list-search.png` | Observé | « Search this list... » + Clear, résumé « N items • Sorted by • Filtered by … • Search: “…” ». Déclenchée à Entrée (Salesforce : filtrage instantané). Champs recherchés conçus (nom, numéro, téléphone, site web, villes, site, ticker). |
| FLT-1 Panneau Filters | `…-FLT-1.png` | `reconstruction/FLT-1-filters-panel-system-view.png` | Observé / Conçu | Même structure (Filtered by, Matching all of these filters, Add Filter, Remove All, Add Filter Logic, Cancel / Save). Conçu : sur une vue système, le panneau est en lecture seule pour un utilisateur standard (« Clone it to filter it. »). |
| FLT-2 Ajout d'un filtre | `…-FLT-2.png` | `reconstruction/FLT-2-add-filter.png` | Observé | Field / Operator / Value / Remove. Salesforce édite dans un popover avec « Done » ; CRM Lab édite directement dans la ligne. 9 opérateurs texte observés ; opérateurs des autres types déduits. |
| FLT-3 Filtre picklist | `…-FLT-3.png` | `reconstruction/FLT-3-picklist-filter.png`, `FLT-3b-filter-applied.png` | Observé | Multi-sélection « N options selected » ; après Save, résumé « + 1 filter ». « More Filter Options » non reproduit. |
| FLT-4 Retrait des filtres | `…-FLT-4.png` | `reconstruction/FLT-4-filters-removed.png` | Observé | Remove All puis Save ; message « No additional filters. » (conçu). |
| FRM-1 New Account | `…-FRM-1.png` | `reconstruction/FRM-1-new-account.png` | Observé | Dialogue « New Account », « * = Required Information », About (Account Name*, Website, Type, Description, Parent Account, Account Owner) et Get in Touch (Phone, Billing / Shipping Address avec Country, Street, City, State/Province, Zip/Postal Code), Cancel / Save & New / Save, croix « Cancel and close ». Différences : disposition sur deux colonnes ; page dédiée `/accounts/new` rendue comme un dialogue (adressable, testable) au lieu d'une modale sur la liste ; Account Owner modifiable par un administrateur (conçu) ; groupe repliable « Additional Information » pour les champs hors layout (conçu). |
| FRM-2 Undo | `…-FRM-2.png` | `reconstruction/FRM-2-undo-website.png` | Observé | Lien « Undo » (aria-label « Undo Website ») dès qu'un champ change, en création comme en modification. |
| FRM-3 Validation au blur | `…-FRM-3.png` | `reconstruction/FRM-3-complete-this-field.png` | Observé | « Complete this field. » sous Account Name à la perte de focus et au Save ; même message renvoyé par le serveur et l'API. |
| INT-1 / INT-2 Actions de masse | `…-INT-1.png`, `…-INT-2.png` | — | Non reproduit | Assign Label et Add to an Actionable List hors périmètre ; la sélection Select All / cases de ligne (« N items selected ») est reproduite. |
| INT-3 / INT-4 Import | `…-INT-3.png`, `…-INT-4.png` | — | Non reproduit | L'assistant d'import CSV et le dialogue « Leave Import Data » ne font pas partie de la reconstruction. |
| INT-5 Contact → Account | `…-INT-5.png` | `reconstruction/REC-2-record-related.png` | Observé (relation) / Conçu (affichage) | La relation est matérialisée par le modèle `Contact` et l'onglet Related ; pas de formulaire New Contact. |
| NAV-3 Recherche globale | `…-NAV-3a/b/c.png` | `reconstruction/NAV-3-global-search-no-match.png`, `NAV-3b-global-search-results.png` | Observé (page de résultats) | « <terme> - Search », Top Results, compteurs par objet, message « We searched the objects you use most and didn't find any matches for "…" ». Non reproduits : suggestions en langage naturel, rapports et vues récents, sélecteur « Search by object type ». |
| SET-1 Object Manager | `…-SET-1.png` | — (schéma Prisma) | Observé | Les 27 champs, types, longueurs et picklists sont portés par `prisma/schema.prisma` et `src/lib/accounts/picklists.ts`. |
| Fiche d'enregistrement | non observée | `reconstruction/REC-1-record-details.png`, `REC-2-record-related.png` | Déduit / Conçu | Panneau de synthèse (Type, Phone, Website, Account Owner), onglets Details (About / Get in Touch / History d'après le layout « Account Layout ») et Related (Contacts, Opportunities, Child Accounts). Onglets Activity / Chatter et actions rapides non implémentés. |
| Modification | non observée | `reconstruction/REC-3-edit-account.png` | Conçu | Même formulaire pré-rempli, Undo par champ, autorisation propriétaire / administrateur ; pas d'édition en ligne. |

## 2. Différences transversales

1. **Habillage** : CRM Lab utilise Tailwind et des pictogrammes textuels ; aucune ressource graphique Salesforce n'est embarquée. La hiérarchie des écrans, les libellés fonctionnels et les enchaînements suivent les observations.
2. **Modales** : New Account et Edit sont des pages à présentation de dialogue (URL propre) plutôt que des modales superposées à la liste ; le bouton « Cancel and close » renvoie à la liste ou à la fiche.
3. **Données** : Salesforce a été observé vide (0 compte) ; CRM Lab est livré avec 12 comptes fictifs, ce qui rend visibles des états non observés (Kanban avec cartes, Split View avec fiche, Recently Viewed peuplée).
4. **Utilisateur** : un seul profil observé. CRM Lab introduit deux utilisateurs de démonstration (administrateur / standard) et un sélecteur pour vérifier les règles d'autorisation conçues.
5. **Périmètre** : import, actions de masse, édition en ligne, suppression, doublons, Chatter / Activity, graphiques et suggestions de recherche ne sont pas reconstruits.

## 3. Vérification

- Captures CRM Lab générées par un script Playwright à partir des données du seed, sans donnée personnelle.
- Parcours manuel enregistré (création, consultation, modification, recherche, Kanban, filtre) et suites automatisées : voir `../../coverage.md` §7 (26 unitaires, 13 intégration, 23 Playwright, tous réussis).
- Aucune interaction avec l'org Salesforce pendant cette phase : la session navigateur de la phase 2 est restée inutilisée.
