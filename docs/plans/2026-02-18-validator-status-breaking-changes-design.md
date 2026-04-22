# Validator Status Breaking Changes — Design

## Context

The `getValidatorsStats` and `getValidatorStats` SDK methods now return updated `ValidatorStatusInSlot` values to reflect the multi-block-per-slot model, where blocks and checkpoints are distinct concepts.

## Status Value Mapping

| Old Value | New Value | Meaning |
|-----------|-----------|---------|
| `block-mined` | `checkpoint-mined` | Checkpoint was mined |
| `block-proposed` | `checkpoint-proposed` | Checkpoint was proposed |
| `block-missed` | `checkpoint-missed` | Blocks were proposed but checkpoint was not attested |
| *(new)* | `blocks-missed` | No block proposals were sent at all |
| `attestation-sent` | `attestation-sent` | *(unchanged)* |
| `attestation-missed` | `attestation-missed` | *(unchanged)* |

## Type Changes

- `ValidatorStatusType`: `'block' | 'attestation'` -> `'proposer' | 'attestation'`
- `ValidatorHistoryEnum` / `AttestationStatus`: updated to include all new values + `blocks-missed`

## UI Color Mapping

| Status | Color | Rationale |
|--------|-------|-----------|
| `checkpoint-proposed` / `checkpoint-mined` | Blue (`accent-blue`) | Success — proposer did their job |
| `attestation-sent` | Green | Success — unchanged |
| `checkpoint-missed` | Amber | Partial failure — proposer worked, attesters didn't |
| `blocks-missed` | Red | Total failure — nothing was proposed |
| `attestation-missed` | Red | Failure — unchanged |

## Scope

### Layer 1: Status Value Migration (breaking — 17 files)

**Constants & Types (3 files):**
- `packages/shared-types/src/attestations.ts` — source of truth constants
- `packages/aztec-rpc-sdk/src/types.ts` — SDK type literals
- `apps/web/src/types/validator.ts` — frontend type re-export

**Backend Services (2 files):**
- `packages/shared-utils/src/epoch-integrity.ts` — epoch analysis switch cases
- `packages/indexer-custom/src/services/EpochService.ts` — indexer switch cases

**API Routes (3 files):**
- `apps/web/src/app/api/epochs/[epochNumber]/live-slot-activity/route.ts`
- `apps/web/src/app/api/governance/sequencer-attestations/route.ts`
- `apps/web/src/app/api/validators/[validatorHexIndex]/route.ts`

**Services & Queries (2 files):**
- `apps/web/src/services/rewards/validatorRewards.ts`
- `apps/web/src/db/queries/signaling-matrix/queries.ts`

**UI Components (4 files):**
- `apps/web/src/components/features/dashboard/ValidatorSlotActivityBar.tsx`
- `apps/web/src/components/features/epochs/SlotDetailsModal.tsx`
- `apps/web/src/components/features/validator-detail/HistoryCard.tsx`
- `apps/web/src/components/features/governance/matrix/SequencerAttestationsModal.tsx`

**Page Components (3 files):**
- `apps/web/src/app/epoch-performance/page.tsx`
- `apps/web/src/app/epochs/[epochNumber]/page.tsx`
- `apps/web/src/app/epochs/[epochNumber]/HistoricalEpochPageContent.tsx`

### Layer 2: Internal Variable Renames (cosmetic — 28 files)

Rename internal variables like `blocksMined`, `blocksProposed`, `blocksMissed`, `blockSuccess` to `checkpointsMined`, `checkpointsProposed`, etc. for semantic consistency. Also rename Chart.js stack groups from `'block'` to `'proposer'`.

## Mock Data

Test fixtures for verifying the migration handles all status types correctly, including the new `blocks-missed` status and backward-compatible behavior.

### Slot Activity Mock (full epoch with all status types)

```typescript
export const MOCK_VALIDATOR_HISTORY: ValidatorHistoryItem[] = [
  // Checkpoint success cases
  { slot: '100', status: 'checkpoint-mined' },
  { slot: '101', status: 'checkpoint-proposed' },

  // Attestation cases (unchanged)
  { slot: '102', status: 'attestation-sent' },
  { slot: '103', status: 'attestation-missed' },

  // New missed distinction
  { slot: '104', status: 'checkpoint-missed' },  // blocks proposed, checkpoint not attested
  { slot: '105', status: 'blocks-missed' },       // no block proposals at all
];
```

### Epoch Summary Mock (for aggregation testing)

```typescript
export const MOCK_EPOCH_RECORDS: SlotRecord[] = [
  // Validator A — healthy proposer
  { slot: '100', status: CHECKPOINT_MINED, validator: '0xaaa' },
  { slot: '101', status: ATTESTATION_SENT, validator: '0xaaa' },
  { slot: '102', status: ATTESTATION_SENT, validator: '0xaaa' },

  // Validator B — mixed performance
  { slot: '100', status: ATTESTATION_SENT, validator: '0xbbb' },
  { slot: '101', status: CHECKPOINT_PROPOSED, validator: '0xbbb' },
  { slot: '102', status: ATTESTATION_MISSED, validator: '0xbbb' },

  // Validator C — problematic
  { slot: '100', status: CHECKPOINT_MISSED, validator: '0xccc' },
  { slot: '101', status: BLOCKS_MISSED, validator: '0xccc' },
  { slot: '102', status: ATTESTATION_MISSED, validator: '0xccc' },
];

// Expected aggregation results:
// Validator A: 1 checkpoint mined, 0 missed, 2 attestations sent, 0 missed
// Validator B: 1 checkpoint proposed, 0 missed, 1 attestation sent, 1 missed
// Validator C: 1 checkpoint missed, 1 blocks missed, 0 attestations sent, 1 missed
```

### UI Color Mapping Mock (for component testing)

```typescript
export const MOCK_STATUS_COLORS = [
  { status: 'checkpoint-mined', expectedColor: 'accent-blue', label: 'Mined' },
  { status: 'checkpoint-proposed', expectedColor: 'accent-blue', label: 'Proposed' },
  { status: 'checkpoint-missed', expectedColor: 'amber', label: 'Missed' },
  { status: 'blocks-missed', expectedColor: 'red', label: 'No Proposals' },
  { status: 'attestation-sent', expectedColor: 'green', label: 'Success' },
  { status: 'attestation-missed', expectedColor: 'red', label: 'Missed' },
  { status: 'no_data', expectedColor: 'slate', label: 'No Data' },
];
```

### Governance Attestation Mock (for sequencer attestation modal)

```typescript
export const MOCK_SEQUENCER_ATTESTATIONS = [
  {
    id: 1,
    validatorAddress: '0xaaa',
    slot: BigInt(100),
    epochNumber: BigInt(10),
    status: 'checkpoint-mined',
    blockHash: '0xblock1',
  },
  {
    id: 2,
    validatorAddress: '0xbbb',
    slot: BigInt(101),
    epochNumber: BigInt(10),
    status: 'checkpoint-proposed',
    blockHash: '0xblock2',
  },
  {
    id: 3,
    validatorAddress: '0xccc',
    slot: BigInt(102),
    epochNumber: BigInt(10),
    status: 'checkpoint-missed',
    blockHash: null,
  },
  {
    id: 4,
    validatorAddress: '0xddd',
    slot: BigInt(103),
    epochNumber: BigInt(10),
    status: 'blocks-missed',
    blockHash: null,
  },
];
```

### Live Slot Activity Mock (for slot activity bar)

```typescript
export const MOCK_LIVE_SLOT_ACTIVITY = {
  epoch: 42,
  slots: [
    { slotNumber: 0, validators: [
      { address: '0xaaa', status: 'checkpoint-mined' },
      { address: '0xbbb', status: 'attestation-sent' },
    ]},
    { slotNumber: 1, validators: [
      { address: '0xaaa', status: 'attestation-sent' },
      { address: '0xbbb', status: 'checkpoint-proposed' },
    ]},
    { slotNumber: 2, validators: [
      { address: '0xaaa', status: 'attestation-missed' },
      { address: '0xbbb', status: 'blocks-missed' },
    ]},
    { slotNumber: 3, validators: [
      { address: '0xaaa', status: 'checkpoint-missed' },
      { address: '0xbbb', status: 'attestation-missed' },
    ]},
  ],
};
```

## Approach

Clean rename at source (`shared-types` constants) + ripple through all 17 files using TypeScript errors as the safety net. Layer 2 variable renames follow in the same PR for consistency.
