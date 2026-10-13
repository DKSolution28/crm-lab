# Environnement du labo — reverse engineering autorise (demo Salesforce)

Projet : application Next.js + TypeScript + Tailwind CSS servant de poste de travail
pour le reverse engineering **autorise** d'une application Salesforce de
demonstration, avec persistance PostgreSQL via Prisma.

## Versions verifiees le 2026-10-13 (releve reel, cf. `.verification/`)

| Composant | Version constatee |
|---|---|
| Node.js | v24.21.0 (requis REA : 22.19+, 24.11+ ou 26+) |
| npm | 11.19.0 |
| REA (`rea-agents`) | 6.4.0 |
| Playwright | 1.64.0 (bibliotheque + `@playwright/test`) |
| Chromium (headless shell) | 156.0.8078.4 — se lance et repond via Playwright |
| Next.js | 16.4.0 (`next dev` repond HTTP 200) |
| Git | 2.43.0 |
| Prisma | 8.0.0-rc.22 / `@prisma/client` 7.10.0 |

## Particularite Node.js sur les VMs Cursor Cloud

`/exec-daemon/node` (v22.14.0, incompatible REA) precede le Node installe via
nvm dans le `PATH`. Il faut donc **toujours** commencer par :

```bash
source scripts/use-node24.sh
node --version   # doit afficher v24.21.0 (ou superieur)
```

Le script epingle la version du fichier `.nvmrc`, la met en tete du `PATH`
(via nvm) et purge le cache de resolution du shell (`hash -r`).
`scripts/setup.sh` et `scripts/verify.sh` le font deja eux-memes.

## Installation reproductible

```bash
./scripts/setup.sh
```

Le script : fixe Node 24, installe les dependances (`npm ci` si
`package-lock.json` est present), installe Chromium
(`playwright install --with-deps chromium` si `sudo` est disponible, sinon
`playwright install chromium`), puis genere le client Prisma.

Commandes de reference (executees manuellement au besoin) :

```bash
node --version
npm install -D rea-agents@6.4.0 playwright @playwright/test
npx playwright install --with-deps chromium
npx rea-agents@6.4.0 capabilities
npx rea-agents@6.4.0 doctor --json
```

## Verification (5 controles, resultats reels uniquement)

```bash
./scripts/verify.sh
# ou : npm run verify
```

1. Versions installees (+ compatibilite Node/REA).
2. Chromium se lance (version du navigateur lance via Playwright).
3. CLI REA : `capabilities` et `doctor --json` s'executent.
4. Navigateur pilotable via Playwright (`npx playwright test`, cf. `tests/smoke.spec.ts`).
5. `next dev` demarre et repond HTTP 200 (demarre sur le port 3100 par defaut,
   `PORT=...` pour le changer ; le serveur de test est arrete proprement).

Rapports ecrits dans `.verification/report.json` et `.verification/report.md`
(dossier ignore par git). Ne jamais inventer de resultats : relancer le script.

## Etat REA honnete : `doctor --json` renvoie `healthy: false`

C'est l'etat **reel et attendu** sans moteurs d'analyse optionnels :

- `hopper` : moteur absent (`rea setup` ou `HOPPER_LAUNCHER_PATH`).
- `ghidra` : `GHIDRA_INSTALL_DIR` non defini (extrait Ghidra 12.1.x requis).
- `ida-registration` : `REA_IDA_MCP_CONFIG` non configure.
- `skill:identity` / `registration:cursor` : `rea setup` non execute.

`capabilities` et `doctor --json` s'executent correctement ; seules les
operations dependant de ces moteurs sont indisponibles. Pour aller plus loin,
lancer `npx rea-agents setup` de facon interactive (hors script, car il peut
modifier `~/.cursor/mcp.json` et telecharger des moteurs sous licence).

## Base de donnees PostgreSQL + Prisma

- Schema : `prisma/schema.prisma` (modeles `Target`, `AnalysisSession`).
- Base locale : `docker compose up -d db` (identifiants de developpement
  uniquement — `npm run db:up`).
- Config : copier `.env.example` vers `.env` (jamais commite, cf. `.gitignore`)
  puis `npx prisma migrate dev`. **Aucun vrai secret n'est commis dans le depot.**

## Prochains agents cloud : demarrage rapide

```bash
git pull
source scripts/use-node24.sh
./scripts/setup.sh     # uniquement si node_modules / Chromium manquent
./scripts/verify.sh    # preuve de fonctionnement, rapports dans .verification/
npm run dev            # application de developpement
```
