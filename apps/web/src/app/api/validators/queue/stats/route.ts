import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { parseRollupParam } from '@/lib/rollupParam';
import { getNextFlushableEpoch, getEntryQueueFlushSize } from '@/services/rpc/rollupContract';

export const dynamic = 'force-dynamic';

async function getContractData() {
  try {
    const [nextFlushableEpoch, flushableValidatorsCount] = await Promise.all([
      getNextFlushableEpoch(),
      getEntryQueueFlushSize()
    ]);

    return {
      nextFlushableEpoch: Number(nextFlushableEpoch),
      flushableValidatorsCount: Number(flushableValidatorsCount),
      error: null
    };
  } catch (error) {
    logError(error as Error, 'Error fetching contract data', {
      source: 'validators/queue/stats/route.ts:getContractData'
    });
    return {
      nextFlushableEpoch: null,
      flushableValidatorsCount: null,
      error: 'Contract data unavailable'
    };
  }
}

export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();

  try {
    const { searchParams } = new URL(request.url);
    const rollupAddresses = await parseRollupParam(searchParams);

    const [totalCount, contractData] = await Promise.all([
      prisma.validatorQueue.count({
        where: { rollup_address: { in: rollupAddresses } },
      }),
      getContractData()
    ]);

    const { total } = benchmark.getResults();

    return NextResponse.json({
      totalQueued: totalCount,
      nextFlushableEpoch: contractData.nextFlushableEpoch,
      flushableValidatorsCount: contractData.flushableValidatorsCount,
      contractError: contractData.error,
      benchmark: total,
      status: 'ok'
    });

  } catch (error) {
    logError(error as Error, 'VALIDATORS_QUEUE_STATS_ERROR', {
      source: 'validators/queue/stats/route.ts:GET',
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      error: 'Failed to fetch sequencer queue statistics. Please try again later.'
    }, { status: 500 });
  }
}