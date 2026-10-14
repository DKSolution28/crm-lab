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

**Verification status:** code review / source updates only. The GitHub-connected editing session cannot access the Cursor Cloud VM, its local PostgreSQL or Chromium, so the checks above have **not** been executed against these commits. Run them in a fresh Cursor Cloud Agent before merging. Verify tests in an isolated disposable database.

## Not solved

- Demonstration user identity uses an editable cookie / API header and falls back to admin. This is suitable **only** for a private local lab. Do not expose CRM Lab on a public network or use real customer data before implementing verified sessions and fail-closed access.
- Existing tests share the dev database and clean up by record-name prefix; migrate them to dedicated disposable test databases before handling non-synthetic data.
- Hierarchy consistency under concurrent writers needs a transactional or database-backed invariant if deployed in multi-user production.
- CRM Lab's Kanban and split pagination are page-oriented rather than global aggregations. The summary for a Kanban group covers only the current page; label such summaries accordingly until implementing aggregate queries.
- Test status and Salesforce compatibility must not be inferred from successful static edits.

No Salesforce writes or production deployments were performed.
