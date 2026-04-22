import { NextResponse } from 'next/server';
import { createBenchmark } from '@/services/benchmark';
import { logError } from '@/services/error/errorLogger';
import { parseRollupParam } from '@/lib/rollupParam';
import { getActiveRollupAddress } from '@/services/rollupRegistry';
import { loadProviderDetail } from '@/services/provider/providerDetailLoader';
import { buildProviderDetail } from '@/services/provider/providerStatsAggregator';
import type { ProviderDetailApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  const benchmark = createBenchmark();
  const { identifier } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const rollupAddresses = await parseRollupParam(searchParams);
    const activeRollup = await getActiveRollupAddress();
    const isActiveRollup = rollupAddresses.length === 1 && rollupAddresses[0] === activeRollup;

    const epochLimitParam = searchParams.get('epochLimit');
    const epochLimit = epochLimitParam ? parseInt(epochLimitParam, 10) : undefined;

    benchmark.start('load');
    const bundle = await loadProviderDetail(identifier, {
      rollupAddresses,
      isActiveRollup,
      epochLimit,
    });
    benchmark.end('load');

    if (!bundle) {
      return NextResponse.json(
        { error: 'Provider not found', status: 'error' as const, benchmark: '0ms' },
        { status: 404 },
      );
    }

    const { total, details } = benchmark.getResults();
    const response: ProviderDetailApiResponse = {
      data: buildProviderDetail(bundle),
      benchmark: total,
      benchmarks: details,
      status: 'ok',
    };
    return NextResponse.json(response);
  } catch (error) {
    logError(error as Error, 'PROVIDER_DETAIL_FETCH_ERROR', {
      source: 'providers/[identifier]/route.ts:GET',
    });
    return NextResponse.json({ error: 'Failed to fetch provider detail' }, { status: 500 });
  }
}
