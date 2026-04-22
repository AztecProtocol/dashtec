import { NextResponse, NextRequest } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { getNetworkProvingHealth, getProverMarketShare } from '@/db/queries/prover';
import { NetworkProvingHealthResponse } from '@/types/prover';
import { parseRollupParam } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';

/**
 * GET /api/prover/network/health
 * Get network-wide proving health KPIs including decentralization index
 */
export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();
  try {
    const { searchParams } = new URL(request.url);
    const rollupAddresses = await parseRollupParam(searchParams);
    const [healthData, marketShareData] = await Promise.all([
      getNetworkProvingHealth(rollupAddresses),
      getProverMarketShare(rollupAddresses),
    ]);

    const totalProofs = Number(healthData?.total_proofs ?? 0);

    if (!healthData || totalProofs === 0) {
      return NextResponse.json({ error: 'No proving data available.' }, { status: 404 });
    }

    const uniqueProvers = Number(healthData.unique_provers);
    const epochsWithProofs = Number(healthData.epochs_with_proofs);
    const avgProofsPerEpoch = epochsWithProofs > 0 ? totalProofs / epochsWithProofs : 0;

    // Calculate HHI (Herfindahl-Hirschman Index) for decentralization
    const hhi = marketShareData.reduce((sum, prover) => {
      const proofShare = Number(prover.total_proofs) / totalProofs;
      return sum + proofShare ** 2;
    }, 0);
    const decentralizationIndex = 1 - hhi;

    const { total: benchmarkTime } = benchmark.getResults();
    const response: NetworkProvingHealthResponse = {
      totalProofs,
      uniqueProvers,
      epochsWithProofs,
      firstEpoch: Number(healthData.first_epoch ?? 0),
      lastEpoch: Number(healthData.last_epoch ?? 0),
      avgProofsPerEpoch,
      decentralizationIndex,
      benchmark: benchmarkTime as unknown as number,
      status: 'ok',
    };

    return NextResponse.json(response);
  } catch (error) {
    logError(error as Error, 'NETWORK_PROVING_HEALTH_ERROR', {
      source: 'prover/network/health/route.ts:GET',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to fetch network proving health. Please try again later.' },
      { status: 500 }
    );
  }
}
