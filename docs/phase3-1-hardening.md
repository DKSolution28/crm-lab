# Phase 3.1 — Accounts hardening (2026-10-14)

Branch: `cursor/phase3-1-accounts-hardening-2cf0`. Base: `cursor/phase3-accounts-reconstruction-2cf0`.

## Corrected

- Annual Revenue: parse exact decimal strings for PostgreSQL Decimal(18,0), reject unsafe JavaScript number input, render as exact BigInt-aware currency, and sum Kanban revenue without IEEE-754 rounding.
- Historical inactive picklists: allow an existing, unchanged inactive value on update; still reject newly selected inactive values.
- Account hierarchy: detect repeated ancestors and limit traversal explicitly (fail closed above 500).
- List view PATCH: validate every requested change before a single Prisma update, avoiding partial mutations followed by HTTP 400.
- Persisted filters: invalid stored filters now raise an error instead of silently broadening the result list.
- Expose Previous/Next pagination in Kanban and Split View, not only Table.
- Added unit, integration and API regression tests for exact revenue and PATCH atomicity.
- List filters keep Annual Revenue as an exact decimal string. Unsafe JSON numbers, fractional values and empty numeric filters are rejected. Employees filters outside the signed 32-bit range are rejected before the query, instead of aborting PostgreSQL with an INT4 conversion error.

## Run verification in Cursor Cloud

```bash
npm ci
npm run db:migrate
npm run test:unit
npm run test:integration
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

**Verification status (2026-10-14, Cursor Cloud):** executed against disposable database `crm_lab_phase31_validation` (`postgresql://ubuntu@127.0.0.1:5432/crm_lab_phase31_validation`). Migrations applied there, then `npm run db:seed`. `crm_lab` was not used: its `demoadm` id stayed `cmv83wtns0000jsnw96o00yln` and its latest account `updatedAt` stayed `2026-10-14 12:49:22`. The dev server for Playwright was started with `DATABASE_URL` pointing at the disposable database; `/api/users` returned `demoadm` id `cmv892af30000js6d5k1qz2cd`.

| Command | Result |
| --- | --- |
| `npm run test:unit` | 29 passed, 0 failed |
| `npm run test:integration` | 15 passed, 0 failed |
| `npm run test:e2e` | 23 passed, 0 failed (9 browser, 13 API, 1 existing lab note) |
| `npm run lint` | 0 problems |
| `npm run typecheck` | passed |
| `npm run build` | passed |

`npm ci` was not re-run; `node_modules` was already installed. The suite still follows `DATABASE_URL` and falls back to `crm_lab` when that variable is unset, so this isolation was provided by the environment for this run.

Before the currency-filter fix, the same database reported unit 28/28, integration 14/14 and typecheck passing, with 5 unused-import lint warnings. Those runs did not cover the rounding bug: `filtersToWhere` turned `"9007199254740993"` into `9007199254740992`, and an Employees filter of `2147483648` raised `Unable to fit integer value '2147483648' into an INT4`.

## Not solved

- Demonstration user identity uses an editable cookie / API header and falls back to admin. This is suitable **only** for a private local lab. Do not expose CRM Lab on a public network or use real customer data before implementing verified sessions and fail-closed access.
- Phase 3.2 ferme l'usage implicite de `crm_lab` par les tests : `TEST_DATABASE_URL` est obligatoire, les nettoyages vérifient `current_database()`, et Playwright lance un serveur dédié sur le port 3100. Voir `docs/phase3-2-test-isolation.md`.
- Hierarchy consistency under concurrent writers needs a transactional or database-backed invariant if deployed in multi-user production.
- CRM Lab's Kanban and split pagination are page-oriented rather than global aggregations. The summary for a Kanban group covers only the current page; label such summaries accordingly until implementing aggregate queries.
- Test status and Salesforce compatibility must not be inferred from successful static edits.

No Salesforce writes or production deployments were performed.
