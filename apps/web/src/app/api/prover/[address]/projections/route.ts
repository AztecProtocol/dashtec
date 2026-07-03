import { NextResponse, NextRequest } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { getProverAverageGasCost } from '@/db/queries/prover';
import { parseRollupParam } from '@/lib/rollupParam';
import { formatUnits } from 'viem';

export const dynamic = 'force-dynamic';

/**
 * GET /api/prover/:address/projections
 * Calculate projections for reaching max shares
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
    const currentScore = searchParams.get('currentScore')
      ? parseInt(searchParams.get('currentScore')!)
      : 0;
    const targetScore = searchParams.get('targetScore')
      ? parseInt(searchParams.get('targetScore')!)
      : 15000000;

    if (currentScore === 0) {
      return NextResponse.json({
        error: 'currentScore query parameter is required'
      }, { status: 400 });
    }

    // Get average gas cost
    const rollupAddresses = await parseRollupParam(searchParams);
    const avgGasCostWei = await getProverAverageGasCost(normalizedAddress, rollupAddresses);

    const avgGasCostEth = avgGasCostWei
      ? formatUnits(BigInt(Math.floor(avgGasCostWei)), 18)
      : '0.015';

    // Calculate current shares and multiplier
    // Based on the activity score formula from spec
    const currentShares = Math.min(Math.floor(currentScore / 15), 1000000);
    const currentMultiplier = currentShares / 100000;

    const targetShares = Math.min(Math.floor(targetScore / 15), 1000000);
    const targetMultiplier = targetShares / 100000;

    // Calculate path to target
    const scoreNeeded = targetScore - currentScore;
    const epochsNeeded = Math.ceil(scoreNeeded / 125000); // Assuming 125k score per epoch
    const daysNeeded = epochsNeeded * 0.0134; // Assuming ~19.3 minutes per epoch
    const estimatedGasCostEth = (epochsNeeded * parseFloat(avgGasCostEth)).toFixed(4);

    const { total } = benchmark.getResults();
    return NextResponse.json({
      current: {
        score: currentScore,
        shares: currentShares,
        multiplier: currentMultiplier
      },
      target: {
        score: targetScore,
        shares: targetShares,
        multiplier: targetMultiplier
      },
      path: {
        scoreNeeded,
        epochsNeeded,
        daysNeeded: parseFloat(daysNeeded.toFixed(2)),
        estimatedGasCostEth
      },
      benchmark: total,
      status: 'ok'
    });

  } catch (error) {
    const { address } = await params;
    logError(error as Error, 'PROVER_PROJECTIONS_FETCH_ERROR', {
      source: 'prover/[address]/projections/route.ts:GET',
      address,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      error: 'Failed to calculate prover projections. Please try again later.'
    }, { status: 500 });
  }
}
