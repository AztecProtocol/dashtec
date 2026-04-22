import { NextResponse } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { getGovernanceRoundsSummary, GovernanceRoundSummary } from '@/db/queries/historical-governance';
import { contracts } from '@/lib/contracts';
import { parseRollupParam } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';

export interface GovernanceRoundsApiResponse {
  data: GovernanceRoundSummary[];
  meta: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
  currentRound: number;
  executionDelayInRounds: number;
  lifetimeInRounds: number;
  quorumSize: number;
  benchmark: string;
  status: 'ok' | 'error';
}

export async function GET(request: Request) {
  const benchmark = createBenchmark();
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit')) || 20));
  const query = searchParams.get('q') || undefined;
  const rollupAddresses = await parseRollupParam(searchParams);

  try {
    benchmark.start('fetch-contracts');
    const [currentRound, executionDelayInRounds, lifetimeInRounds, quorumSize] = await Promise.all([
      contracts.empireBase.getCurrentRound(),
      contracts.empireBase.getExecutionDelayInRounds(),
      contracts.empireBase.getLifetimeInRounds(),
      contracts.empireBase.getQuorumSize(),
    ]);
    benchmark.end('fetch-contracts');

    benchmark.start('fetch-rounds');
    const roundsData = await getGovernanceRoundsSummary(
      page,
      limit,
      query,
      Number(currentRound),
      Number(lifetimeInRounds),
      rollupAddresses
    );
    benchmark.end('fetch-rounds');

    const { total } = benchmark.getResults();

    const response: GovernanceRoundsApiResponse = {
      data: roundsData.rounds,
      meta: {
        totalCount: roundsData.totalCount,
        totalPages: roundsData.totalPages,
        currentPage: page,
        pageSize: limit,
      },
      currentRound: Number(currentRound),
      executionDelayInRounds: Number(executionDelayInRounds),
      lifetimeInRounds: Number(lifetimeInRounds),
      quorumSize: Number(quorumSize),
      benchmark: total,
      status: 'ok',
    };

    return NextResponse.json(response);
  } catch (error) {
    logError(error as Error, 'GOVERNANCE_ROUNDS_FETCH_ERROR', {
      source: 'governance/rounds/route.ts:GET',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to fetch governance rounds. Please try again later.' },
      { status: 500 }
    );
  }
}
