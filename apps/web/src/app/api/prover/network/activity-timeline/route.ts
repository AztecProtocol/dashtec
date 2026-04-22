import { NextResponse, NextRequest } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { getNetworkProverTimeline } from '@/db/queries/prover';
import { parseRollupParam } from '@/lib/rollupParam';
import { NetworkActivityTimelineResponse } from '@/types/prover';

export const dynamic = 'force-dynamic';

/**
 * GET /api/prover/network/activity-timeline
 * Get network-wide proof activity timeline for visualization
 */
export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupBy = searchParams.get('groupBy') as 'epoch' | 'day' | 'week' | null;
    const validGroupBy = ['epoch', 'day', 'week'].includes(groupBy || '')
      ? (groupBy as 'epoch' | 'day' | 'week')
      : 'day';

    const rollupAddresses = await parseRollupParam(searchParams);
    const results = await getNetworkProverTimeline(rollupAddresses, validGroupBy);

    const timeline = results.map(row => ({
      period: validGroupBy === 'epoch'
        ? row.period.toString()
        : new Date(Number(row.period) * 1000).toISOString(),
      proofCount: Number(row.proof_count),
      uniqueProvers: Number(row.unique_provers),
      totalGas: row.total_gas.toString(),
    }));

    const { total } = benchmark.getResults();
    const response: NetworkActivityTimelineResponse = {
      timeline,
      groupBy: validGroupBy,
      benchmark: parseFloat(total),
      status: 'ok',
    };

    return NextResponse.json(response);
  } catch (error) {
    logError(error as Error, 'NETWORK_ACTIVITY_TIMELINE_FETCH_ERROR', {
      source: 'prover/network/activity-timeline/route.ts:GET',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to fetch network activity timeline. Please try again later.' },
      { status: 500 }
    );
  }
}
