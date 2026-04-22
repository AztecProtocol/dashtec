# Dashtec Monorepo — Comprehensive Codebase Analysis

_Generated: April 15, 2026_

This report covers architecture, code quality, and security for the Dashtec Aztec blockchain monitoring platform. Findings reference concrete files and lines where applicable.

---

## 1. Executive Summary

Dashtec is a production-grade blockchain monitoring system for the Aztec network. The architecture is well-layered and the import rules declared in `CLAUDE.md` are actually honored across the repo. Data flows cleanly from Ponder event indexers through batch materializers into a Prisma/Postgres schema, exposed via a Next.js REST API to a React 19 dashboard, with a Go reverse proxy (`sentinel-proxy-go`) sitting in front of upstream Aztec RPC nodes.

**Overall verdict:** architecturally sound, but the repo has a significant set of convention violations in the API layer and, more seriously, credentials and CORS misconfigurations that warrant immediate remediation before any public-facing deployment.

| Area | Grade | Summary |
|---|---|---|
| Architecture | A | Clear layering; import rules honored; idempotent data flow |
| Code quality | C+ | 46/49 API routes missing `dynamic`, console logging, `any` in catches, fat routes |
| Security | D | Credentials in `.env` files tracked in git, wildcard CORS, no auth gate |
| Operational readiness | B- | Docker and K8s in place, but default creds and exposed indexer ports |

---

## 2. Architecture

### 2.1 Stack

- **Monorepo:** pnpm 9 + Turborepo, ESM everywhere, TypeScript strict
- **Frontend:** Next.js 16 (App Router), React 19, TanStack Query, Tailwind, Framer Motion
- **Indexer:** Ponder 0.15 (live blockchain events) + seven custom collectors extending `BaseCollector`
- **Database:** PostgreSQL 16 + Prisma 7 with a modular schema under `packages/database/prisma/models/*.prisma`
- **Proxy:** Go `sentinel-proxy-go` handling rate limiting, health checking, and upstream load balancing
- **Deployment:** Docker Compose (mainnet/testnet profiles) plus Kubernetes manifests under `k8s/base/`

### 2.2 Package dependency graph

All imports conform to the rules stated in `CLAUDE.md`:

| Package | Internal deps | Rule check |
|---|---|---|
| `shared-types` | none | Leaf — OK |
| `logger` | none | Leaf — OK |
| `shared-utils` | shared-types, logger | OK |
| `database` | shared-types, logger | OK |
| `contract-calls` | shared-types, aztec-rpc-sdk | OK |
| `indexer-ponder` | shared-types, shared-utils, logger, database | OK |
| `materializer` | database, shared-utils, indexer-ponder | OK |
| `indexer-custom` | database, shared-types, shared-utils, logger, aztec-rpc-sdk | OK |
| `apps/web` | all | OK |

### 2.3 Data flow

The declared flow `Blockchain → Ponder → Materializer → PostgreSQL → REST API → Dashboard` is implemented faithfully. Tracing a concrete example, a `ValidatorDeposit` event:

1. **Ponder handler** in `packages/indexer-ponder/src/sync/validator/` captures the GSE event, normalizes the address, and stores it keyed on `${txHash}-${logIndex}` for dedup.
2. **Materializer** `packages/materializer/src/materializers/deposit-lifecycle.ts` extends `BaseMaterializer`, batch-fetches from Ponder tables, and upserts into `MaterializedValidatorDeposit`. Checkpoints live in `MaterializerCheckpoint`. On reorg, `deleteAfterBlock()` rolls state back.
3. **REST API** `apps/web/src/app/api/validators/route.ts` composes a multi-CTE Prisma query ranking validators by attestation/proposal success and epoch participation.
4. **Client** `apps/web/src/hooks/queries/useValidatorsData.ts` calls it via TanStack Query with a 5-minute `staleTime`.

Idempotency is enforced at two layers: Ponder dedup IDs and Prisma upserts. Reorg detection compares Ponder's max block against the materializer checkpoint hash.

### 2.4 Services inventory

**sentinel-proxy-go** (`:8080`) — distributes RPC traffic across upstream nodes, exports Prometheus metrics at `/metrics`, provides a verbose `/health` endpoint listing every backend, and exposes `/pruned` and `/archiver` aliases for the two RPC classes.

**Custom collectors** — each runs standalone with a health + metrics endpoint at a fixed port offset from 4000:

| Collector | Port | Role |
|---|---|---|
| ValidatorStatsCollector | 4000 | Per-validator performance polling |
| ValidatorListCollector | 4001 | Registry sync |
| EpochIntegrityCollector | 4002 | Epoch consistency checks |
| EpochAggregatesCollector | 4003 | Epoch-wide metrics |
| ValidatorMigrationCollector | 4004 | Rollup migration tracking |
| ProviderListCollector | 4005 | Provider metadata sync |
| TokenPriceCollector | 4006 | Price feed polling |

### 2.5 Database schema

Nine Prisma model files group roughly as follows (all PascalCase model names, snake_case fields, proper dedup indexes on `(transaction_hash, log_index)`):

- **Validators** (11 models): `Validator`, `ValidatorQueue`, `ValidatorAttestation`, `ValidatorEpochPerformance`, `ValidatorRollup`, `ValidatorMigration`, and five `MaterializedValidator*` snapshots.
- **Blocks** (3): `L2BlockProposed`, `L2ProofVerified`, `CanonicalRollupUpdated`.
- **Epochs** (2): `Epoch`, `EpochIntegrityStats`.
- **Governance** (5): `ProposerVote`, `ProposerPayloadSubmittable`, `ProposerPayloadSubmitted`, `GovernanceProposerPayload`, `GovernanceProposerGSEPayload`.
- **Slashing** (8): `SlashFactoryPayload`, `SlashPayloadData`, `SlashSlashed`, `TallyVoteCast`, `TallyRoundExecuted`, `TallySlashTargetCommittee`, `TallySlashAction`, plus supporting records.
- **Providers** (5): `Provider`, `ProviderAttester`, `ProviderMetadata`, `ProviderQueueDrip`, `StakedWithProvider`.
- **System** (2): `AuthChallenge`, `AppErrorLog`.

All models carry `rollup_address` foreign keys, enabling multi-rollup support on a single database.

### 2.6 Next.js app

16 page files, 49 API routes across auth (6), validators (6), governance (6), epochs (3), provers (5), dashboard (4), providers (2), plus 17 miscellaneous. The app nests eight providers at the root layout (wallet, connect-wallet, theme, notification, loading, query, rollup, and the top-level `AppProvider`). 135 `.tsx` component files are organized into `features/`, `layout/`, and `ui/`.

### 2.7 Deployment topology

`docker-compose.yml` supports split `mainnet` and `testnet` profiles with dedicated Postgres and Redis instances (`mainnet` on 5432, `testnet` on 5433). Kubernetes manifests in `k8s/base/` define separate deployments for `web`, `indexer-ponder`, and `indexer-custom`, with a one-shot `migration-job.yaml` applied before rollout. Health check paths are standardized: `/api/health` (web), `:42069/health` (Ponder), `:4000-4006/health` (collectors).

---

## 3. Code Quality Findings

Ordered by impact. All issues reference concrete files.

### 3.1 Systemic: API route conventions

**`dynamic` export missing on 46 of 49 routes.** `CLAUDE.md` mandates `export const dynamic = 'force-dynamic'`; only `health/`, `token-price/`, and `rollups/` have it. Everything under `auth/`, `dashboard/`, `epochs/`, `providers/`, `validators/`, `governance/`, `prover/`, and `search/` is missing it. Without this, Next.js may statically prerender responses at build time, serving stale data.

**Fat route handlers.** `CLAUDE.md` says routes should stay thin (~100 lines, orchestration only). Offenders:

- `apps/web/src/app/api/validators/route.ts` — 340 lines, includes inline multi-CTE SQL
- `apps/web/src/app/api/providers/[identifier]/route.ts` — 275 lines
- `apps/web/src/app/api/epochs/[epochNumber]/live-slot-activity/route.ts` — 255 lines
- `apps/web/src/app/api/slashing-history/[roundNumber]/route.ts` — 243 lines
- `apps/web/src/app/api/governance/signaling-matrix/route.ts` — 202 lines

**Raw SQL in routes.** Should be extracted to `apps/web/src/db/queries/`:

- `apps/web/src/app/api/search/route.ts:45` — inline CTE
- `apps/web/src/app/api/validators/route.ts:188` — multi-stage CTE

### 3.2 Config and logging discipline

**Direct `process.env` access** instead of Zod-validated config:

- `apps/web/src/app/api/auth/discord/callback/route.ts:44,51,57` (`process.env.APP_URL`)
- `apps/web/src/app/api/auth/x/connect/route.ts:76,95,102` (`process.env.APP_URL`)

**`console.*` instead of `@dashtec/logger`:**

- `apps/web/src/app/api/health/route.ts:25,38`
- `apps/web/src/app/api/auth/discord/callback/route.ts:47`
- `apps/web/src/app/api/auth/x/connect/route.ts:80`
- `apps/web/src/app/api/dashboard/voting-overview/route.ts:38,49`
- `apps/web/src/app/api/epochs/[epochNumber]/live-slot-activity/route.ts:23`
- `apps/web/src/app/api/stats/general/route.ts:21` (also logs raw data)

### 3.3 Type safety

**Enums instead of string unions** (`CLAUDE.md` forbids enums):

- `packages/shared-types/src/validators.ts:15` — `ValidatorContractStatus`
- `packages/shared-types/src/validators.ts:77` — `Offense`
- `packages/shared-types/src/proposers.ts:4` — `ProposerVoteType`

**`any` in catch blocks and indexer:**

- `apps/web/src/app/api/health/route.ts:24,37` (`catch (e: any)`)
- `apps/web/src/app/api/auth/discord/callback/route.ts:46`
- `apps/web/src/app/api/auth/x/connect/route.ts:79`
- `packages/indexer-ponder/src/events/rollup/deposit.ts:35` (`as any` on contract result)

### 3.4 Miscellaneous

- `apps/web/src/app/api/prover/[address]/projections/route.ts:45,68` — two TODOs in a production route (ETH price and reward rate both hardcoded/missing).
- `apps/web/src/lib/prisma.ts:58` — a `debugSql()` helper that could leak SQL into logs if ever enabled in production.
- `ValidatorEpochPerformance` model uses `BigInt` for some timestamps, while other models use `DateTime` or `String`. Worth standardizing.

---

## 4. Security Findings

### 4.1 Critical

**C1. Plaintext production credentials on local disk.** `.env` files contain real secrets including `DATABASE_URL` with plaintext password, `SESSION_PASSWORD`, `DISCORD_CLIENT_SECRET`, and `X_CLIENT_SECRET`:

- `apps/web/.env`
- `packages/database/.env`
- `services/sentinel-proxy-go/.env`

The good news: these files are properly listed in `.gitignore` (`.env`, `.env.local`, `.env*.local`) and are **not** tracked in git. The risk is local — any developer machine or shared workstation with a clone of this repo has production credentials sitting in plaintext. Move production secrets to a secret manager (Vault, AWS Secrets Manager, or Doppler/1Password CLI) and keep only dev-safe values in local `.env` files. Double-check git history (`git log --all -- '**/.env'`) to confirm they've never been accidentally committed.

**C2. Wildcard CORS.** `apps/web/src/middleware.ts:254-258,315-317` sets `Access-Control-Allow-Origin: *` on all API responses. Combined with session cookies, this is a CSRF foot-gun. Restrict to an explicit allowlist.

**C3. No authentication on data endpoints.** All of `/api/dashboard`, `/api/validators`, `/api/providers`, `/api/search` etc. are open. The app integrates Discord/X OAuth but doesn't gate any data surfaces. If leaking validator/provider profile joins (including Discord/X handles) to the open internet is not intentional, add auth middleware.

### 4.2 High

**H1. Rate limiting flaws in `apps/web/src/middleware.ts`:**

- Device fingerprints (lines 72–93) hash only stable headers (User-Agent, Accept-Language, platform). Many users collide.
- In-memory counter store (lines 149–163) leaks unless the 10%-sampled cleanup runs (line 193).
- No global IP cap — attackers can hop paths to multiply their quota.
- `RATE_LIMITING_ENABLED` is flag-toggleable but state resets on restart.

**H2. Verbose error messages.** `apps/web/src/app/api/health/route.ts:25-26,38-39` returns raw database error messages to clients. Strip to a generic message; log details server-side.

**H3. Unauthenticated Prometheus metrics.** `services/sentinel-proxy-go/pkg/server/server.go:77` exposes `/metrics` publicly. Put it behind an internal route or basic auth.

**H4. Potential LIKE-injection pattern.** `apps/web/src/app/api/search/route.ts:32,126` mixes template interpolation with raw SQL (`'%' + searchQuery + '%'`). Prisma's template-literal `$queryRaw` is parameterized, but the string-concat pattern at line 126 is a smell — prefer `Prisma.sql\`...\`` with typed placeholders consistently.

**H5. Input validation gaps.** No Zod parsing on query params. `apps/web/src/app/api/providers/route.ts:21-22` accepts `page`/`limit` without floor/ceiling checks. Several other routes coerce `Number(searchParams.get(...))` without NaN/bounds validation.

### 4.3 Medium

**M1. Missing security headers.** `next.config.*` defines no `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, or CSP.

**M2. Default credentials in Docker.** `docker-compose.yml` uses `dashtec:dashtec` for Postgres and `dashtec` for Redis. Fine for local, risky if anyone reuses the compose file in production.

**M3. Indexer ports exposed.** `docker-compose.yml` publishes Ponder (42069) and collector ports (4000–4006) with no auth. Bind them to the Docker network only.

**M4. No body/header size limits in Go proxy.** `services/sentinel-proxy-go/pkg/server/server.go:44` uses Go's defaults. Set `MaxHeaderBytes` and wrap handlers with `http.MaxBytesReader`.

**M5. Dependency overrides without rationale.** `package.json:45-51` pins `esbuild`, `hono` (three separate ranges), `valibot`, and `next` for what appear to be CVEs. Add comments or a `SECURITY.md` explaining each pin.

### 4.4 Low

- Middleware logs IP and fingerprint on every request (`apps/web/src/middleware.ts:238-242`). Consider redaction or a log-retention policy.
- No explicit Prisma `maxConnections` configured — relying on defaults; set per-service pool sizes for Ponder vs. web vs. materializer.
- `sentinel-proxy-go` shutdown timeout is a hard-coded 10s with no request draining — some requests get cut during deploys.
- `sentinel-proxy-go` `/health` response enumerates backends, useful for operators but also for attackers.

---

## 5. Recommended Action Plan

**Immediate (this week):**

1. Move plaintext production credentials out of local `.env` files and into a secret manager; verify `git log --all -- '**/.env'` shows no history of them being committed.
2. Replace `Access-Control-Allow-Origin: *` with an explicit domain allowlist in `apps/web/src/middleware.ts`.
3. Decide whether the dashboard is public; if not, gate API routes behind the existing OAuth.
4. Add `export const dynamic = 'force-dynamic'` to the 46 missing routes (single sweeping PR).

**Short-term (next sprint):**

6. Convert the three enums in `shared-types` to string unions.
7. Extract raw SQL out of `validators/route.ts`, `search/route.ts`, and the four other 200+-line routes into `apps/web/src/db/queries/` and `apps/web/src/services/`.
8. Replace `console.*` with `@dashtec/logger` and `catch (e: any)` with typed error helpers.
9. Introduce Zod schemas for query-param parsing across API routes.
10. Add security headers and a basic CSP in `next.config.ts`.

**Medium-term:**

11. Put Prometheus and collector health endpoints behind internal-only routing.
12. Add request size limits and graceful drain to `sentinel-proxy-go`.
13. Standardize timestamp types across Prisma models.
14. Resolve the two TODOs in `prover/[address]/projections/route.ts` (ETH price + reward rate).
15. Document the rationale behind each `pnpm.overrides` entry.

---

## 6. Strengths Worth Preserving

- Layering is real, not aspirational — `CLAUDE.md` rules match actual imports.
- Idempotency everywhere: Ponder dedup IDs, Prisma upserts, reorg-aware materializers.
- Clear separation of capture (Ponder), enrichment (collectors), and serve (API).
- Multi-rollup support designed into the schema from day one.
- Prisma modular schema with domain-grouped files scales well as the model count grows.
- Health endpoints and Prometheus metrics are consistent across services — good operational hygiene, modulo auth.

The bones are good. The fixes are mostly mechanical: apply conventions uniformly, close the credential and CORS gaps, and tighten the API-layer hygiene.
