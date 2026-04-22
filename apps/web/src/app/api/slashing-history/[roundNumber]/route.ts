import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { parseRollupParam } from '@/lib/rollupParam';
import {
  loadSlashingRoundDetail,
  transformSlashingRoundResponse,
} from '@/services/slashing/slashingRoundDetail';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roundNumber: string }> },
) {
  const benchmark = createBenchmark();
  const { roundNumber: roundParam } = await params;
  const roundNumber = parseInt(roundParam, 10);

  if (!Number.isInteger(roundNumber) || roundNumber < 0) {
    return NextResponse.json({ error: 'Invalid round number' }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rollupAddresses = await parseRollupParam(searchParams);

    benchmark.start('load');
    const bundle = await loadSlashingRoundDetail(roundNumber, rollupAddresses);
    benchmark.end('load');

    if (!bundle) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: transformSlashingRoundResponse(bundle),
      benchmark: benchmark.getResults().total,
      status: 'ok' as const,
    });
  } catch (error) {
    logError(error as Error, 'Error fetching slashing round detail', {
      source: 'slashing-history/[roundNumber]/route.ts:GET',
      roundNumber: roundParam,
    });
    return NextResponse.json({ error: 'Failed to fetch slashing round detail' }, { status: 500 });
  }
}
