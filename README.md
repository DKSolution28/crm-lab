# CRM Lab

Reconstruction fonctionnelle autorisée d'une application Salesforce de démonstration.

Stack : Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, PostgreSQL 16 + Prisma 7,
Playwright (Chromium) et la CLI de reverse engineering [REA](https://www.npmjs.com/package/rea-agents) `rea-agents@6.4.0`.

## Prérequis

- Node.js `24.21.0` (voir `.nvmrc` ; REA exige `^22.19 || ^24.11 || >=26`)
- PostgreSQL 16, Git, curl, jq, tmux

`scripts/cloud-install.sh` installe tout cela de façon idempotente (Ubuntu 24.04).

## Démarrage rapide

```bash
bash scripts/cloud-install.sh   # Node pinné, paquets système, npm ci, Chromium Playwright, prisma generate
bash scripts/cloud-start.sh     # PostgreSQL, migrations + seed, navigateur CDP, next dev sur :3000
bash scripts/verify-env.sh      # vérifications 1 à 5, preuves dans .verify/<horodatage>/
```

## Scripts

| Script | Rôle |
| --- | --- |
| `scripts/cloud-install.sh` | Bootstrap idempotent (champ `install` de l'environnement Cursor Cloud). |
| `scripts/cloud-start.sh` | Services à chaque démarrage (champ `start`) : PostgreSQL, `db-setup.sh --seed`, navigateur CDP, `next dev` dans la session tmux `next-dev`. |
| `scripts/db-setup.sh` | Crée le rôle/la base locale `crm_lab`, applique les migrations, `--seed` charge des données fictives. |
| `scripts/start-cdp-browser.sh` | Chromium headless avec CDP sur `127.0.0.1:9222` pour les commandes web de REA. |
| `scripts/verify-env.sh` | Versions, Chromium, CLI REA, Playwright, application de développement. |
| `scripts/node-env.sh` | À sourcer : place le Node pinné en tête du `PATH` et exporte `REA_BROWSER_EXECUTABLE`. |

## Commandes npm utiles

```bash
npm run dev            # http://localhost:3000
npm run lint
npm run typecheck
npm run build
npm run test:e2e       # Playwright (réutilise le serveur :3000 s'il tourne)
npm run db:migrate     # nouvelle migration Prisma
npm run db:seed
npx rea-agents@6.4.0 capabilities
npx rea-agents@6.4.0 doctor --json
```

## Secrets

Aucun secret réel n'est versionné. `.env.example` contient uniquement les identifiants
PostgreSQL locaux jetables. Les accès à l'org Salesforce de démonstration doivent être
fournis via les secrets Cursor Cloud (Dashboard > Cloud Agents > Secrets).
