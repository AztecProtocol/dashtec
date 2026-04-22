import { NextResponse, NextRequest } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { getProverEpochs } from '@/db/queries/prover';
import { parseRollupParam } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';

/**
 * GET /api/prover/:address/epochs
 * Get list of epochs with proofs
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
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // Get epochs
    const rollupAddresses = await parseRollupParam(searchParams);
    const results = await getProverEpochs(normalizedAddress, rollupAddresses, sortOrder);

    const epochs = results.map(row => row.epoch);

    const { total } = benchmark.getResults();
    return NextResponse.json({
      epochs,
      count: epochs.length,
      benchmark: total,
      status: 'ok'
    });

  } catch (error) {
    const { address } = await params;
    logError(error as Error, 'PROVER_EPOCHS_FETCH_ERROR', {
      source: 'prover/[address]/epochs/route.ts:GET',
      address,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      error: 'Failed to fetch prover epochs. Please try again later.'
    }, { status: 500 });
  }
}
