import { NextRequest, NextResponse } from 'next/server';
import { getNetworkConfigFromCacheOrContract } from '@/services/networkConfig';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { parseRollupParam } from '@/lib/rollupParam';
import { getActiveRollupAddress } from '@/services/rollupRegistry';
import {
  getActiveValidatorsForRollup,
  loadCommitteeWithProviders,
} from '@/services/epoch/epochCommittee';
import { transformSentinelStatsToSlotActivity } from '@/services/epoch/slotActivityTransformer';
import {
  fetchValidatorStats,
  filterStatsToCommittee,
  SentinelApiError,
} from '@/services/sentinel/sentinelClient';
import { createLogger } from '@dashtec/shared-utils';
import type { Address } from 'viem';

const logger = createLogger('api:epochs:live-slot-activity');

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ epochNumber: string }> },
) {
  const benchmark = createBenchmark();
  const { epochNumber: epochNumberStr } = await params;
  const targetEpoch = parseInt(epochNumberStr, 10);
  if (!Number.isInteger(targetEpoch) || targetEpoch < 0) {
    return NextResponse.json(
      { error: 'Epoch number must be a non-negative integer.' },
      { status: 400 },
    );
  }

  const emptyResponse = () =>
    NextResponse.json({
      activities: [],
      benchmark: benchmark.getResults().total,
      status: 'ok' as const,
    });

  try {
    const { searchParams } = new URL(request.url);
    const rollupAddresses = await parseRollupParam(searchParams);
    const rollupAddress = (rollupAddresses[0] || (await getActiveRollupAddress())) as Address;

    benchmark.start('committee');
    const committee = await getActiveValidatorsForRollup(targetEpoch, rollupAddress);
    benchmark.end('committee');

    if (committee.length === 0) {
      logger.warn('No active validators returned from smart contract', { epoch: targetEpoch });
      return emptyResponse();
    }

    benchmark.start('load');
    const [detailsMap, sentinelResult, networkConfig] = await Promise.all([
      loadCommitteeWithProviders(committee),
      fetchValidatorStats(),
      getNetworkConfigFromCacheOrContract(),
    ]);
    benchmark.end('load');

    const filtered = filterStatsToCommittee(sentinelResult.stats, new Set(committee));
    if (Object.keys(filtered).length === 0) {
      logger.warn('Sentinel stats did not contain any committee validators', {
        epoch: targetEpoch,
        committeeSize: committee.length,
      });
      return emptyResponse();
    }

    benchmark.start('transform');
    const activities = transformSentinelStatsToSlotActivity(
      filtered,
      targetEpoch,
      networkConfig.epochDurationSlots,
      detailsMap,
    );
    benchmark.end('transform');

    return NextResponse.json({
      activities,
      benchmark: benchmark.getResults().total,
      status: 'ok' as const,
    });
  } catch (error) {
    if (error instanceof SentinelApiError) {
      logError(error, 'SENTINEL_API_ERROR', {
        status: error.status,
        epochNumber: targetEpoch,
      });
      return NextResponse.json(
        { error: 'External service unavailable. Please try again later.' },
        { status: 503 },
      );
    }
    logError(error as Error, 'LIVE_SLOT_ACTIVITY_ERROR', {
      epochNumber: targetEpoch,
      source: 'epochs/live-slot-activity',
    });
    return NextResponse.json(
      { error: 'Failed to fetch live slot activity. Please try again later.' },
      { status: 500 },
    );
  }
}
