# Préparation — connexion REA et reconnaissance Salesforce

Rapport du 13 octobre 2026, agent cloud sur l'environnement CRM Lab `DKSolution28/crm-lab`.

La reconstruction du CRM n'a pas commencé. La CLI REA 6.4.0 et Chromium CDP fonctionnent. Le serveur MCP REA n'est pas enregistré pour les agents cloud : les outils `list_browser_targets` et `inspect_web_page` ne font pas partie du catalogue de cette session. Une sonde stdio locale, lancée à part, a réussi ces deux appels sur une page de test. Cette sonde ne remplace pas l'enregistrement cloud.

La session Salesforce distincte est ouverte sur la page publique de connexion. Aucune Developer Org n'est authentifiée. Une personne doit terminer l'identifiant, le domaine personnalisé (SSO) s'il est utilisé, et la MFA si l'org l'exige.

## Synthèse

| Contrôle | Résultat |
| --- | --- |
| Paquet `rea-agents` 6.4.0 | Présent. `npx rea-agents@6.4.0 --version` affiche `6.4.0`. Node `v24.21.0`. |
| Serveur MCP stdio REA | `rea mcp doctor` est sain : serveur `rea` 6.4.0, protocole `2025-11-25`, 170 outils sur 170. |
| Enregistrement MCP visible par cet agent cloud | Absent. Namespaces reçus : `cursor`, `cursor-cloud`, `cursor-subscriptions`. Pas de namespace `rea`. |
| Fichiers `mcp.json` | Absents : `/home/ubuntu/.cursor/mcp.json` et `.cursor/mcp.json` du dépôt. |
| Chromium et CDP `127.0.0.1:9222` | Chrome/156.0.8078.4, protocole CDP 1.3, profil `/tmp/crm-lab-cdp`. |
| `list_browser_targets` et `inspect_web_page` | Réussis uniquement par une sonde stdio locale, sur `http://127.0.0.1:8765/`. Non appelables comme outils de cet agent. |
| Session Salesforce distincte | Chromium séparé, port `127.0.0.1:9333`, profil `/tmp/crm-lab-salesforce-cdp`. Page `Login \| Salesforce`. |
| Module Accounts | Non exploré. Plan dans `accounts-exploration-plan.md`. |

## CLI installée et connexion MCP

Ce sont deux états différents.

Le dépôt déclare `rea-agents` `6.4.0` et le binaire `/workspace/node_modules/.bin/rea` répond. `rea doctor --client cursor --json` se termine en échec. Le contrôle qui concerne cette phase est `registration:cursor` : état `missing`, chemin `/home/ubuntu/.cursor/mcp.json`. Les moteurs Hopper, Ghidra et IDA sont aussi absents. Ils ne sont pas requis pour l'observation navigateur.

`rea setup --client cursor --dry-run --json` propose d'écrire cet `mcp.json` local avec la commande `npx -y rea-agents@6.4.0 mcp`, puis d'installer le skill dans `/home/ubuntu/.agents/skills/reverse-engineer-anything`. Ce plan n'a pas été appliqué. Les agents cloud ne chargent ni `~/.cursor/mcp.json` ni `.cursor/mcp.json` du dépôt. Écrire ces fichiers rendrait `rea doctor --client cursor` vert sans rendre les outils disponibles ici. Le skill REA, même installé, n'enregistre pas le serveur MCP.

`rea mcp doctor` prouve seulement que le processus stdio démarre et publie son catalogue. Le contrôle `request-flow` de doctor appelle `binary_session`, pas les outils navigateur.

### Configuration manquante

Les agents cloud reçoivent les serveurs MCP activés dans le compte, au démarrage de la session. Les ajouter dans le menu MCP de [cursor.com/agents](https://cursor.com/agents), ou, pour une équipe, dans Dashboard → Plugins & MCPs. SSE et `mcp-remote` ne sont pas pris en charge. REA 6.4.0 n'expose pas d'endpoint HTTP : le transport attendu est stdio.

Enregistrement à créer et à activer avant un nouvel agent :

- Nom : `rea`
- Transport : stdio
- Commande : `npx`
- Arguments : `-y`, `rea-agents@6.4.0`, `mcp`
- Variables d'environnement : aucune. Ne pas y placer d'identifiants Salesforce.

Le paquet est déjà installé dans cette VM par `package.json`. Épingler `6.4.0` évite de dériver vers une autre version. Après l'enregistrement, seul un nouvel agent cloud voit les outils. Cette session ne peut pas les acquérir en cours de route.

La confirmation attendue au prochain run est la présence des outils dans le catalogue de l'agent, puis un appel `list_browser_targets` fait par cet agent. Un doctor vert ou une sonde stdio locale ne suffisent pas.

## Chromium et CDP

Le navigateur du lab tourne déjà :

- Binaire : `/home/ubuntu/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`
- Arguments : `--headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/crm-lab-cdp`
- `GET http://127.0.0.1:9222/json/version` : produit `Chrome/156.0.8078.4`, protocole `1.3`
- L'application lab répond `{"ok":true,"database":"up"}` sur `http://127.0.0.1:3000/api/health`

L'URL WebSocket DevTools n'est pas reproduite ici : c'est un secret de session local.

## Sonde des outils navigateur

Les outils ont été appelés en ouvrant un client MCP stdio sur `/workspace/node_modules/.bin/rea mcp`. Ce client n'est pas l'agent cloud.

Le schéma MCP exige `cdp_endpoint` et, pour l'inspection, `target_id`. Un premier appel avec la clé CLI `endpoint` a été rejeté : `Unrecognized key: "endpoint"`. Les arguments de `rea list-browser-targets` ne sont donc pas ceux du tool MCP.

Page de test servie uniquement sur `127.0.0.1:8765`, titre `CRM Lab REA test page`, texte `local-test-page`. Onglet ouvert dans le Chromium du lab.

`list_browser_targets` avec `cdp_endpoint` `http://127.0.0.1:9222` et origine `http://127.0.0.1:8765` :

- Evidence `ev_aa9baca9be5e461c19451eb901ebfa723376fb01295bc8d6fc403d815b5d9efe`
- Une page retenue, titre `CRM Lab REA test page`
- Exclusions : 1 URL non supportée (`about:blank`), 3 cibles non page

`inspect_web_page` sur cette cible, observation 500 ms, texte d'accessibilité inclus, sources de scripts et stockage exclus :

- Evidence `ev_04185fa3446ac33ae416022b6173b1cb757a8f48421fc8bfb975e117f6285c39`
- 22 nœuds DOM
- Titres accessibles observés : `CRM Lab browser probe` et `local-test-page`
- Complétude `policy_filtered`, ce qui correspond aux sections non demandées

Ces Evidence IDs appartiennent à la session du processus MCP, déjà terminée. Ils ne sont pas rejouables. Le résumé conservé est `evidence/stdio-browser-probe.json`.

## Session Salesforce

Second Chromium, profil et port distincts du lab :

- Port CDP : `127.0.0.1:9333`
- Profil : `/tmp/crm-lab-salesforce-cdp`
- Même binaire Playwright, headless
- Première navigation : `https://login.salesforce.com/`
- Aucun identifiant saisi, aucun cookie du lab partagé, aucun contournement

`list_browser_targets` sur `http://127.0.0.1:9333` ne voit qu'une page : titre `Login | Salesforce`, origine `https://login.salesforce.com`, chemin `/`, sans query string.

`inspect_web_page` (Evidence `ev_17400df7ec030b042b348cf94fe24da8a32c4f35aa3ffdacff15dc371e6bd94b`) observe un formulaire de connexion : bouton `Log In`, champ nommé `Username`, case `Remember me`, liens `Use Custom Domain`, `Log In with Email` et `Forgot Your Password?`. Un seul textbox nommé est présent dans l'arbre d'accessibilité. Le résumé ne contient ni cookies, ni corps de requêtes, ni valeurs de champs. Le stockage rapporté par REA est vide et marqué `values_redacted`.

Aucun hostname d'org (`*.my.salesforce.com`, Lightning) n'a été ouvert. Le module Accounts n'a pas été atteint.

### Intervention humaine

Le dépôt ne contient pas d'URL d'org, de jeton ni de session Salesforce. `.env.example` ne porte que la base locale.

Pour continuer, une personne autorisée sur la Developer Org doit prendre la main sur le bureau de l'agent et se connecter dans le profil `/tmp/crm-lab-salesforce-cdp`. Le Chromium actuel est headless et verrouille ce profil : il faudra l'arrêter, puis relancer le même profil en mode affiché sur le bureau de la VM. Ne pas coller de mot de passe, cookie ou code MFA dans le chat ni dans le dépôt.

- Si l'org utilise My Domain ou un fournisseur d'identité, le lien observé `Use Custom Domain` est l'entrée SSO. La redirection IdP n'a pas eu lieu, parce que le formulaire n'a pas été soumis.
- La MFA, si l'org l'exige, apparaît après le premier facteur. Elle n'est pas visible sur cette page. Le code doit être saisi par la personne, dans le navigateur.

Tant que cette session reste sur `login.salesforce.com`, l'accès à l'environnement Salesforce n'est pas validé.

## Suite

1. Enregistrer et activer le serveur stdio `rea` décrit ci-dessus, puis lancer un nouvel agent cloud.
2. Dans ce nouvel agent, appeler `list_browser_targets` depuis le catalogue cloud, sur le CDP du lab, et conserver l'Evidence.
3. Authentifier la Developer Org dans le profil Salesforce, avec SSO ou MFA si l'org les demande.
4. Exécuter `accounts-exploration-plan.md` et déposer uniquement des preuves structurelles dans ce dossier.
5. Commencer la reconstruction du CRM seulement après les étapes 2 et 3.
