# crm-lab

Laboratoire de reverse engineering fonctionnel **autorisé** d'une application
Salesforce de démonstration, et de sa ré-implémentation. Le dépôt est conçu
pour être piloté par des agents Cursor Cloud.

## Stack

| Couche | Outils |
| --- | --- |
| Application | Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS 4 |
| Données | PostgreSQL 16, Prisma 7 (`prisma/schema.prisma` : Account, Contact, Opportunity) |
| Observation / analyse | REA (`rea-agents` 6.4.0), Playwright + Chromium (navigateur CDP sur `127.0.0.1:9222`) |
| Runtime | Node.js 24 (`.nvmrc`), npm |

## Démarrage rapide (VM Cursor Cloud ou Ubuntu 24.04)

```bash
bash scripts/cloud/install.sh      # Node 24, PostgreSQL, npm ci, Chromium Playwright, prisma generate
bash scripts/cloud/start.sh        # PostgreSQL + migrations + seed, navigateur CDP, next dev (tmux "dev-server")
bash scripts/cloud/verify.sh       # vérifications reproductibles -> /tmp/crm-lab-verify/report.md
```

Dans chaque nouveau shell : `source scripts/cloud/env.sh` (place le bon Node en
tête du `PATH` et exporte `REA_BROWSER_EXECUTABLE`, `CRM_LAB_BASE_URL`, `CRM_LAB_CDP_URL`).

Application : <http://localhost:3000> · santé : `GET /api/health` · comptes : `/accounts`.

## Commandes utiles

```bash
npm run dev | build | start | lint | typecheck
npm run db:migrate -- --name <nom>   # nouvelle migration (dev)
npm run db:deploy                    # appliquer les migrations
npm run db:seed                      # données de démo (idempotent)
npm run test:e2e                     # tests Playwright (e2e/)
npx rea-agents@6.4.0 capabilities
npx rea-agents@6.4.0 doctor --json
```

## Scripts cloud

| Script | Rôle |
| --- | --- |
| `scripts/cloud/env.sh` | Variables d'environnement et PATH (à `source`) |
| `scripts/cloud/install-node.sh` | Installe la version Node de `.nvmrc`, lien `/usr/local/lib/nodejs/current` |
| `scripts/cloud/install.sh` | Phase `install` de `.cursor/environment.json` (idempotente) |
| `scripts/cloud/db-setup.sh` | Rôle/base PostgreSQL, `prisma migrate deploy`, seed |
| `scripts/start-cdp-browser.sh` | Chromium headless avec endpoint CDP pour REA / Playwright |
| `scripts/cloud/start.sh` | Phase `start` : services + serveur de dev |
| `scripts/cloud/verify.sh` | Rapport de vérification (aucun résultat simulé) |

## Secrets

Aucun secret réel n'est versionné. `.env.example` ne contient que des
identifiants PostgreSQL locaux créés par `db-setup.sh`. Les secrets réels
(identifiants de l'org Salesforce de démo, etc.) doivent être ajoutés dans
Cursor Dashboard › Cloud Agents › Secrets.
