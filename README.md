# CRM Lab

Lab Cursor Cloud pour un reverse engineering fonctionnel **autorisé** d'une application Salesforce de démonstration.

Le dépôt ne contient aucun secret réel. Copier `.env.example` vers `.env` pour les valeurs locales PostgreSQL.

## Stack

- Node.js 24.11+ (pin local : 24.21.0)
- Next.js + TypeScript + Tailwind CSS
- PostgreSQL + Prisma 7
- REA (`rea-agents@6.4.0`)
- Playwright + Chromium
- Chrome-family browser avec CDP loopback sur `127.0.0.1:9222`

## Commandes Cloud Agent

Les scripts suivants sont idempotents :

```bash
bash scripts/cloud-install.sh
bash scripts/start-cdp-browser.sh
bash scripts/verify-cloud-env.sh
```

`cloud-install.sh` installe Node.js 24.21.0 dans `/usr/local`, PostgreSQL, les dépendances npm, Playwright Chromium et génère le client Prisma.

`start-cdp-browser.sh` démarre PostgreSQL, applique le schéma Prisma, lance Next.js sur le port 3000, puis un navigateur Chrome avec débogage distant sur le port 9222.

## Vérifications attendues

```bash
export PATH="/usr/local/bin:$PATH"
node --version
npx playwright install --with-deps chromium
npx rea-agents@6.4.0 capabilities
npx rea-agents@6.4.0 doctor --json
npm run dev
```

## Application locale

```bash
cp .env.example .env
npm ci
npx prisma generate
npx prisma db push
npm run dev
```

Ouvrir `http://127.0.0.1:3000` et enregistrer une note d'observation pour valider Prisma.
