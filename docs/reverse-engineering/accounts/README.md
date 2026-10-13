# Phase 2 — Rapport de préparation : connexion REA MCP et reconnaissance Salesforce (module Accounts)

Date : 2026-10-13. Environnement : Cursor Cloud Agent, dépôt `crm-lab`.

## Verdict

| Porte de validation | Statut |
| --- | --- |
| REA 6.4.0 disponible (CLI) | OK |
| Serveur MCP REA démarre et expose ses outils | OK |
| Serveur MCP REA enregistré et visible par l'agent cloud | **BLOQUÉ** |
| Chromium + CDP `127.0.0.1:9222` | OK |
| `list_browser_targets` / `inspect_web_page` sur page de test | OK (via CLI et via MCP stdio) |
| Session navigateur distincte pour la Developer Org (`127.0.0.1:9223`) | Prête, non authentifiée |
| Accès à la Salesforce Developer Org | **BLOQUÉ** (URL, identifiants et SSO/MFA non fournis) |

**La reconstruction du CRM ne doit pas démarrer** : deux portes restent fermées (enregistrement MCP côté agents cloud, accès à l'org).

## 1. Tests réussis

Preuves dans `evidence/` (aucun secret, aucun jeton, aucune URL WebSocket de débogage).

1. REA 6.4.0 : `npx rea-agents@6.4.0 --version` renvoie `6.4.0` (`evidence/rea-version.txt`). `package.json` épingle `rea-agents` à 6.4.0.
2. Serveur MCP REA : `rea mcp doctor` renvoie `healthy: true`, 170 outils attendus et 170 observés, protocole `2025-11-25`, aucun écart de catalogue (`evidence/rea-mcp-doctor.txt`).
3. Chromium : Chromium 156 (Playwright, `chromium-1248`), headless, CDP sur `127.0.0.1:9222`, profil `/tmp/crm-lab-cdp` (`evidence/cdp-9222-version.json`). `scripts/verify-environment.sh` termine avec le code 0.
4. `list_browser_targets` sur `http://127.0.0.1:9222` : une cible `page`, « CRM Lab », origine `http://127.0.0.1:3000` (`evidence/cli-list_browser_targets.json`).
5. `inspect_web_page` sur cette cible : preuve `observed`, 189 nœuds DOM, 1 frame (`evidence/cli-inspect_web_page-summary.json`). Les sections sensibles (texte d'accessibilité, sources de scripts, clés de stockage, corps JSON) sont filtrées par défaut (`completeness: policy_filtered`).
6. Chemin MCP complet : `node scripts/rea-mcp-smoke.mjs` lance `rea-agents --mcp` en stdio, fait `initialize`, `tools/list` (170 outils), puis appelle `list_browser_targets` et `inspect_web_page` par JSON-RPC. Résultat `ok: true` (`evidence/mcp-stdio-smoke.json`). Cela prouve que le serveur et le CDP fonctionnent. Cela ne prouve pas que l'agent cloud y est connecté (voir section 2).
7. Isolation des sessions : un second Chromium écoute sur `127.0.0.1:9223` avec le profil `/tmp/sf-devorg-cdp`. REA y voit 0 page, alors que le port 9222 montre uniquement la page du lab (`evidence/cdp-9223-version.json`).

## 2. Blocage réel n°1 : le serveur MCP REA n'est pas connecté aux agents cloud

Constats :

- Dans cette session d'agent cloud, aucun espace de noms d'outils REA n'est disponible. Les outils MCP visibles sont `cursor-cloud` et `cursor-subscriptions`. Aucun outil `list_browser_targets` ni `inspect_web_page` n'est appelable directement par l'agent.
- `~/.cursor/mcp.json` et `.cursor/mcp.json` n'existent pas. `rea doctor --json` signale `registration:cursor` en `config_drift` et `skill:identity` manquant.
- `get-events` ne renvoie aucun événement MCP. Aucun serveur MCP n'est configuré pour cet agent, donc il n'y a pas d'erreur d'authentification MCP.

Cause : la CLI est installée (dépendance npm du dépôt), mais la connexion MCP est une configuration distincte, qui n'existe pas encore. D'après la documentation Cursor, un agent cloud reçoit ses serveurs MCP depuis le tableau de bord (liste MCP de cursor.com/agents, ou Dashboard → Plugins & MCPs pour l'équipe) ou depuis `mcpServers` dans l'API Cloud Agents. La documentation ne dit pas qu'un `.cursor/mcp.json` du dépôt est lu par les agents cloud. Lancer `rea mcp add` dans la VM n'écrirait que `~/.cursor/mcp.json` sur cette VM éphémère et ne règle pas le problème.

Action requise (humain, hors dépôt) : ajouter un serveur MCP stdio personnel ou d'équipe avec cette définition.

```json
{
  "mcpServers": {
    "rea": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "rea-agents@6.4.0", "--mcp"]
    }
  }
}
```

Points de vigilance :

- Le serveur stdio tourne dans la VM de l'agent. Il atteint donc `127.0.0.1:9222` et `127.0.0.1:9223`. Les cibles CDP doivent être démarrées par le script de démarrage de l'environnement.
- Garder la version épinglée `6.4.0`. L'égress réseau n'est pas restreint, donc `npx` peut télécharger le paquet. La variante hors ligne est `/workspace/node_modules/.bin/rea-agents` avec l'argument `--mcp`.
- Une configuration MCP ajoutée après le démarrage d'un agent peut ne pas s'appliquer à cet agent. Démarrer un nouvel agent cloud après l'enregistrement.
- Critère de validation : dans le nouvel agent, `list_browser_targets` avec `cdp_endpoint = http://127.0.0.1:9222` doit renvoyer la cible « CRM Lab ». Ensuite, `rea doctor --json` n'est pas un critère fiable pour l'enregistrement cloud, car il lit la configuration locale de la VM.

Avertissements `doctor` sans effet sur cette phase : Hopper, Ghidra et IDA sont absents (moteurs natifs inutiles pour l'analyse web). `capture_native_ui_scenario` et `demangle_swift` exigent macOS.

## 3. Blocage réel n°2 : accès à la Salesforce Developer Org

- `login.salesforce.com` est joignable depuis la VM (HTTP 200, égress libre).
- Aucune variable d'environnement ni secret Salesforce n'est présent. L'URL de l'org (`https://<domaine>.develop.my.salesforce.com`) n'est pas connue.
- Le navigateur de la session `9223` est headless dans la VM cloud. Un SSO ou une MFA demande une personne pour saisir le code ou approuver la notification. L'authentification n'a pas été tentée ni contournée.

Interventions nécessaires :

1. Fournir l'URL My Domain de la Developer Org autorisée. L'URL n'est pas un secret, elle peut figurer dans `docs/`.
2. Choisir le mode de connexion :
   - Option A, recommandée : session assistée. Lancer `SF_HEADED=1 bash scripts/start-salesforce-browser.sh` (fenêtre visible sur le bureau VNC `:1`). La personne autorisée se connecte elle-même, SSO et MFA compris, dans cette fenêtre. Le profil `/tmp/sf-devorg-cdp` conserve la session tant que la VM vit.
   - Option B : compte de test de la Developer Org sans MFA ou avec une méthode compatible, dont les identifiants sont des secrets Cursor (Cloud Agents → Secrets). Ne jamais les écrire dans le dépôt, les journaux ou les captures.
3. Confirmer que l'org est une Developer Org jetable, sans données personnelles réelles.

## 4. Session navigateur dédiée Salesforce

- Script : `scripts/start-salesforce-browser.sh` (port `9223`, profil `/tmp/sf-devorg-cdp`, `--remote-debugging-address=127.0.0.1`).
- Le script refuse d'utiliser le port ou le profil du lab. Il ne saisit aucun identifiant.
- Les cibles REA doivent toujours porter `--allowed-origins` limité à l'origine de l'org (`https://<domaine>.develop.my.salesforce.com` et `https://<domaine>.develop.lightning.force.com`). Cela évite que REA touche d'autres pages ouvertes.
- Les profils sont dans `/tmp` : ils disparaissent quand la VM est supprimée. Aucun état d'authentification n'est exporté ni versionné.

## 5. Préparation de l'exploration du module Accounts

Le protocole détaillé est dans `exploration-plan.md`. Il couvre : navigation, vues de liste, fiches, formulaires, filtres et interactions. Il définit aussi le format des spécifications et des preuves, et les règles de non-collecte de données sensibles.

## 6. Étapes suivantes

1. Humain : enregistrer le serveur MCP `rea` dans le tableau de bord Cursor (section 2), puis démarrer un nouvel agent cloud.
2. Humain : fournir l'URL de la Developer Org et choisir l'option A ou B (section 3). Réaliser la connexion SSO/MFA si nécessaire.
3. Agent : dans le nouvel agent, rejouer `list_browser_targets` et `inspect_web_page` via les vrais outils MCP et consigner le résultat dans `evidence/`.
4. Agent : démarrer `scripts/start-salesforce-browser.sh`, vérifier la session (page Accounts atteignable sans redirection vers la connexion), puis exécuter `exploration-plan.md`.
5. Agent : consigner les spécifications Accounts dans ce dossier. Ne commencer la reconstruction qu'après revue des deux portes (MCP et accès org).

## Annexe : fichiers ajoutés

- `scripts/rea-mcp-smoke.mjs` : test MCP stdio de bout en bout (sans dépendance).
- `scripts/start-salesforce-browser.sh` : navigateur CDP dédié à la Developer Org.
- `docs/reverse-engineering/accounts/` : ce rapport, le plan d'exploration et les preuves.
