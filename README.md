# CRM Lab - Salesforce Reverse Engineering & Next.js Architecture

Environnement configuré pour le reverse engineering fonctionnel autorisé d'une application Salesforce de démonstration, couplé à une stack applicative Next.js, TypeScript, Tailwind CSS et Prisma ORM pour PostgreSQL.

---

## 🛠️ Composants et versions installés

- **Node.js** : `v24.21.0` (LTS 24.11+ requis)
- **npm** : `11.19.0`
- **Git** : `2.43.0`
- **REA (rea-agents)** : `6.4.0`
- **Playwright** : `^1.58.x` avec navigateur Chromium compatible (`Chrome for Testing 156.0.8078.4`) et dépendances système
- **Next.js** : `16.4.0` (App Router, Turbopack)
- **TypeScript** : `^5`
- **Tailwind CSS** : `^4`
- **Prisma ORM** : `8.0.0-rc.22` / `@prisma/client 7.10.0` / `@prisma/orm-postgres` avec modélisation relationnelle PostgreSQL (Account, Contact, Opportunity, ReverseEngineeringLog)

---

## 🚀 Commandes de référence

### Vérification de l'environnement
```bash
node --version
npm --version
git --version
```

### REA (Reverse Engineering Agents)
```bash
npx rea-agents@6.4.0 capabilities
npx rea-agents@6.4.0 doctor --json
```

### Playwright & Chromium
```bash
# Lancement du test de fumée Chromium Playwright
npx playwright test tests/chromium.test.ts

# Lancement du script de capture Playwright
npx tsx scripts/verify-browser.ts
```

### Développement Next.js
```bash
# Lancement de l'application de développement
npm run dev

# Construction pour la production
npm run build
```

### Prisma & Architecture PostgreSQL
```bash
# Émission du contrat Prisma
npm run contract:emit
```

---

## 🔄 Scripts reproductibles pour les agents cloud

- **`.cursor/environment.json`** : Configuration native Cursor Cloud pour le provisioning automatique (`install` et `start`).
- **`scripts/setup-env.sh`** : Script bash idempotent installant Node 24, les dépendances npm, Chromium et ses bibliothèques système.
- **`scripts/verify-all.sh`** : Script d'automatisation exécutant la suite complète des vérifications (versions, REA capabilities, REA doctor, Chromium, Playwright test).
- **`prisma/schema.prisma`** & **`src/prisma/contract.prisma`** : Schéma PostgreSQL pour l'extraction et le mapping des objets Salesforce (`Account`, `Contact`, `Opportunity`, `ReverseEngineeringLog`).

---

## 🔒 Sécurité et secrets
Ce dépôt ne contient aucun secret sensible. Les variables d'environnement (`DATABASE_URL`, identifiants d'API Salesforce éventuels) sont configurées via `.env` (exclu par `.gitignore`) et documentées dans `.env.example`.
