import { NextResponse, NextRequest } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { getProverTimeline } from '@/db/queries/prover';
import { parseRollupParam } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';

/**
 * GET /api/prover/:address/timeline
 * Get proof submission timeline for visualization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const benchmark = createBenchmark();
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json({ error: 'Prover address is required.' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const groupBy = searchParams.get('groupBy') as 'epoch' | 'day' | 'week' | null;
    const validGroupBy = ['epoch', 'day', 'week'].includes(groupBy || '')
      ? (groupBy as 'epoch' | 'day' | 'week')
      : 'epoch';

    // Get timeline
    const rollupAddresses = await parseRollupParam(searchParams);
    const results = await getProverTimeline(normalizedAddress, rollupAddresses, validGroupBy);

    const timeline = results.map(row => ({
      period: validGroupBy === 'epoch'
        ? row.period.toString()
        : (row.period as Date).toISOString(),
      proofCount: Number(row.proof_count),
      totalGas: row.total_gas.toString(),
      avgGasPrice: row.avg_gas_price?.toString() || '0'
    }));

    const { total } = benchmark.getResults();
    return NextResponse.json({
      timeline,
      groupBy: validGroupBy,
      benchmark: total,
      status: 'ok'
    });

  } catch (error) {
    const { address } = await params;
    logError(error as Error, 'PROVER_TIMELINE_FETCH_ERROR', {
      source: 'prover/[address]/timeline/route.ts:GET',
      address,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      error: 'Failed to fetch prover timeline. Please try again later.'
    }, { status: 500 });
  }
}
