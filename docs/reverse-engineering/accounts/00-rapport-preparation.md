# Rapport de préparation — Phase 2 : connexion REA MCP et reconnaissance Salesforce

Date : 2026-10-13 · Environnement : Cursor Cloud Agent, VM Ubuntu 24.04, dépôt `crm-lab` (branche de phase 2) · Node 24.21.0 · REA (`rea-agents`) 6.4.0 · Chromium 156.0.8078.4 (Playwright 1.64.0).

Verdict court : **l'outillage REA fonctionne de bout en bout dans la VM (CLI et serveur MCP, 170 outils, observation CDP validée sur une page de test), mais le serveur MCP REA n'est pas exposé aux agents cloud** : il manque l'enregistrement côté tableau de bord Cursor Cloud Agents. **L'accès à une Salesforce Developer Org n'est pas encore établi** : la session navigateur dédiée est prête, aucune authentification n'a été tentée. La reconstruction du CRM ne démarre pas.

## 1. Tests réussis

| # | Test | Résultat | Preuve |
| --- | --- | --- | --- |
| 1 | REA 6.4.0 disponible | `node_modules/rea-agents` 6.4.0, `npx rea-agents@6.4.0 --version` → `6.4.0`, 127 commandes CLI, catalogue 170 outils MCP / 6 prompts. `rea doctor` sort en code 1 pour des raisons attendues : moteurs natifs absents (Hopper, Ghidra, IDA — hors périmètre web) et deux dérives de configuration (skill non installé, enregistrement Cursor `~/.cursor/mcp.json` absent). | `evidence/2026-10-13-rea-doctor.json` |
| 2 | Serveur MCP REA démarre et répond (stdio) | `rea mcp doctor` : `healthy: true`, `initialize` OK (`rea@6.4.0`, protocole MCP `2025-11-25`), 170/170 outils, 6/6 prompts, digest de catalogue conforme, flux de requête OK. | `evidence/2026-10-13-rea-mcp-doctor.json` |
| 3 | Client MCP réel → `tools/list` + `tools/call` | `node scripts/check-rea-mcp.mjs` (client `@modelcontextprotocol/client` 2.3.1 lançant `npx -y rea-agents@6.4.0 mcp`) : 170 outils listés, `list_browser_targets`, `inspect_web_page`, `capture_web_screenshot`, `observe_web_session` présents ; appels `list_browser_targets` et `inspect_web_page` sans erreur, `evidence_id` retournés. | `evidence/2026-10-13-check-rea-mcp.json` |
| 4 | Chromium + CDP sur `127.0.0.1:9222` | `/json/version` → `Chrome/156.0.8078.4`, `Protocol-Version 1.3`, `webSocketDebuggerUrl` loopback ; processus lancé par `scripts/start-cdp-browser.sh` (profil `/tmp/crm-lab-cdp`, headless). | `evidence/2026-10-13-cdp-json-version-9222.json` |
| 5 | `list_browser_targets` sur page de test | Après ouverture de `http://127.0.0.1:3000/` dans le navigateur CDP : 1 cible `page` « CRM Lab », origine `http://127.0.0.1:3000` ; `about:blank` et cibles non-page correctement exclues. | `evidence/2026-10-13-list-browser-targets-lab.json` |
| 6 | `inspect_web_page` sur page de test | Observation passive 1,5 s : 189 nœuds DOM, 155 nœuds d'accessibilité (landmarks : « Notes de laboratoire », « Nouvelle note », champs « Titre », « Détail », bouton « Enregistrer »), 18 scripts, requêtes réseau et WebSocket HMR listés sans corps, stockage `values_redacted: true`. `completeness.status = policy_filtered` : sources de scripts, texte console et formes JSON exclus par défaut (non approuvés), comme attendu. | `evidence/2026-10-13-inspect-web-page-lab-summary.json` |
| 7 | `capture_web_screenshot` | PNG du viewport de la page de test (sha256 `1719fc10…`, 22 151 octets). | `evidence/2026-10-13-rea-capture-lab-page.png` |
| 8 | Session navigateur Salesforce distincte | `scripts/start-salesforce-browser.sh` : Chromium visible sur `DISPLAY=:1`, port CDP `9223`, profil isolé `/tmp/crm-lab-salesforce`, ouvert sur `https://login.salesforce.com/` (page publique). `list_browser_targets` sur `9223` ne voit que « Login \| Salesforce » ; `9222` continue de ne voir que le lab : isolation vérifiée. Capture REA de la page de connexion réalisée. | `evidence/2026-10-13-list-browser-targets-salesforce-session.json`, `evidence/2026-10-13-rea-capture-salesforce-login.png` |
| 9 | Sortie réseau vers Salesforce | `login.salesforce.com`, `test.salesforce.com`, `developer.salesforce.com` répondent 200 depuis la VM ; politique d'egress de l'environnement : non restreinte. | Journal de session (non versionné). |
| 10 | Serveur lab + base | `GET /api/health` → `{"ok":true,"database":"up"}` ; migrations Prisma à jour. | Journal `start-user.log`. |

## 2. Blocages réels

### B1 — Le serveur MCP REA n'est pas enregistré pour les agents cloud (bloquant)

Constat dans ce run : les seuls espaces de noms MCP disponibles à l'agent sont `cursor-cloud`, `cursor-subscriptions` et `cursor` ; aucun outil `list_browser_targets` / `inspect_web_page` n'est exposé. Aucun événement `mcp_auth_error` : le serveur n'a tout simplement jamais été déclaré.

Ne pas confondre :

| Niveau | État | Ce que cela couvre |
| --- | --- | --- |
| CLI installée (`npm ci` → `rea-agents@6.4.0`) | OK | Commandes `npx rea-agents@6.4.0 …` dans le terminal de l'agent. |
| Serveur MCP exécutable dans la VM (`rea mcp`) | OK | Prouvé par `rea mcp doctor` et `scripts/check-rea-mcp.mjs`. |
| Enregistrement MCP côté client | **Manquant pour les agents cloud** | Ce qui donne à l'agent des *outils* `rea.*` dans sa conversation. |

Configuration manquante, précisément : d'après la documentation Cursor (« Cloud Agent → Capabilities → MCP tools »), les agents cloud utilisent les serveurs MCP **configurés dans le tableau de bord** — menu MCP de `cursor.com/agents` pour un serveur personnel, ou Dashboard → Plugins & MCPs pour un serveur d'équipe — puis **activés pour le run**. Les fichiers `~/.cursor/mcp.json` (ce que `rea setup --client cursor` écrirait dans la VM) et `.cursor/mcp.json` du dépôt servent l'IDE, pas le runtime des agents cloud. `rea doctor` continuera donc de signaler `registration:cursor: missing` dans la VM : ce contrôle vise l'IDE et n'est pas un indicateur de l'état cloud.

Configuration à saisir dans le tableau de bord (transport stdio, exécuté dans la VM, sans variable d'environnement ni secret) :

```json
{
  "mcpServers": {
    "rea": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "rea-agents@6.4.0", "mcp"]
    }
  }
}
```

Prérequis vérifiés pour ce transport : `npx` disponible dans l'image (`/usr/local/bin/npx`, Node 24.21.0), paquet déjà présent dans `node_modules` à la version exacte (pas de téléchargement au démarrage), `rea mcp` démarre en moins de 3 s. Ne pas renseigner `cwd` (refusé pour les serveurs stdio cloud). Après ajout, un **nouveau run** d'agent cloud est nécessaire ; la validation consiste à constater l'espace de noms `rea` dans le catalogue d'outils et à appeler `list_browser_targets` avec `{"cdp_endpoint":"http://127.0.0.1:9222"}`.

Le même JSON est versionné dans `.cursor/mcp.json` pour les sessions Cursor IDE ouvertes sur ce dépôt ; cela ne remplace pas l'enregistrement tableau de bord.

### B2 — Aucune Salesforce Developer Org authentifiée (bloquant, intervention humaine requise)

Aucun identifiant, secret ou org n'est disponible dans l'environnement (aucune variable `SF_*`/`SFDX_*`, Salesforce CLI non installée). Conformément à la consigne, l'authentification n'a pas été tentée : la session `9223` est restée sur la page de connexion publique.

Interventions nécessaires (détail dans `02-session-navigateur-salesforce.md`) :

- Désigner la Developer Org autorisée (My Domain) et confirmer l'autorisation d'analyse fonctionnelle.
- Connexion humaine : prendre le contrôle du bureau distant de l'agent, se connecter dans la fenêtre « Salesforce », valider le **MFA** (obligatoire sur les Developer Orgs) et, le cas échéant, le **SSO** d'entreprise ou la vérification d'identité par e-mail, puis rendre la main.
- Alternative sans intervention à chaque run : secret Cursor `SFDX_AUTH_URL` (Cursor Dashboard → Cloud Agents → Secrets) + installation de `@salesforce/cli` dans l'environnement ; à décider par le responsable du projet.

### B3 — Points d'attention (non bloquants)

- REA est strictement passif : il n'ouvre pas de page, ne clique pas, ne remplit pas de formulaire. La navigation Salesforce sera faite par une personne ou par Playwright connecté au navigateur `9223` (`connectOverCDP`) ; REA observe et prouve. Le plan `01-plan-exploration-accounts.md` est construit sur ce partage.
- Le profil `/tmp/crm-lab-salesforce` et le navigateur `9223` disparaissent à l'arrêt de la VM ; la connexion sera à refaire à chaque nouveau run tant que l'alternative CLI n'est pas en place.
- `rea doctor` sort en code 1 (moteurs natifs absents) : attendu pour une cible web, à ne pas traiter comme une régression.

## 3. Modifications apportées au dépôt dans cette phase

| Fichier | Rôle |
| --- | --- |
| `.cursor/mcp.json` | Enregistrement REA MCP projet (IDE) ; même JSON à copier dans le tableau de bord Cloud Agents. |
| `scripts/check-rea-mcp.mjs` + script npm `rea:mcp-check` | Vérification reproductible : client MCP réel, `tools/list`, `list_browser_targets`, `inspect_web_page`. |
| `scripts/start-salesforce-browser.sh` | Session navigateur Salesforce isolée (port `9223`, profil dédié, fenêtre visible), sans identifiant. |
| `package.json` | `@modelcontextprotocol/client` 2.3.1 épinglé en devDependency pour le script de vérification. |
| `docs/reverse-engineering/accounts/` | Ce rapport, le plan d'exploration, la procédure de session, les preuves. |

## 4. Étapes suivantes (dans l'ordre)

1. **Propriétaire du tableau de bord Cursor** : ajouter le serveur MCP `rea` (JSON ci-dessus) dans Cloud Agents → MCP (ou Plugins & MCPs pour l'équipe), l'activer, lancer un nouveau run.
2. **Agent (nouveau run)** : confirmer la présence des outils `rea.*`, exécuter `list_browser_targets` sur `9222` via MCP (et non via CLI) ; consigner la preuve dans `evidence/`.
3. **Responsable du projet** : désigner la Developer Org autorisée ; choisir la voie d'authentification (connexion humaine via bureau distant, ou secret `SFDX_AUTH_URL` + Salesforce CLI).
4. **Titulaire du compte** : `bash scripts/start-salesforce-browser.sh`, prendre le contrôle du bureau distant, se connecter (MFA/SSO), rendre la main.
5. **Agent** : `list_browser_targets` sur `9223` avec `allowed_origins` = origine My Domain ; première capture de `/lightning/o/Account/home` (NAV-1) selon le protocole du plan ; relecture des captures avant dépôt.
6. Dérouler le plan `01-plan-exploration-accounts.md` (NAV → LST → FIC → FRM → FLT → INT), puis rédiger `spec-accounts.md`.
7. Seulement après validation de la spécification : démarrer la reconstruction du CRM dans `src/`.
