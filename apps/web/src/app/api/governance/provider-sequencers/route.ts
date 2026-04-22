import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { getProviderSequencersWithSignals } from '@/db/queries/signaling-matrix';
import { contracts } from '@/lib/contracts';
import { parseRollupParam } from '@/lib/rollupParam';
import { ProviderSequencerSortBy, SortBy } from '@/types/signaling-matrix';

export const dynamic = 'force-dynamic';

export interface SequencerSignalCounts {
  [payloadAddress: string]: number;
}

export interface SequencerInfo {
  address: string;
  name: string | null;
  xHandle: string | null;
  xImageUrl: string | null;
  discordAvatar: string | null;
  discordUsername: string | null;
  payloadSignals: SequencerSignalCounts;
  totalSignals: number;
  checkpointsProposed: number;
  checkpointsMined: number;
  checkpointsMissed: number;
  blocksMissed: number;
  totalProposerSlots: number;
}

export interface ProviderSequencersResponse {
  sequencers: SequencerInfo[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  benchmark: string;
  status: 'ok' | 'error';
}

/**
 * GET /api/governance/provider-sequencers
 *
 * Query Parameters:
 * - providerIdentifier: string (required)
 * - roundNumber: number (required)
 * - payloadAddresses: string (comma-separated, required)
 * - page: number (default: 1)
 * - limit: number (default: 10)
 * - sortBy: 'name' | 'signals' | 'opportunities' (default: 'signals')
 * - search: string (optional)
 */
export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();

  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const providerIdentifier = searchParams.get('providerIdentifier');
    const roundNumber = searchParams.get('roundNumber');
    const payloadAddressesStr = searchParams.get('payloadAddresses');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortBy = (searchParams.get('sortBy') || 'signals') as ProviderSequencerSortBy
    const search = searchParams.get('search') || undefined;
    const rollupAddresses = await parseRollupParam(searchParams);

    // Validate required parameters
    if (!providerIdentifier) {
      return NextResponse.json(
        { error: 'providerIdentifier is required' },
        { status: 400 }
      );
    }

    if (!roundNumber || isNaN(parseInt(roundNumber))) {
      return NextResponse.json(
        { error: 'Valid roundNumber is required' },
        { status: 400 }
      );
    }

    if (!payloadAddressesStr) {
      return NextResponse.json(
        { error: 'payloadAddresses is required' },
        { status: 400 }
      );
    }

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const payloadAddresses = payloadAddressesStr.split(',').filter(Boolean);

    // Calculate round slot range
    benchmark.start('fetch_round_data');
    const [roundSize, slotsPerEpoch] = await Promise.all([
      contracts.empireBase.getRoundSize(),
      contracts.rollup.getEpochDuration(),
    ]);
    const roundSizeNum = Number(roundSize);
    const roundStartSlot = parseInt(roundNumber) * roundSizeNum;
    const roundEndSlot = roundStartSlot + roundSizeNum - 1;
    benchmark.end('fetch_round_data');

    benchmark.start('fetch_sequencers');
    const { sequencers, totalCount } = await getProviderSequencersWithSignals(
      providerIdentifier,
      parseInt(roundNumber),
      roundStartSlot,
      roundEndSlot,
      payloadAddresses,
      { page, limit, sortBy, search },
      rollupAddresses
    );
    benchmark.end('fetch_sequencers');

    // Convert Map to plain object for JSON
    benchmark.start('format_response');
    const formattedSequencers: SequencerInfo[] = sequencers.map(sequencer => {
      const payloadSignals: SequencerSignalCounts = {};
      sequencer.payloadSignals.forEach((count, payloadAddress) => {
        payloadSignals[payloadAddress] = count;
      });

      return {
        address: sequencer.address,
        name: sequencer.name,
        xHandle: sequencer.xHandle,
        xImageUrl: sequencer.xImageUrl,
        discordAvatar: sequencer.discordAvatar,
        discordUsername: sequencer.discordUsername,
        payloadSignals,
        totalSignals: sequencer.totalSignals,
        checkpointsProposed: sequencer.checkpointsProposed,
        checkpointsMined: sequencer.checkpointsMined,
        checkpointsMissed: sequencer.checkpointsMissed,
        blocksMissed: sequencer.blocksMissed,
        totalProposerSlots: sequencer.totalProposerSlots,
      };
    });
    benchmark.end('format_response');

    const response: ProviderSequencersResponse = {
      sequencers: formattedSequencers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      benchmark: benchmark.getResults().total,
      status: 'ok',
    };

    return NextResponse.json(response);

  } catch (error) {
    logError(error as Error, 'PROVIDER_SEQUENCERS_FETCH_ERROR', {
      source: 'governance/provider-sequencers/route.ts:GET',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to fetch provider sequencers. Please try again later.' },
      { status: 500 }
    );
  }
}
