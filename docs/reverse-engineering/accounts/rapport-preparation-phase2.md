# Phase 2 — Rapport de préparation : connexion REA MCP et reconnaissance Salesforce

Date d'exécution : 2026-10-13 (VM Cursor Cloud Agent, Ubuntu 24.04).
Statut global : **REA et CDP prêts ; deux blocages réels avant l'exploration Salesforce.**

| # | Vérification | Résultat |
|---|--------------|----------|
| 1 | REA 6.4.0 disponible | Réussi |
| 2 | Serveur MCP REA enregistré et accessible aux agents cloud | **Bloqué** : le serveur fonctionne, mais il n'est pas enregistré côté Cursor |
| 3 | Configuration MCP manquante identifiée | Réussi (voir section 2) |
| 4 | Chromium + CDP sur `127.0.0.1:9222` | Réussi |
| 5 | `list_browser_targets` et `inspect_web_page` sur une page de test | Réussi (CLI et protocole MCP stdio) |
| 6 | Session navigateur distincte pour la Developer Org | Prête, en attente de connexion humaine |
| 7 | Plan d'exploration du module Accounts | Rédigé : [`plan-exploration.md`](plan-exploration.md) |
| 8 | Spécifications et preuves non sensibles | Ce dossier et [`evidence/`](evidence/) |

La reconstruction du CRM n'a pas commencé.

## 1. REA 6.4.0

- `npx rea-agents --version` → `6.4.0` (paquet `node_modules/rea-agents`, `mcpName: io.github.morluto/rea`).
- Node utilisé : `/usr/local/bin/node` v24.21.0 (REA exige `^22.19 || ^24.11 || >=26`).
- `npx rea-agents@6.4.0 doctor --json` retourne `healthy: false`, exit 1. Détail :

| Check | État | Bloquant pour ce projet ? |
|-------|------|---------------------------|
| node, host | ok | — |
| hopper, ghidra, ida-registration | `missing_analysis_engine` | Non : moteurs natifs, inutiles pour l'analyse web/CDP |
| skill:identity | `config_drift` | Non : skill REA non installé (instructions d'agent facultatives) |
| registration:cursor | `config_drift` (`~/.cursor/mcp.json` absent) | Non pour les agents cloud (voir section 2) |

## 2. Serveur MCP REA : installé, sain, mais non connecté à Cursor

Il faut distinguer trois choses :

1. **CLI installée** : oui (`rea-agents` 6.4.0 dans `node_modules`).
2. **Serveur MCP fonctionnel** : oui. `npx rea-agents@6.4.0 mcp doctor --json` → `healthy: true`, protocole `2025-11-25`, 170/170 outils, 6/6 prompts, empreinte du catalogue conforme ([`evidence/rea-mcp-doctor.json`](evidence/rea-mcp-doctor.json)).
3. **Serveur enregistré auprès de Cursor et exposé à l'agent** : **non**. Le catalogue d'outils de cet agent cloud ne contient que `cursor`, `cursor-cloud` et `cursor-subscriptions`. Aucun namespace `rea`. `~/.cursor/mcp.json` n'existe pas sur la VM.

### Configuration manquante

D'après la documentation Cursor ([Cloud Agent capabilities](https://cursor.com/docs/cloud-agent/capabilities.md), [MCP](https://cursor.com/docs/mcp.md)), un agent cloud reçoit ses serveurs MCP depuis :

- le menu MCP de [cursor.com/agents](https://cursor.com/agents) (serveurs personnels), ou
- **Dashboard → Plugins & MCPs** (serveurs d'équipe, réservé aux admins).

Transports acceptés : stdio et HTTP (pas SSE ni `mcp-remote`). La documentation ne dit pas qu'un agent cloud lit `.cursor/mcp.json` du dépôt ou `~/.cursor/mcp.json` de la VM. Elle indique que les secrets sont injectés au démarrage, ce qui laisse supposer que les serveurs MCP sont aussi chargés au lancement de l'agent.

**Action requise (humaine, une fois)** : ajouter ce serveur stdio dans le menu MCP de cursor.com/agents ou dans Dashboard → Plugins & MCPs :

```json
{
  "mcpServers": {
    "rea": {
      "command": "npx",
      "args": ["-y", "rea-agents@6.4.0", "--mcp"]
    }
  }
}
```

Ensuite, **lancer un nouvel agent cloud** : l'agent en cours ne rechargera pas ses outils. Aucun secret n'est nécessaire. Le serveur tourne dans la VM, et `npx` (Node 24) y est installé par `scripts/cloud-agent-install.sh`.

Le même bloc est versionné dans `.cursor/mcp.json` pour Cursor Desktop. Ce fichier ne suffit pas pour les agents cloud.

`npx rea-agents setup` / `rea mcp add --agent cursor` écrirait seulement `~/.cursor/mcp.json` sur cette VM éphémère. Ces commandes ne règlent pas le problème des agents cloud, je ne les ai donc pas lancées.

## 3. Chromium et CDP sur `127.0.0.1:9222`

- Lancé par `scripts/start-cdp-browser.sh` (script `start` de l'environnement), profil `/tmp/crm-lab-cdp`, headless.
- `GET /json/version` → `Chrome/156.0.8078.4`, protocole CDP `1.3`.
- Next.js (`/api/health` → `{"ok":true,"database":"up"}`) et PostgreSQL actifs.

## 4. Tests `list_browser_targets` et `inspect_web_page`

Page de test : CRM Lab local `http://127.0.0.1:3000/`, ouverte via `PUT /json/new`.

| Chemin | `list_browser_targets` | `inspect_web_page` |
|--------|------------------------|--------------------|
| CLI `npx rea-agents …` | ok : 1 cible `page` « CRM Lab », 3 cibles non-page exclues | ok : 189 nœuds DOM, 15 sections, `completeness: policy_filtered` |
| MCP stdio (`scripts/rea-mcp-smoke.mjs`) : `initialize` → `tools/list` → `tools/call` | ok, `isError: false` | ok, `isError: false`, 189 nœuds |

Preuve : [`evidence/rea-mcp-smoke-lab.json`](evidence/rea-mcp-smoke-lab.json). Le chemin MCP est celui qu'utilisera un agent Cursor une fois le serveur enregistré. Il fonctionne déjà dans cette VM.

`policy_filtered` est le comportement attendu. Par défaut, REA n'expose ni sources de scripts, ni texte console, ni clés de stockage, ni formes JSON/WebSocket. Il faut les demander explicitement (`include_*`).

Note CLI : `--allowed-origins` prend des origines simples (`--allowed-origins https://x.my.salesforce.com`), pas un tableau JSON. Un tableau JSON renvoie `invalid_request`.

## 5. Session navigateur Salesforce distincte

`scripts/start-salesforce-browser.sh` lance un **second** Chromium :

| | Lab | Salesforce |
|---|-----|-----------|
| Port CDP (loopback) | 9222 | 9223 |
| Profil | `/tmp/crm-lab-cdp` | `~/.crm-lab/salesforce-profile` (chmod 700, hors dépôt) |
| Mode | headless | **affiché** sur l'écran VM `:1`, pour une connexion humaine |
| URL initiale | `about:blank` | `$SALESFORCE_LOGIN_URL` (défaut `https://login.salesforce.com`) |

Vérifié : sur 9223, REA liste une seule cible, « Login \| Salesforce » (`https://login.salesforce.com`). Sur 9222, il ne liste que le lab. Les sessions ne partagent ni cookies ni profil. `inspect_web_page` passif sur la page de connexion publique : ok (212 nœuds). Preuves : [`evidence/salesforce-session-targets.json`](evidence/salesforce-session-targets.json), [`evidence/salesforce-login-page.png`](evidence/salesforce-login-page.png).

Aucun identifiant n'a été saisi et l'authentification n'a pas été contournée.

## 6. Blocages réels

1. **REA MCP non enregistré pour les agents cloud.** Action : ajouter le serveur stdio (section 2) dans cursor.com/agents ou dans Dashboard → Plugins & MCPs, puis démarrer un nouvel agent. En attendant, la CLI REA donne les mêmes outils et les mêmes preuves.
2. **Accès à la Salesforce Developer Org autorisée.** Il faut :
   - l'URL My Domain de l'org (ex. `https://<domaine>.develop.my.salesforce.com`). La renseigner dans le secret Cursor `SALESFORCE_LOGIN_URL`, ou la passer au script ;
   - une **connexion humaine** dans la fenêtre Chromium du bureau VM (onglet Desktop de l'agent cloud). Elle couvre l'identifiant, le mot de passe, la **MFA** (Salesforce Authenticator, TOTP) ou le **SSO** si l'org en impose. Je ne saisis pas d'identifiants et je ne contourne pas la MFA ;
   - une confirmation écrite que l'org est autorisée pour cette analyse, et la liste des origines Lightning à autoriser (`*.lightning.force.com`, `*.my.salesforce.com`, `*.file.force.com`…).
3. **Persistance de la session.** La VM et le profil `~/.crm-lab/salesforce-profile` sont éphémères. La connexion est à refaire à chaque nouvel agent. Ne pas versionner le profil (il contient les cookies de session).

## 7. Étapes suivantes

1. Humain : enregistrer REA MCP (section 2) et créer le secret `SALESFORCE_LOGIN_URL`.
2. Nouvel agent : confirmer que le namespace `rea` apparaît dans ses outils, puis appeler `list_browser_targets` sur `http://127.0.0.1:9222` via MCP.
3. Agent : `bash scripts/start-salesforce-browser.sh`, puis signaler à l'humain que la connexion est attendue.
4. Humain : se connecter sur le bureau VM (MFA/SSO), arriver sur Lightning Experience → Accounts.
5. Agent : `list_browser_targets` sur 9223 avec `allowed_origins` limité aux domaines de l'org, puis dérouler [`plan-exploration.md`](plan-exploration.md).
6. Valider les spécifications Accounts avec le demandeur. Seulement ensuite, ouvrir la phase de reconstruction.

## Reproduire les vérifications

```bash
npx rea-agents@6.4.0 --version
npx rea-agents@6.4.0 mcp doctor --json
curl -s http://127.0.0.1:9222/json/version
npm run rea:mcp-smoke
bash scripts/start-salesforce-browser.sh
npx rea-agents@6.4.0 list-browser-targets http://127.0.0.1:9223
```
