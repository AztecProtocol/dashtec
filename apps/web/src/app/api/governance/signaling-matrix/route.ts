import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { parseRollupParam } from '@/lib/rollupParam';
import {
  loadSignalingMatrix,
  type SignalingMatrixParams,
} from '@/services/governance/signalingMatrixLoader';
import { formatSignalingMatrixResponse } from '@/services/governance/signalingMatrixFormatter';

export const dynamic = 'force-dynamic';

/**
 * GET /api/governance/signaling-matrix
 *
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 100)
 * - sortBy: 'name' | 'support' (default: 'support')
 * - filterStatus: 'all' | 'signaled' | 'no_signal' (default: 'all')
 * - search: string (optional)
 * - round: number (default: 0 → use current round)
 */
export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();

  try {
    const params = await parseSignalingMatrixParams(request.nextUrl.searchParams);
    if ('error' in params) {
      return NextResponse.json({ error: params.error }, { status: 400 });
    }

    benchmark.start('load');
    const bundle = await loadSignalingMatrix(params);
    benchmark.end('load');

    return NextResponse.json(
      formatSignalingMatrixResponse(bundle, params, benchmark.getResults()),
    );
  } catch (error) {
    logError(error as Error, 'SIGNALING_MATRIX_FETCH_ERROR', {
      source: 'governance/signaling-matrix/route.ts:GET',
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Failed to fetch signaling matrix data. Please try again later.' },
      { status: 500 },
    );
  }
}

async function parseSignalingMatrixParams(
  searchParams: URLSearchParams,
): Promise<SignalingMatrixParams | { error: string }> {
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  if (!Number.isInteger(page) || !Number.isInteger(limit) || page < 1 || limit < 1 || limit > 100) {
    return { error: 'Invalid pagination parameters' };
  }

  const sortByRaw = searchParams.get('sortBy') ?? 'support';
  const sortBy: 'name' | 'support' = sortByRaw === 'name' ? 'name' : 'support';

  const filterStatusRaw = searchParams.get('filterStatus') ?? 'all';
  const filterStatus: 'all' | 'signaled' | 'no_signal' =
    filterStatusRaw === 'signaled' || filterStatusRaw === 'no_signal' ? filterStatusRaw : 'all';

  return {
    page,
    limit,
    sortBy,
    filterStatus,
    roundNumber: parseInt(searchParams.get('round') || '0', 10) || 0,
    search: searchParams.get('search') || undefined,
    rollupAddresses: await parseRollupParam(searchParams),
  };
}
