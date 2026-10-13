# crm-lab

Reverse engineering fonctionnel **autorisé** d'une application Salesforce de démonstration.

Stack : Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, PostgreSQL + Prisma 7, Playwright (Chromium), [REA](https://www.npmjs.com/package/rea-agents) 6.4.0.

> Ne jamais committer de secrets, de jetons ni d'identifiants Salesforce. `.env` est ignoré par git ;
> `.env.example` ne contient que des valeurs de développement local.

## Démarrage rapide (Cursor Cloud ou machine Ubuntu 24.04 avec `sudo`)

```bash
bash scripts/cloud/install.sh   # Node 24 épinglé, apt, npm ci, Chromium + dépendances, PostgreSQL, Prisma
bash scripts/cloud/start.sh     # PostgreSQL + migrations (CLOUD_START_DEV_SERVER=1 pour lancer aussi `next dev` dans tmux)
bash scripts/cloud/verify.sh    # vérifications réelles -> reports/env-verification/<horodatage>/summary.md
npm run dev                     # http://localhost:3000 (GET /api/health teste la base)
```

`.cursor/environment.json` branche `install` et `start` sur ces scripts.

## Commandes utiles

| Besoin | Commande |
| --- | --- |
| Versions Node requises par REA | `node --version` (22.19+, 24.11+ ou 26+ ; ce dépôt épingle 24.21.0 dans `.nvmrc`) |
| Dépendances dev (déjà dans `package.json`) | `npm install -D rea-agents@6.4.0 playwright @playwright/test` |
| Chromium + dépendances système | `npx playwright install --with-deps chromium` |
| REA | `npx rea-agents@6.4.0 capabilities` · `npx rea-agents@6.4.0 doctor --json` |
| Tests e2e | `npm run test:e2e` |
| Prisma | `npm run db:migrate` (dev) · `npm run db:deploy` (CI/cloud) · `npm run db:studio` |

## Notes d'environnement

- Le PATH de base de l'image place `/exec-daemon/node` (Node 22) en premier. `install.sh` ajoute donc le Node 24 épinglé
  à `~/.profile` et `~/.bashrc` ; les scripts du dépôt l'activent eux-mêmes (`scripts/cloud/lib.sh`).
- `rea-agents doctor --json` retourne un code 1 tant que les moteurs d'analyse optionnels (Hopper, Ghidra 12.1.x, IDA)
  et l'enregistrement MCP/skill (`rea setup`) ne sont pas configurés. Node et l'hôte sont contrôlés « healthy ».
  `verify.sh` le signale en `WARN` sans le masquer.
- Base locale : PostgreSQL 16 (apt), rôle/base `crm_lab`, mot de passe de **dev local uniquement** défini dans
  `scripts/cloud/lib.sh` (surchargeable via `CRM_LAB_PG_*`).

## Modèle de données (`prisma/schema.prisma`)

`Project` → `CaptureSession` (avec `authorizationRef` obligatoire) → `Screen` → `Artifact` (captures, DOM, HAR, traces),
plus `DataObject` / `DataField` / `Relationship` (modèle métier déduit) et `BusinessRule` (règles observées avec preuves).
