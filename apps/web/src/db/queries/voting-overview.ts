import prisma from '@/lib/prisma';
import { ProposerVoteType } from '@dashtec/shared-types';
import { Prisma } from '@dashtec/database';
import { determinePayloadStatus, paginate } from './helpers';
import { rollupWhereClause, rollupWhereClauseFor, getRollupBlockRange, rollupBlockRangeClause } from '@/lib/rollupParam';

/**
 * Get governance voting data filtered by rollup's canonical block range
 */
export async function getGovernanceVotingData(rollupAddresses?: string[]) {
  const blockRange = rollupAddresses?.length ? await getRollupBlockRange(rollupAddresses) : null;
  const blockFilter = blockRange ? {
    block_number: {
      gte: BigInt(blockRange.startBlock),
      ...(blockRange.endBlock ? { lt: BigInt(blockRange.endBlock) } : {}),
    }
  } : {};
  const blockRangeRaw = blockRange
    ? Prisma.sql`AND ${rollupBlockRangeClause('"ProposerVote"', blockRange)}`
    : Prisma.empty;
  const blockRangeRawPpsu = blockRange
    ? Prisma.sql`AND ${rollupBlockRangeClause('ppsu', blockRange)}`
    : Prisma.empty;
  const blockRangeRawPps = blockRange
    ? Prisma.sql`AND ${rollupBlockRangeClause('"ProposerPayloadSubmitted"', blockRange)}`
    : Prisma.empty;

  const [latestRoundResult, recentVotes, submittedPayloads, submittablePayloads, allPayloadCreators] = await Promise.all([
    prisma.proposerVote.aggregate({
      where: { vote_type: ProposerVoteType.GOVERNANCE_PROPOSER, ...blockFilter },
      _max: { round_number: true }
    }),

    prisma.proposerVote.findMany({
      where: { vote_type: ProposerVoteType.GOVERNANCE_PROPOSER, ...blockFilter },
      orderBy: [{ block_number: 'desc' }, { log_index: 'desc' }],
      take: 5,
      select: {
        round_number: true,
        signaler_address: true,
        vote_date: true,
        transaction_hash: true,
        payload_address: true,
      }
    }),

    prisma.proposerPayloadSubmitted.findMany({
      where: blockFilter,
      orderBy: [{ block_number: 'desc' }, { log_index: 'desc' }],
      take: 3,
      select: {
        round_number: true,
        payload_address: true,
        submitter_address: true,
        timestamp: true,
        transaction_hash: true,
      }
    }),

    prisma.$queryRaw<Array<{
      round_number: number;
      payload_address: string;
      timestamp: string | null;
    }>>`
      SELECT
        ppsu.round_number,
        ppsu.payload_address,
        ppsu.timestamp
      FROM "ProposerPayloadSubmittable" ppsu
      LEFT JOIN LATERAL (
        SELECT 1
        FROM "ProposerPayloadSubmitted" pps
        WHERE pps.payload_address = ppsu.payload_address
        LIMIT 1
      ) subm ON TRUE
      WHERE subm IS NULL
      ${blockRangeRawPpsu}
      ORDER BY ppsu.payload_address, ppsu.timestamp DESC
      LIMIT 3
    `,

    prisma.governanceProposerPayload.findMany({
      where: blockFilter,
      select: {
        payload_address: true,
        creator_address: true,
      }
    })
  ]);

  const creatorMap = new Map(
    allPayloadCreators.map(p => [p.payload_address, p.creator_address])
  );

  return {
    latestRound: latestRoundResult._max.round_number || 0,
    recentVotes,
    submittedPayloads,
    submittablePayloads,
    creatorMap,
  };
}

/**
 * Historical governance payload with signal count and metadata
 */
export interface GovernancePayloadWithSignals {
  payloadAddress: string;
  roundNumber: number;
  signalCount: number;
  proposerAddress: string | null;
  status: 'Submitted' | 'Submittable' | 'Active';
  firstSignalTimestamp: string | null;
  submittedTimestamp: string | null;
  submittedTransactionHash: string | null;
  submittableTimestamp: string | null;
  submittableTransactionHash: string | null;
}

/**
 * Individual signal for a governance payload
 */
export interface GovernanceSignal {
  signalerAddress: string;
  timestamp: string | null;
  transactionHash: string;
}

/**
 * Payload with its signals for nested display
 */
export interface GovernancePayloadWithSignalsList extends GovernancePayloadWithSignals {
  signals: GovernanceSignal[];
}

/**
 * Round with its payloads for grouped display
 */
export interface GovernanceRoundWithPayloads {
  roundNumber: number;
  payloads: GovernancePayloadWithSignalsList[];
  totalSignals: number;
}

/**
 * Get governance data grouped by rounds with payloads and signals
 */
export interface GovernanceRoundsResult {
  rounds: GovernanceRoundWithPayloads[];
  totalCount: number;
  totalPages: number;
}

/**
 * Get governance data grouped by rounds with payloads and signals
 * Supports pagination and search by round number
 */
export async function getGovernanceRoundsWithPayloadsAndSignals(
  page: number = 1,
  pageSize: number = 20,
  query?: string,
  rollupAddresses?: string[]
): Promise<GovernanceRoundsResult> {
  const { skip } = paginate(page, pageSize, 0);

  const blockRange = rollupAddresses?.length ? await getRollupBlockRange(rollupAddresses) : null;
  const blockFilter = blockRange ? {
    block_number: {
      gte: BigInt(blockRange.startBlock),
      ...(blockRange.endBlock ? { lt: BigInt(blockRange.endBlock) } : {}),
    }
  } : {};
  const blockRangeRawPv = blockRange
    ? Prisma.sql`AND ${rollupBlockRangeClause('"ProposerVote"', blockRange)}`
    : Prisma.empty;

  let roundWhere: Prisma.ProposerVoteWhereInput = {
    vote_type: ProposerVoteType.GOVERNANCE_PROPOSER,
    ...blockFilter,
  };

  if (query) {
    // Search by round number
    const roundNum = parseInt(query.replace('#', ''));
    if (!isNaN(roundNum)) {
      roundWhere = {
        ...roundWhere,
        round_number: roundNum
      };
    }
  }

  // 1. Get distinct rounds matching the criteria with pagination
  const [distinctRounds, totalCount] = await Promise.all([
    prisma.proposerVote.groupBy({
      by: ['round_number'],
      where: roundWhere,
      orderBy: {
        round_number: 'desc'
      },
      skip,
      take: pageSize,
    }),
    // Get total count of unique rounds matching criteria
    prisma.proposerVote.groupBy({
      by: ['round_number'],
      where: roundWhere,
    }).then(res => res.length)
  ]);

  if (distinctRounds.length === 0) {
    return {
      rounds: [],
      totalCount: 0,
      totalPages: 0
    };
  }

  const roundNumbers = distinctRounds.map(r => r.round_number);

  // 2. Custom query for payloads filtered by specific rounds
  const payloadsWithSignals = await prisma.$queryRaw<Array<{
    payload_address: string;
    round_number: number;
    signal_count: bigint;
    creator_address: string | null;
    first_signal_timestamp: string | null;
    submitted_at: string | null;
    submitted_tx: string | null;
    is_submitted: boolean;
    submittable_at: string | null;
    submittable_tx: string | null;
    is_submittable: boolean;
  }>>`
    WITH payload_signals AS (
      SELECT 
        payload_address,
        round_number,
        COUNT(*) as signal_count,
        MIN(timestamp) as first_signal_timestamp
      FROM "ProposerVote"
      WHERE vote_type = 'GOVERNANCE_PROPOSER'
      AND round_number IN (${Prisma.join(roundNumbers)})
      ${blockRangeRawPv}
      GROUP BY payload_address, round_number
    ),
    submitted_payloads AS (
      SELECT DISTINCT ON (payload_address, round_number)
        payload_address,
        round_number,
        timestamp as submitted_at,
        transaction_hash as submitted_tx
      FROM "ProposerPayloadSubmitted"
      ORDER BY payload_address, round_number DESC
    ),
    submittable_payloads AS (
      SELECT DISTINCT ON (payload_address, round_number) 
        payload_address,
        round_number,
        timestamp as submittable_at,
        transaction_hash as submittable_tx
      FROM "ProposerPayloadSubmittable" ps
      WHERE NOT EXISTS (
        SELECT 1 FROM "ProposerPayloadSubmitted" sub
        WHERE (sub.payload_address, sub.round_number) = (ps.payload_address, ps.round_number)
      )
    )
    SELECT 
      ps.payload_address,
      ps.round_number,
      ps.signal_count,
      gpp.creator_address,
      ps.first_signal_timestamp,
      sp.submitted_at,
      sp.submitted_tx,
      (sp.payload_address IS NOT NULL) as is_submitted,
      subm.submittable_at,
      subm.submittable_tx,
      (subm.payload_address IS NOT NULL) as is_submittable
    FROM payload_signals ps
    LEFT JOIN "GovernanceProposerPayload" gpp ON gpp.payload_address = ps.payload_address
    LEFT JOIN submitted_payloads sp ON (sp.payload_address, sp.round_number) = (ps.payload_address, ps.round_number)
    LEFT JOIN submittable_payloads subm ON (subm.payload_address, subm.round_number) = (ps.payload_address, ps.round_number)
    ORDER BY ps.round_number DESC, ps.signal_count DESC
  `;

  // Map to GovernancePayloadWithSignals objects
  const payloads = payloadsWithSignals.map(p => ({
    payloadAddress: p.payload_address,
    roundNumber: p.round_number,
    signalCount: Number(p.signal_count),
    proposerAddress: p.creator_address,
    status: determinePayloadStatus(p.is_submitted, p.is_submittable),
    firstSignalTimestamp: p.first_signal_timestamp,
    submittedTimestamp: p.submitted_at,
    submittedTransactionHash: p.submitted_tx,
    submittableTimestamp: p.submittable_at,
    submittableTransactionHash: p.submittable_tx,
  })) as GovernancePayloadWithSignals[];

  // 3. Get all signals for these rounds
  const allSignals = await prisma.proposerVote.findMany({
    where: {
      vote_type: 'GOVERNANCE_PROPOSER',
      round_number: { in: roundNumbers },
      ...blockFilter,
    },
    orderBy: [{ block_number: 'desc' }, { log_index: 'desc' }],
    select: {
      payload_address: true,
      signaler_address: true,
      timestamp: true,
      transaction_hash: true,
      round_number: true,
    },
  });

  // Create a map of payload -> signals
  const signalsMap = new Map<string, GovernanceSignal[]>();
  allSignals.forEach(s => {
    const key = `${s.payload_address.toLowerCase()}-${s.round_number}`;
    if (!signalsMap.has(key)) {
      signalsMap.set(key, []);
    }
    signalsMap.get(key)!.push({
      signalerAddress: s.signaler_address,
      timestamp: s.timestamp,
      transactionHash: s.transaction_hash,
    });
  });

  // Add signals to each payload
  const payloadsWithSignalsList: GovernancePayloadWithSignalsList[] = payloads.map(p => ({
    ...p,
    signals: signalsMap.get(`${p.payloadAddress.toLowerCase()}-${p.roundNumber}`) || [],
  }));

  // Group by round
  const roundsMap = new Map<number, GovernancePayloadWithSignalsList[]>();
  roundNumbers.forEach(rn => roundsMap.set(rn, []));

  payloadsWithSignalsList.forEach(p => {
    if (roundsMap.has(p.roundNumber)) {
      roundsMap.get(p.roundNumber)!.push(p);
    }
  });

  // Convert to array and sort descending by round number
  const rounds: GovernanceRoundWithPayloads[] = Array.from(roundsMap.entries())
    .map(([roundNumber, payloads]) => ({
      roundNumber,
      payloads,
      totalSignals: payloads.reduce((sum, p) => sum + p.signalCount, 0)
    }))
    .sort((a, b) => b.roundNumber - a.roundNumber);

  return {
    rounds,
    totalCount,
    totalPages: paginate(page, pageSize, totalCount).totalPages,
  };
}

/**
 * Get slashing voting data including latest round, recent votes, and slashed validators
 */
export async function getSlashingVotingData(rollupAddresses?: string[]) {
  const rollupWhere = rollupAddresses?.length
    ? { rollup_address: { in: rollupAddresses } }
    : {};
  const rollupRawFilterTsa = rollupAddresses?.length
    ? Prisma.sql`AND ${rollupWhereClauseFor('tsa', rollupAddresses)}`
    : Prisma.empty;

  const [latestRoundResult, latestExecutedResult, recentVotes, recentSlashed, allRoundTargets] = await Promise.all([
    // Get latest round number from votes
    prisma.tallyVoteCast.aggregate({
      where: rollupWhere,
      _max: { round_number: true }
    }),

    // Get latest executed round
    prisma.tallyRoundExecuted.aggregate({
      where: { slash_count: { gt: 0 }, ...rollupWhere },
      _max: { round_number: true }
    }),

    // Get recent votes (last 5)
    prisma.tallyVoteCast.findMany({
      where: rollupWhere,
      orderBy: [{ block_number: 'desc' }, { log_index: 'desc' }],
      take: 5,
      select: {
        round_number: true,
        proposer_address: true,
        vote_date: true,
        transaction_hash: true,
        slot_number: true,
        epoch_number: true,
      }
    }),

    // Get recently slashed validators (last 5 from executed rounds)
    prisma.$queryRaw<Array<{
      validator_address: string;
      round_number: number;
      slash_amount: string;
      executed_date: Date | null;
      deployment_tx_hash: string | null;
    }>>`
      SELECT
        tsa.validator_address,
        tsa.round_number,
        tsa.slash_amount::TEXT as slash_amount,
        tre.executed_date,
        tsa.deployment_tx_hash
      FROM "TallySlashAction" tsa
      INNER JOIN "TallyRoundExecuted" tre
        ON tsa.round_number = tre.round_number
      WHERE tsa.executed_at IS NOT NULL
      ${rollupRawFilterTsa}
      ORDER BY tre.executed_date DESC
      LIMIT 5
    `,

    // Get all round targets (fetch recent ones, filter in memory)
    prisma.$queryRaw<Array<{
      round_number: number;
      validator_address: string | null;
    }>>`
      SELECT
        round_number,
        validator_address
      FROM "TallySlashAction"
      WHERE round_number >= (
        SELECT COALESCE(MIN(round_number), 0)
        FROM (
          SELECT round_number
          FROM "TallyVoteCast"
          ORDER BY vote_date DESC
          LIMIT 5
        ) recent_rounds
      )
      ${rollupAddresses?.length ? Prisma.sql`AND ${rollupWhereClause(rollupAddresses)}` : Prisma.empty}
      GROUP BY round_number, validator_address
    `
  ]);

  // Create a map of round_number to first target validator
  const roundTargetMap = new Map<number, string>();
  for (const rt of allRoundTargets) {
    if (rt.validator_address && !roundTargetMap.has(rt.round_number)) {
      roundTargetMap.set(rt.round_number, rt.validator_address);
    }
  }

  return {
    latestRound: latestRoundResult._max.round_number || 0,
    latestExecutedRound: latestExecutedResult._max.round_number || 0,
    recentVotes,
    recentSlashed,
    roundTargetMap,
  };
}
