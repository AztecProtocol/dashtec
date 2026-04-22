import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { EpochAttestationMetrics } from '@/types';
import { VALIDATOR_STATUS } from '@/utils/constants';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { createProvidersConcentrationQuery } from '@/db/queries/providers';
import { parseRollupParam } from '@/lib/rollupParam';
import { getContractsForRollup } from '@/lib/contracts';
import type { Address } from 'viem';
import { createLogger, serializeError } from '@dashtec/shared-utils';

const logger = createLogger('api:dashboard:current-epoch-stats');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();
  const { searchParams } = new URL(request.url);
  const rollupAddresses = await parseRollupParam(searchParams);

  try {
    // 1. Compute current on-chain epoch from the selected rollup's contract timing
    const rollupAddress = rollupAddresses[0] as Address;
    const rollupContracts = getContractsForRollup(rollupAddress);

    benchmark.start('fetchOnChainEpoch');
    let currentEpochNumberOnchain = BigInt(0);
    try {
      const [genesisTime, slotDuration, epochDuration] = await Promise.all([
        rollupContracts.rollup.getGenesisTime(),
        rollupContracts.rollup.getSlotDuration(),
        rollupContracts.rollup.getEpochDuration(),
      ]);

      if (genesisTime > 0n && slotDuration > 0n && epochDuration > 0n) {
        const now = BigInt(Math.floor(Date.now() / 1000));
        if (now > genesisTime) {
          const currentSlot = (now - genesisTime) / slotDuration;
          currentEpochNumberOnchain = currentSlot / epochDuration;
        }
      }
    } catch (err: unknown) {
      logger.error('Failed to compute on-chain epoch, falling back to DB', { error: serializeError(err) });
    }
    benchmark.end('fetchOnChainEpoch');

    // Fallback: use DB if on-chain calculation failed
    const latestEpochEntry = await prisma.epoch.findFirst({
      where: {
        rollup_address: { in: rollupAddresses },
      },
      orderBy: { epoch_number: 'desc' },
    });

    let currentEpochNumber = BigInt(0)
    if (latestEpochEntry) {
      currentEpochNumber = latestEpochEntry.epoch_number;
    }

    // 2. Fetch validator committee from the selected rollup contract
    benchmark.start('fetchCommittee');
    let validatorCommitteeSize = 0;
    let validatorCommitteeList: string[] = [];
    try {
      const committee = await rollupContracts.rollup.getEpochCommittee(currentEpochNumberOnchain ? currentEpochNumberOnchain : currentEpochNumber);
      validatorCommitteeSize = committee.length;
      validatorCommitteeList = committee;
    } catch {
      validatorCommitteeSize = 0;
      validatorCommitteeList = [];
    }
    benchmark.end('fetchCommittee');

    // 3. Get validator counts
    benchmark.start('fetchTotalValidators');
    const rollupWhere = { rollup_address: { in: rollupAddresses } };
    const [totalActiveValidators, totalExitingValidators, totalZombieValidators, totalQueuedValidators] = await Promise.all([
      prisma.validator.count({ where: { status: VALIDATOR_STATUS.ACTIVE, ...rollupWhere } }),
      prisma.validator.count({ where: { status: VALIDATOR_STATUS.EXITING, ...rollupWhere } }),
      prisma.validator.count({ where: { status: VALIDATOR_STATUS.ZOMBIE, ...rollupWhere } }),
      prisma.validatorQueue.count({ where: rollupWhere }),
    ]);
    benchmark.end('fetchTotalValidators');

    // 4. Get total providers count and top 3 concentration
    benchmark.start('fetchTotalProviders');
    const totalProviders = await prisma.provider.count();

    // Get top 3 providers concentration using optimized query
    const concentrationData = await prisma.$queryRaw<Array<{
      providerName: string;
      validator_count: bigint;
      rank: bigint;
      total_validators: bigint;
      percentage: number;
    }>>(createProvidersConcentrationQuery(3));

    const topProviders = concentrationData.map(provider => ({
      name: provider.providerName,
      validatorCount: Number(provider.validator_count)
    }));

    // Calculate concentration relative to total sequencers (active + exiting + queued)
    const totalSequencers = totalActiveValidators + totalExitingValidators + totalZombieValidators + totalQueuedValidators;
    const top3ValidatorCount = concentrationData.reduce((sum, provider) => sum + Number(provider.validator_count), 0);
    const top3Concentration = totalSequencers > 0 ? (top3ValidatorCount / totalSequencers) * 100 : 0;

    benchmark.end('fetchTotalProviders');

    // 4. Create metrics for the current epoch from the latest entry (or defaults if no data)
    const successCount = latestEpochEntry ? Number(latestEpochEntry.total_attestations_successful) || 0 : 0;
    const missCount = latestEpochEntry ? Number(latestEpochEntry.total_attestations_missed) || 0 : 0;
    const totalAttestations = successCount + missCount;
    const epochBlockProducedVolume = latestEpochEntry ? (Number(latestEpochEntry.total_checkpoints_mined || 0) + Number(latestEpochEntry.total_checkpoints_proposed || 0)) : 0;
    const epochBlockMissedVolume = latestEpochEntry ? (Number(latestEpochEntry.total_checkpoints_missed || 0) + Number(latestEpochEntry.total_blocks_missed || 0)) : 0;
    const totalBlockOpportunities = epochBlockProducedVolume + epochBlockMissedVolume;

    const currentEpochMetrics: EpochAttestationMetrics = {
      epochNumber: Number(currentEpochNumber),
      successCount: successCount,
      missCount: missCount,
      totalAttestations: totalAttestations,
      epochBlockMissedVolume: epochBlockMissedVolume,
      epochBlockProducedVolume: epochBlockProducedVolume,
      attestationRate: totalAttestations > 0 ? (successCount / totalAttestations) * 100 : 0,
      blockProductionRate: totalBlockOpportunities > 0 ? (epochBlockProducedVolume / totalBlockOpportunities) * 100 : 0,
      validatorCommitteeSize: validatorCommitteeSize,
      validatorCommitteeList: validatorCommitteeList
    };

    const { total, details } = benchmark.getResults();

    // 5. Return the combined payload
    return NextResponse.json({
      totalActiveValidators,
      totalExitingValidators,
      totalZombieValidators,
      totalQueuedValidators,
      totalProviders,
      top3Concentration,
      topProviders,
      currentEpochMetrics,
      benchmark: total,
      benchmarks: details,
      status: 'ok'
    });

  } catch (error) {
    // Log the actual error details
    logError(error as Error, 'CURRENT_EPOCH_STATS_FETCH_ERROR', {
      source: 'dashboard/current-epoch-stats/route.ts:GET',
      timestamp: new Date().toISOString()
    });

    // Return user-friendly message
    return NextResponse.json({
      error: 'Failed to fetch current epoch statistics. Please try again later.'
    }, { status: 500 });
  }
}