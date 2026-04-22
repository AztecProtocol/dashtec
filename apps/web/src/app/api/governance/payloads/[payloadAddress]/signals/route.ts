import { NextResponse } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { getPayloadSignals, GovernanceSignal } from '@/db/queries/historical-governance';
import { parseRollupParam } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';

export interface PayloadSignalsApiResponse {
  data: GovernanceSignal[];
  meta: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
  payloadAddress: string;
  roundNumber: number;
  benchmark: string;
  status: 'ok' | 'error';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ payloadAddress: string; }> }
) {
  const benchmark = createBenchmark();
  const { searchParams } = new URL(request.url);

  const { payloadAddress } = await params;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit')) || 50));
  const roundNumber = Math.max(1, Number(searchParams.get('roundNumber')) || 0);
  const rollupAddresses = await parseRollupParam(searchParams);

  if (!payloadAddress || isNaN(Number(roundNumber)) || Number(roundNumber) === 0) {
    return NextResponse.json(
      { error: 'Invalid payload address or round number' },
      { status: 400 }
    );
  }

  try {
    benchmark.start('fetch-signals');
    const signalsData = await getPayloadSignals(payloadAddress, Number(roundNumber), page, limit, rollupAddresses);
    benchmark.end('fetch-signals');

    const { total } = benchmark.getResults();

    const response: PayloadSignalsApiResponse = {
      data: signalsData.signals,
      meta: {
        totalCount: signalsData.totalCount,
        totalPages: signalsData.totalPages,
        currentPage: page,
        pageSize: limit,
      },
      payloadAddress,
      roundNumber: Number(roundNumber),
      benchmark: total,
      status: 'ok',
    };

    return NextResponse.json(response);
  } catch (error) {
    logError(error as Error, 'PAYLOAD_SIGNALS_FETCH_ERROR', {
      source: 'governance/payloads/[payloadAddress]/signals/route.ts:GET',
      payloadAddress,
      roundNumber: Number(roundNumber),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to fetch payload signals. Please try again later.' },
      { status: 500 }
    );
  }
}
