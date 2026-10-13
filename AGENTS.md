# crm-lab — agent guide

Functional reverse-engineering lab (authorised) for a Salesforce demo application.
Stack: Next.js 16 + TypeScript + Tailwind CSS 4, Prisma 7 + PostgreSQL 16,
REA (`rea-agents` 6.4.0) and Playwright for observation/analysis.

## Cursor Cloud specific instructions

- **Always run `source scripts/cloud/env.sh` first in every new shell.** The Cloud
  Agent shell resolves `node` to an internal Node 22.14 binary that is too old for
  REA (needs ^22.19 || ^24.11 || >=26). `env.sh` puts the pinned Node (`.nvmrc`,
  installed to `/usr/local/lib/nodejs/current`) first on `PATH` and exports
  `REA_BROWSER_EXECUTABLE`, `PLAYWRIGHT_BROWSERS_PATH`, `CRM_LAB_BASE_URL`,
  `CRM_LAB_CDP_URL`. `.npmrc` has `engine-strict=true`, so npm refuses to run on
  the wrong Node instead of failing later.
- Environment lifecycle (`.cursor/environment.json`):
  `install` = `scripts/cloud/install.sh` (Node, apt packages incl. PostgreSQL,
  `npm ci`, Playwright Chromium + deps, `.env`, `prisma generate`);
  `start` = `scripts/cloud/start.sh` (PostgreSQL, `db-setup.sh` = role/db +
  `prisma migrate deploy` + seed, Chromium CDP on `127.0.0.1:9222`, `next dev`
  on port 3000 in tmux session `dev-server`).
- On boot, check `/tmp/cursor/start-user/start-user.log` and `start-user.status`
  (`0` = all services up). If services are missing, run `bash scripts/cloud/start.sh`
  yourself (idempotent). Dev-server log: `/tmp/crm-lab-dev-server.log`.
- `bash scripts/cloud/verify.sh` re-runs every environment check (versions,
  Chromium, REA `capabilities` / `doctor --json`, Playwright launch, PostgreSQL,
  dev app, CDP endpoint) and writes a report to `/tmp/crm-lab-verify/report.md`.
  Use `CRM_LAB_VERIFY_DIR=/opt/cursor/artifacts/verify` to keep it as an artifact.
- `npx rea-agents@6.4.0 doctor --json` exits 1 on this VM because optional native
  engines (Hopper/Ghidra/IDA) and the agent MCP registration are not installed.
  `node` and `host` checks are healthy; web/JavaScript analysis does not need the
  native engines. Do not treat that exit code alone as an environment failure.
- Local DB credentials in `.env.example` (`crm_lab`/`crm_lab`) are dev-only values
  created by `db-setup.sh`. Never commit real secrets; ask for them as Cloud Agent
  secrets (Dashboard > Cloud Agents > Secrets) instead.
- Playwright tests (`npm run test:e2e`) reuse the running dev server. For passive
  observation of a target app, point REA/Playwright at the CDP endpoint
  (`npx rea-agents@6.4.0 list-browser-targets "$CRM_LAB_CDP_URL"`,
  `chromium.connectOverCDP(process.env.CRM_LAB_CDP_URL)` in Playwright).

## Common commands

| Task | Command |
| --- | --- |
| Dev server | `npm run dev` (or `scripts/cloud/start.sh`) |
| Lint / typecheck / build | `npm run lint` · `npm run typecheck` · `npm run build` |
| Prisma | `npm run db:migrate -- --name <name>` · `npm run db:deploy` · `npm run db:seed` · `npm run db:generate` |
| E2E | `npm run test:e2e` |
| REA | `npx rea-agents@6.4.0 capabilities` · `npx rea-agents@6.4.0 doctor --json` · `npm run rea -- --help` |
| Environment check | `npm run cloud:verify` |

## Code conventions

- App Router with Cache Components enabled (`next.config.ts`): wrap uncached DB
  reads in `<Suspense>`; mutate through Server Functions in `actions.ts` files
  and call `revalidatePath`.
- Prisma Client is generated to `src/generated/prisma` (gitignored); import it
  through `src/lib/prisma.ts` only. Edit `prisma/schema.prisma`, then
  `npm run db:migrate -- --name <change>`; commit the migration.
- Keep scripts under `scripts/cloud/` idempotent and `shellcheck`-clean.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
