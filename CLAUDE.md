# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`pw-ims-service` is a TypeScript/Express REST API backing Purple Wave's Inventory Management System (IMS). It stores auction inventory items (vehicles/equipment) in Postgres and uses the Anthropic API to (1) extract structured fields from unstructured listing text and (2) estimate auction sale value ranges.

## Commands

```bash
npm run dev       # run with ts-node (no build), src/index.ts → port 3001
npm run build     # tsc → dist/
npm start         # run compiled dist/index.js
npm run migrate   # run DB migrations (see caveat below)
```

There is no test runner, linter, or formatter configured. `tsc` (via `npm run build`) is the only static check.

Local Postgres runs via `docker-compose up postgres` (postgres:15, exposed on host port **5440**, db `ims_db`). `docker-compose.override.yml` is gitignored and, on this machine, repoints the app at a remote AWS RDS instance and disables the local postgres container — be aware the override may silently change which database you hit.

## Architecture

Request flow: `src/index.ts` (Express app, CORS, rate limits) → `src/routes/items.ts` (all routes, mounted at `/items`) → `src/services/*` (Anthropic calls + estimate persistence) → `src/db/connection.ts` (shared `pg` Pool).

- **`src/db/connection.ts`** — single shared `pool`. Connection string resolution order: `DATABASE_URL` env → assembled from `DB_HOST`/`DB_PASSWORD`/`DB_USER`/`DB_NAME`/`DB_PORT` (production path, vars sourced from AWS Secrets Manager; appends `sslmode=require`) → hardcoded localhost:5440 dev fallback. All queries go through the exported `query()`/`pool`.
- **`src/services/extractor.ts`** — `extractFromText()`. Sends raw listing text to Claude, expects JSON back. Maps known fields to columns (`year`, `make`, `model`, `vin`, `miles`, `location_address`); everything else goes into a free-form `extra_attributes` JSONB blob.
- **`src/services/estimator.ts`** — `estimateValue()`. Prompts Claude for a low/high USD auction estimate. The prompt deliberately anchors low (Purple Wave sale prices ≈ 50–65% of retail). Carries `MODEL` and `PROMPT_VERSION` constants that are persisted with each estimate for traceability.
- **`src/services/estimates.ts`** — DB layer for the `estimates` table (`insertEstimate`, `listEstimatesForItem`, `getLatestEstimate`). Estimates are append-only history; each row stores a full `item_snapshot` (JSONB) of the item as it was when estimated.

### Key behaviors to preserve

- **Estimation is best-effort on item create.** `POST /items` and `POST /items/from-text` create the item first, then attempt an estimate inside a nested try/catch — a failed estimate logs and returns `estimate: null` but never fails item creation. `POST /items/:id/estimates` (manual re-estimate) is the path where estimate failure *is* surfaced as a 500.
- **Anthropic JSON parsing is brittle by design.** Both services strip ```` ```json ```` fences then `JSON.parse`. There is no schema validation beyond a numeric check on prices. If you change prompts, keep the "respond ONLY with JSON" instruction.
- **Rate limits** (in `index.ts`): global 100 req/min/IP; a tighter 10 req/min/IP limiter is applied specifically to the Claude-hitting routes (`/items/from-text`, `/items/:id/from-text`, `/items/:id/estimates`). `trust proxy` is set to 1 because the service runs behind an ALB.

## Database migrations

Migrations are plain `up()`/`down()` functions in `src/db/migrations/NNN_*.ts`, wired manually into `src/db/migrate.ts`. **`migrate.ts` is hand-edited each run**: already-applied migrations are commented out and only the new one is left uncommented. There is no migration-tracking table — when adding a migration, append its import and `up()` call, and comment out the prior ones before running `npm run migrate`.

Current schema:
- **`items`** — core fields (`year`, `make`, `model`, `vin`, `miles`, `location_address`, `seller_account_number`), workflow status fields (`data_capture_status`/`review_status` are `todo|in_progress|complete`; boolean title/lien checks; `published`), `universal_id`/`origin_system` for cross-system identity, and `raw_text`/`extra_attributes` (JSONB) for text-extracted items.
- **`estimates`** — append-only, `ON DELETE CASCADE` from items. Stores `low_price`/`high_price`, `reasoning`, `model_used`, `prompt_version`, `source`, and `item_snapshot` (JSONB).

## Environment variables

- `ANTHROPIC_API_KEY` — required for extractor/estimator.
- `DATABASE_URL` or the `DB_*` set — see connection resolution above.
