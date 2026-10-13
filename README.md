# Labo de reverse engineering autorise — demo Salesforce

Poste de travail Next.js + TypeScript + Tailwind CSS pour le reverse
engineering **autorise et fonctionnel** d'une application Salesforce de
demonstration. Persistance PostgreSQL via Prisma. Automatisation navigateur
via Playwright + Chromium. CLI d'analyse via REA (`rea-agents` 6.4.0).

## Demarrage (agents cloud)

```bash
source scripts/use-node24.sh
./scripts/setup.sh
./scripts/verify.sh
npm run dev
```

Details de l'environnement, versions verifiees et etat REA :
[`docs/ENVIRONNEMENT.md`](docs/ENVIRONNEMENT.md).

## Scripts

- `scripts/use-node24.sh` — fixe Node.js 24 en tete du `PATH` (a sourcer).
- `scripts/setup.sh` — installation reproductible (`npm run setup`).
- `scripts/verify.sh` — 5 controles + rapports dans `.verification/` (`npm run verify`).

## Base de donnees

```bash
cp .env.example .env   # renseigner DATABASE_URL en local, jamais de secret commis
npm run db:up          # PostgreSQL local via docker compose
npx prisma migrate dev
```

## Securite

Aucun secret reel dans le depot (`.env` ignore, `.env.example` factice).
Cibles d'analyse : instances de demonstration autorisees uniquement.
