# Multi-Versioned Rollup Data Migration Spec

> Goal: Support multiple rollup contract versions in the same database, enabling historical queries across versions and seamless version transitions.

---

## 1. Current Architecture

### Data Pipeline

```
L1 Chain Events
    |
    v
Ponder (indexer-ponder)          -- Event indexing, writes to `ponder_*` schema
    |
    v
Materializer (materializer)      -- Cursor-based polling, denormalizes into `public` schema
    |
    v
Prisma (database)                -- Application tables in `public` schema
    |
    v
Backend API (apps/web)           -- Next.js API routes, raw SQL + ORM queries
    |
    v
Frontend (apps/web)              -- React components
```

### Prisma Model Domains

| Domain | Models | Rollup-Aware? |
|--------|--------|---------------|
| Blocks | `L2BlockProposed`, `L2ProofVerified` | Yes — has `rollup_address` |
| Validators | `Validator`, `ValidatorAttestation`, `ValidatorEpochPerformance` | Partial — `Validator.rollup_address` added, others lack it |
| Providers | `Provider`, `ProviderAttester`, `ProviderQueueDrip`, `StakedWithProvider` | `StakedWithProvider` has `rollupAddress`, others don't |
| Governance | `ProposerVote`, `ProposerPayloadSubmittable`, `ProposerPayloadSubmitted` | No — only `contract_address` |
| Slashing | `SlashSlashed`, `TallyVoteCast`, `TallyRoundExecuted` | No — only `contract_address` |
| Epochs | `Epoch` | No |
| Materializer | `MaterializerCheckpoint`, `BlockHashCache` | No — global cursors |

### Ponder Event Tables With `rollup_address`

These tables already capture the originating rollup contract address:

- `deposit` — `rollup_address` (from `event.log.address`)
- `gseDeposit` — `instance_address` (from event args, maps to rollup identity)
- `failedDeposit` — `rollup_address`
- `withdrawInitiated` / `withdrawFinalized` — `rollup_address`
- `stakedWithProvider` — `rollup_address` (explicit event parameter)
- `l2BlockProposed` — `rollup_address`

### Ponder Event Tables WITHOUT `rollup_address`

These only have `contract_address` (the contract that emitted the event, not the rollup it belongs to):

- `proposerVote`
- `payloadSubmittable` / `payloadSubmitted`
- `tallyVoteCast` / `tallyRoundExecuted`
- `slashed`
- `l2ProofVerified`
- `validatorQueued`
- `providerRegistered` / `providerQueueDripped` / etc.

### indexer-custom Collectors

6 independent collectors in `packages/indexer-custom/src/collectors/`:

| Collector | Rollup-Aware? | Notes |
|-----------|---------------|-------|
| ValidatorListCollector | No — uses single `ROLLUP_CONTRACT_ADDRESS` | Calls `getActiveAttesterCount`, `getAttesterAtIndex` |
| ValidatorStatsCollector | No — uses aztec-rpc-sdk | Fetches validator stats via dedicated RPC |
| EpochIntegrityCollector | No — global epochs | Validates epoch-level integrity metrics |
| EpochAggregatesCollector | No — aggregates globally | Computes per-epoch aggregated metrics |
| ValidatorMigrationCollector | Partial — handles GSE migration events | Tracks `moveWithLatestRollup` flag |
| ProviderListCollector | No — uses single `STAKING_REGISTRY_ADDRESS` | Calls `getProviderCount`, `getProviderAtIndex` |

### Backend API Patterns

| Pattern | Used For | Rollup Filtering? |
|---------|----------|-------------------|
| Raw SQL CTEs | Provider rankings, validator aggregations, epoch metrics | No |
| Prisma ORM | Simple CRUD, provider/validator lookups | No |
| Direct contract calls | Live network config (epoch duration, pending blocks) | Single `ROLLUP_CONTRACT_ADDRESS` |

### Hardcoded Single-Rollup Assumptions

1. **Config**: `ROLLUP_CONTRACT_ADDRESS` is a single env var across all packages
2. **Ponder config**: Contracts are registered once, no dynamic binding
3. **Materializer checkpoints**: Global cursor per materializer ID, no rollup dimension
4. **API queries**: No `WHERE rollup_address = ?` filtering anywhere
5. **Frontend**: No rollup version selector or context
6. **indexer-custom**: All contract calls target single address

---

## 2. Rollup Version Identity

### Proposed Identifier: `rollup_address`

Use the rollup contract address (`0x...`, 42 chars) as the canonical version identifier. This is already captured by Ponder in several event tables and requires no mapping layer.

**Why not a semantic version like `v1`/`v2`?**
- Addresses are already present in indexed data
- No ambiguity — each contract deployment has a unique address
- No lookup table needed to resolve version → address

### Rollup Registry Config

Replace single `ROLLUP_CONTRACT_ADDRESS` with a registry:

```typescript
// .environment/mainnet/config.json
{
  "rollup": {
    "versions": [
      {
        "address": "0xOLD_ROLLUP_ADDRESS",
        "label": "v1",
        "startBlock": 12345678,
        "endBlock": 19876543,
        "deprecated": true
      },
      {
        "address": "0xNEW_ROLLUP_ADDRESS",
        "label": "v2",
        "startBlock": 19876544,
        "endBlock": null,
        "deprecated": false
      }
    ],
    "activeAddress": "0xNEW_ROLLUP_ADDRESS"
  }
}
```

---

## 3. Migration Plan

### Phase 1: Schema — Add `rollup_address` to All Tables

**Database models requiring a new `rollup_address` column:**

| Model | Current State | Change |
|-------|--------------|--------|
| `L2ProofVerified` | No rollup field | Add `rollup_address Char(42)` |
| `ValidatorAttestation` | No rollup field | Add `rollup_address VarChar(42)` |
| `ValidatorEpochPerformance` | No rollup field | Add `rollup_address VarChar(42)` |
| `Epoch` | No rollup field | Add `rollup_address VarChar(42)` |
| `Provider` | No rollup field | Add `rollup_address VarChar(42)` |
| `ProviderAttester` | No rollup field | Add `rollup_address VarChar(42)` |
| `ProviderQueueDrip` | No rollup field | Add `rollup_address Char(42)` |
| `ProposerVote` | Has `contract_address` | Add `rollup_address VarChar(42)` |
| `ProposerPayloadSubmittable` | Has `contract_address` | Add `rollup_address VarChar(42)` |
| `ProposerPayloadSubmitted` | Has `contract_address` | Add `rollup_address VarChar(42)` |
| `SlashSlashed` | Has `contract_address` | Add `rollup_address VarChar(42)` |
| `TallyVoteCast` | Has `contract_address` | Add `rollup_address VarChar(42)` |
| `TallyRoundExecuted` | Has `contract_address` | Add `rollup_address VarChar(42)` |
| `MaterializerCheckpoint` | Global cursor | Add `rollup_address VarChar(42)` to composite PK |

**Models already rollup-aware (no schema change):**

| Model | Field |
|-------|-------|
| `L2BlockProposed` | `rollup_address Char(42)` |
| `Validator` | `rollup_address VarChar(42)` (optional) |
| `StakedWithProvider` | `rollupAddress Char(42)` |

**Migration strategy:**
1. Add columns as nullable first (zero-downtime)
2. Backfill existing rows with current `ROLLUP_CONTRACT_ADDRESS` value
3. Add indexes on `rollup_address` for all tables
4. Make columns non-nullable after backfill
5. Update composite unique constraints where needed

### Phase 2: Ponder — Add `rollup_address` to Missing Event Tables

Ponder event handlers that need to capture rollup_address:

| Event Handler | Source of `rollup_address` |
|---------------|---------------------------|
| `l2-proof-verified.ts` | `event.log.address` |
| `validator-queued.ts` | `event.log.address` |
| `signal-cast.ts` | Needs rollup mapping via GovernanceProposer → Rollup relationship |
| `payload-submittable.ts` | Needs rollup mapping |
| `payload-submitted.ts` | Needs rollup mapping |
| `vote-cast.ts` | Needs rollup mapping via TallySlashing → Rollup relationship |
| `round-executed.ts` | Needs rollup mapping |
| `slashed.ts` | `event.log.address` (Rollup contract emits this) |
| `provider-registered.ts` | Needs rollup mapping via StakingRegistry |
| `provider-queue-dripped.ts` | Needs rollup mapping |
| `staking-registry/*.ts` | Most have implicit rollup via event args |

**Key challenge:** Governance and Tally contracts are not the Rollup contract — they emit events about a rollup but their `event.log.address` is their own contract address. Two approaches:

**Option A — Config mapping (simpler):**
```typescript
// Map contract addresses to their associated rollup
const CONTRACT_TO_ROLLUP: Record<string, string> = {
  '0xGOVERNANCE_PROPOSER': '0xROLLUP_V2',
  '0xTALLY_SLASHING': '0xROLLUP_V2',
};
```

**Option B — On-chain lookup (more robust):**
```typescript
// Read rollup address from GovernanceProposer contract
const rollupAddress = await client.readContract({
  address: governanceProposerAddress,
  abi: GovernanceProposerABI,
  functionName: 'getRollup',
});
```

### Phase 3: Materializer — Per-Rollup Cursors

**Changes to `MaterializerCheckpoint`:**

```prisma
model MaterializerCheckpoint {
  checkpointName String   @db.VarChar(100)
  rollupAddress  String   @db.VarChar(42)
  blockNumber    String   @default("0") @db.VarChar(20)
  logIndex       String   @default("0") @db.VarChar(10)
  updatedAt      DateTime @default(now()) @updatedAt

  @@id([checkpointName, rollupAddress])
}
```

**Changes to `BaseMaterializer`:**
- `fetchBatch()` must filter by `rollup_address` in its Ponder query
- `loadCursor()` / `saveCursor()` must include rollup address in checkpoint lookup
- Each materializer processes one rollup at a time, cycling through active rollups per poll

```typescript
// Pseudocode for poll loop
for (const rollup of activeRollups) {
  for (const materializer of materializers) {
    await materializer.poll(rollup.address);
  }
}
```

**Changes to `ReorgDetector`:**
- `BlockHashCache` stays rollup-agnostic (L1 blocks are shared across all rollups)
- No changes needed — reorgs affect all rollups equally

### Phase 4: indexer-custom — Multi-Rollup Collectors

**ValidatorListCollector:**
```typescript
// Current: single contract call
const count = await client.readContract({
  address: config.ROLLUP_CONTRACT_ADDRESS, // single
  // ...
});

// New: iterate over rollup versions
for (const rollup of config.rollup.versions.filter(v => !v.deprecated)) {
  const count = await client.readContract({
    address: rollup.address,
    // ...
  });
  // Insert with rollup_address column
}
```

**ProviderListCollector:**
- StakingRegistry is likely shared across rollups — may need per-rollup filtering of results

**EpochIntegrity/EpochAggregates:**
- Epochs may be global or per-rollup depending on protocol design
- Needs protocol-level clarification before implementation

### Phase 5: Backend API — Rollup-Scoped Queries

**Add `rollup` query parameter to all endpoints:**

```typescript
// GET /api/validators?rollup=0x1234...
// GET /api/providers?rollup=0x1234...
// GET /api/blocks?rollup=0x1234...

const rollupAddress = searchParams.get('rollup') ?? config.rollup.activeAddress;
```

**Update raw SQL queries:**

```sql
-- Before
SELECT * FROM "Validator" WHERE status = 'active'

-- After
SELECT * FROM "Validator"
WHERE status = 'active'
  AND rollup_address = $1  -- defaults to active rollup
```

**Add rollup metadata endpoint:**

```typescript
// GET /api/rollups
// Returns list of known rollup versions with metadata
{
  "versions": [
    { "address": "0x...", "label": "v1", "deprecated": true },
    { "address": "0x...", "label": "v2", "deprecated": false }
  ],
  "active": "0x..."
}
```

### Phase 6: Frontend — Rollup Context

- Add rollup version selector in header/navigation
- Store selected rollup in URL params (`?rollup=0x...`)
- Pass rollup address to all API calls
- Default to active rollup when no selection

---

## 4. GSE Instance Handling

GSE (Generic Sequencer Environment) introduces a wrinkle:

- `gseDeposit.instance_address` is the GSE instance, not the rollup address
- `gseDeposit` has `moveWithLatestRollup: boolean` which signals whether a validator migrates with rollup version changes
- The materializer currently maps `instance_address` → `rollup_address` in `ValidatorMaterializer`

**For multi-rollup:**
- GSE instances may span multiple rollup versions
- Need to track the GSE instance → rollup mapping over time
- Validators with `moveWithLatestRollup = true` should automatically be associated with the newest rollup version

---

## 5. Data Backfill Strategy

When a new rollup version is deployed:

1. **Git tag**: Tag the current Ponder handlers as `ponder-v{N}-final` before modifying for the new ABI. This preserves the ability to re-index historical data by checking out the tag and running Ponder against the old contract.
2. **Ponder**: Update `ponder.config.ts` with the new contract address + ABI. Ponder indexes from the new contract's deployment block.
3. **Existing data**: Run a one-time migration to set `rollup_address = OLD_ROLLUP_ADDRESS` on all existing rows where `rollup_address IS NULL`.
4. **Materializer**: Reset checkpoints for the new rollup version — it starts fresh from block 0 for the new contract. Old version checkpoints remain untouched (static data).
5. **indexer-custom**: Reset collector checkpoints to re-scan with multi-rollup awareness.

### Historical Re-indexing (Emergency Only)

If old version data needs to be re-indexed (corruption, missed rows, new columns):

1. Check out the git tag `ponder-v{N}-final`
2. Point Ponder at the old contract address
3. Run against a separate Ponder schema (e.g. `ponder_v1_recovery`)
4. Merge recovered data into the main database

This avoids maintaining versioned handler directories in the codebase long-term.

---

## 6. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backfill sets wrong rollup_address | Data corruption | Verify against Ponder source data before making columns non-nullable |
| API breaks without `rollup` param | All consumers affected | Default to `activeAddress` when param is missing |
| Checkpoint migration loses position | Re-processing from block 0 | Backup checkpoints before migration, test on staging |
| Governance contract → rollup mapping breaks | Wrong rollup association | Use on-chain lookup (Option B) rather than hardcoded mapping |
| Epoch model ambiguity (global vs per-rollup) | Incorrect aggregation | Clarify with protocol team before Phase 4 |

---

## 7. Implementation Order

```
Phase 1: Schema (nullable columns + backfill)
   |
   v
Phase 2: Ponder (add rollup_address to event handlers)
   |
   v
Phase 3: Materializer (per-rollup cursors + query filters)
   |
   v
Phase 4: indexer-custom (multi-rollup collectors)
   |
   v
Phase 5: Backend API (rollup-scoped queries)
   |
   v
Phase 6: Frontend (rollup selector + context)
```

Each phase is independently deployable. Phases 1-2 are backward-compatible (nullable columns, default values). Phase 3 onward requires the rollup registry config.

---

## 8. Resolved Questions

1. **Are epochs global or per-rollup?** Per-rollup. Epoch numbers reset on new rollup versions. `Epoch` needs `rollup_address` in its composite PK.

2. **Is StakingRegistry shared across rollups?** Yes — one StakingRegistry serves all rollup versions. `Provider` and `ProviderAttester` are rollup-agnostic. `StakedWithProvider` (which already has `rollupAddress`) is the join point between providers and specific rollup versions.

3. **How does governance map to rollup versions?** 1:1 — each rollup version deploys its own GovernanceProposer and TallySlashing contracts. The contract address in Ponder config can be mapped directly to its rollup version via the registry config.

4. **What happens to validators during a version transition?** Validators explicitly choose via `moveWithLatestRollup` flag. Those that stay on the old rollup are orphaned. Those that follow are re-associated with the new rollup contract.

### Additional Findings

5. **ABI compatibility**: New rollup versions are **NOT guaranteed ABI-compatible**. Event signatures may change between versions. This means Ponder needs separate handler registrations per ABI version, not just a second address on the same handler.

6. **L2 numbering resets**: Slot numbers, epoch numbers, and L2 block numbers all reset on a new rollup version. Tables keyed by these values (`L2BlockProposed`, `Epoch`, `ValidatorAttestation`, `ValidatorEpochPerformance`) need `rollup_address` as part of their primary/unique key — not just an added column.

7. **On-chain upgrade transaction exists**: There is a discoverable on-chain event that marks the version transition. This can be used to auto-detect version boundaries rather than relying on manual config.

8. **Old versions are static**: Only the active rollup version is live-indexed. Historical versions are read-only data that was already indexed when they were active.

9. **Version count**: N-version system. Data layer supports arbitrary versions (just a WHERE clause). Indexing layer is pragmatic — one active Ponder instance, historical data is static.

10. **Historical data required**: Frontend must show data across all versions historically. No archival/pruning option.

---

## 9. Feasibility Analysis

### Blast Radius (Revised)

| Phase | Files Touched | Scope | Effort |
|-------|--------------|-------|--------|
| **1. Schema** | 9 prisma model files | 36 models: add `rollup_address` + PK restructure on 4+ tables | **Heavy** |
| **2. Ponder** | 22 event handlers | Add `rollup_address` to 16 handlers + schema columns | Medium |
| **3. Materializer** | 9 materializers + base class | Per-rollup cursors, query filters, poll loop | Medium |
| **4. indexer-custom** | 6 collectors | 2 need rollup context (4 already reference it) | Light |
| **5. Backend API** | 47 route files | 31 routes need rollup-scoped queries (12 raw SQL) | Heavy |
| **6. Frontend** | 16 pages + 97 components | 83 components + rollup selector + version context | Medium |

**Total: ~200+ files across 6 phases**

### Feasibility Per Phase (Revised)

#### Phase 1 — Schema | Feasibility: HIGH | Effort: Heavy

- Add `rollup_address` column to 36 models (nullable first, backfill, then non-nullable)
- **PK restructure required** on tables where numbering resets per rollup version:
  - `L2BlockProposed` — `(rollup_address, slot_number)` instead of `(slot_number)`
  - `Epoch` — `(rollup_address, epoch_number)` instead of `(epoch_number)`
  - `ValidatorAttestation` — needs rollup in composite key
  - `ValidatorEpochPerformance` — needs rollup in composite key
  - `MaterializerCheckpoint` — `(checkpointName, rollupAddress)`
- PK changes require dropping + recreating indexes, foreign keys, and constraints
- Dependency: None — can start immediately

#### Phase 2 — Ponder | Feasibility: HIGH | Effort: Medium

- Ponder only indexes the **active** rollup version at any given time
- When a new version deploys, Ponder config is updated to point to the new contract + ABI
- Old version data is already indexed and static — never re-indexed
- No ABI-versioned handler sets needed. Handlers always match the current ABI
- 7 handlers can use `event.log.address` directly
- 9 governance/tally handlers still need contract-to-rollup mapping (question #3)
- Ponder schema tables get `rollup_address` column on all event tables
- Dependency: Phase 1

#### Phase 3 — Materializer | Feasibility: HIGH | Effort: Medium

- Small surface area (9 files), well-structured base class
- `EventCursor` gets `rollupAddress` field
- `CheckpointService` gets rollup dimension on load/save
- Poll loop becomes `for rollup -> for materializer`
- Only active rollup polls; historical rollup data is static (no polling needed)
- Dependency: Phase 1 + Phase 2

#### Phase 4 — indexer-custom | Feasibility: HIGH | Effort: Light

- Only 2/6 collectors need changes
- 4 already reference rollup context
- Validator transition logic already exists via `moveWithLatestRollup` flag
- Epoch collectors need rollup scoping (epochs reset per version)
- Dependency: Phase 1

#### Phase 5 — Backend API | Feasibility: MEDIUM | Effort: Heavy

- 31 routes need `rollup_address` WHERE clause
- 12 use raw SQL CTEs — manual parameterization needed
- Default `rollup` param to `activeAddress` for backward compatibility
- Queries using slot/epoch numbers as keys need composite key awareness
- Risk: raw SQL CTEs are complex, adding WHERE clauses is error-prone
- Dependency: Phase 1

#### Phase 6 — Frontend | Feasibility: HIGH | Effort: Medium

- Rollup selector component + URL state (`?rollup=0x...`)
- 83 components pass rollup param to API calls
- Can be phased page-by-page
- Historical view: timeline showing data across rollup versions
- Dependency: Phase 5

### Remaining Blockers

None — all questions resolved.

**Key resolutions:**
- StakingRegistry is shared → `Provider`/`ProviderAttester` do NOT need `rollup_address`. Provider tables are rollup-agnostic. `StakedWithProvider.rollupAddress` is the join point.
- Governance is 1:1 per rollup version → contract address maps to rollup via registry config (Option A). No on-chain lookup needed.
- Ponder only indexes the active version — no ABI versioning needed.

### What Can Start Now (No Blockers)

| Task | Phase | Effort | Risk |
|------|-------|--------|------|
| Add nullable `rollup_address` to 36 models | 1 | 2-3 hrs | Low |
| Restructure PKs on slot/epoch-keyed tables | 1 | 3-4 hrs | Medium |
| Backfill existing rows with current rollup address | 1 | 1 hr | Low |
| Rollup registry config in `.environment/` | Config | 1 hr | Low |
| ABI diff analysis (v1 vs v2 event signatures) | 2 (prep) | 2-3 hrs | Low |
| Add `rollup` query param to API routes (defaulting to active) | 5 (partial) | 4-6 hrs | Low |
| `GET /api/rollups` metadata endpoint | 5 | 1 hr | Low |
| Refactor `MaterializerCheckpoint` to composite PK | 3 (partial) | 2 hrs | Medium |

### What Is Blocked

| Task | Blocked By | Effort After Unblocked |
|------|-----------|----------------------|
| 9 governance/tally Ponder handlers | Question #3 | 4-6 hrs |
| Provider/ProviderAttester multi-rollup logic | Question #2 | 3-4 hrs |
| Full materializer per-rollup poll loop | Phase 2 completion | 4-6 hrs |
| Frontend rollup selector | Phase 5 completion | 4-6 hrs |

### Overall Assessment (Revised)

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Technical complexity | Medium | PK restructuring is the main challenge, rest is mechanical |
| Blast radius | High | 200+ files across entire stack |
| Protocol dependencies | Medium | 2 remaining questions (#2 StakingRegistry, #3 governance mapping) |
| Backward compatibility | High | Nullable columns + default params = zero breaking changes |
| Incremental deployability | High | Each phase is independently deployable |
| Estimated total effort | **~35-45 hrs** | PK restructuring adds complexity to Phase 1 |

**Bottom line**: With Ponder only indexing the active version, the migration is back to "large but mechanical." The PK restructuring on slot/epoch-keyed tables (Phase 1) is the main technical challenge. Phase 2 is straightforward column additions. Start with Phase 1 schema + Phase 5 API param work in parallel.
