import { NextResponse, NextRequest } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { PaginatedValidatorsResponse } from '@/types/api';
import {
  parseValidatorListParams,
  ValidatorParamsError,
} from '@/lib/queryParams/validators';
import {
  fetchRankedValidators,
  fetchValidatorStatusCounts,
} from '@/db/queries/validators';
import { mapValidatorRow } from '@/services/validator/validatorListMapper';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();

  try {
    const params = await parseValidatorListParams(new URL(request.url).searchParams);

    benchmark.start('queryExecution');
    const [rows, statuses] = await Promise.all([
      fetchRankedValidators(params),
      fetchValidatorStatusCounts(params),
    ]);
    benchmark.end('queryExecution');

    const totalCount = Number(rows.length > 0 ? rows[0].total_count : 0);
    const maxTotalAttestations = Number(rows.length > 0 ? rows[0].max_total_attestations : 0);
    const maxTotalBlocksProduced = Number(rows.length > 0 ? rows[0].max_total_blocks_produced : 0);
    const totalPages = Math.ceil(totalCount / params.limit);
    const { total, details } = benchmark.getResults();

    const response: PaginatedValidatorsResponse = {
      validators: rows.map(mapValidatorRow),
      totalCount,
      totalPages,
      currentPage: params.page,
      limit: params.showAll ? totalCount : params.limit,
      maxTotalAttestations,
      maxTotalBlocksProduced,
      statuses,
      benchmark: total,
      benchmarks: details,
      status: 'ok',
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof ValidatorParamsError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logError(error as Error, 'VALIDATORS_LIST_FETCH_ERROR', {
      source: 'validators/route.ts:GET',
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Failed to fetch sequencers list. Please try again later.' },
      { status: 500 },
    );
  }
}
