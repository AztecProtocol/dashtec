# Validator Status Breaking Changes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all validator status values from `block-*` to `checkpoint-*`/`blocks-missed` to reflect the multi-block-per-slot model.

**Architecture:** Rename constants at the shared-types source of truth, then ripple changes through SDK types, backend services, API routes, DB queries, and UI components. Add new `BLOCKS_MISSED` constant for the new "no proposals at all" case. TypeScript compiler errors guide completeness.

**Tech Stack:** TypeScript, Prisma ORM (raw SQL), Next.js API routes, React components, Chart.js

---

### Task 1: Rename constants at source of truth

**Files:**
- Modify: `packages/shared-types/src/attestations.ts:1-7`

**Step 1: Update the constants and type**

Replace entire file content with:

```typescript
export const CHECKPOINT_MINED = 'checkpoint-mined';
export const CHECKPOINT_PROPOSED = 'checkpoint-proposed';
export const CHECKPOINT_MISSED = 'checkpoint-missed';
export const BLOCKS_MISSED = 'blocks-missed';
export const ATTESTATION_SENT = 'attestation-sent';
export const ATTESTATION_MISSED = 'attestation-missed';

export type AttestationStatus =
  | typeof ATTESTATION_SENT
  | typeof ATTESTATION_MISSED
  | typeof CHECKPOINT_MINED
  | typeof CHECKPOINT_PROPOSED
  | typeof CHECKPOINT_MISSED
  | typeof BLOCKS_MISSED;
```

**Step 2: Commit**

```bash
git add packages/shared-types/src/attestations.ts
git commit -m "feat!: rename block-* status constants to checkpoint-*/blocks-missed"
```

---

### Task 2: Update SDK types

**Files:**
- Modify: `packages/aztec-rpc-sdk/src/types.ts:163-166`

**Step 1: Update ValidatorHistoryItem status union**

Change line 165 from:
```typescript
  status: 'block-mined' | 'block-proposed' | 'block-missed' | 'attestation-sent' | 'attestation-missed';
```
To:
```typescript
  status: 'checkpoint-mined' | 'checkpoint-proposed' | 'checkpoint-missed' | 'blocks-missed' | 'attestation-sent' | 'attestation-missed';
```

**Step 2: Commit**

```bash
git add packages/aztec-rpc-sdk/src/types.ts
git commit -m "feat!: update ValidatorHistoryItem status union for checkpoint model"
```

---

### Task 3: Update frontend types

**Files:**
- Modify: `apps/web/src/types/validator.ts:1-5, 18-25, 86-92, 119-121, 142-146`

**Step 1: Update imports and ValidatorHistoryEnum (lines 1-5)**

```typescript
import { VALIDATOR_STATUS } from '@/utils/constants';
import { ProposerVoteType, CHECKPOINT_MINED, CHECKPOINT_PROPOSED, CHECKPOINT_MISSED, BLOCKS_MISSED, ATTESTATION_SENT, ATTESTATION_MISSED } from '@dashtec/shared-types';

export type ValidatorStatusEnum = (typeof VALIDATOR_STATUS)[keyof typeof VALIDATOR_STATUS];
export type ValidatorHistoryEnum = typeof CHECKPOINT_MINED | typeof CHECKPOINT_PROPOSED | typeof CHECKPOINT_MISSED | typeof BLOCKS_MISSED | typeof ATTESTATION_SENT | typeof ATTESTATION_MISSED;
```

**Step 2: Rename ValidatorEpochPerformanceData fields (lines 18-25)**

```typescript
export interface ValidatorEpochPerformanceData {
  epochNumber: number;
  attestationsSuccessful: number;
  attestationsMissed: number;
  checkpointsProposed: number;
  checkpointsMined: number;
  checkpointsMissed: number;
  blocksMissed: number;
}
```

**Step 3: Rename Validator totals (lines 86-92)**

```typescript
  totalCheckpointsProposed?: number;
  totalCheckpointsMined?: number;
  totalCheckpointsMissed?: number;
  totalBlocksMissed?: number;
  totalParticipatingEpochs?: number;
```

**Step 4: Rename ValidatorCurrentEpochActivity (lines 142-146)**

```typescript
export interface ValidatorCurrentEpochActivity {
  validatorIndex: string;
  address: string;
  checkpointsMined: number;
  checkpointsProposed: number;
  checkpointsMissed: number;
  blocksMissed: number;
  attestationsSent: number;
  attestationsMissed: number;
}
```

**Step 5: Rename ValidatorTableSummary fields (lines 163-170)**

Rename `total_blocks_proposed` -> `total_checkpoints_proposed`, `total_blocks_mined` -> `total_checkpoints_mined`, `total_blocks_missed` -> `total_checkpoints_missed`, `max_epoch_with_blocks_proposed` -> `max_epoch_with_checkpoints_proposed`, `max_epoch_with_blocks_mined` -> `max_epoch_with_checkpoints_mined`. Add `total_blocks_missed` field.

**Step 6: Commit**

```bash
git add apps/web/src/types/validator.ts
git commit -m "feat!: update frontend validator types for checkpoint model"
```

---

### Task 4: Update shared-utils epoch-integrity

**Files:**
- Modify: `packages/shared-utils/src/epoch-integrity.ts`

**Step 1: Update imports (lines 8-14)**

```typescript
import {
  CHECKPOINT_MINED,
  CHECKPOINT_PROPOSED,
  CHECKPOINT_MISSED,
  BLOCKS_MISSED,
  ATTESTATION_SENT,
  ATTESTATION_MISSED,
} from '@dashtec/shared-types';
```

**Step 2: Rename EpochIntegrityResult fields (lines 33-37)**

```typescript
  checkpointMissedCount: number;
  checkpointMinedCount: number;
  checkpointProposedCount: number;
  blocksMissedCount: number;
  attestationSentCount: number;
  attestationMissedCount: number;
```

**Step 3: Rename EpochSummary fields (lines 57-59)**

```typescript
  checkpointsMined: number;
  checkpointsProposed: number;
  checkpointsMissed: number;
  blocksMissed: number;
```

**Step 4: Update analyzeEpochIntegrity function (lines 91-161)**

Update all status lookups:
```typescript
const checkpointMissedCount = statusCounts.get(CHECKPOINT_MISSED) || 0;
const checkpointMinedCount = statusCounts.get(CHECKPOINT_MINED) || 0;
const checkpointProposedCount = statusCounts.get(CHECKPOINT_PROPOSED) || 0;
const blocksMissedCount = statusCounts.get(BLOCKS_MISSED) || 0;
const attestationSentCount = statusCounts.get(ATTESTATION_SENT) || 0;
const attestationMissedCount = statusCounts.get(ATTESTATION_MISSED) || 0;
```

Update Rule 2 to include `blocksMissedCount`:
```typescript
const totalCheckpointRecords = checkpointMinedCount + checkpointProposedCount + checkpointMissedCount + blocksMissedCount;
```

Update Rule 3 `slotsWithBlocks`:
```typescript
const slotsWithBlocks = checkpointMinedCount + checkpointProposedCount;
```

Update Rule 4 issue text:
```typescript
result.issues.push(`Has ${result.emptyValidators} empty validators with no checkpoint-missed`);
```

**Step 5: Update buildEpochSummary switch (lines 249-265)**

```typescript
switch (record.status) {
  case ATTESTATION_SENT:
    summary.attestationsSent++;
    break;
  case ATTESTATION_MISSED:
    summary.attestationsMissed++;
    break;
  case CHECKPOINT_MINED:
    summary.checkpointsMined++;
    break;
  case CHECKPOINT_PROPOSED:
    summary.checkpointsProposed++;
    break;
  case CHECKPOINT_MISSED:
    summary.checkpointsMissed++;
    break;
  case BLOCKS_MISSED:
    summary.blocksMissed++;
    break;
}
```

**Step 6: Update compareSentinelEpochs fieldsToCompare (lines 182-190)**

```typescript
const fieldsToCompare: (keyof EpochSummary)[] = [
  'totalSlots',
  'validatorsWithData',
  'attestationsSent',
  'attestationsMissed',
  'checkpointsMined',
  'checkpointsProposed',
  'checkpointsMissed',
  'blocksMissed',
];
```

**Step 7: Commit**

```bash
git add packages/shared-utils/src/epoch-integrity.ts
git commit -m "refactor: update epoch-integrity for checkpoint status model"
```

---

### Task 5: Update indexer EpochService

**Files:**
- Modify: `packages/indexer-custom/src/services/EpochService.ts:4, 95-113`

**Step 1: Update import (line 4)**

```typescript
import { CHECKPOINT_MINED, CHECKPOINT_PROPOSED, CHECKPOINT_MISSED, BLOCKS_MISSED, ATTESTATION_SENT, ATTESTATION_MISSED } from '@dashtec/shared-types';
```

**Step 2: Update switch case (lines 95-113)**

```typescript
for (const att of attestationsInEpoch) {
  switch (att.status) {
    case ATTESTATION_SENT:
      successfulAttestations++;
      break;
    case ATTESTATION_MISSED:
      missedAttestations++;
      break;
    case CHECKPOINT_PROPOSED:
      proposedBlocks++;
      break;
    case CHECKPOINT_MINED:
      minedBlocks++;
      break;
    case CHECKPOINT_MISSED:
    case BLOCKS_MISSED:
      missedBlocks++;
      break;
  }
}
```

**Step 3: Commit**

```bash
git add packages/indexer-custom/src/services/EpochService.ts
git commit -m "refactor: update EpochService for checkpoint status model"
```

---

### Task 6: Update API routes

**Files:**
- Modify: `apps/web/src/app/api/epochs/[epochNumber]/live-slot-activity/route.ts`
- Modify: `apps/web/src/app/api/governance/sequencer-attestations/route.ts`
- Modify: `apps/web/src/app/api/validators/[validatorHexIndex]/route.ts`

**Step 1: Update live-slot-activity route imports and logic**

Change import from `BLOCK_PROPOSED, BLOCK_MINED, BLOCK_MISSED` to `CHECKPOINT_PROPOSED, CHECKPOINT_MINED, CHECKPOINT_MISSED, BLOCKS_MISSED`.

Update status detection (lines 54-61):
```typescript
const proposedEvent = eventsInThisAbsoluteSlot.find((e: any) => e.status === CHECKPOINT_PROPOSED || e.status === CHECKPOINT_MINED);
const attestationSentEvent = eventsInThisAbsoluteSlot.find((e: any) => e.status === ATTESTATION_SENT);
const attestationMissedEvent = eventsInThisAbsoluteSlot.find((e: any) => e.status === ATTESTATION_MISSED);
const checkpointMissedEvent = eventsInThisAbsoluteSlot.find((e: any) => e.status === CHECKPOINT_MISSED);
const blocksMissedEvent = eventsInThisAbsoluteSlot.find((e: any) => e.status === BLOCKS_MISSED);
if (proposedEvent) currentSlotStatus = proposedEvent.status as ValidatorHistoryEnum;
else if (attestationSentEvent) currentSlotStatus = ATTESTATION_SENT;
else if (attestationMissedEvent) currentSlotStatus = ATTESTATION_MISSED;
else if (checkpointMissedEvent) currentSlotStatus = CHECKPOINT_MISSED;
else if (blocksMissedEvent) currentSlotStatus = BLOCKS_MISSED;
```

**Step 2: Update sequencer-attestations route**

Change import to `CHECKPOINT_MINED, CHECKPOINT_PROPOSED, CHECKPOINT_MISSED, BLOCKS_MISSED`.

Update DB query filter:
```typescript
status: {
  in: [CHECKPOINT_MINED, CHECKPOINT_PROPOSED, CHECKPOINT_MISSED, BLOCKS_MISSED],
},
```

Update count filters:
```typescript
const checkpointsMined = attestations.filter(a => a.status === CHECKPOINT_MINED).length;
const checkpointsProposed = attestations.filter(a => a.status === CHECKPOINT_PROPOSED).length;
const checkpointsMissed = attestations.filter(a => a.status === CHECKPOINT_MISSED).length;
const blocksMissed = attestations.filter(a => a.status === BLOCKS_MISSED).length;
```

**Step 3: Update validators/[validatorHexIndex] route**

Change import to `CHECKPOINT_PROPOSED, CHECKPOINT_MINED, CHECKPOINT_MISSED, BLOCKS_MISSED`.

Update DB query filter:
```typescript
status: { in: [CHECKPOINT_PROPOSED, CHECKPOINT_MINED, CHECKPOINT_MISSED, BLOCKS_MISSED] }
```

**Step 4: Commit**

```bash
git add apps/web/src/app/api/epochs/[epochNumber]/live-slot-activity/route.ts apps/web/src/app/api/governance/sequencer-attestations/route.ts apps/web/src/app/api/validators/[validatorHexIndex]/route.ts
git commit -m "refactor: update API routes for checkpoint status model"
```

---

### Task 7: Update services and DB queries

**Files:**
- Modify: `apps/web/src/services/rewards/validatorRewards.ts`
- Modify: `apps/web/src/db/queries/signaling-matrix/queries.ts`

**Step 1: Update validatorRewards.ts**

Change import to `CHECKPOINT_MINED, CHECKPOINT_PROPOSED`.

Update comment and query:
```typescript
// Get slots where validator had checkpoint-mined or checkpoint-proposed status
const blockAttestations = await prisma.validatorAttestation.findMany({
  where: {
    validator_address: validatorAddress.toLowerCase(),
    status: {
      in: [CHECKPOINT_MINED, CHECKPOINT_PROPOSED],
    },
  },
```

**Step 2: Update signaling-matrix/queries.ts**

Change import to `CHECKPOINT_MINED, CHECKPOINT_MISSED, CHECKPOINT_PROPOSED, BLOCKS_MISSED`.

Update all SQL queries:
- `IN (${BLOCK_MINED}, ${BLOCK_PROPOSED}, ${BLOCK_MISSED})` -> `IN (${CHECKPOINT_MINED}, ${CHECKPOINT_PROPOSED}, ${CHECKPOINT_MISSED}, ${BLOCKS_MISSED})`
- SQL CASE aggregations:
```sql
SUM(CASE WHEN va.status = ${CHECKPOINT_PROPOSED} THEN 1 ELSE 0 END) as checkpoints_proposed,
SUM(CASE WHEN va.status = ${CHECKPOINT_MINED} THEN 1 ELSE 0 END) as checkpoints_mined,
SUM(CASE WHEN va.status = ${CHECKPOINT_MISSED} THEN 1 ELSE 0 END) as checkpoints_missed,
SUM(CASE WHEN va.status = ${BLOCKS_MISSED} THEN 1 ELSE 0 END) as blocks_missed,
```

**Step 3: Commit**

```bash
git add apps/web/src/services/rewards/validatorRewards.ts apps/web/src/db/queries/signaling-matrix/queries.ts
git commit -m "refactor: update services and queries for checkpoint status model"
```

---

### Task 8: Update UI components

**Files:**
- Modify: `apps/web/src/components/features/dashboard/ValidatorSlotActivityBar.tsx`
- Modify: `apps/web/src/components/features/epochs/SlotDetailsModal.tsx`
- Modify: `apps/web/src/components/features/validator-detail/HistoryCard.tsx`
- Modify: `apps/web/src/components/features/governance/matrix/SequencerAttestationsModal.tsx`

**Step 1: Update ValidatorSlotActivityBar.tsx**

Change import to `CHECKPOINT_PROPOSED, CHECKPOINT_MINED, CHECKPOINT_MISSED, BLOCKS_MISSED, ATTESTATION_SENT, ATTESTATION_MISSED`.

Update getStatusColor:
```typescript
const getStatusColor = (status: SlotActivityStatus): string => {
  switch (status) {
    case CHECKPOINT_PROPOSED:
    case CHECKPOINT_MINED:
      return 'bg-accent-blue';
    case ATTESTATION_SENT:
      return 'bg-green-500/60 dark:bg-green-500/40';
    case CHECKPOINT_MISSED:
      return 'bg-amber-500/90 dark:bg-amber-400/80';
    case BLOCKS_MISSED:
    case ATTESTATION_MISSED:
      return 'bg-red-500/90 dark:bg-red-400/80';
    case 'no_data':
    default:
      return 'bg-slate-200 dark:bg-slate-700/50';
  }
};
```

**Step 2: Update SlotDetailsModal.tsx**

Change import to `CHECKPOINT_PROPOSED, CHECKPOINT_MINED, CHECKPOINT_MISSED, BLOCKS_MISSED, ATTESTATION_SENT, ATTESTATION_MISSED`.

Update grouping logic:
```typescript
if (!slot || slot.status === 'no_data') {
  acc.noData.push(validator);
} else if (slot.status === CHECKPOINT_PROPOSED || slot.status === CHECKPOINT_MINED) {
  acc.blockProposer.push(validator);
} else if (slot.status === CHECKPOINT_MISSED || slot.status === BLOCKS_MISSED) {
  acc.blockMissed.push(validator);
} else if (slot.status === ATTESTATION_SENT) {
  acc.attestationSuccess.push(validator);
} else if (slot.status === ATTESTATION_MISSED) {
  acc.attestationMissed.push(validator);
}
```

**Step 3: Update HistoryCard.tsx**

Change import to `CHECKPOINT_PROPOSED, CHECKPOINT_MINED`.

Update status check:
```typescript
[CHECKPOINT_PROPOSED, CHECKPOINT_MINED].includes(prop.status)
```

**Step 4: Update SequencerAttestationsModal.tsx**

Change import to `CHECKPOINT_MINED, CHECKPOINT_PROPOSED, CHECKPOINT_MISSED, BLOCKS_MISSED`.

Update status logic:
```typescript
const isMined = attestation.status === CHECKPOINT_MINED;
const isProposed = attestation.status === CHECKPOINT_PROPOSED;
const isMissed = attestation.status === CHECKPOINT_MISSED;
const isBlocksMissed = attestation.status === BLOCKS_MISSED;
const statusLabel = isMined ? 'Mined' : isProposed ? 'Proposed' : isMissed ? 'Checkpoint Missed' : isBlocksMissed ? 'No Proposals' : attestation.status;
const statusClass = isMined
  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
  : isProposed
    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
    : (isMissed || isBlocksMissed)
      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
```

**Step 5: Commit**

```bash
git add apps/web/src/components/features/dashboard/ValidatorSlotActivityBar.tsx apps/web/src/components/features/epochs/SlotDetailsModal.tsx apps/web/src/components/features/validator-detail/HistoryCard.tsx apps/web/src/components/features/governance/matrix/SequencerAttestationsModal.tsx
git commit -m "refactor: update UI components for checkpoint status model"
```

---

### Task 9: Update epoch page components

**Files:**
- Modify: `apps/web/src/app/epoch-performance/page.tsx`
- Modify: `apps/web/src/app/epochs/[epochNumber]/page.tsx`
- Modify: `apps/web/src/app/epochs/[epochNumber]/HistoricalEpochPageContent.tsx`

**Step 1: Update all three files identically**

Change import from `BLOCK_PROPOSED, BLOCK_MINED, BLOCK_MISSED` to `CHECKPOINT_PROPOSED, CHECKPOINT_MINED, CHECKPOINT_MISSED, BLOCKS_MISSED`.

Update status analysis logic (identical pattern in all 3 files):
```typescript
if (slot.status === ATTESTATION_SENT || slot.status === ATTESTATION_MISSED) {
  totalAttestations++;
  if (slot.status === ATTESTATION_SENT) {
    successfulAttestations++;
    hasActivity = true;
  }
}
if (slot.status === CHECKPOINT_PROPOSED || slot.status === CHECKPOINT_MINED || slot.status === CHECKPOINT_MISSED || slot.status === BLOCKS_MISSED) {
  totalBlockOps++;
  if (slot.status === CHECKPOINT_PROPOSED || slot.status === CHECKPOINT_MINED) {
    successfulBlockOps++;
    hasActivity = true;
  }
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/epoch-performance/page.tsx apps/web/src/app/epochs/[epochNumber]/page.tsx apps/web/src/app/epochs/[epochNumber]/HistoricalEpochPageContent.tsx
git commit -m "refactor: update epoch pages for checkpoint status model"
```

---

### Task 10: Typecheck and fix remaining references

**Step 1: Run typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1
```

**Step 2: Fix any remaining TypeScript errors**

The compiler will flag any missed references to old `BLOCK_MINED`, `BLOCK_PROPOSED`, `BLOCK_MISSED` constants or renamed interface fields. Fix each one following the same pattern.

**Step 3: Commit**

```bash
git add -A
git commit -m "fix: resolve remaining TypeScript errors from status migration"
```

---

### Task 11: Rename internal variables for semantic consistency (Layer 2)

**Files:** ~28 files with `blocksMined`, `blocksProposed`, `blocksMissed`, `blockSuccess` variables.

**Step 1: Search and rename internal variable names**

Use grep to find all internal references and rename:
- `blocksMined` -> `checkpointsMined`
- `blocksProposed` -> `checkpointsProposed`
- `blocksMissed` (context-dependent: keep if referring to `blocks-missed` status, rename to `checkpointsMissed` if referring to old `block-missed`)
- `blockSuccess` -> `checkpointSuccess`
- `blockMissedData` -> `checkpointMissedData`
- `blockSuccessData` -> `checkpointSuccessData`
- Chart.js `stack: 'block'` -> `stack: 'proposer'`
- `blockProposer` -> `checkpointProposer` (in SlotDetailsModal grouping)

**Step 2: Run typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1
```

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rename internal block variables to checkpoint for consistency"
```

---

### Task 12: Final typecheck and push

**Step 1: Full typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1
```

**Step 2: Push branch**

```bash
git push -u origin heed/validator-status-breaking-changes
```
