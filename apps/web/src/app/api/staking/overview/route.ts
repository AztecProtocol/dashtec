import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getNetworkConfigFromCacheOrContract } from '@/services/networkConfig';
import { formatBalance } from '@/utils/formatters';
import { VALIDATOR_STATUS } from '@/utils/constants';
import { logError } from '@/services/error/errorLogger';
import { StakingData } from '@/types/api';
import { createBenchmark } from '@/services/benchmark';
import { parseRollupParam } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();

  const { searchParams } = new URL(request.url);
  const rollupAddresses = await parseRollupParam(searchParams);
  const rollupWhere = { rollup_address: { in: rollupAddresses } };

  try {
    // Get network configuration for token details
    const config = await getNetworkConfigFromCacheOrContract()

    // Get total staked amount from all active validators
    const stakingStats = await prisma.validator.aggregate({
      _sum: {
        stake_balance: true,
      },
      _count: {
        _all: true,
      },
      where: {
        status: {
          in: [VALIDATOR_STATUS.ACTIVE]
        },
        ...rollupWhere,
      }
    });

    // Calculate total staked amount
    const totalStakedRaw = stakingStats._sum.stake_balance || BigInt(0);
    const decimals = config?.stakingTokenDecimals || 18;
    const symbol = config?.stakingTokenSymbol || 'STK';

    // Convert to readable format
    const totalStakedFormatted = formatBalance(Number(totalStakedRaw), decimals, symbol, true);

    // Get unclaimed rewards from withdrawable_balance
    const unclaimedRewardsStats = await prisma.validator.aggregate({
      _sum: {
        withdrawable_balance: true,
      },
      where: {
        status: {
          in: [VALIDATOR_STATUS.ACTIVE]
        },
        withdrawable_balance: {
          not: null
        },
        ...rollupWhere,
      }
    });

    const unclaimedRewardsRaw = unclaimedRewardsStats._sum.withdrawable_balance || BigInt(0);
    
    const rewardCalculations = {
      unclaimedRewards: unclaimedRewardsRaw,
      unclaimedRewardsFormatted: formatBalance(Number(unclaimedRewardsRaw), decimals, symbol, true),
    };

    // Get actual minimum deposit and stake from network configuration
    // Convert from wei to token units
    const minimumDepositRaw = BigInt(config?.depositAmount || (100 * Math.pow(10, decimals)));
    const minimumStakeRaw = BigInt(config?.minimumStake || (32 * Math.pow(10, decimals)));
    
    const minimumDepositFormatted = formatBalance(Number(minimumDepositRaw), decimals, symbol, true);
    const minimumStakeFormatted = formatBalance(Number(minimumStakeRaw), decimals, symbol, true);

    const { total } = benchmark.getResults();

    const response: StakingData = {
      totalStaked: Number(totalStakedRaw),
      totalStakedFormatted,
      unclaimedRewards: Number(rewardCalculations.unclaimedRewards),
      unclaimedRewardsFormatted: rewardCalculations.unclaimedRewardsFormatted,
      minimumDeposit: Number(minimumDepositRaw),
      minimumDepositFormatted,
      minimumStake: Number(minimumStakeRaw),
      minimumStakeFormatted,
      lastUpdated: new Date().toISOString(),
      benchmark: total,
      status: 'ok'
    };

    return NextResponse.json(response);
  } catch (error) {
    logError(error as Error, 'STAKING_OVERVIEW_FETCH_ERROR', {
      source: 'staking/overview/route.ts:GET'
    });
    return NextResponse.json(
      { error: 'Failed to fetch staking data' },
      { status: 500 }
    );
  }
}

