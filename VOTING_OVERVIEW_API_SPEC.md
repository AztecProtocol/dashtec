# VotingOverview API Specification

## Overview
This document outlines the API requirements for the `VotingOverview.tsx` dashboard component based on analysis of the Prisma schemas (`governance.prisma` and `slashing.prisma`).

## Component Requirements Analysis

The `VotingOverview` component displays two main sections:

### 1. Governance Proposer Voting Section
- **Latest Round Number**: Current governance round
- **Recent Votecasts**: List of recent votes cast on governance proposals
- **Payload Status**: Status of governance payloads (Submittable/Submitted)

### 2. Slashing Proposer Voting Section
- **Latest Round Number**: Current slashing round
- **Latest Executed Round**: Most recent executed slashing round
- **Recent Votecasts**: List of recent votes cast on slashing proposals
- **Recently Slashed**: List of recently slashed validators

---

## Database Schema Analysis

### Governance Tables (governance.prisma)

#### ProposerVote
- Tracks votes for governance proposals
- **Note**: In practice, only `GOVERNANCE_PROPOSER` type is used; slashing votes use `TallyVoteCast`
- **Always filter by `vote_type = 'GOVERNANCE_PROPOSER'`** for defensive programming
- Key fields:
  - `vote_type`: GOVERNANCE_PROPOSER | SLASHING_PROPOSER (filter for GOVERNANCE_PROPOSER)
  - `signaler_address`: Voter address
  - `payload_address`: Proposal address
  - `round_number`: Round number
  - `vote_date`: When vote was cast
  - `transaction_hash`: TX hash

#### GovernanceProposerPayload
- Tracks governance proposal payloads
- Key fields:
  - `payload_address`: Unique payload address
  - `creator_address`: Proposal creator
  - `timestamp`: Creation timestamp
  - `first_signal_timestamp`: First vote timestamp

#### ProposerPayloadSubmittable
- Tracks when payloads become submittable
- Key fields:
  - `payload_address`: Payload reference
  - `round_number`: Round when submittable
  - `timestamp`: When it became submittable

#### ProposerPayloadSubmitted
- Tracks submitted payloads
- Key fields:
  - `payload_address`: Payload reference
  - `round_number`: Round when submitted
  - `submitter_address`: Who submitted
  - `timestamp`: Submission timestamp

### Slashing Tables (slashing.prisma)

#### TallyVoteCast
- Tracks votes cast on slashing proposals in the Tally system
- Key fields:
  - `round_number`: Slashing round
  - `proposer_address`: Voter address
  - `vote_date`: When vote was cast
  - `transaction_hash`: TX hash

#### TallyRoundExecuted
- Tracks executed slashing rounds
- Key fields:
  - `round_number`: Round number
  - `slash_count`: Number of validators slashed
  - `executed_date`: When round was executed
  - `payload_address`: Associated payload
  - `vote_count`: Total votes
  - `quorum_threshold`: Required quorum

#### TallySlashAction
- Individual slashing actions
- Key fields:
  - `round_number`: Slashing round
  - `validator_address`: Slashed validator
  - `slash_amount`: Amount slashed
  - `executed_at`: Execution timestamp
  - `payload_address`: Proposal that triggered slash

#### SlashSlashed (Legacy)
- Legacy slashing events
- Key fields:
  - `attester_address`: Slashed validator
  - `amount`: Slash amount
  - `slashed_date`: Execution date
  - `payload_address`: Associated payload

---

## Proposed API Endpoint

### `GET /api/dashboard/voting-overview`

Returns aggregated voting data for both governance and slashing proposers.

#### Response Schema

```typescript
interface VotingOverviewResponse {
  governance: {
    latestRound: number;
    recentVotecasts: Array<{
      round: number;
      voter: string; // signaler_address
      timestamp: string; // formatted time ago
      support: boolean; // derived from vote existence
      transactionHash: string;
      payloadAddress: string;
    }>;
    recentPayloads: Array<{
      round: number;
      proposer: string; // creator_address
      status: 'Submittable' | 'Submitted';
      timestamp: string; // formatted time ago
      payloadAddress: string;
      transactionHash?: string;
    }>;
  };
  slashing: {
    latestRound: number;
    latestExecutedRound: number;
    recentVotecasts: Array<{
      round: number;
      voter: string; // proposer_address
      timestamp: string; // formatted time ago
      support: boolean; // derived from vote existence
      transactionHash: string;
      target?: string; // validator being slashed (if available)
    }>;
    recentSlashed: Array<{
      sequencer: string; // validator_address
      round: number;
      reason?: string; // derived from slash_amount or other factors
      timestamp: string; // formatted time ago
      slashAmount: string;
      transactionHash?: string;
    }>;
  };
  benchmark: string;
  status: 'ok' | 'error';
}
```

---

## Database Query Strategy

### Governance Queries

**Note**: Always use `ProposerVoteType.GOVERNANCE_PROPOSER` from `@dashtec/shared-types` instead of hardcoded strings.

1. **Latest Round Number**
```sql
SELECT MAX(round_number)
FROM "ProposerVote"
WHERE vote_type = 'GOVERNANCE_PROPOSER'
-- In code: use ProposerVoteType.GOVERNANCE_PROPOSER
```

2. **Recent Votecasts** (last 5-10 votes)
```sql
SELECT
  pv.round_number,
  pv.signaler_address as voter,
  pv.vote_date,
  pv.transaction_hash,
  pv.payload_address
FROM "ProposerVote" pv
WHERE pv.vote_type = 'GOVERNANCE_PROPOSER'
-- In code: use ProposerVoteType.GOVERNANCE_PROPOSER
ORDER BY pv.vote_date DESC
LIMIT 5
```

3. **Recent Payloads with Status**
```sql
-- Get payloads that are submitted
SELECT
  pps.round_number,
  gpp.creator_address as proposer,
  'Submitted' as status,
  pps.timestamp,
  pps.payload_address,
  pps.transaction_hash
FROM "ProposerPayloadSubmitted" pps
LEFT JOIN "GovernanceProposerPayload" gpp
  ON pps.payload_address = gpp.payload_address
ORDER BY pps.timestamp DESC
LIMIT 3

UNION ALL

-- Get payloads that are submittable but not submitted
SELECT
  ppsu.round_number,
  gpp.creator_address as proposer,
  'Submittable' as status,
  ppsu.timestamp,
  ppsu.payload_address,
  NULL as transaction_hash
FROM "ProposerPayloadSubmittable" ppsu
LEFT JOIN "GovernanceProposerPayload" gpp
  ON ppsu.payload_address = gpp.payload_address
WHERE NOT EXISTS (
  SELECT 1 FROM "ProposerPayloadSubmitted" pps
  WHERE pps.payload_address = ppsu.payload_address
)
ORDER BY timestamp DESC
LIMIT 3
```

### Slashing Queries

1. **Latest Round Number**
```sql
SELECT MAX(round_number)
FROM "TallyVoteCast"
```

2. **Latest Executed Round**
```sql
SELECT MAX(round_number)
FROM "TallyRoundExecuted"
WHERE slash_count > 0
```

3. **Recent Votecasts** (last 5-10 votes)
```sql
SELECT
  tvc.round_number,
  tvc.proposer_address as voter,
  tvc.vote_date,
  tvc.transaction_hash,
  tre.payload_address
FROM "TallyVoteCast" tvc
LEFT JOIN "TallyRoundExecuted" tre
  ON tvc.round_number = tre.round_number
ORDER BY tvc.vote_date DESC
LIMIT 5
```

4. **Recently Slashed** (last 5 slashing events)
```sql
SELECT
  tsa.validator_address as sequencer,
  tsa.round_number,
  tsa.slash_amount,
  tre.executed_date,
  tre.transaction_hash,
  tsa.payload_address
FROM "TallySlashAction" tsa
INNER JOIN "TallyRoundExecuted" tre
  ON tsa.round_number = tre.round_number
WHERE tsa.executed_at IS NOT NULL
ORDER BY tre.executed_date DESC
LIMIT 5
```

---

## Implementation Steps

1. **Create API Route**
   - File: `apps/web/src/app/api/dashboard/voting-overview/route.ts`
   - Follow existing patterns from `/api/dashboard/current-epoch-stats/route.ts`
   - **Import**: Use `ProposerVoteType` from `@dashtec/shared-types`

2. **Create Database Query Helpers**
   - File: `apps/web/src/db/queries/voting-overview.ts`
   - Implement query functions using Prisma client
   - **Import**: Use `ProposerVoteType` enum instead of hardcoded strings

3. **Add TypeScript Types**
   - File: `apps/web/src/types/api/voting-overview.ts`
   - Define response interfaces

4. **Create React Hook**
   - File: `apps/web/src/hooks/queries/useVotingOverview.ts`
   - Implement data fetching hook using existing patterns

5. **Update Component**
   - File: `apps/web/src/components/features/dashboard/VotingOverview.tsx`
   - Replace mock data with real API calls
   - Add loading and error states

---

## Data Formatting Helpers

### Time Formatting
```typescript
// Reuse existing utility: apps/web/src/utils/formatters.ts
import { formatTimestamp } from '@/utils/formatters';
```

### Address Formatting
```typescript
export function formatAddress(address: string): string {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}
```

### Slash Reason Derivation
```typescript
export function getSlashReason(slashAmount: number): string {
  // This would need to be enhanced with actual business logic
  // For now, use generic reasons or derive from amount thresholds
  if (slashAmount > 1000) return 'Double signing';
  if (slashAmount > 500) return 'Missed attestations';
  return 'Protocol violation';
}
```

---

## Query Optimizations

1. **Use Indexes** (already defined in schemas):
   - `vote_type` on `ProposerVote`
   - `vote_date` on `ProposerVote` and `TallyVoteCast`
   - `round_number` on all tables
   - `executed_date` on `TallyRoundExecuted`

2. **Parallel Queries**:
   - Use `Promise.all()` to fetch governance and slashing data concurrently

3. **Limit Results**:
   - Only fetch top 5-10 recent items per section
   - Consider caching for frequently accessed data

4. **Database Views** (optional future optimization):
   - Create materialized views for complex joins
   - Refresh periodically via cron job

---

## Example Implementation Snippet

```typescript
// apps/web/src/db/queries/voting-overview.ts
import prisma from '@/lib/prisma';
import { ProposerVoteType } from '@dashtec/shared-types';

export async function getGovernanceVotingData() {
  const [latestRound, recentVotes, recentPayloads] = await Promise.all([
    // Get latest round
    prisma.proposerVote.aggregate({
      where: { vote_type: ProposerVoteType.GOVERNANCE_PROPOSER },
      _max: { round_number: true }
    }),

    // Get recent votes (filter for governance votes)
    prisma.proposerVote.findMany({
      where: { vote_type: ProposerVoteType.GOVERNANCE_PROPOSER },
      orderBy: { vote_date: 'desc' },
      take: 5,
      select: {
        round_number: true,
        signaler_address: true,
        vote_date: true,
        transaction_hash: true,
        payload_address: true,
      }
    }),

    // Get recent payloads (both submitted and submittable)
    getRecentPayloads()
  ]);

  return {
    latestRound: latestRound._max.round_number || 0,
    recentVotecasts: recentVotes,
    recentPayloads: recentPayloads
  };
}

export async function getSlashingVotingData() {
  // Uses TallyVoteCast, TallyRoundExecuted, and TallySlashAction tables
  // No vote_type filtering needed - these tables are slashing-specific
}
```

---

## Testing Considerations

1. **Mock Data**: Keep existing mock data for development
2. **Error Handling**: Handle cases where data is missing
3. **Loading States**: Show skeletons while loading
4. **Empty States**: Handle scenarios with no recent activity

---

## Next Steps

1. Review this specification with the team
2. Implement the API endpoint
3. Create database query helpers
4. Implement React hook
5. Update VotingOverview component
6. Test with real data
7. Add error handling and loading states
