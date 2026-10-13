# Preuves d'environnement non sensibles (Phase 2)

Commandes exécutées le 2026-10-13 sur la VM Cloud Agent. Aucune sortie ne contient
de secret (versions, états et structures DOM publics de l'app locale uniquement).

## REA — version et catalogue

- `node -p require("./node_modules/rea-agents/package.json").version` → `6.4.0`.
- `npx rea-agents@6.4.0 capabilities` : 127 commandes CLI / 170 outils MCP / 6 prompts ;
  `list_browser_targets` et `inspect_web_page` présents, surface `browser-provider`.
- `npx rea-agents@6.4.0 doctor --json` (extrait pertinent) :
  - `node` 24.21.0 OK, `host` ubuntu 24.04 OK ;
  - `hopper` / `ghidra` / `ida-registration` : `missing_analysis_engine` (non bloquant, lecture seule navigateur) ;
  - `registration:cursor` : `config_drift`, détail `/home/ubuntu/.cursor/mcp.json` ;
  - `skill:identity` : `config_drift` (skill REA non installé).
- `npx rea-agents@6.4.0 mcp doctor --json` : `healthy: true`, outils `170/170`,
  prompts `6/6`, identité `package=6.4.0`, digest catalogue conforme.

## MCP — absence d'enregistrement

- `~/.cursor/mcp.json` : absent. `<repo>/.cursor/mcp.json` : absent (pas de dossier `.cursor/`).
- Catalogue d'outils dynamiques de la session cloud : `cursor`, `cursor-cloud`,
  `cursor-subscriptions` — aucun espace `rea`.
- Conclusion : CLI OK, serveur MCP sain en stdio, **connexion MCP absente**.

## Chromium / CDP (`127.0.0.1:9222`)

- `GET /json/version` : `Chrome/156.0.8078.4`, `Protocol-Version: 1.3`,
  profil `--user-data-dir=/tmp/crm-lab-cdp`, mode `--headless=new`.
- Serveur lab : `GET /api/health` → `{"ok":true,"database":"up"}`.

## Tests navigateur via CLI REA (page de test `http://127.0.0.1:3000/`)

1. Création de la cible : `PUT /json/new?http://127.0.0.1:3000/` → page `477D72FE…`, titre vide puis « CRM Lab ».
2. `rea list-browser-targets http://127.0.0.1:9222` :
   - `evidence_id ev_fbae…`, `predicate_type rea.browser-target-list`, `confidence: observed` ;
   - 1 cible listée (type `page`, origine `http://127.0.0.1:3000`, `attached: false`) ;
   - exclusions : `non_page: 3`, `unsupported_url: 1` (comportement attendu).
3. `rea inspect-web-page <endpoint> <targetId> --observation-ms 500` :
   - `evidence_id ev_9cf8…`, `predicate_type rea.web-page-inspection` ;
   - fenêtre 500 ms, `dom.total_nodes: 189`, `frames: 1` ;
   - `completeness.status: policy_filtered` — sections `accessibility`, `script_sources`,
     `storage_keys`, etc. filtrées par politique sans les options `--include-*`
     (comportement attendu, pas une erreur).

## Réseau Salesforce (connectivité seule, sans authentification)

- `https://login.salesforce.com/` → HTTP 200 (~65 ms).
- `https://test.salesforce.com/` → HTTP 200 (~59 ms).
