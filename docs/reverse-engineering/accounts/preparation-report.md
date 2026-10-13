# Rapport de préparation — Phase 2

Date d'observation : 2026-10-13. Run Cloud Agent
`bc-fc05a8f4-0c4d-44ec-9341-03d2c1942cab`. Environnement personnel
[38a02691-c720-11f1-ac31-5e2d0494121f](https://cursor.com/dashboard/cloud-agents/environments/e/38a02691-c720-11f1-ac31-5e2d0494121f),
build `bld-20261013-6ab53a4c-af36-4b6b-86c2-dae59c34debe`.

La reconstruction du CRM n'a pas commencé. La connexion MCP REA et
l'accès authentifié à Salesforce ne sont pas validés.

## Décision

| Couche | Résultat |
| --- | --- |
| CLI REA 6.4.0 | OK |
| Chromium + CDP lab `127.0.0.1:9222` | OK |
| `list_browser_targets` / `inspect_web_page` via **CLI** | OK, page CRM Lab |
| Serveur MCP REA pour Cloud Agents | **Manquant** |
| `list_browser_targets` / `inspect_web_page` via **MCP** | **Impossible dans cette run** |
| Session Salesforce distincte `127.0.0.1:9223` | OK, profil isolé |
| Accès org Developer authentifiée | **Bloqué** (mur de login, pas d'org fournie) |
| Exploration Accounts | Préparée, non exécutée |

## Tests réussis

### REA 6.4.0

```text
node v24.21.0
rea-agents package: 6.4.0
npx rea-agents@6.4.0 capabilities   # s'exécute
npx rea-agents@6.4.0 doctor --client cursor --json
```

Doctor : `cli_package_version` = `6.4.0`, Node et hôte sains,
170 outils au catalogue dont `list_browser_targets` et
`inspect_web_page`. Hopper / Ghidra / IDA absents : hors périmètre
web Salesforce. Preuve :
[evidence/rea-doctor-cursor.summary.json](evidence/rea-doctor-cursor.summary.json).

### Chromium et CDP lab

`scripts/start-cdp-browser.sh` a ouvert Playwright Chromium
`Google Chrome for Testing 156.0.8078.4` sur `127.0.0.1:9222`.

```text
GET http://127.0.0.1:9222/json/version  → 200
Protocol-Version: 1.3
Browser: Chrome/156.0.8078.4
```

Le serveur Next.js répond `{"ok":true,"database":"up"}` sur
`http://127.0.0.1:3000/api/health`. Preuve :
[evidence/cdp-lab-version.json](evidence/cdp-lab-version.json).

### Observation REA de la page de test

Cible ouverte par CDP : `http://127.0.0.1:3000/`.

CLI `list-browser-targets` (`operation` MCP `list_browser_targets`) :

- evidence `ev_50da9be476047b595e9d448be2de191bbd297908d02768e702dc1af8a0c02b1f`
- 1 page : titre `CRM Lab`, origine `http://127.0.0.1:3000`

CLI `inspect-web-page` (`operation` MCP `inspect_web_page`) :

- evidence `ev_7d6af7d67311a1d6340942cedde9e714f7a86423243649a3616ee41d1ec70f08`
- 189 nœuds DOM, accessibilité : « Notes de laboratoire »,
  « Nouvelle note », champs Titre / Détail, bouton Enregistrer,
  « PostgreSQL joignable »
- `storage.values_redacted`: true

Ces commandes CLI portent les mêmes opérations que les outils MCP.
Elles ne prouvent pas que le serveur MCP est branché sur l'agent.

Preuves :
[evidence/list-browser-targets.lab.json](evidence/list-browser-targets.lab.json),
[evidence/inspect-web-page.lab.summary.json](evidence/inspect-web-page.lab.summary.json),
[evidence/crm-lab-test-page.png](evidence/crm-lab-test-page.png).

### Session Salesforce distincte

Profil `/tmp/crm-lab-salesforce-cdp`, port `9223`, hors profil lab.
Script : `scripts/start-salesforce-cdp-browser.sh`.

`https://login.salesforce.com/` s'ouvre sans envoi d'identifiants.
Titre observé : `Login | Salesforce`. Champs publics : Username,
Log In, Remember me, Forgot Your Password, Use Custom Domain.
Aucune valeur de stockage. Evidence
`ev_877f44b876fc7036303659d6ee2ade57f68416faf8fe1c35bbe9793635959ad2`
(liste) et
`ev_6e00c6d2f23d74727301bf27cc2284bd41b5c952b90428d268e9da4052d285bf`
(inspection).

Preuves :
[evidence/list-browser-targets.salesforce-login.json](evidence/list-browser-targets.salesforce-login.json),
[evidence/inspect-web-page.salesforce-login.summary.json](evidence/inspect-web-page.salesforce-login.summary.json),
[evidence/salesforce-login-wall.png](evidence/salesforce-login-wall.png).

## Blocages réels

### 1. MCP REA non enregistré pour les Cloud Agents

Le catalogue de cette run n'inclut pas REA
([evidence/cloud-agent-mcp-catalog.json](evidence/cloud-agent-mcp-catalog.json)).
Aucun événement `mcp_auth_error` : le serveur n'est pas rejeté, il
n'est pas configuré.

Détail et JSON à coller : [mcp-gap.md](mcp-gap.md).

Intervention requise : ajouter le serveur stdio
`npx -y rea-agents@6.4.0 mcp` dans le menu MCP de
[cursor.com/agents](https://cursor.com/agents), puis relancer un
agent. `rea setup` dans cette VM ne suffit pas.

### 2. Org Salesforce non authentifiée

Aucun secret Salesforce dans l'environnement (`SALESFORCE_*`,
`SF_*` absents). Aucune URL d'org Developer n'est versionnée, par
conception.

Le navigateur 9223 est sur le formulaire public de login. Continuer
vers Accounts exigerait :

- l'URL d'une Developer Org autorisée ;
- une authentification humaine (mot de passe, et SSO / MFA si
  l'org les impose) via le bureau distant.

L'agent n'a pas contourné ce mur.

### 3. Skill REA locale absente

Doctor : skill `reverse-engineer-anything` non installée dans
`~/.agents/skills`. Secondaire par rapport au MCP Cloud Agent.

## Étapes suivantes

1. Enregistrer REA dans le menu MCP Cloud Agent (stdio, version
   6.4.0) et démarrer une nouvelle run.
2. Vérifier que `list_browser_targets` et `inspect_web_page` sont
   des outils MCP, puis les rejouer sur `http://127.0.0.1:9222`.
3. Communiquer hors dépôt l'URL de la Developer Org autorisée.
4. Ouvrir le bureau distant, terminer login / SSO / MFA dans le
   profil `9223`.
5. Exécuter [accounts-exploration-plan.md](accounts-exploration-plan.md).
6. Seulement ensuite, ouvrir la reconstruction CRM.

## Hors périmètre volontaire

- Pas de `rea setup --yes` (écriture locale inutile pour Cloud).
- Pas de saisie d'identifiants Salesforce.
- Pas d'inventaire Accounts réel.
- Pas de génération d'écrans CRM Lab au-delà de la page de notes.
