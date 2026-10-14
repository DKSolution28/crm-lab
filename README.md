# CRM Lab

Laboratoire local Next.js pour un reverse engineering fonctionnel autorisé d'une application Salesforce de démonstration. Les données restent dans PostgreSQL sur la machine. Aucun secret Salesforce n'est versionné.

Le dépôt contient aujourd'hui :

- le module **Accounts** reconstruit à partir des observations REA (liste, vues, filtres, formulaire, fiche, recherche, API) ;
- la page de notes d'observation d'origine (`/`) ;
- l'outillage d'exploration Salesforce en lecture seule et les preuves anonymisées (`docs/reverse-engineering/accounts/`).

## Module Accounts

```bash
cp .env.example .env            # si absent
npm run db:migrate              # applique les migrations Prisma
npm run db:seed                 # utilisateurs et comptes fictifs ([demo])
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Puis ouvrir <http://127.0.0.1:3000/accounts>.

- Utilisateurs de démonstration : `demoadm` (administrateur) et `demostd` (standard), sélectionnables dans l'en-tête (« View profile »). Il n'y a pas d'authentification réelle : le choix est porté par le cookie `crm-lab-user`, ou par l'en-tête `x-crm-lab-user` pour l'API.
- Données : 12 comptes fictifs, 4 contacts et 3 opportunités fictifs marqués `[demo]` ; `npm run db:seed` les recrée à l'identique. Aucune donnée personnelle réelle ne doit entrer dans CRM Lab.
- Fonctionnalités : vues Recently Viewed / All Accounts / My Accounts / New This Week et vues personnelles (New, Clone, Rename, Sharing Settings, Select Fields to Display, Delete, épinglage), recherche dans la liste, tri, filtres avec logique (`1 AND (2 OR 3)`), modes Table / Kanban / Split View, formulaire New / Edit (About, Get in Touch), fiche Details / Related, recherche globale, API REST sous `/api/accounts` et `/api/list-views`.
- Documentation : `docs/architecture.md` (structure du code), `docs/coverage.md` (couverture par rapport aux observations, classification observé / déduit / conçu, résultats de tests), `docs/reverse-engineering/accounts/05-reconstruction-crm-lab.md` (comparaison écran par écran avec les captures Salesforce).

### Tests

```bash
npm run test:unit          # règles du domaine (node --test)
npm run test:integration   # service Prisma contre la base locale
npm run test:api           # contrats REST (Playwright request)
npm run test:e2e           # API + parcours navigateur (Playwright, Chromium)
npm test                   # tout
```

Les tests d'intégration et E2E utilisent la base `crm_lab` locale ; ils créent des enregistrements préfixés `[test]` / `[e2e]` et les suppriment à la fin. Playwright démarre le serveur de développement sur `127.0.0.1:3000` s'il n'est pas déjà lancé.

## Pile

- Node.js 24.11+ et npm
- Next.js, TypeScript, Tailwind CSS
- PostgreSQL et Prisma
- Playwright avec Chromium
- REA (`rea-agents`) 6.4.0

## Démarrage local

```bash
bash scripts/cloud-agent-install.sh
bash scripts/start-cdp-browser.sh
```

`scripts/start-cdp-browser.sh` ouvre Chromium en mode headless avec DevTools sur le port 9222, puis exécute `scripts/cloud-agent-start.sh`.

L'application écoute sur le port 3000. `scripts/cloud-agent-start.sh` crée le rôle PostgreSQL `ubuntu` et la base `crm_lab`, autorise l'authentification `trust` uniquement sur l'interface loopback, copie `.env.example` vers `.env` si besoin, puis applique les migrations.

`.env.example` ne contient pas de mot de passe. Ne commitez pas `.env` ni de jetons Salesforce. Si une session ultérieure a besoin d'un secret, ajoutez-le dans les secrets de l'environnement Cursor, pas dans le dépôt.

## Vérification

```bash
bash scripts/verify-environment.sh
npm run lint
npm run typecheck
npm run test:e2e
```

Commandes REA épinglées :

```bash
npx rea-agents@6.4.0 capabilities
npx rea-agents@6.4.0 doctor --json
```

`doctor` est en lecture seule. Un moteur natif absent (Hopper, Ghidra, IDA) n'empêche pas l'exécution de la CLI.

## REA en MCP

`npm run rea:mcp-check` lance le serveur MCP REA (`npx -y rea-agents@6.4.0 mcp`) avec un vrai client MCP, liste les outils puis appelle `list_browser_targets` et `inspect_web_page` sur le navigateur CDP du port 9222 (la page `http://127.0.0.1:3000/` doit y être ouverte).

`.cursor/mcp.json` enregistre REA pour Cursor IDE. Les agents cloud n'utilisent pas ce fichier : le même serveur doit être déclaré dans le tableau de bord Cursor (Cloud Agents → MCP, ou Plugins & MCPs pour l'équipe). Voir `docs/reverse-engineering/accounts/00-rapport-preparation.md`.

## Session Salesforce

`bash scripts/start-salesforce-browser.sh` ouvre un second Chromium, visible sur le bureau de la VM, avec son propre profil et DevTools sur le port 9223. Il sert uniquement à une Salesforce Developer Org autorisée ; la connexion (SSO, MFA) est faite par une personne, jamais par un script. Procédure et règles : `docs/reverse-engineering/accounts/02-session-navigateur-salesforce.md`.

Une fois la session ouverte, trois scripts enchaînent l'exploration en lecture seule :

| Script | Rôle |
| --- | --- |
| `node scripts/sf-act.mjs '<actions JSON>'` | Navigue, clique, remplit et masque les données personnelles dans la page (Playwright sur le CDP 9223). Refuse tout clic sur Save / Save & New / Delete / Change Owner / Submit / Merge / Next. |
| `bash scripts/sf-observe.sh <Id>` | Observe l'écran courant avec REA (`list-browser-targets` → `inspect-web-page` → `capture-web-screenshot`). Sorties brutes dans `/tmp/sf-explore`. |
| `node scripts/sf-redact-evidence.mjs <Id…>` | Génère les preuves anonymisées déposées dans `docs/reverse-engineering/accounts/evidence/`, à partir d'un fichier de règles hors dépôt (`SF_REDACTION_FILE`). |

Résultats de l'exploration Accounts : `docs/reverse-engineering/accounts/spec-accounts.md` et `04-rapport-couverture-accounts.md`.
