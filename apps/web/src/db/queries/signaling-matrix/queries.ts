import prisma from '@/lib/prisma';
import { Prisma } from '@dashtec/database';
import { CHECKPOINT_MINED, CHECKPOINT_MISSED, CHECKPOINT_PROPOSED, BLOCKS_MISSED, ProposerVoteType } from '@dashtec/shared-types';
import type {
  ValidatorWithProvider,
  GovernanceSignal,
  GovernancePayloadInfo,
} from '@/types/queries/signaling-matrix';
import { INDEPENDENT_PROVIDER_IDENTIFIER, VALIDATOR_STATUS } from '@/utils/constants';
import { ProviderSequencerSortBy } from '@/types/signaling-matrix';
import { getRollupBlockRange, rollupBlockRangeClause } from '@/lib/rollupParam';
import { buildSignalLookup } from './signal-lookup';

/**
 * Get all active validators with their provider associations
 */
export async function getValidatorsWithProviders(filters?: {
  providerIdentifier?: string;
  search?: string;
}): Promise<ValidatorWithProvider[]> {
  const whereConditions: Prisma.Sql[] = [
    Prisma.sql`v.status IN (${VALIDATOR_STATUS.ACTIVE})`
  ];

  // Add provider filter
  if (filters?.providerIdentifier) {
    if (filters.providerIdentifier === INDEPENDENT_PROVIDER_IDENTIFIER) {
      whereConditions.push(Prisma.sql`ls."providerIdentifier" IS NULL`);
    } else {
      whereConditions.push(Prisma.sql`ls."providerIdentifier" = ${filters.providerIdentifier}`);
    }
  }

  if (filters?.search) {
    const searchPattern = `%${filters.search}%`;
    whereConditions.push(Prisma.sql`(
      v.name ILIKE ${searchPattern} OR
      v.address ILIKE ${searchPattern} OR
      v.x_handle ILIKE ${searchPattern} OR
      v."discordUsername" ILIKE ${searchPattern}
    )`);
  }

  const whereClause = Prisma.join(whereConditions, ' AND ');

  const result = await prisma.$queryRaw<ValidatorWithProvider[]>`
    WITH
    AttesterRanked AS (
    SELECT
      "providerIdentifier",
      "attesterAddress",
      "blockNumber",
      "logIndex",
      "timestamp",
      "txHash",
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
      "timestamp",
      "txHash",
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
        "timestamp",
        "txHash",
      'ADD' as event_type
      FROM AttesterRanked
      UNION ALL
      SELECT
        "providerIdentifier",
        "attesterAddress",
        "blockNumber",
        "logIndex",
        "timestamp",
        "txHash",
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
      v.address,
      v.name,
      v.status,
      v.x_handle as "xHandle",
      v.x_user_id as "xUserId",
      v.x_image_url as "xImageUrl",
      v."discordId",
      v."discordUsername",
      v."discordAvatar",
      ls."providerIdentifier",
      pm.name as "providerName",
      pm."logoUrl" as "providerLogoUrl"
    FROM "Validator"  v
    LEFT JOIN LatestState ls ON (v.address, 1) = (ls."attesterAddress", ls.rn)
    LEFT JOIN "Provider" p ON ls."providerIdentifier" = p."providerIdentifier"
    LEFT JOIN "ProviderMetadata" pm ON p."providerIdentifier" = pm."providerIdentifier"
    WHERE ${whereClause}
    GROUP BY v.address, v.name, v.status, v.x_handle, v.x_user_id, v.x_image_url, v."discordId", v."discordUsername", v."discordAvatar", ls."providerIdentifier", pm.name, pm."logoUrl"
    ORDER BY ls."providerIdentifier" ASC, v.address ASC
  `;

  return result;
}

/**
 * Get all governance signals for a specific round
 */
export async function getGovernanceSignalsForRound(roundNumber: number, rollupAddresses?: string[]): Promise<GovernanceSignal[]> {
  const blockRange = rollupAddresses?.length ? await getRollupBlockRange(rollupAddresses) : null;
  const blockFilter = blockRange ? {
    block_number: { gte: BigInt(blockRange.startBlock), ...(blockRange.endBlock ? { lt: BigInt(blockRange.endBlock) } : {}) }
  } : {};

  const signals = await prisma.proposerVote.findMany({
    where: {
      vote_type: ProposerVoteType.GOVERNANCE_PROPOSER,
      round_number: roundNumber,
      ...blockFilter,
    },
    select: {
      signaler_address: true,
      payload_address: true,
      round_number: true,
      vote_date: true,
      transaction_hash: true,
    },
  });

  return signals.map(signal => ({
    signalerAddress: signal.signaler_address,
    payloadAddress: signal.payload_address,
    roundNumber: signal.round_number,
    voteDate: signal.vote_date,
    transactionHash: signal.transaction_hash,
  }));
}

/**
 * Get payload information for a specific round
 */
export async function getPayloadsForRound(roundNumber: number, rollupAddresses?: string[]): Promise<GovernancePayloadInfo[]> {
  const blockRange = rollupAddresses?.length ? await getRollupBlockRange(rollupAddresses) : null;
  const blockFilter = blockRange ? {
    block_number: { gte: BigInt(blockRange.startBlock), ...(blockRange.endBlock ? { lt: BigInt(blockRange.endBlock) } : {}) }
  } : {};

  const payloadAddresses = await prisma.proposerVote.findMany({
    where: {
      vote_type: ProposerVoteType.GOVERNANCE_PROPOSER,
      round_number: roundNumber,
      ...blockFilter,
    },
    select: {
      payload_address: true,
    },
    distinct: ['payload_address'],
  });

  if (payloadAddresses.length === 0) {
    return [];
  }

  const addresses = payloadAddresses.map(p => p.payload_address);

  const [submissions, submittables] = await Promise.all([
    prisma.proposerPayloadSubmitted.findMany({
      where: {
        payload_address: {
          in: addresses,
        },
        round_number: roundNumber,
      },
      select: {
        payload_address: true,
        timestamp: true,
        transaction_hash: true,
      },
    }),
    prisma.proposerPayloadSubmittable.findMany({
      where: {
        payload_address: {
          in: addresses,
        },
        round_number: roundNumber
      },
      select: {
        payload_address: true,
        timestamp: true,
        transaction_hash: true,
      },
    }),
  ]);

  const submissionMap = new Map(
    submissions.map(p => [p.payload_address, p])
  );
  const submittableMap = new Map(
    submittables.map(p => [p.payload_address, p])
  );

  return addresses.map(address => {
    const submission = submissionMap.get(address);
    const submittable = submittableMap.get(address);

    return {
      payloadAddress: address,
      roundNumber,
      isSubmitted: !!submission,
      isSubmittable: !!submittable && !submission,
      submittedTimestamp: submission?.timestamp || null,
      submittableTimestamp: submittable?.timestamp || null,
      submittedTransactionHash: submission?.transaction_hash || null,
      submittableTransactionHash: submittable?.transaction_hash || null,
    };
  });
}

/**
 * Get signal counts for each payload in a round
 */
export async function getPayloadSignalCounts(roundNumber: number, rollupAddresses?: string[]): Promise<Map<string, number>> {
  const blockRange = rollupAddresses?.length ? await getRollupBlockRange(rollupAddresses) : null;
  const blockRangeRaw = blockRange
    ? Prisma.sql`AND ${rollupBlockRangeClause('"ProposerVote"', blockRange)}`
    : Prisma.empty;

  const result = await prisma.$queryRaw<{ payload_address: string; signal_count: bigint }[]>`
    SELECT
      payload_address,
      COUNT(*) as signal_count
    FROM "ProposerVote"
    WHERE vote_type = ${ProposerVoteType.GOVERNANCE_PROPOSER}
      AND round_number = ${roundNumber}
      ${blockRangeRaw}
    GROUP BY payload_address
  `;

  const countMap = new Map<string, number>();
  result.forEach(row => {
    countMap.set(row.payload_address, Number(row.signal_count));
  });

  return countMap;
}

/**
 * Get proposer slot counts for each validator in a round
 * Joins L2BlockProposed with ValidatorAttestation by slot_number
 * to identify which validators were proposers and how many times
 */
export async function getProposerSlotsForRound(
  roundStartSlot: number,
  roundEndSlot: number,
  rollupAddresses?: string[]
): Promise<Map<string, number>> {
  const rollupFilter = rollupAddresses?.length
    ? Prisma.sql`AND va.rollup_address IN (${Prisma.join(rollupAddresses)})`
    : Prisma.empty;

  const result = await prisma.$queryRaw<{
    validator_address: string;
    slot_count: bigint
  }[]>`
    SELECT
      va.validator_address,
      COUNT(*) as slot_count
    FROM "ValidatorAttestation" va
    WHERE va.slot_number >= ${roundStartSlot}
      AND va.slot_number <= ${roundEndSlot}
      AND va.status IN (${CHECKPOINT_MINED}, ${CHECKPOINT_PROPOSED}, ${CHECKPOINT_MISSED}, ${BLOCKS_MISSED})
      ${rollupFilter}
    GROUP BY va.validator_address
  `;

  const slotCountMap = new Map<string, number>();
  result.forEach(row => {
    slotCountMap.set(row.validator_address, Number(row.slot_count));
  });

  return slotCountMap;
}

export interface SequencerWithSignals {
  address: string;
  name: string | null;
  xHandle: string | null;
  xImageUrl: string | null;
  discordAvatar: string | null;
  discordUsername: string | null;
  payloadSignals: Map<string, number>;
  totalSignals: number;
  checkpointsProposed: number;
  checkpointsMined: number;
  checkpointsMissed: number;
  blocksMissed: number;
  totalProposerSlots: number;
}

/**
 * Get sequencers for a specific provider with their signal counts and proposer status
 */
export async function getProviderSequencersWithSignals(
  providerIdentifier: string,
  roundNumber: number,
  roundStartSlot: number,
  roundEndSlot: number,
  payloadAddresses: string[],
  options: {
    page: number;
    limit: number;
    sortBy: ProviderSequencerSortBy;
    search?: string;
  },
  rollupAddresses: string[]
): Promise<{ sequencers: SequencerWithSignals[]; totalCount: number }> {
  const providerValidators = await getValidatorsWithProviders({
    providerIdentifier,
    search: options.search,
  });

  const validatorAddresses = providerValidators.map(v => v.address);

  // Fetch signals (filtered by rollup canonical block range)
  const blockRange = rollupAddresses?.length ? await getRollupBlockRange(rollupAddresses) : null;
  const blockFilter = blockRange ? {
    block_number: { gte: BigInt(blockRange.startBlock), ...(blockRange.endBlock ? { lt: BigInt(blockRange.endBlock) } : {}) }
  } : {};

  const signals = await prisma.proposerVote.findMany({
    where: {
      vote_type: ProposerVoteType.GOVERNANCE_PROPOSER,
      round_number: roundNumber,
      signaler_address: {
        in: validatorAddresses,
      },
      ...blockFilter,
    },
    select: {
      signaler_address: true,
      payload_address: true,
    },
  });

  // Fetch proposer status (checkpoints and blocks missed)
  const proposerStatus = await prisma.$queryRaw<{
    validator_address: string;
    checkpoints_proposed: bigint;
    checkpoints_mined: bigint;
    checkpoints_missed: bigint;
    blocks_missed: bigint;
    total_slots: bigint;
  }[]>`
    SELECT
      va.validator_address,
      SUM(CASE WHEN va.status = ${CHECKPOINT_PROPOSED} THEN 1 ELSE 0 END) as checkpoints_proposed,
      SUM(CASE WHEN va.status = ${CHECKPOINT_MINED} THEN 1 ELSE 0 END) as checkpoints_mined,
      SUM(CASE WHEN va.status = ${CHECKPOINT_MISSED} THEN 1 ELSE 0 END) as checkpoints_missed,
      SUM(CASE WHEN va.status = ${BLOCKS_MISSED} THEN 1 ELSE 0 END) as blocks_missed,
      COUNT(*) as total_slots
    FROM "ValidatorAttestation" va
    WHERE va.slot_number >= ${roundStartSlot}
      AND va.slot_number <= ${roundEndSlot}
      AND va.validator_address IN (${Prisma.join(validatorAddresses)})
      AND va.status IN (${CHECKPOINT_MINED}, ${CHECKPOINT_PROPOSED}, ${CHECKPOINT_MISSED}, ${BLOCKS_MISSED})
      AND va.rollup_address IN (${Prisma.join(rollupAddresses)})
    GROUP BY va.validator_address
  `;

  // Build signal map
  const signalMap = buildSignalLookup(signals);

  // Build proposer status map
  const proposerStatusMap = new Map<string, { checkpointsProposed: number; checkpointsMined: number; checkpointsMissed: number; blocksMissed: number; totalSlots: number }>();
  proposerStatus.forEach(row => {
    proposerStatusMap.set(row.validator_address, {
      checkpointsProposed: Number(row.checkpoints_proposed),
      checkpointsMined: Number(row.checkpoints_mined),
      checkpointsMissed: Number(row.checkpoints_missed),
      blocksMissed: Number(row.blocks_missed),
      totalSlots: Number(row.total_slots),
    });
  });

  const sequencersWithSignals: SequencerWithSignals[] = providerValidators.map(validator => {
    const payloadSignals = new Map<string, number>();
    let totalSignals = 0;

    payloadAddresses.forEach(payloadAddress => {
      const count = signalMap.get(validator.address)?.get(payloadAddress) || 0;
      payloadSignals.set(payloadAddress, count);
      totalSignals += count;
    });

    const proposerData = proposerStatusMap.get(validator.address);

    return {
      address: validator.address,
      name: validator.name,
      xHandle: validator.xHandle,
      xImageUrl: validator.xImageUrl,
      discordAvatar: validator.discordAvatar,
      discordUsername: validator.discordUsername,
      payloadSignals,
      totalSignals,
      checkpointsProposed: proposerData?.checkpointsProposed || 0,
      checkpointsMined: proposerData?.checkpointsMined || 0,
      checkpointsMissed: proposerData?.checkpointsMissed || 0,
      blocksMissed: proposerData?.blocksMissed || 0,
      totalProposerSlots: proposerData?.totalSlots || 0,
    };
  });

  sequencersWithSignals.sort((a, b) => {
    switch (options.sortBy) {
      case 'name':
        return (a.name || a.address).localeCompare(b.name || b.address);
      case 'signals':
        return b.totalSignals - a.totalSignals;
      case 'opportunities':
        return b.totalProposerSlots - a.totalProposerSlots;
      default:
        return 0;
    }
  });

  const totalCount = sequencersWithSignals.length;
  const startIndex = (options.page - 1) * options.limit;
  const endIndex = startIndex + options.limit;
  const paginatedSequencers = sequencersWithSignals.slice(startIndex, endIndex);

  return {
    sequencers: paginatedSequencers,
    totalCount,
  };
}
