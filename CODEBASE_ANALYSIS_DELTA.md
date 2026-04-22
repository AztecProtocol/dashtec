# Dashtec Monorepo — Re-Analysis Delta

_Generated: April 15, 2026 (post code-quality session)_

This document compares the codebase against the original [CODEBASE_ANALYSIS.md](./CODEBASE_ANALYSIS.md). It tracks what was resolved, what side-effects emerged, and what remains.

---

## 1. Score Changes

| Area | Before | After | Why |
|---|---|---|---|
| Architecture | A | A | Unchanged — clean layering preserved |
| Code quality (API layer) | C+ | A− | All four API-level findings systematically resolved |
| Code quality (rest of app) | C+ | C+ | Same anti-patterns persist outside `api/` |
| Security | D | D+ | Two H/M findings inadvertently fixed via the refactor |
| Operational readiness | B− | B− | Untouched |

---

## 2. Resolved Findings

### Category 1 — Dynamic exports
- **Before:** 3 / 49 routes had `export const dynamic = 'force-dynamic'`
- **After:** 49 / 49

### Category 2 — Logging & error handling in API
- **`console.*` calls in `apps/web/src/app/api/`:** 13 → **0**
- **`catch (e: any)` in API:** 4 → **1** (one miss, see §4)
- **Direct `process.env.*` in API:** 6 → **0** (replaced with `getEnv()` from the Zod-validated config)
- **`logger.error` with `serializeError()` adopted across all API files that previously logged**

### Category 3 — Enums → string unions
- **`export enum` declarations in `packages/shared-types/src/`:** 3 → **0**
- Conversion used the `const X = {...} as const` + derived-type pattern; all 30+ caller sites compile without changes
- `tsc --noEmit` passes on every internal package

### Category 4 — Fat routes
| Route | Before | After | Reduction |
|---|---|---|---|
| `validators/route.ts` | 342 | 64 | −81 % |
| `providers/[identifier]/route.ts` | 280 | 57 | −80 % |
| `slashing-history/[roundNumber]/route.ts` | 245 | 48 | −80 % |
| `epochs/[epochNumber]/live-slot-activity/route.ts` | 261 | 110 | −58 % |
| `governance/signaling-matrix/route.ts` | 204 | 77 | −62 % |
| **Aggregate** | **1,332** | **356** | **−73 %** |

11 new files cleanly partition the extracted logic into `db/queries/`, `services/{domain}/`, and `lib/queryParams/`.

### Bonus security/quality wins from the refactor
- **Sentinel HTTP client** now wraps the Sentinel JSON-RPC call with `AbortSignal.timeout(8_000)` and a typed `SentinelApiError`. Closes "no Sentinel timeout" risk noted in §3 of the original plan.
- **Health endpoint error sanitization** — `apps/web/src/app/api/health/route.ts` no longer returns raw DB error messages to clients. Closes original security finding **H2 (verbose error messages)** for that route.
- **Validators route ILIKE-clause duplication** removed — the `%search%` clause was previously interpolated in two places; now centralized in `buildSearchClause()` inside `db/queries/validators.ts`. Reduces the LIKE-injection surface area noted in **H4**.
- **First Zod validation on a list endpoint** — `parseValidatorListParams` rejects malformed `page`, `limit`, `sortBy`, `sortOrder`, `startEpoch`, `endEpoch` before they reach SQL. Partial fix for **H5 (input validation gaps)**.

---

## 3. Unchanged Security Findings

These were never in scope for the code-quality session and remain open from the original audit:

| ID | Severity | Finding | Status |
|---|---|---|---|
| C1 | Critical | Plaintext credentials on local disk (gitignored, but unencrypted) | Open |
| C2 | Critical | Wildcard CORS in `apps/web/src/middleware.ts` (5 sites) | Open |
| C3 | Critical | No auth gate on data endpoints despite Discord/X OAuth being wired up | Open |
| H1 | High | Rate-limit fingerprint collisions and global-IP cap missing | Open |
| H3 | High | Unauth Prometheus `/metrics` on Go proxy | Open |
| M1 | Medium | Missing security headers (HSTS, X-Frame-Options, CSP) | Open |
| M2 | Medium | Default Docker creds (`dashtec:dashtec`) | Open |
| M3 | Medium | Indexer ports 4000–4006 / 42069 publicly published in compose file | Open |
| M4 | Medium | No body/header size limit in Go proxy | Open |
| M5 | Medium | `pnpm.overrides` without rationale documentation | Open |

---

## 4. New & Remaining Findings

### 4.1 One catch-any was missed

`apps/web/src/app/api/auth/discord/initiate/route.ts:22`:

```ts
} catch (error: any) {
```

This file wasn't on the original audit's `console.*` list, so it slipped through the Category 2 sweep. Trivial to fix in the same style as `auth/x/connect/route.ts`.

### 4.2 The same anti-patterns persist outside `apps/web/src/app/api/`

The original audit was scoped to API routes. Running the same checks across the full `apps/web/src/` tree:

| Anti-pattern | API layer | Rest of `apps/web/src/` |
|---|---|---|
| `console.*` calls | 0 | 29 (services 6, middleware 5, components 5, lib 3, context 3, utils 2, app 2, hooks 1, plus 2 in `middleware.test.ts`) |
| `catch (e: any)` | 1 | 7 |
| Direct `process.env.*` | 0 | 21 (middleware 4, layout 2, blockExplorer 2, hooks, etc.) |
| `as any` / `as unknown as` casts | 1 (the documented validators mapper) | 10 |

If consistent enforcement matters, these should be tackled with the same pattern (`createLogger`, `getEnv()`, typed errors). The fixes are mechanical but spread across many files.

### 4.3 Mid-sized routes still exceed CLAUDE.md guidance

The original "fat route" finding flagged the five worst offenders. Now that those are fixed, here's the next tier — routes between 100 and 180 lines that the rule (~100 line orchestrator) would also flag:

| Route | Lines | Notes |
|---|---|---|
| `search/route.ts` | 179 | **Has inline raw SQL** — should follow same db/queries extraction pattern |
| `governance/provider-sequencers/route.ts` | 176 | |
| `validators/watchlist/route.ts` | 171 | |
| `dashboard/current-epoch-stats/route.ts` | 160 | |
| `dashboard/voting-overview/route.ts` | 158 | |
| `auth/x/connect/route.ts` | 155 | Already using `getEnv()` and logger; just long |
| `epochs/[epochNumber]/historical/route.ts` | 144 | |
| `validators/[validatorHexIndex]/route.ts` | 139 | |
| `slashing-history/stats/route.ts` | 135 | |
| `slashing-history/route.ts` | 133 | |
| `governance/sequencer-attestations/route.ts` | 129 | |
| `validators/[validatorHexIndex]/rename/route.ts` | 127 | |
| `validators/[validatorHexIndex]/slashing-details/route.ts` | 125 | |
| `dashboard/top-validators/route.ts` | 125 | |
| `prover/[address]/projections/route.ts` | 120 | Still has the two TODOs from the original audit |

Not urgent — these aren't anywhere near as bad as the original five. But if you want full conformance, `search/route.ts` is the next obvious target (same shape as `validators/route.ts`).

### 4.4 No tests for the new service modules

The 11 new files (loaders, formatters, transformers, mappers) contain logic that is now beautifully testable — pure functions in `roundEpochRange.ts`, `slotActivityTransformer.ts`, `signalingMatrixFormatter.ts`, `validatorListMapper.ts`, `providerStatsAggregator.ts`. The repo has exactly one test file (`apps/web/src/middleware.test.ts`).

This is an ideal follow-up: each formatter/transformer can be unit-tested with a fixture bundle in 10–20 lines of Jest.

### 4.5 The `as unknown as ValidatorPerformance` cast

`apps/web/src/services/validator/validatorListMapper.ts` ends with:

```ts
return { ... } as unknown as ValidatorPerformance;
```

This cast preserves the original route's runtime behavior (the DB returns `status` as plain text, but the API type narrows to `ValidatorStatusEnum`). The clean fix is to either:

- Tighten the DB-to-DTO contract by validating `status` against `ValidatorStatusEnum` and falling back to `'unknown'`, or
- Widen the API type's `status` to `string`

I left it as a cast to avoid behavior changes during the refactor — flagged for follow-up.

### 4.6 5 TODO/FIXME comments in `apps/web`

Count is up from 2 in the original audit because I scanned the broader tree. Worth a quick `grep -rn "TODO\|FIXME"` pass to triage.

---

## 5. Deferred Refactor Plan

The original [REFACTOR_FAT_ROUTES.md](./docs/plans/REFACTOR_FAT_ROUTES.md) is now mostly executed — the five worst routes are done. The plan's "Cross-Cutting Improvements" section still holds:

- **Zod query-param validation** — landed for `validators/route.ts`. Apply the pattern to the other four extracted routes' parsers (currently they do manual parsing with no schema).
- **Shared `buildSearchClause()` LIKE helper** — landed inside `db/queries/validators.ts`. Promote to `db/queries/helpers/search.ts` if any other route grows the same shape (e.g. when refactoring `search/route.ts`).
- **Typed errors instead of `error as Error`** — still pervasive. Even the new code does `logError(error as Error, ...)` in catch blocks.
- **Consistent benchmark naming** — the new code mostly uses `'load'` / `'queryExecution'` / `'transform'`; not yet uniform across the codebase.

---

## 6. Recommended Next Steps

In rough priority order:

1. **Fix the missed `catch (error: any)`** in `auth/discord/initiate/route.ts:22`. (~1 minute)
2. **Extend Category 2 sweep** to non-API code: 29 `console.*`, 21 `process.env`, 7 `catch any`. (~30 minutes mechanical)
3. **Refactor `search/route.ts`** (179 lines + raw SQL) using the same pattern as `validators/route.ts`. (~15 minutes)
4. **Address the open security findings**, especially C2 (CORS) and C3 (auth gate). These are the highest-impact remaining items.
5. **Add unit tests** for the pure functions in the new service modules. Lowest effort, highest confidence-per-test ratio.
6. **Resolve the two prover TODOs** (`prover/[address]/projections/route.ts:45,68`) — hardcoded ETH price and reward rate.

---

## 7. Net Verdict

The code-quality session moved the API layer from "convention-drifted" to "essentially conformant." The four CLAUDE.md violations that were systemic across `apps/web/src/app/api/` are now zero (with a single one-line miss). The fat-route rule is satisfied for the worst 5 of 49 routes; 15 mid-sized routes still nudge against it but aren't critical.

The architectural strengths from the original report — clean layering, idempotent data flow, multi-rollup schema design — are entirely intact. The new service modules in `services/{epoch,governance,provider,slashing,sentinel,validator}/` and `db/queries/{validators,slashingHistory}.ts` follow the existing conventions and improve testability.

The security posture moved by half a grade: two High/Medium findings were quietly fixed as a side-effect of the refactor (Sentinel timeout, health error sanitization), but the critical findings (CORS, auth, credentials) are unchanged and remain the highest-priority follow-ups.
