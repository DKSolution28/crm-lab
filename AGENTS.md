<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Environnement : `.cursor/environment.json` → `scripts/cloud/install.sh` (idempotent) et `scripts/cloud/start.sh`.
  Détails et commandes dans `README.md`.
- Le shell de l'agent a `/exec-daemon/node` (Node 22) en tête du PATH. Pour Node 24 : `source scripts/cloud/lib.sh && use_pinned_node`
  (ou un nouveau shell de login après `install.sh`). REA exige Node 22.19+ / 24.11+ / 26+.
- Vérifier l'environnement : `bash scripts/cloud/verify.sh` (n'affirme que des résultats réellement obtenus).
- `rea-agents doctor --json` sort en code 1 sans Hopper/Ghidra/IDA configurés : comportement attendu, pas une panne d'installation.
- Reverse engineering uniquement sur un périmètre autorisé ; aucun secret ni identifiant réel dans le dépôt.
