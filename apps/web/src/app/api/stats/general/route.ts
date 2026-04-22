import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { parseRollupParam } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();
  const { searchParams } = new URL(request.url);
  const rollupAddresses = await parseRollupParam(searchParams);

  try {
    const result = await prisma.epoch.aggregate({
      _min: { epoch_number: true },
      _max: { epoch_number: true },
      where: {
        rollup_address: { in: rollupAddresses },
      },
    });

    const earliestEpoch = result._min.epoch_number;
    const latestEpoch = result._max.epoch_number;

    const { total } = benchmark.getResults();
    return NextResponse.json({
      earliestIndexedEpoch: Number(earliestEpoch),
      latestIndexedEpoch: latestEpoch !== null ? Number(latestEpoch) : null,
      benchmark: total,
      status: 'ok'
    });

  } catch (error) {
    // Log the actual error details
    logError(error as Error, 'STATS_GENERAL_FETCH_ERROR', {
      source: 'stats/general/route.ts:GET',
      timestamp: new Date().toISOString()
    });

    // Return user-friendly message
    return NextResponse.json({
      error: 'Failed to fetch general statistics. Please try again later.'
    }, { status: 500 });
  }
}