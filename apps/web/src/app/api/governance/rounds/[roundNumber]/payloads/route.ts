import { NextResponse } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { getRoundPayloads, GovernancePayloadInfo } from '@/db/queries/historical-governance';
import { contracts } from '@/lib/contracts';
import { parseRollupParam } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';

export interface RoundPayloadsApiResponse {
  data: GovernancePayloadInfo[];
  meta: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
  roundNumber: number;
  benchmark: string;
  status: 'ok' | 'error';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roundNumber: string }> }
) {
  const benchmark = createBenchmark();
  const { searchParams } = new URL(request.url);
  const { roundNumber } = await params

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit')) || 20));
  const rollupAddresses = await parseRollupParam(searchParams);

  if (isNaN(Number(roundNumber))) {
    return NextResponse.json(
      { error: 'Invalid round number' },
      { status: 400 }
    );
  }

  try {
    // Get current round and lifetime for status calculation
    benchmark.start('contract_calls');
    const [currentRound, lifetimeInRounds] = await Promise.all([
      contracts.empireBase.getCurrentRound(),
      contracts.empireBase.getLifetimeInRounds(),
    ]);
    benchmark.end('contract_calls');

    benchmark.start('fetch-payloads');
    const payloadsData = await getRoundPayloads(
      Number(roundNumber),
      page,
      limit,
      Number(currentRound),
      Number(lifetimeInRounds),
      rollupAddresses
    );
    benchmark.end('fetch-payloads');

    const { total } = benchmark.getResults();

    const response: RoundPayloadsApiResponse = {
      data: payloadsData.payloads,
      meta: {
        totalCount: payloadsData.totalCount,
        totalPages: payloadsData.totalPages,
        currentPage: page,
        pageSize: limit,
      },
      roundNumber: Number(roundNumber),
      benchmark: total,
      status: 'ok',
    };

    return NextResponse.json(response);
  } catch (error) {
    logError(error as Error, 'ROUND_PAYLOADS_FETCH_ERROR', {
      source: 'governance/rounds/[roundNumber]/payloads/route.ts:GET',
      roundNumber,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to fetch round payloads. Please try again later.' },
      { status: 500 }
    );
  }
}
