import prisma, { debugSql } from '@/lib/prisma';
import { ProposerVoteType } from '@dashtec/shared-types';
import { Prisma } from '@dashtec/database';
import { determinePayloadStatus, paginate } from './helpers';
import { getRollupBlockRange, rollupBlockRangeClause } from '@/lib/rollupParam';

/**
 * Optimized governance queries with lazy-loading and pagination
 * Separates concerns: Rounds -> Payloads -> Signals
 */

/**
 * Round summary without nested payloads (for efficient listing)
 */
export interface GovernanceRoundSummary {
  roundNumber: number;
  payloadCount: number;
  totalSignals: number;
  statusCounts: {
    submitted: number;
    submittable: number;
    active: number;
    expired: number;
  };
}

/**
 * Individual signal for a governance payload with provider information
 */
export interface GovernanceSignal {
  signalerAddress: string;
  timestamp: string | null;
  transactionHash: string;
  blockNumber: number;
  // Provider/Validator information
  validatorName: string | null;
  validatorIndex: number | null;
  xHandle: string | null;
  xImageUrl: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  providerName: string | null;
  providerLogoUrl: string | null;
  providerIdentifier: string | null;
}

/**
 * Governance payload with metadata
 */
export interface GovernancePayloadInfo {
  payloadAddress: string;
  roundNumber: number;
  signalCount: number;
  proposerAddress: string | null;
  status: 'Submitted' | 'Submittable' | 'Active' | 'Expired';
  firstSignalTimestamp: string | null;
  submittedTimestamp: string | null;
  submittedTransactionHash: string | null;
  submittableTimestamp: string | null;
  submittableTransactionHash: string | null;
}

/**
 * Get governance rounds with summary counts only (no nested data)
 * Optimized for list view performance
 */
export async function getGovernanceRoundsSummary(
  page: number = 1,
  pageSize: number = 20,
  query?: string,
  currentRound?: number,
  lifetimeInRounds?: number,
  rollupAddresses?: string[]
): Promise<{ rounds: GovernanceRoundSummary[]; totalCount: number; totalPages: number }> {
  const { skip } = paginate(page, pageSize, 0);

  // Filter by rollup's canonical block range
  const blockRange = rollupAddresses?.length ? await getRollupBlockRange(rollupAddresses) : null;
  const blockFilter = blockRange ? {
    block_number: {
      gte: BigInt(blockRange.startBlock),
      ...(blockRange.endBlock ? { lt: BigInt(blockRange.endBlock) } : {}),
    }
  } : {};
  const rollupRawFilter = blockRange
    ? Prisma.sql`AND ${rollupBlockRangeClause('"ProposerVote"', blockRange)}`
    : Prisma.empty;
  const rollupRawFilterSp = blockRange
    ? Prisma.sql`AND ${rollupBlockRangeClause('"ProposerPayloadSubmitted"', blockRange)}`
    : Prisma.empty;
  const rollupRawFilterSubm = blockRange
    ? Prisma.sql`AND ${rollupBlockRangeClause('"ProposerPayloadSubmittable"', blockRange)}`
    : Prisma.empty;

  let roundWhere: Prisma.ProposerVoteWhereInput = {
    vote_type: ProposerVoteType.GOVERNANCE_PROPOSER,
    ...blockFilter,
  };

  if (query) {
    const roundNum = parseInt(query.replace('#', ''));
    if (!isNaN(roundNum)) {
      roundWhere = {
        ...roundWhere,
        round_number: roundNum
      };
    }
  }

  // Get distinct rounds with pagination
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

  // Get summary counts for these rounds
  const roundSummaries = await prisma.$queryRaw<Array<{
    round_number: number;
    payload_count: bigint;
    total_signals: bigint;
    submitted_count: bigint;
    submittable_count: bigint;
    active_count: bigint;
  }>>`
    WITH payload_signals AS (
      SELECT
        payload_address,
        round_number,
        COUNT(*) as signal_count
      FROM "ProposerVote"
      WHERE vote_type = ${ProposerVoteType.GOVERNANCE_PROPOSER}
      AND round_number IN (${Prisma.join(roundNumbers)})
      ${rollupRawFilter}
      GROUP BY payload_address, round_number
    ),
    payload_statuses AS (
      SELECT
        ps.round_number,
        ps.payload_address,
        ps.signal_count,
        (sp.payload_address IS NOT NULL) as is_submitted,
        (subm.payload_address IS NOT NULL AND sp.payload_address IS NULL) as is_submittable
      FROM payload_signals ps
      LEFT JOIN (
        SELECT DISTINCT ON (payload_address, round_number)
          payload_address, round_number
        FROM "ProposerPayloadSubmitted"
        WHERE 1=1 ${rollupRawFilterSp}
      ) sp ON (sp.payload_address, sp.round_number) = (ps.payload_address, ps.round_number)
      LEFT JOIN (
        SELECT DISTINCT ON (payload_address, round_number)
          payload_address, round_number
        FROM "ProposerPayloadSubmittable"
        WHERE 1=1 ${rollupRawFilterSubm}
      ) subm ON (subm.payload_address, subm.round_number) = (ps.payload_address, ps.round_number)
    )
    SELECT
      round_number,
      COUNT(DISTINCT payload_address) as payload_count,
      SUM(signal_count) as total_signals,
      COUNT(DISTINCT CASE WHEN is_submitted THEN payload_address END) as submitted_count,
      COUNT(DISTINCT CASE WHEN is_submittable THEN payload_address END) as submittable_count,
      COUNT(DISTINCT CASE WHEN NOT is_submitted AND NOT is_submittable THEN payload_address END) as active_count
    FROM payload_statuses
    GROUP BY round_number
    ORDER BY round_number DESC
  `;

  // Calculate expired count if we have currentRound and lifetimeInRounds
  const rounds: GovernanceRoundSummary[] = roundSummaries.map(r => {
    const tooOld = currentRound && lifetimeInRounds
      ? currentRound > r.round_number + lifetimeInRounds
      : false;

    // If round is too old, all non-submitted payloads become expired
    const activeCount = Number(r.active_count);
    const submittableCount = Number(r.submittable_count);

    const expiredCount = tooOld ? (activeCount + submittableCount) : 0;
    const adjustedActiveCount = tooOld ? 0 : activeCount;
    const adjustedSubmittableCount = tooOld ? 0 : submittableCount;

    return {
      roundNumber: r.round_number,
      payloadCount: Number(r.payload_count),
      totalSignals: Number(r.total_signals),
      statusCounts: {
        submitted: Number(r.submitted_count),
        submittable: adjustedSubmittableCount,
        active: adjustedActiveCount,
        expired: expiredCount,
      }
    };
  });

  return {
    rounds,
    totalCount,
    totalPages: paginate(page, pageSize, totalCount).totalPages,
  };
}

/**
 * Get payloads for a specific round with pagination
 */
export async function getRoundPayloads(
  roundNumber: number,
  page: number = 1,
  pageSize: number = 20,
  currentRound?: number,
  lifetimeInRounds?: number,
  rollupAddresses?: string[]
): Promise<{ payloads: GovernancePayloadInfo[]; totalCount: number; totalPages: number }> {
  const { skip } = paginate(page, pageSize, 0);

  const blockRange = rollupAddresses?.length ? await getRollupBlockRange(rollupAddresses) : null;
  const rollupRawFilter = blockRange
    ? Prisma.sql`AND ${rollupBlockRangeClause('"ProposerVote"', blockRange)}`
    : Prisma.empty;
  const rollupRawFilterSp = blockRange
    ? Prisma.sql`AND ${rollupBlockRangeClause('"ProposerPayloadSubmitted"', blockRange)}`
    : Prisma.empty;
  const rollupRawFilterSubm = blockRange
    ? Prisma.sql`AND ${rollupBlockRangeClause('ps', blockRange)}`
    : Prisma.empty;

  // Determine if this round is expired
  const tooOld = currentRound && lifetimeInRounds
    ? currentRound > roundNumber + lifetimeInRounds
    : false;

  // Get payloads for this round
  const payloadsData = await prisma.$queryRaw<Array<{
    payload_address: string;
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
        COUNT(*) as signal_count,
        MIN(timestamp) as first_signal_timestamp
      FROM "ProposerVote"
      WHERE vote_type = ${ProposerVoteType.GOVERNANCE_PROPOSER}
      AND round_number = ${roundNumber}
      ${rollupRawFilter}
      GROUP BY payload_address
    ),
    submitted_payloads AS (
      SELECT DISTINCT ON (payload_address)
        payload_address,
        timestamp as submitted_at,
        transaction_hash as submitted_tx
      FROM "ProposerPayloadSubmitted"
      WHERE round_number = ${roundNumber}
      ${rollupRawFilterSp}
      ORDER BY payload_address, timestamp DESC
    ),
    submittable_payloads AS (
      SELECT DISTINCT ON (payload_address)
        payload_address,
        timestamp as submittable_at,
        transaction_hash as submittable_tx
      FROM "ProposerPayloadSubmittable" ps
      WHERE round_number = ${roundNumber}
      ${rollupRawFilterSubm}
      AND NOT EXISTS (
        SELECT 1 FROM "ProposerPayloadSubmitted" sub
        WHERE sub.payload_address = ps.payload_address AND sub.round_number = ${roundNumber}
      )
    )
    SELECT
      ps.payload_address,
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
    LEFT JOIN submitted_payloads sp ON sp.payload_address = ps.payload_address
    LEFT JOIN submittable_payloads subm ON subm.payload_address = ps.payload_address
    ORDER BY ps.signal_count DESC, ps.payload_address
    LIMIT ${pageSize} OFFSET ${skip}
  `;

  // Get total count
  const blockFilter = blockRange ? {
    block_number: {
      gte: BigInt(blockRange.startBlock),
      ...(blockRange.endBlock ? { lt: BigInt(blockRange.endBlock) } : {}),
    }
  } : {};
  const totalCountResult = await prisma.proposerVote.groupBy({
    by: ['payload_address'],
    where: {
      vote_type: ProposerVoteType.GOVERNANCE_PROPOSER,
      round_number: roundNumber,
      ...blockFilter,
    }
  });
  const totalCount = totalCountResult.length;

  // Map to payload objects - compute status based on flags and expiration
  const payloads: GovernancePayloadInfo[] = payloadsData.map(p => ({
    payloadAddress: p.payload_address,
    roundNumber: roundNumber,
    signalCount: Number(p.signal_count),
    proposerAddress: p.creator_address,
    status: determinePayloadStatus(p.is_submitted, p.is_submittable, tooOld),
    firstSignalTimestamp: p.first_signal_timestamp,
    submittedTimestamp: p.submitted_at,
    submittedTransactionHash: p.submitted_tx,
    submittableTimestamp: p.submittable_at,
    submittableTransactionHash: p.submittable_tx,
  }));

  return {
    payloads,
    totalCount,
    totalPages: paginate(page, pageSize, totalCount).totalPages,
  };
}

/**
 * Get signals for a specific payload with pagination
 */
export async function getPayloadSignals(
  payloadAddress: string,
  roundNumber: number,
  page: number = 1,
  pageSize: number = 50,
  rollupAddresses?: string[]
): Promise<{ signals: GovernanceSignal[]; totalCount: number; totalPages: number }> {
  const { skip } = paginate(page, pageSize, 0);
  const blockRange = rollupAddresses?.length ? await getRollupBlockRange(rollupAddresses) : null;
  const rollupRawFilterPv = blockRange
    ? Prisma.sql`AND ${rollupBlockRangeClause('pv', blockRange)}`
    : Prisma.empty;

  const signalsData = await prisma.$queryRaw<Array<{
    signaler_address: string;
    timestamp: string | null;
    transaction_hash: string;
    block_number: string;
    validator_name: string | null;
    validator_hex_index: string | null;
    x_handle: string | null;
    x_image_url: string | null;
    discord_username: string | null;
    discord_avatar: string | null;
    provider_name: string | null;
    provider_logo_url: string | null;
    provider_identifier: string | null;
  }>>`
    WITH
    AttesterRanked AS (
      SELECT
        "providerIdentifier",
        "attesterAddress",
        "blockNumber",
        "logIndex",
        ROW_NUMBER() OVER (
          PARTITION BY "providerIdentifier", "attesterAddress"
          ORDER BY "blockNumber", "logIndex"
        ) AS rn
      FROM "ProviderAttester"
    ),
    DripRanked AS (
      SELECT
        "providerIdentifier",
        "attesterAddress",
        "blockNumber",
        "logIndex",
        ROW_NUMBER() OVER (
          PARTITION BY "providerIdentifier", "attesterAddress"
          ORDER BY "blockNumber", "logIndex"
        ) AS rn
      FROM "ProviderQueueDrip"
    ),
    AllEvents AS (
      SELECT
        "providerIdentifier",
        "attesterAddress",
        "blockNumber",
        "logIndex",
        'ADD' as event_type
      FROM AttesterRanked
      UNION ALL
      SELECT
        "providerIdentifier",
        "attesterAddress",
        "blockNumber",
        "logIndex",
        'DRIP' as event_type
      FROM DripRanked
    ),
    LatestState AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY "providerIdentifier", "attesterAddress"
          ORDER BY "blockNumber" DESC, "logIndex" DESC
        ) as rn
      FROM AllEvents
    )
    SELECT
      pv.signaler_address,
      pv.timestamp,
      pv.transaction_hash,
      pv.block_number,
      v.name as validator_name,
      v.validator_hex_index,
      v.x_handle,
      v.x_image_url,
      v."discordUsername" as discord_username,
      v."discordAvatar" as discord_avatar,
      COALESCE(pm.name, 'Provider ' || ls."providerIdentifier") as provider_name,
      pm."logoUrl" as provider_logo_url,
      ls."providerIdentifier" as provider_identifier
    FROM "ProposerVote" pv
    LEFT JOIN "Validator" v ON LOWER(v.address) = LOWER(pv.signaler_address)
    LEFT JOIN LatestState ls ON LOWER(ls."attesterAddress") = LOWER(pv.signaler_address) AND ls.rn = 1 AND ls.event_type = 'ADD'
    LEFT JOIN "ProviderMetadata" pm ON pm."providerIdentifier" = ls."providerIdentifier"
    WHERE pv.vote_type = ${ProposerVoteType.GOVERNANCE_PROPOSER}
      AND pv.payload_address = ${payloadAddress}
      AND pv.round_number = ${roundNumber}
      ${rollupRawFilterPv}
    ORDER BY pv.block_number DESC, pv.log_index DESC
    LIMIT ${pageSize} OFFSET ${skip}
  `;

  const blockFilter = blockRange ? {
    block_number: {
      gte: BigInt(blockRange.startBlock),
      ...(blockRange.endBlock ? { lt: BigInt(blockRange.endBlock) } : {}),
    }
  } : {};
  const totalCount = await prisma.proposerVote.count({
    where: {
      vote_type: ProposerVoteType.GOVERNANCE_PROPOSER,
      payload_address: payloadAddress,
      round_number: roundNumber,
      ...blockFilter,
    }
  });

  const signals: GovernanceSignal[] = signalsData.map(s => ({
    signalerAddress: s.signaler_address,
    timestamp: s.timestamp,
    transactionHash: s.transaction_hash,
    blockNumber: Number(s.block_number),
    validatorName: s.validator_name,
    validatorIndex: s.validator_hex_index ? parseInt(s.validator_hex_index, 16) : null,
    xHandle: s.x_handle,
    xImageUrl: s.x_image_url,
    discordUsername: s.discord_username,
    discordAvatar: s.discord_avatar,
    providerName: s.provider_name,
    providerLogoUrl: s.provider_logo_url,
    providerIdentifier: s.provider_identifier,
  }))

  return {
    signals,
    totalCount,
    totalPages: paginate(page, pageSize, totalCount).totalPages,
  };
}
