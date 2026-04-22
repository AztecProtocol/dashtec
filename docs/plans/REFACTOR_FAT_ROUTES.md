# Refactor Plan — Fat API Routes

_Generated: April 15, 2026_

`CLAUDE.md` requires API route handlers to stay thin (~100 lines, orchestration only). Five routes currently exceed that. This document is a per-route extraction plan with concrete file paths, function names, and post-extraction targets. No code changes have been made — implement when ready.

## Conventions (from CLAUDE.md)

- **Raw SQL (`prisma.$queryRaw` template literals + `Prisma.sql` builders)** → `apps/web/src/db/queries/{model}.ts`
- **Prisma ORM logic** (`.findMany`, `.aggregate`, `.upsert`) → `apps/web/src/services/{domain}/{feature}.ts`
- **Cross-service orchestration that doesn't touch the DB** (e.g. external HTTP, business logic on already-fetched data) → `apps/web/src/services/{domain}/`
- **Param parsing & validation** → small helpers in the route, or shared in `apps/web/src/lib/`

Route handlers should end up doing only: parse params → call services in parallel → assemble response → handle errors.

---

## 1. `apps/web/src/app/api/validators/route.ts` (342 → ~80 lines)

### Current shape
- Lines 25–55: parse 17 query params (epochs, pagination, sort, search, status, show, provider, plus 10 column-filter params)
- Lines 57–64: validation
- Lines 66–133: build `Prisma.sql` filter conditions and epoch filter
- Lines 135–185: 51-line `switch` building `ORDER BY` clause across 9 sortable columns
- Lines 188–209: multi-CTE main query (already partially extracted to `db/queries/validatorAggregates.ts`)
- Lines 211–255: result mapping into the API DTO
- Lines 259–303: second large query for status counts (45 lines of inline raw SQL)
- Lines 305–329: response assembly + status filter

### Extractions

**A. `apps/web/src/lib/queryParams/validators.ts`** — pure param parsing
```ts
export interface ValidatorListParams {
  rollupAddresses: string[];
  isActiveRollup: boolean;
  pagination: { page: number; limit: number; showAll: boolean };
  sort: { sortBy: ValidatorSortKey; sortOrder: 'asc' | 'desc' };
  filters: ValidatorFilters;     // search, status, provider, balance/min-max, etc.
  epochRange: { start: number | null; end: number | null };
}
export async function parseValidatorListParams(searchParams: URLSearchParams): Promise<ValidatorListParams>
```
Use Zod here while we're touching it — kills the "no input validation" finding from the security audit.

**B. `apps/web/src/db/queries/validators.ts`** — both raw SQL queries
```ts
export function buildValidatorFilterClause(filters: ValidatorFilters, isActiveRollup: boolean): Prisma.Sql
export function buildValidatorOrderClause(sortBy: ValidatorSortKey, sortOrder: 'asc' | 'desc'): Prisma.Sql
export async function fetchRankedValidators(params: ValidatorListParams): Promise<RankedValidatorRow[]>
export async function fetchValidatorStatusCounts(params: ValidatorListParams): Promise<Array<{ status: string; count: number }>>
```
The 51-line ORDER BY switch becomes a lookup table `Record<ValidatorSortKey, (order) => Prisma.Sql>`.

**C. `apps/web/src/services/validator/validatorListMapper.ts`** — DTO mapping
```ts
export function mapValidatorRow(r: RankedValidatorRow): ValidatorDto
```
The 40-line `result.map(...)` block at lines 217–255.

### Post-extraction route shape
```ts
export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();
  try {
    const params = await parseValidatorListParams(new URL(request.url).searchParams);
    benchmark.start('queryExecution');
    const [rows, statusCounts] = await Promise.all([
      fetchRankedValidators(params),
      fetchValidatorStatusCounts(params),
    ]);
    benchmark.end('queryExecution');

    return NextResponse.json(buildValidatorListResponse(rows, statusCounts, params, benchmark));
  } catch (error) {
    logError(error as Error, 'VALIDATORS_LIST_FETCH_ERROR', { source: 'validators/route.ts:GET' });
    return NextResponse.json({ error: 'Failed to fetch sequencers list. Please try again later.' }, { status: 500 });
  }
}
```

### Risks
- The two raw queries share a search-param interpolation pattern that should be normalized (`buildSearchClause(searchParam): Prisma.Sql`) — currently duplicated between lines 80–89 and 290–298.
- `parseFloat`/`parseInt` defaults silently swallow `NaN`. Zod schemas should fail loudly.

---

## 2. `apps/web/src/app/api/providers/[identifier]/route.ts` (280 → ~80 lines)

### Current shape
- Lines 35–40: param parsing
- Lines 46–57: provider lookup (raw SQL, already extracted query builder)
- Lines 62–74: contract fallback (`getProviderConfiguration`) with try/catch
- Lines 80–116: 5 sequential benchmarked fetches (attesters, rollup breakdown, attester performance, performance history)
- Lines 128–187: aggregate computations (overall stats, status counts, total staked, attester mapping)
- Lines 189–230 (estimated): per-attester history mapping, queue handling
- Lines 232–280: response assembly

### Extractions

**A. `apps/web/src/services/provider/providerDetailLoader.ts`** — orchestrates the 5 parallel fetches
```ts
export interface ProviderDetailBundle {
  provider: ProviderByIdentifierRow;
  config: ProviderConfiguration;     // contract or DB fallback
  attesters: ProviderAttesterRow[];
  rollupBreakdown: RollupBreakdownRow[];
  performance: ProviderPerformanceRow[];
  history: PerformanceHistoryRow[];
}
export async function loadProviderDetail(identifier: string, opts: ProviderLoadOptions): Promise<ProviderDetailBundle>
```
Internally runs the existing query builders in `Promise.all` and handles the contract fallback. Returns `null` for "provider not found" so the route can 404 cleanly.

**B. `apps/web/src/services/provider/providerStatsAggregator.ts`** — pure functions over the bundle
```ts
export function aggregateProviderStats(bundle: ProviderDetailBundle, depositAmount: bigint): ProviderStats
export function mapAttestersWithHistory(bundle: ProviderDetailBundle): ProviderAttesterDto[]
export function buildRollupBreakdownDto(bundle: ProviderDetailBundle): RollupBreakdownDto[]
```

**C. `apps/web/src/db/queries/providers.ts`** — already exists; move the ad-hoc rollup-breakdown raw query here as `createProviderRollupBreakdownQuery(identifier, rollupAddresses)`.

### Post-extraction route shape
```ts
export async function GET(request, { params }) {
  const benchmark = createBenchmark();
  const { identifier } = await params;
  const opts = await parseProviderDetailParams(new URL(request.url).searchParams);

  try {
    const bundle = await loadProviderDetail(identifier, opts);
    if (!bundle) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

    const networkConfig = await getNetworkConfigFromCacheOrContract();
    const response: ProviderDetailApiResponse = {
      ...aggregateProviderStats(bundle, BigInt(networkConfig.depositAmount)),
      attesters: mapAttestersWithHistory(bundle),
      rollupBreakdown: buildRollupBreakdownDto(bundle),
      benchmark: benchmark.getResults().total,
      status: 'ok',
    };
    return NextResponse.json(response);
  } catch (error) { /* log + 500 */ }
}
```

### Risks
- The contract fallback (lines 62–74) has business-meaningful behavior (DB values when contract fails). Keep the fallback inside the loader, log via `@dashtec/logger`.

---

## 3. `apps/web/src/app/api/epochs/[epochNumber]/live-slot-activity/route.ts` (261 → ~70 lines)

### Current shape
- Lines 19–28: helper `getActiveValidatorsForRollup` — calls rollup contract
- Lines 30–95: helper `transformSentinelStatsToSlotActivity` — pure transformation
- Lines 100–112: epoch param validation
- Lines 113–170: load committee + validator details + provider metadata + provider attester join
- Lines 173–204: external Sentinel HTTP call + error handling
- Lines 206–249: filter sentinel stats, transform via helper, return

### Extractions

**A. `apps/web/src/services/epoch/epochCommittee.ts`**
```ts
export async function getActiveValidatorsForRollup(epochNumber: number, rollupAddress: Address): Promise<Address[]>
export async function loadCommitteeWithProviders(addresses: Address[]): Promise<Map<string, CommitteeMemberDetails>>
```
The Prisma joins for validator details + provider metadata + attester linkage move here.

**B. `apps/web/src/services/sentinel/sentinelClient.ts`**
```ts
export async function fetchValidatorStats(): Promise<SentinelStatsResponse>
```
Wraps the JSON-RPC call to `NEXT_SENTINEL_URL`. Returns typed result. Throws `SentinelApiError` so the route can map to 503 cleanly.

**C. `apps/web/src/services/epoch/slotActivityTransformer.ts`** — move the existing `transformSentinelStatsToSlotActivity` helper out of the route file. It's pure; no DB. Add types for `filteredSentinelStats` to kill the `any` (line 208).

### Post-extraction route shape
```ts
export async function GET(request, { params }) {
  const benchmark = createBenchmark();
  const { epochNumber } = await params;
  const targetEpoch = parseInt(epochNumber, 10);
  if (!Number.isInteger(targetEpoch) || targetEpoch < 0) {
    return NextResponse.json({ error: 'Epoch number must be a non-negative integer.' }, { status: 400 });
  }

  try {
    const rollupAddress = (await parseRollupParam(new URL(request.url).searchParams))[0]
      ?? await getActiveRollupAddress();

    const committee = await getActiveValidatorsForRollup(targetEpoch, rollupAddress as Address);
    if (committee.length === 0) return emptyActivities(benchmark);

    const [detailsMap, sentinelStats, networkConfig] = await Promise.all([
      loadCommitteeWithProviders(committee),
      fetchValidatorStats(),
      getNetworkConfigFromCacheOrContract(),
    ]);

    const activities = transformSentinelStatsToSlotActivity(
      filterSentinelStatsToCommittee(sentinelStats, committee),
      targetEpoch,
      networkConfig.epochDurationSlots,
      detailsMap
    );

    return NextResponse.json({ activities, benchmark: benchmark.getResults().total, status: 'ok' });
  } catch (error) { /* SentinelApiError → 503; else 500 */ }
}
```

### Risks
- The Sentinel API call currently has no timeout. Add `AbortSignal.timeout(8_000)` in `sentinelClient.ts`.
- `filteredSentinelStats: any` (line 208) and the `transformSentinelStatsToSlotActivity` signature both use `any`. Type the Sentinel response shape while extracting.

---

## 4. `apps/web/src/app/api/slashing-history/[roundNumber]/route.ts` (245 → ~70 lines)

### Current shape (inferred from grep — read in full before implementing)
- Param parsing + round-number validation
- Lines ~80–110: raw SQL fetch of validators participating in the round
- Lines ~166–190: round execution detail lookup (`TallyRoundExecuted`)
- Lines ~192–205: parallel fetch of convicted attesters + votes
- Lines ~206–245: response transformation (joining addresses → names/handles/providers)

### Extractions

**A. `apps/web/src/db/queries/slashingHistory.ts`**
```ts
export function createRoundParticipantsQuery(roundNumber: number, rollupAddresses: string[]): Prisma.Sql
export async function fetchRoundParticipants(...): Promise<RoundParticipantRow[]>
export async function fetchRoundExecution(roundNumber: number, rollupAddresses: string[]): Promise<TallyRoundExecuted | null>
export async function fetchConvictedAttestersAndVotes(roundNumber: number): Promise<{ attesters: ...; votes: ... }>
```

**B. `apps/web/src/services/slashing/slashingRoundDetail.ts`**
```ts
export async function loadSlashingRoundDetail(roundNumber: number, opts): Promise<SlashingRoundBundle | null>
export function transformSlashingRoundResponse(bundle: SlashingRoundBundle): SlashingRoundResponseDto
```
Loader runs the three queries from (A) in `Promise.all`. Transformer is pure — easy to unit-test.

### Post-extraction route shape
```ts
export async function GET(request, { params }) {
  const { roundNumber: roundParam } = await params;
  const roundNumber = parseInt(roundParam, 10);
  if (!Number.isInteger(roundNumber) || roundNumber < 0) return badRequest();

  try {
    const opts = await parseSlashingRoundParams(new URL(request.url).searchParams);
    const bundle = await loadSlashingRoundDetail(roundNumber, opts);
    if (!bundle) return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    return NextResponse.json(transformSlashingRoundResponse(bundle));
  } catch (error) { /* log + 500 */ }
}
```

### Risks
- Validator name/handle joins may overlap with helpers used by `validators/route.ts`. Watch for an opportunity to pull a shared `joinValidatorIdentity()` helper into `db/queries/helpers/`.

---

## 5. `apps/web/src/app/api/governance/signaling-matrix/route.ts` (204 → ~70 lines)

### Current shape
- Lines 37–46: param parsing
- Lines 47–53: validation
- Lines 55–66: contract calls (`benchmark contract_calls`)
- Lines 73–87: round → epoch range derivation (pure math)
- Lines 89–95: payload fetch from DB (`fetch_payloads`)
- Lines 97–124: payload processing (`process_payloads`)
- Lines 128–136: provider fetch (`fetch_providers`)
- Lines 138–170: response formatting (`format_response`)

### Extractions

**A. `apps/web/src/services/governance/roundEpochRange.ts`** — pure math
```ts
export interface RoundEpochRange { startEpoch: number; endEpoch: number; startSlot: bigint; endSlot: bigint; }
export function deriveRoundEpochRange(roundNumber: number, roundSize: number, slotsPerEpoch: number): RoundEpochRange
```
Move lines 73–87 here. Easy to unit test.

**B. `apps/web/src/services/governance/signalingMatrixLoader.ts`**
```ts
export async function loadSignalingMatrix(params: SignalingMatrixParams): Promise<SignalingMatrixBundle>
```
Orchestrates the 4 benchmarked fetches (contract, payloads, providers) in parallel where possible (contract + payloads can parallelize; providers depends on payload result).

**C. `apps/web/src/services/governance/signalingMatrixFormatter.ts`**
```ts
export function formatSignalingMatrixResponse(bundle: SignalingMatrixBundle): SignalingMatrixResponseDto
```
Lines 138–170 — pure formatter, unit-testable.

Most of the signaling-matrix DB code already lives under `apps/web/src/db/queries/signaling-matrix/` — extend that module rather than creating new files there.

### Post-extraction route shape
```ts
export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();
  try {
    const params = await parseSignalingMatrixParams(new URL(request.url).searchParams);
    const bundle = await loadSignalingMatrix(params);
    return NextResponse.json({
      ...formatSignalingMatrixResponse(bundle),
      benchmark: benchmark.getResults().total,
      status: 'ok',
    });
  } catch (error) { /* log + 500 */ }
}
```

---

## Suggested Implementation Order

1. **#5 signaling-matrix** — smallest (204 lines), already partly extracted, fastest to ship and validate the extraction pattern.
2. **#3 live-slot-activity** — also has a typed Sentinel client win, addresses an `any`.
3. **#4 slashing-history** — straightforward bundle + transform split.
4. **#2 providers/[identifier]** — heavier orchestration, but the bundle/aggregator split is clean.
5. **#1 validators** — biggest, hardest. Save it for last so the extraction patterns from the others are battle-tested. Pair with adding Zod for query params (kills two findings at once).

## Cross-Cutting Improvements to Bundle In

While doing these refactors, address adjacent findings:

- **Zod query-param validation** — every parsing helper (`parse*Params`) should use Zod schemas. Closes the security audit's H5 (input validation gaps).
- **Shared `searchParam` LIKE-clause builder** — three of the five routes interpolate `'%' + search + '%'` into ILIKE clauses. Extract to `apps/web/src/db/queries/helpers/search.ts` with proper `Prisma.sql` parameterization.
- **Typed errors instead of `error as Error`** — every fat route's catch block does `error as Error`. Replace with `serializeError()` from `@dashtec/logger`.
- **Consistent benchmark naming** — current names (`queryExecution`, `fetch_payloads`, `db_queries`) mix camelCase and snake_case. Pick one.

## Estimated Effort

| Route | Current | Target | Estimated PR size |
|---|---|---|---|
| signaling-matrix | 204 | ~70 | 1–2 hours |
| live-slot-activity | 261 | ~70 | 2–3 hours |
| slashing-history | 245 | ~70 | 2 hours |
| providers/[identifier] | 280 | ~80 | 3 hours |
| validators | 342 | ~80 | 4–5 hours (Zod adoption included) |

Total: ~12–15 hours of focused work, spread across 5 PRs.
