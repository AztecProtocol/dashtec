import { NextResponse, NextRequest } from 'next/server';
import { getNetworkConfigFromCacheOrContract } from '@/services/networkConfig';
import { NETWORK_DEFAULTS } from '@/constants/networkDefaults';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();
  const { searchParams } = new URL(request.url);
  const rollupAddress = searchParams.get('rollup') ?? undefined;

  try {
    const networkConfig = await getNetworkConfigFromCacheOrContract(rollupAddress);

    const { total } = benchmark.getResults();

    return NextResponse.json({
      ...networkConfig,
      benchmark: total,
      status: 'ok'
    });

  } catch (error) {
    logError(error as Error, 'NETWORK_CONFIG_FETCH_ERROR', {
      source: 'network/config/route.ts:GET'
    });
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';

    return NextResponse.json({
      genesisTime: NETWORK_DEFAULTS.GENESIS_TIME,
      slotDuration: NETWORK_DEFAULTS.SLOT_DURATION,
      epochDurationSlots: NETWORK_DEFAULTS.EPOCH_DURATION_SLOTS,
      stakingTokenSymbol: NETWORK_DEFAULTS.STAKING_TOKEN_SYMBOL,
      stakingTokenDecimals: NETWORK_DEFAULTS.STAKING_TOKEN_DECIMALS,
      minimumStake: NETWORK_DEFAULTS.MINIMUM_STAKE, 
      depositAmount: NETWORK_DEFAULTS.DEPOSIT_AMOUNT, 
      error: `Failed to fetch dynamic network configuration: ${errorMessage}`
    }, { status: 500 });
  }
}
