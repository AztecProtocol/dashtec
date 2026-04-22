import { NextResponse } from 'next/server';
import { getSequencerRewards } from '@/services/rpc/rollupContract';
import { parseRollupParam } from '@/lib/rollupParam';
import { logError } from '@/services/error/errorLogger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ coinbase: string }> }
) {
  try {
    const { coinbase: address } = await params;
    const { searchParams } = new URL(request.url);
    const rollupAddresses = await parseRollupParam(searchParams);

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    const rewards = await getSequencerRewards(address as `0x${string}`, rollupAddresses[0]);

    return NextResponse.json({
      address,
      rewards: rewards.toString(),
    });
  } catch (error) {
    logError(error as Error, 'REWARDS_FETCH_ERROR', {
      source: 'rewards/[coinbase]/route.ts:GET'
    });
    return NextResponse.json(
      { error: 'Failed to check rewards' },
      { status: 500 }
    );
  }
}
