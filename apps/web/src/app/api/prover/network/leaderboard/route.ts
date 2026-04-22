import { NextResponse, NextRequest } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { getProverLeaderboard } from '@/db/queries/prover';
import { parseRollupParam } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';
/**
 * GET /api/prover/network/leaderboard
 * Get top provers ranked by total proof submissions
 */
export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100);

    const rollupAddresses = await parseRollupParam(searchParams);
    const results = await getProverLeaderboard(rollupAddresses, limit);

    const provers = results.map((row) => ({
      proverId: row.prover_id,
      totalProofs: Number(row.total_proofs),
      firstEpoch: row.first_epoch,
      lastEpoch: row.last_epoch,
      rank: Number(row.rank),
    }));

    const { total: benchmarkTime } = benchmark.getResults();
    return NextResponse.json({
      provers,
      benchmark: benchmarkTime,
      status: 'ok',
    });
  } catch (error) {
    logError(error as Error, 'PROVER_LEADERBOARD_FETCH_ERROR', {
      source: 'prover/network/leaderboard/route.ts:GET',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to fetch prover leaderboard. Please try again later.' },
      { status: 500 }
    );
  }
}
