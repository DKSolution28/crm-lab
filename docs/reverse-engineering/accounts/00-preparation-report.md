# Phase 2 — Rapport de préparation : connexion REA MCP et reconnaissance Salesforce

Date : 2026-10-13. Environnement : CRM Lab (Next.js, PostgreSQL loopback, Chromium headless CDP `:9222`).

## 1. Vérifications demandées — résultat

### 1.1 REA 6.4.0 disponible — ✅ Réussi

- `node_modules/rea-agents/package.json` : version `6.4.0` (dépendance épinglée du dépôt).
- `rea --version` via `npx rea-agents@6.4.0` : serveur MCP déclaré `rea@6.4.0`, protocole `2025-11-25`.
- Catalogue : 127 commandes CLI, 170 outils MCP, 6 prompts — digests conformes aux valeurs attendues.

### 1.2 Serveur MCP REA enregistré et accessible aux agents cloud — ❌ Bloqué

Distinction CLI / MCP vérifiée et confirmée :

- **CLI installée** : oui. `npx rea-agents@6.4.0 capabilities`, `doctor --json`,
  `list-browser-targets`, `inspect-web-page` fonctionnent depuis le shell.
- **Serveur MCP sain** : oui. `rea mcp doctor --json` → `healthy: true`,
  `expected=170 observed=170`, `prompts 6/6`, flux de requête `binary_session` OK.
- **Serveur MCP enregistré** : **non**.
  - `rea doctor --json` → `registration:cursor` = `config_drift`,
    détail `/home/ubuntu/.cursor/mcp.json`,
    remédiation « Run rea setup to refresh this registration, then restart the client ».
  - Fichiers absents : `~/.cursor/mcp.json` et `<repo>/.cursor/mcp.json` n'existent pas.
  - Catalogue d'outils de *cette session cloud* : espaces `cursor`, `cursor-cloud`,
    `cursor-subscriptions` uniquement — **aucun espace MCP `rea` exposé**,
    donc `list_browser_targets` / `inspect_web_page` ne sont pas appelables
    comme outils MCP par l'agent cloud (utilisés ici uniquement via la CLI).

### 1.3 Configuration MCP manquante — identification précise

Ce qui manque, sans confondre avec l'installation CLI :

1. L'entrée serveur MCP REA dans la configuration du client
   (`~/.cursor/mcp.json` en global, ou `.cursor/mcp.json` au niveau projet) —
   créée normalement par `npx rea-agents setup` ou `rea mcp add --agent cursor`,
   suivie d'un **redémarrage du client**.
2. Côté Cursor Cloud Agent, l'enregistrement équivalent doit passer par la
   configuration MCP de l'environnement (Dashboard / environment), pas par un
   fichier local de la VM : un `~/.cursor/mcp.json` écrit sur cette VM
   ne rendrait pas les outils visibles aux agents cloud sans redémarrage
   et sans propagation via l'environment build.

Aucune écriture de configuration globale n'a été effectuée dans cette passe :
l'enregistrement MCP est une action de configuration d'environnement qui
dépasse le dépôt et nécessite un redémarrage d'agent.

### 1.4 Chromium et CDP sur `127.0.0.1:9222` — ✅ Réussi

- `GET /json/version` → `Chrome/156.0.8078.4`, protocole CDP `1.3`, profil `/tmp/crm-lab-cdp`.
- Les erreurs `dbus` / `xcb` / `EGL` dans `/tmp/crm-lab-cdp.log` sont le bruit
  normal du mode headless sans serveur X — sans effet sur le DevTools HTTP.
- Serveur lab : `GET /api/health` → `{"ok":true,"database":"up"}`.

### 1.5 `list_browser_targets` + `inspect_web_page` sur page de test — ✅ Réussi (via CLI)

- Cible de test créée : onglet `http://127.0.0.1:3000/` (titre « CRM Lab »).
- `rea list-browser-targets http://127.0.0.1:9222` → liste la cible
  (`target_id` local `477D72FE…`, origine `http://127.0.0.1:3000`, 3 cibles
  non-page et 1 URL non supportée correctement exclues).
- `rea inspect-web-page <endpoint> <targetId> --observation-ms 500` →
  `evidence_id ev_9cf8…`, DOM 189 nœuds, fenêtre de capture 500 ms,
  sections sensibles filtrées par politique (comportement attendu).
- Détail complet : voir `01-environment-evidence.md`.

### 1.6 Session navigateur distincte pour org Salesforce autorisée — 🟡 Préparée, non authentifiée

- Emplacement réservé : profil CDP séparé + procédure en `02-salesforce-session-prep.md`.
- Connectivité réseau vérifiée : `login.salesforce.com` et `test.salesforce.com` → HTTP 200.
- **Aucune tentative de connexion** : aucune org, aucun identifiant fourni ; l'authentification
  (SSO/MFA) requiert une intervention manuelle — voir §2.

### 1.7 Exploration Accounts — ⏸️ Planifiée, non exécutée

Plan d'exécution en `03-accounts-exploration-plan.md`. Démarrage conditionné à
la levée des blocages §2.

### 1.8 Spécifications et preuves — ✅ Enregistrées ici même

Ce dossier `docs/reverse-engineering/accounts/` contient le rapport, les preuves
non sensibles et les plans. Aucun secret n'y figure.

## 2. Blocages réels (rien n'est contourné)

| # | Blocage | Intervention requise |
|---|---|---|
| B1 | Serveur MCP REA non enregistré / non visible des agents cloud | Côté humain : exécuter `npx rea-agents setup` (ou `rea mcp add --agent cursor`) dans l'environnement Cursor concerné, ou déclarer le serveur MCP REA dans la configuration MCP de l'environnement Cloud Agent, puis redémarrer l'agent. En attendant, les outils REA restent utilisables uniquement via la CLI dans le shell. |
| B2 | Aucune Salesforce Developer Org autorisée fournie | Côté humain : fournir l'URL d'org (fichier non versionné ou secret Cursor) et effectuer la connexion interactive (SSO/MFA) dans la session navigateur dédiée. L'agent ne saisit ni identifiants ni codes MFA. |
| B3 | Moteurs d'analyse natifs absents (Hopper, Ghidra, IDA) | Non bloquant pour cette phase (analyse web/navigateur uniquement). Signalé pour mémoire : `rea doctor` les marque `missing_analysis_engine`, ce qui n'empêche pas la CLI. |

## 3. Étapes suivantes proposées

1. Lever B1 (enregistrement MCP REA + redémarrage), puis re-tester
   `list_browser_targets` / `inspect_web_page` **comme outils MCP** depuis un agent cloud.
2. Lever B2 (connexion SSO/MFA manuelle sur la session dédiée).
3. Exécuter `03-accounts-exploration-plan.md` : navigation, listes, fiches,
   formulaires, filtres, interactions — preuves REA vers `docs/reverse-engineering/accounts/`.
4. Seulement après 1–3 : cadrer la reconstruction du CRM (hors périmètre Phase 2).
