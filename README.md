# CRM Lab

Socle de reverse engineering fonctionnel **autorisé** pour une application
Salesforce de démonstration. Le projet associe Next.js, TypeScript, Tailwind
CSS, Playwright, REA 6.4.0 et une architecture PostgreSQL modélisée avec Prisma.

Ce dépôt ne doit contenir ni identifiants Salesforce réels, ni jetons, ni
données extraites d’un environnement non autorisé.

## Prérequis

- Node.js 24.11 ou version 24 plus récente
- npm
- Git
- PostgreSQL (facultatif tant qu’aucune requête applicative n’utilise la base)
- Chromium et ses bibliothèques système

Dans une VM Ubuntu Cursor Cloud neuve :

```bash
bash scripts/bootstrap-system.sh
bash scripts/cloud-install.sh
```

Le premier script installe Node.js 24.21.0, PostgreSQL, les outils de
compilation et Chromium avec ses dépendances système. Le second installe les
dépendances verrouillées et génère le client Prisma.

## Développement

```bash
cp .env.example .env
npm run dev
```

L’application est disponible sur `http://localhost:3000` et son endpoint de
santé sur `http://localhost:3000/api/health`.

## Vérifications

```bash
npm run verify:tools
npx rea-agents@6.4.0 capabilities
npx rea-agents@6.4.0 doctor --json
npm run prisma:validate
npm run lint
npm run typecheck
npm test --if-present
npx playwright test
npm run build
```

`doctor` peut signaler des capacités optionnelles absentes ; son JSON doit être
lu plutôt que remplacé par un résultat supposé.

## Base de données

Le schéma `prisma/schema.prisma` structure les captures, objets et champs
observés. Configurez `DATABASE_URL` via un secret d’environnement pour toute
base distante. `.env.example` ne contient qu’une valeur locale de démonstration.
