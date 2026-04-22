import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { EpochAttestationMetrics } from '@/types';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { parseRollupParam } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();
  const { searchParams } = new URL(request.url);
  const startEpochParam = searchParams.get('startEpoch');
  const endEpochParam = searchParams.get('endEpoch');

  if (!startEpochParam || !endEpochParam) {
    return NextResponse.json({ error: 'startEpoch and endEpoch parameters are required.' }, { status: 400 });
  }

  const startEpoch = parseInt(startEpochParam, 10);
  const endEpoch = parseInt(endEpochParam, 10);

  if (isNaN(startEpoch) || isNaN(endEpoch)) {
    return NextResponse.json({ error: 'Invalid epoch parameters.' }, { status: 400 });
  }

  const rollupAddresses = await parseRollupParam(searchParams);

  try {
    const historicalEpochsData = await prisma.epoch.findMany({
      where: {
        epoch_number: { gte: startEpoch, lte: endEpoch },
        rollup_address: { in: rollupAddresses },
      },
      orderBy: { epoch_number: 'asc' },
    });

    const aggregateTotals = historicalEpochsData.reduce(
      (acc, epoch) => {
        acc.totalSuccess += Number(epoch.total_attestations_successful) || 0;
        acc.totalMissed += Number(epoch.total_attestations_missed) || 0;
        acc.totalBlocksProduced += (Number(epoch.total_checkpoints_mined) || 0) + (Number(epoch.total_checkpoints_proposed) || 0);
        acc.totalBlocksMissed += (Number(epoch.total_checkpoints_missed) || 0) + (Number(epoch.total_blocks_missed) || 0);
        return acc;
      },
      {
        totalSuccess: 0,
        totalMissed: 0,
        totalBlocksProduced: 0,
        totalBlocksMissed: 0,
      }
    );

    const totalAggregateAttestations = aggregateTotals.totalSuccess + aggregateTotals.totalMissed;
    const totalAggregateBlockOpportunities = aggregateTotals.totalBlocksProduced + aggregateTotals.totalBlocksMissed;

    const aggregateMetrics: Omit<EpochAttestationMetrics, 'epochNumber'> = {
      successCount: aggregateTotals.totalSuccess,
      missCount: aggregateTotals.totalMissed,
      totalAttestations: totalAggregateAttestations,
      epochBlockProducedVolume: aggregateTotals.totalBlocksProduced,
      epochBlockMissedVolume: aggregateTotals.totalBlocksMissed,
      attestationRate: totalAggregateAttestations > 0 ? (aggregateTotals.totalSuccess / totalAggregateAttestations) * 100 : 0,
      blockProductionRate: totalAggregateBlockOpportunities > 0 ? (aggregateTotals.totalBlocksProduced / totalAggregateBlockOpportunities) * 100 : 0,
    };

    const historicalGraphData: EpochAttestationMetrics[] = historicalEpochsData.map((epoch) => {
      const successCount = Number(epoch.total_attestations_successful) || 0;
      const missCount = Number(epoch.total_attestations_missed) || 0;
      const totalAttestations = successCount + missCount;
      const epochBlockProducedVolume = (Number(epoch.total_checkpoints_mined) || 0) + (Number(epoch.total_checkpoints_proposed) || 0);
      const epochBlockMissedVolume = (Number(epoch.total_checkpoints_missed) || 0) + (Number(epoch.total_blocks_missed) || 0);
      const totalBlockOpportunities = epochBlockProducedVolume + epochBlockMissedVolume;

      return {
        epochNumber: Number(epoch.epoch_number),
        successCount,
        missCount,
        totalAttestations,
        epochBlockProducedVolume,
        epochBlockMissedVolume,
        attestationRate: totalAttestations > 0 ? (successCount / totalAttestations) * 100 : 0,
        blockProductionRate: totalBlockOpportunities > 0 ? (epochBlockProducedVolume / totalBlockOpportunities) * 100 : 0,
      };
    });

    const { total } = benchmark.getResults();

    return NextResponse.json({
      historicalGraphData,
      aggregateMetrics,
      benchmark: total,
      status: 'ok'
    });

  } catch (error) {
    // Log the actual error details
    logError(error as Error, 'HISTORICAL_RATES_FETCH_ERROR', {
      source: 'dashboard/historical-rates/route.ts:GET',
      startEpoch,
      endEpoch,
      timestamp: new Date().toISOString()
    });

    // Return user-friendly message
    return NextResponse.json({
      error: 'Failed to fetch historical rates. Please try again later.'
    }, { status: 500 });
  }
}