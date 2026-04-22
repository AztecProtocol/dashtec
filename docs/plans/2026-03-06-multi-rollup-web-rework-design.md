# Multi-Rollup Web Rework Design

> Phase 5 (Backend API) + Phase 6 (Frontend) of the multi-rollup migration.
> Prerequisite: Phases 1-4 (Schema, Ponder, Materializer, indexer-custom) are complete or in-progress on `heed/multi-rollup-migration`.

---

## 1. Context

### What is multi-rollup?

Multiple versions of the same Aztec rollup contract deployed at different L1 addresses. When a protocol upgrade occurs, a new rollup contract is deployed. The system must support **N versions** (potentially 10+), not just 2.

### Current state

- **Database**: All tables have `rollup_address` column (Phases 1-3 done)
- **Ponder**: Indexes active rollup, captures `rollup_address` on events
- **Materializer**: Per-rollup cursors implemented
- **Web app**: Zero rollup awareness — no filtering, no selector, no version context

### Key data characteristics

- Epoch/slot/block numbers **reset per rollup version** (composite keys in DB)
- Governance and slashing are **1:1 per rollup version**
- StakingRegistry (providers) is **shared** across all versions
- Only the latest rollup is "live" — older versions are read-only/static
- Validators choose to migrate via `moveWithLatestRollup` flag

---

## 2. Design Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Selector placement | Header (global) + per-page override | Global default sets context; pages can drill down independently |
| 2 | Aggregate mode UX | Filterable timeline with chip-based multi-select | Scales to N versions; chips collapse with overflow dropdown at N>6 |
| 3 | Aggregate content | Metrics + cross-version migration tracking | Users need to track validator journeys across versions |
| 4 | Orphaned validators | "Orphaned" label with amber badge | Clear warning that validator is on deprecated rollup, de-emphasized in UI |
| 5 | URL state | `?rollup=0x...` or `?rollup=all` | Shareable, bookmarkable, SSR-friendly |
| 6 | Default behavior | Active rollup (latest non-deprecated) | Backward compatible — existing users see no change |

---

## 3. Architecture

### 3.1 Data Flow

```
Header Selector (global default)
        |
        v
RollupContext (React Context)
        |
    ┌───┴───┐
    |       |
    v       v
Per-page    React Query Hooks
override    (rollup in cache key)
chip filter       |
    |             v
    └──────> API Routes (?rollup=0x...)
                  |
                  v
             Prisma Queries
             (WHERE rollup_address = $1)
```

### 3.2 RollupContext Provider

```typescript
interface RollupContextValue {
  // Available versions from /api/rollups
  versions: RollupVersion[];
  // Currently selected (from header selector)
  globalRollup: string; // address or 'all'
  setGlobalRollup: (address: string) => void;
  // Active/latest rollup address
  activeRollup: string;
  // Helper
  isAggregate: boolean;
}

interface RollupVersion {
  address: string;
  label: string;        // "v1", "v2", etc.
  startBlock: number;
  endBlock: number | null;
  deprecated: boolean;
  validatorCount?: number;
}
```

**Placement**: Wraps inside `AppProvider`, above page content. Fetches from `GET /api/rollups` on mount.

### 3.3 Per-Page Override Pattern

Pages that need granular control (epochs, validators, slashing, governance) render a `RollupVersionFilter` component that can:
- Override the global selection for that page only
- Support multi-select (e.g., show v6 + v8 data together)
- Reset to global default on navigation

```typescript
// Per-page hook
function useRollupFilter() {
  const { globalRollup, versions } = useRollupContext();
  const [pageOverride, setPageOverride] = useState<string[] | null>(null);

  // If page has override, use it; otherwise use global
  const effectiveRollups = pageOverride ?? (globalRollup === 'all'
    ? versions.map(v => v.address)
    : [globalRollup]);

  // For API calls
  const rollupParam = pageOverride
    ? pageOverride.join(',')
    : globalRollup;

  return { effectiveRollups, rollupParam, setPageOverride, versions };
}
```

### 3.4 API Query Parameter

All API routes accept `?rollup=` with these formats:

| Value | Meaning |
|-------|---------|
| `0x1234...` | Single rollup address |
| `0x1234...,0x5678...` | Multiple rollups (multi-select) |
| `all` | All versions |
| _(omitted)_ | Default to active rollup |

**Server-side helper:**

```typescript
function parseRollupParam(searchParams: URLSearchParams, config: AppConfig): string[] {
  const rollup = searchParams.get('rollup');
  if (!rollup || rollup === 'active') return [config.rollup.activeAddress];
  if (rollup === 'all') return config.rollup.versions.map(v => v.address);
  return rollup.split(',').filter(isValidAddress);
}
```

SQL queries use `WHERE rollup_address = ANY($1::varchar[])` for array support.

### 3.5 React Query Cache Strategy

Rollup address is part of every cache key:

```typescript
// Before
useQuery({ queryKey: ['validators', page, sort] })

// After
useQuery({ queryKey: ['validators', rollupParam, page, sort] })
```

Switching rollup triggers fresh fetch (no stale cross-version data).

---

## 4. Component Design

### 4.1 Header Rollup Selector

Lives in `Header.tsx` next to existing network selector (Mainnet/Sepolia).

```
┌──────────────────────────────────────┐
│ Logo   [Mainnet ▼]  [v8 (Active) ▼] │
│                      ┌──────────────┐│
│                      │ ● v8 Active  ││
│                      │ ○ v7         ││
│                      │ ○ v6         ││
│                      │ ─────────────││
│                      │ ● All        ││
│                      └──────────────┘│
└──────────────────────────────────────┘
```

- Dropdown with version list
- Active version marked with green dot
- Deprecated versions with gray dot
- "All" option at bottom with separator
- Selection persists in URL `?rollup=`

### 4.2 RollupVersionFilter (Per-Page Chips)

Reusable component for page-level override.

```
Version: [● All] [v8] [v7] [v6] [v5] [v4] [+4 more ▼]
```

**Behavior:**
- N <= 6: All chips visible inline
- N > 6: Latest 5 visible + overflow dropdown for older
- Click chip to toggle (multi-select)
- "All" is exclusive — selecting it deselects individuals
- Selecting any individual deselects "All"
- Color-coded chips match chart legend colors
- Appears in filter bar alongside existing filters (search, sort, etc.)

### 4.3 Version Boundary Marker (Tables)

When aggregate mode shows data from multiple versions in a single table:

```
│ v8 ● │  12  │  32/32  │ 98.2% │
│ v8 ● │  11  │  31/32  │ 97.1% │
│ ───── v8 deployed (block 21,500,000) ─────│
│ v7 ○ │  85  │  30/30  │ 96.5% │
│ v7 ○ │  84  │  29/30  │ 95.0% │
```

- Full-width separator row with version label and deploy block
- Only shown when adjacent rows are from different versions
- Pagination respects version boundaries (don't split a boundary across pages)

### 4.4 Orphaned Validator Badge

```
Status: [Orphaned] (amber)
Tooltip: "This validator is on deprecated rollup v3 and is no longer participating"
```

- Amber background, dark text
- Shown in validator tables and detail pages
- In aggregate mode, orphaned validators sorted below active ones

---

## 5. Feature Viability & Cause/Effect Analysis

### Tier 1 — Must Have (data breaks without rollup filter)

| Feature | Impact | Cause | Effect Without Filter |
|---------|--------|-------|----------------------|
| **Epoch pages** | Critical | Epoch numbers reset per version | Epoch 1 from v1 collides with epoch 1 from v8; queries return mixed data |
| **Validator list** | Critical | Validators have rollup_address | Active v8 validators mixed with orphaned v3 validators; scores/rankings wrong |
| **Validator queue** | Critical | Queue is per-rollup | Shows queued validators for wrong version |
| **Dashboard metrics** | Critical | Aggregates from all tables | Epoch stats, top validators, attestation rates — all garbage when mixed |
| **Slashing history** | Critical | Rounds are per-rollup | Round numbers collide across versions |
| **Governance** | Critical | 1:1 per rollup version | Signals from different versions mixed = meaningless matrix |

### Tier 2 — Should Have (works partially, degraded)

| Feature | Impact | Cause | Effect Without Filter |
|---------|--------|-------|----------------------|
| **Providers** | Medium | StakingRegistry shared, attesters per-rollup | Attester count per provider inflated (counts all versions) |
| **Watchlist** | Medium | User watches validators | Can't tell which version a watched validator is on |
| **Search** | Low | Global search | Results don't indicate rollup version |
| **Prover** | Medium | Proofs are per-rollup | Leaderboard mixes provers across versions |

### Tier 3 — Nice to Have (new features enabled by multi-rollup)

| Feature | Value | Description |
|---------|-------|-------------|
| **Migration tracker** | High | Validator journey visualization (v1 -> v3 -> v8) on detail page |
| **Rollups overview page** | Medium | /rollups page listing all versions with metadata |
| **Cross-version comparison** | Medium | Dashboard aggregate comparing metrics across versions |

---

## 6. Files Impacted

### Backend (Phase 5)

| Category | Files | Change |
|----------|-------|--------|
| New endpoint | 1 | `GET /api/rollups` — version metadata |
| API routes | 31 | Add `?rollup` param + WHERE clause |
| Raw SQL CTEs | 12 | Parameterize `rollup_address` in CTE queries |
| Helper | 1 | `parseRollupParam()` utility |
| Config | 2 | Rollup registry in env config |
| Types | 2 | RollupVersion type, API param types |

**Key API routes requiring rollup filter:**

- `/api/dashboard/*` (4 routes)
- `/api/validators/*` (8 routes)
- `/api/epochs/*` (3 routes)
- `/api/slashing-history/*` (3 routes)
- `/api/governance/*` (7 routes)
- `/api/providers/*` (2 routes)
- `/api/prover/*` (8 routes)
- `/api/staking/overview` (1 route)
- `/api/stats/general` (1 route)
- `/api/search` (1 route)

**Routes NOT needing rollup filter:**

- `/api/auth/*` (6 routes) — user auth, rollup-agnostic
- `/api/health` — health check
- `/api/network/config` — network params
- `/api/rewards/[coinbase]` — reward calculation
- `/api/rollups` — new endpoint, returns version list

### Frontend (Phase 6)

| Category | Files | Change |
|----------|-------|--------|
| New context | 1 | `RollupContext.tsx` |
| New components | 2 | `RollupVersionFilter.tsx`, `VersionBoundaryRow.tsx` |
| Header | 1 | Add rollup selector dropdown |
| Query hooks | 30+ | Add rollup param to cache key + API call |
| Page components | 16 | Consume RollupContext, add filter chips |
| Feature components | ~40 | Pass rollup prop through component tree |
| Types | 3 | RollupVersion, RollupFilter, extended API types |
| New hook | 1 | `useRollupFilter()` — per-page override logic |

---

## 7. Implementation Order

```
Phase 5A: Foundation (parallel)
├── #2  API routes: add ?rollup param (31 routes)
└── #3  GET /api/rollups endpoint

Phase 6A: Foundation
├── #4  RollupContext provider + header selector
├── #5  RollupVersionFilter chip component
└── #6  Wire rollup through all query hooks

Phase 6B: Tier 1 Pages (parallel after 6A)
├── #7  Dashboard
├── #8  Epochs
├── #9  Validators
└── #10 Slashing + Governance

Phase 6C: Tier 2 Pages (parallel after 6B)
├── #11 Providers
├── #12 Watchlist
└── #13 Search + Prover

Phase 6D: Tier 3 Features
├── #14 Migration tracker (after #9)
├── #15 Rollups overview page (after #3)
└── #16 Cross-version comparison (after #7)
```

**Parallelization opportunities:**
- #2 and #3 are independent (both backend)
- #7, #8, #9, #10 are independent (different pages)
- #11, #12, #13 are independent (different pages)
- #14, #15, #16 are independent (different features)

---

## 8. Rollup Registry Configuration

### Environment config

Replace single `ROLLUP_CONTRACT_ADDRESS` with a registry. Backward compatible — if registry not present, fall back to single address.

```json
// .environment/mainnet/config.json
{
  "rollup": {
    "versions": [
      {
        "address": "0x...",
        "label": "v1",
        "startBlock": 12345678,
        "endBlock": 19876543,
        "deprecated": true
      },
      {
        "address": "0x...",
        "label": "v2",
        "startBlock": 19876544,
        "endBlock": null,
        "deprecated": false
      }
    ],
    "activeAddress": "0x..."
  }
}
```

### Dynamic enrichment

`GET /api/rollups` supplements static config with live data:
- Validator count per version (from DB)
- Epoch count per version (from DB)
- Deploy timestamp (from `canonical_rollup_updated` Ponder table)

---

## 9. Migration Tracking (Tier 3)

### Data sources for rebuilding validator journeys

| Source | Data | Location |
|--------|------|----------|
| `deposit` events | Which rollup a validator deposited on | Ponder `deposit` table, `rollup_address` field |
| `gseDeposit` events | `moveWithLatestRollup` flag | Ponder `gse_deposit` table |
| `canonical_rollup_updated` | When each version was deployed | Ponder `canonical_rollup_updated` table |
| `Validator.rollup_address` | Current rollup association | Prisma `Validator` model |
| `ValidatorEpochPerformance` | Which rollup a validator performed on per epoch | Composite key includes `rollup_address` |

### Reconstruction logic

```sql
-- Validator's rollup history (ordered by first appearance)
SELECT DISTINCT ON (rollup_address)
  validator_address,
  rollup_address,
  MIN(epoch_number) as first_epoch,
  MAX(epoch_number) as last_epoch
FROM "ValidatorEpochPerformance"
WHERE validator_address = $1
GROUP BY validator_address, rollup_address
ORDER BY rollup_address, first_epoch;
```

Cross-reference with `canonical_rollup_updated` to get version labels and transition timestamps.

---

## 10. Edge Cases

| Scenario | Handling |
|----------|----------|
| Only 1 rollup version exists | Hide selector entirely; no rollup param needed |
| User bookmarks URL with deprecated rollup | Show data normally with "Deprecated" badge on version indicator |
| New version deployed while user is browsing | `/api/rollups` returns new version on next fetch; selector updates; no forced redirect |
| Validator exists on multiple versions (migrated) | In single-version mode: show current state on that version. In aggregate: show migration history column |
| Epoch 0 (genesis) of new version | Show normally; version boundary marker appears above it in aggregate view |
| API called without `?rollup` param | Default to active rollup — backward compatible |
| Chart with 10 versions selected | Color-coded series; group older versions into "Others" if > 5 selected |

---

## 11. Not In Scope

- Rollup version management UI (admin) — versions come from config
- ABI versioning in frontend — frontend only queries API, never reads contracts directly
- Historical re-indexing UI — handled by ops tooling
- Real-time version transition notifications — can be added later
- Per-rollup RPC endpoint configuration — handled in backend config
