# Phase 3.2 — Isolation des tests (2026-10-14)

Branche : `cursor/phase3-1-accounts-hardening-2cf0`. Les tests qui écrivent en base ne peuvent plus retomber sur `crm_lab`.

## Règles

- `TEST_DATABASE_URL` est obligatoire pour `npm run test:integration`, `npm run test:e2e` et `npm run test:api`. `DATABASE_URL` est ignoré, y compris la valeur de `.env`.
- Hôte autorisé : `127.0.0.1`, `localhost` ou `::1`. Tout autre hôte est refusé.
- Nom refusé : `crm_lab`, `postgres`, `template0`, `template1`, et un nom de production (`prod`, `production`, `live`, seul ou entre `_`).
- Le protocole doit être `postgresql:` ou `postgres:`.
- Avant chaque nettoyage, le test lit `current_database()` et s'arrête si ce nom n'est pas exactement celui de `TEST_DATABASE_URL`.
- Playwright démarre Next.js sur `127.0.0.1:3100` avec `reuseExistingServer: false` et `NEXT_DIST_DIR=.next-e2e`. Le serveur de développement du port 3000 n'est pas réutilisé, et les deux processus ne partagent pas le verrou `.next`. `webServer.env.DATABASE_URL` reçoit la même URL que le client Prisma de Playwright.
- `e2e/database-isolation.spec.ts` crée un compte dans la base du helper et le relit par l'API, puis compare l'identifiant `demoadm`.

## Préparer une base jetable

```bash
createdb crm_phase32_test
DATABASE_URL="postgresql://ubuntu@127.0.0.1:5432/crm_phase32_test" npx prisma migrate deploy
DATABASE_URL="postgresql://ubuntu@127.0.0.1:5432/crm_phase32_test" npm run db:seed
export TEST_DATABASE_URL="postgresql://ubuntu@127.0.0.1:5432/crm_phase32_test"
```

`npm run db:migrate` et `npm run db:seed` restent des commandes de développement : elles lisent `DATABASE_URL`. Les lancer sans surcharger `DATABASE_URL` cible `crm_lab`.

## Vérification (2026-10-14, Cursor Cloud)

Base jetable : `crm_phase32_test` (`postgresql://ubuntu@127.0.0.1:5432/crm_phase32_test`), migrée puis amorcée. `demoadm` y vaut `cmv8g6aaj0000jseb1co2wy5e`.

Les commandes d'intégration et E2E ont reçu en plus `DATABASE_URL` pointant vers `crm_lab`, pour vérifier que cette variable est ignorée. `crm_lab` est restée à 12 comptes, dernier `updatedAt` `2026-10-14 12:49:22.245`. Sans `TEST_DATABASE_URL`, `npm run test:integration` s'arrête avant toute requête avec `UnsafeTestDatabaseError: TEST_DATABASE_URL is required... DATABASE_URL is ignored.`

| Commande | Résultat |
| --- | --- |
| `npm ci` | 509 packages, exit 0 |
| `npm run test:unit` | 35 passed, 0 failed |
| `npm run test:integration` | 16 passed, 0 failed |
| `npm run test:e2e` | 24 passed, 0 failed en 27,9 s (port 3100, `reuseExistingServer: false`) |
| `npm run lint` | 0 problems |
| `npm run typecheck` | passed |
| `npm run build` | passed |

`e2e/database-isolation.spec.ts` a confirmé que le helper Prisma et l'API voient le même `demoadm` et le même compte créé directement en base. Aucune écriture Salesforce.
