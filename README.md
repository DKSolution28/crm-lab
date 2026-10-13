# CRM Lab

Laboratoire local Next.js pour préparer un reverse engineering fonctionnel autorisé d'une application Salesforce de démonstration. Les notes restent dans PostgreSQL sur la machine. Aucun secret Salesforce n'est versionné.

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

## Reverse engineering Accounts

La préparation Phase 2 (REA, MCP, CDP, session Salesforce) est dans
`docs/reverse-engineering/accounts/`. La CLI REA et Chromium CDP sont
validés. Le serveur MCP REA n'est pas encore enregistré pour les Cloud
Agents ; l'accès authentifié à une Developer Org reste une étape
opérateur.
