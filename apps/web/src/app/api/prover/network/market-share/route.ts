import { NextResponse, NextRequest } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { getProverMarketShare } from '@/db/queries/prover';
import { ProverMarketShareResponse, ProverMarketShareItem } from '@/types/prover';
import { parseRollupParam } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';

/**
 * GET /api/prover/network/market-share
 * Get proof distribution across all provers for market share visualization
 */
export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();
  try {
    const { searchParams } = new URL(request.url);
    const rollupAddresses = await parseRollupParam(searchParams);
    const rawData = await getProverMarketShare(rollupAddresses);

    const totalProofs = rawData.reduce(
      (sum, row) => sum + Number(row.total_proofs),
      0
    );

    const provers: ProverMarketShareItem[] = rawData.map((row) => ({
      proverId: row.prover_id,
      totalProofs: Number(row.total_proofs),
      percentage: totalProofs > 0
        ? Number(((Number(row.total_proofs) / totalProofs) * 100).toFixed(2))
        : 0,
      firstEpoch: row.first_epoch,
      lastEpoch: row.last_epoch,
      uniqueEpochs: Number(row.unique_epochs),
    }));

    const { total: benchmarkTime } = benchmark.getResults();

    const response: ProverMarketShareResponse = {
      provers,
      totalProofs,
      benchmark: benchmarkTime as unknown as number,
      status: 'ok',
    };

    return NextResponse.json(response);
  } catch (error) {
    logError(error as Error, 'PROVER_MARKET_SHARE_FETCH_ERROR', {
      source: 'prover/network/market-share/route.ts:GET',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to fetch prover market share data. Please try again later.' },
      { status: 500 }
    );
  }
}
