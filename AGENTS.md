<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Scope: authorized functional reverse engineering of a demo Salesforce app. Never commit credentials; org access comes from Cursor Cloud secrets.
- Cloud VMs put `/exec-daemon/node` (an older Node) ahead of nvm on `PATH`. `scripts/cloud-install.sh` appends a marked block to `~/.bashrc` that prepends the Node pinned in `.nvmrc`; in non-interactive scripts run `source scripts/node-env.sh` first. Check with `node --version`.
- `bash scripts/cloud-start.sh` (idempotent) starts PostgreSQL, applies migrations + seed, starts a headless CDP Chromium on `127.0.0.1:9222`, and runs `next dev` on port 3000 in tmux session `next-dev` (log: `/tmp/next-dev.log`).
- `bash scripts/verify-env.sh` runs the environment checks and writes raw evidence to `.verify/<timestamp>/`. `rea doctor --json` exits 1 with `healthy: false` here because optional engines (Ghidra, IDA, Hopper) and the REA skill/MCP registration are not installed; the script records that as WARN. Do not run `rea setup` unless asked: it rewrites `~/.cursor/mcp.json`.
- REA web commands take the CDP endpoint as an argument, e.g. `npx rea list-browser-targets http://127.0.0.1:9222`. `REA_BROWSER_EXECUTABLE` (exported by `scripts/node-env.sh`) points at Playwright's Chromium.
- Prisma 7: the client is generated into `src/generated/prisma` (gitignored; `npm run db:generate`), the datasource URL lives in `prisma.config.ts`, and the runtime uses the `@prisma/adapter-pg` driver adapter. `npm view prisma` reports an 8.0 RC as `latest`; stay on the pinned 7.10.0.
- `npm run typecheck` runs `next typegen` first because `LayoutProps`/`PageProps` are generated types.
