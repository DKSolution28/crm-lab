# Plan d'exploration — module Accounts

Ce plan est prêt. Il n'a pas été exécuté. Le catalogue MCP de l'agent cloud ne contient pas REA, et la session Salesforce du port `9333` est arrêtée sur `https://login.salesforce.com/`.

## Conditions d'entrée

- Un nouvel agent cloud voit les outils REA, dont `list_browser_targets` et `inspect_web_page`.
- Le navigateur Salesforce reste celui du profil `/tmp/crm-lab-salesforce-cdp`, port CDP `127.0.0.1:9333`. Ne pas réutiliser le profil lab `/tmp/crm-lab-cdp`.
- Une personne autorisée a terminé la connexion, y compris My Domain / SSO et MFA si l'org les présente.
- L'URL observée est une org Lightning de cette Developer Org, pas la page `Login | Salesforce`.
- Aucun secret n'est écrit dans le dépôt. REA omet déjà cookies, en-têtes d'autorisation et valeurs de stockage. Ne pas réactiver `include_script_sources` ni les formes de corps JSON tant que le besoin n'est pas nommé, et ne pas conserver de donnée personnelle de comptes de démonstration au-delà de la structure.

## Parcours à observer

Chaque ligne doit produire une Evidence REA, ou être marquée non atteinte avec la limite observée.

1. Navigation. App Launcher, entrée Accounts, URL Lightning obtenue, titre de page. Noter les autres applications visibles sans les ouvrir.
2. Liste. Colonnes, vues de liste, recherche de liste, tri, pagination, état vide. Relever les libellés et l'ordre, pas le contenu des lignes si ce sont des données personnelles.
3. Fiche. Ouverture d'un enregistrement de démonstration, en-tête, champs affichés, listes associées, onglets. Décrire les sections et les types de champs.
4. Formulaires. Nouveau compte et modification : champs obligatoires, valeurs par défaut visibles, messages de validation affichés sans soumettre de donnée réelle hors org de démo. Ne pas créer d'enregistrement dans une org qui n'est pas la Developer Org autorisée.
5. Filtres. Filtres de la vue de liste et recherche. Noter les champs filtrables et les opérateurs proposés.
6. Interactions. Actions de ligne, actions globales de la vue, édition inline si elle est offerte, confirmation avant suppression. Observer les libellés. Ne pas supprimer d'enregistrement pendant cette passe.

## Outils

Commencer par `list_browser_targets` sur `http://127.0.0.1:9333`, filtré par l'origine exacte de l'org une fois qu'elle est connue. Enchaîner avec `inspect_web_page` sur le `target_id` retenu. `capture_web_screenshot` seulement si la structure accessible ne suffit pas, et après contrôle visuel que la capture ne montre pas de session ni de donnée hors sujet.

Les arguments MCP sont `cdp_endpoint` et `target_id`. Ce ne sont pas les arguments de la CLI `rea list-browser-targets`.

## Sortie

Ajouter les résumés non sensibles dans `docs/reverse-engineering/accounts/evidence/`. Pour chaque écran : Evidence ID, URL réduite à l'origine et au chemin, titre, libellés structurels, limites. Écarter les query strings de session.

La reconstruction des écrans Accounts dans le lab Next.js attend ce dossier et la validation d'accès.
