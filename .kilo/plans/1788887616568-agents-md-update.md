# Bifröst — AGENTS.md Update Plan

## Goal
In-place improve `AGENTS.md` (root) with high-signal, repo-specific guidance. No other files change.

## Current state
- `AGENTS.md` exists (695 lines). It is a near-verbatim copy of `PLAN.md` (mission, architecture rules, testing rules, etc.). Much of it is generic project-management content, not agent-specific operational guidance.
- Repo facts verified by reading files: pnpm workspace, Next.js 15 app under `apps/api`, packages `models/providers/router/shared/storage`, Jest+ts-jest, Neon serverless Postgres, `master` branch, Vercel deploy.

## Proposed new `AGENTS.md` (full replacement)
Keep the existing sections 1–29 (mission, execution rules, architecture rules, testing rules, definition of done, etc.) and **prepend** a new compact "Repo Quick Facts" section (section 0) plus append a "Developer Commands" section. Do not delete verified useful guidance.

### Section 0 — Repo Quick Facts (new, prepend)
- Stack: pnpm 10.16.0 workspace, TS 5.6, Next.js 15 App Router, Jest+ts-jest, Neon serverless Postgres.
- Branch: `master` (single default). Remote: origin (GitHub).
- Entrypoints: API app `apps/api`; real routes under `apps/api/app/api/...`. Packages: `models`, `providers`, `router`, `shared`, `storage`.
- Vercel pnpm builds do NOT create workspace symlinks. `apps/api/next.config.mjs` re-aliases `@bifrost/*` → `packages/*/src` and lists `transpilePackages`. Adding a package requires updating both lists.
- Generated JS artifacts (`.js`/`.d.ts`/`.map`) are committed for `models`, `providers`, `shared`. `router` has no built artifacts. Don't delete committed `.js` files wholesale.
- DB: `database/schema.sql` is canonical. Migrations live in `database/migrations/` (currently untracked). Run in order; never hand-edit prod schema.
- Secrets: `.env.local` exists locally with real `DATABASE_URL` + `VERCEL_OIDC_TOKEN`; it is gitignored. Never commit secrets.

### Section 31 — Developer Commands (new, append)
- Install: `pnpm install`
- Dev server: `pnpm dev` (runs `@bifrost/api` Next.js on port 3000)
- Build: `pnpm build`
- Typecheck: `pnpm typecheck` (api only; individual packages: `pnpm --filter @bifrost/router typecheck`)
- Test: `pnpm test` (Jest across `packages/models/tests` + `packages/providers/tests`). Single package: `pnpm --filter @bifrost/models test`. Note the root `test` script hardcodes a path to the pnpm-stored jest binary.
- Vercel deploy config: `vercel.json` + `.vercel/project.json`. Build command: `pnpm --filter @bifrost/api build`.

## Constraints honored
- No destructive git operations.
- No new dependencies.
- Preserve existing AGENTS.md sections 1–29 verbatim.
- Only modify `AGENTS.md`.

## Validation
- Read back the file; confirm sections 1–29 intact and new sections present.
- No secrets introduced.