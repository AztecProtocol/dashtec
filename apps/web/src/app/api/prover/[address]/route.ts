import { NextResponse, NextRequest } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { getProverData } from '@/services/prover/proverService';
import { parseRollupParam } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';

/**
 * GET /api/prover/:address
 * Get comprehensive prover data including summary, history, and financial metrics
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

    const { searchParams } = new URL(request.url);
    const rollupAddresses = await parseRollupParam(searchParams);
    const data = await getProverData(address, rollupAddresses);

    const { total: benchmarkTime } = benchmark.getResults();
    return NextResponse.json({
      ...data,
      benchmark: benchmarkTime,
      status: 'ok'
    });

  } catch (error) {
    const { address } = await params;

    if (error instanceof Error && error.message === 'No proofs found for this prover address') {
      return NextResponse.json({
        error: error.message
      }, { status: 404 });
    }

    logError(error as Error, 'PROVER_DATA_FETCH_ERROR', {
      source: 'prover/[address]/route.ts:GET',
      address,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      error: 'Failed to fetch prover data. Please try again later.'
    }, { status: 500 });
  }
}
