import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { SlashingHistoryApiResponse } from '@/types/api';
import { parseRollupParam } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';

// Get total count of executed rounds
async function getSlashingRoundsCount(search: string, rollupAddresses: string[]) {
  const searchConditions = search ? {
    OR: [
      { transaction_hash: { contains: search, mode: 'insensitive' as const } },
      { contract_address: { contains: search, mode: 'insensitive' as const } },
      { payload_address: { contains: search, mode: 'insensitive' as const } },
      // Search by round number or block number if it's a valid integer and within safe range
      ...(isNaN(Number(search)) || Number(search) > Number.MAX_SAFE_INTEGER || Number(search) < 0 ? [] : [
        { round_number: Number(search) },
        { block_number: { equals: BigInt(search) } },
      ])
    ]
  } : {};

  return await prisma.tallyRoundExecuted.count({
    where: {
      slash_count: { gt: 0 },
      rollup_address: { in: rollupAddresses },
      ...searchConditions
    }
  });
}

const VALID_SORT_FIELDS = ['round_number', 'slash_count', 'executed_date'] as const;
type SortField = typeof VALID_SORT_FIELDS[number];

/** Get paginated slashing rounds with optional sorting */
async function getSlashingRounds(
  search: string,
  rollupAddresses: string[],
  page: number,
  limit: number,
  sortBy: SortField = 'executed_date',
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const offset = (page - 1) * limit;

  const searchConditions = search ? {
    OR: [
      { transaction_hash: { contains: search, mode: 'insensitive' as const } },
      { contract_address: { contains: search, mode: 'insensitive' as const } },
      { payload_address: { contains: search, mode: 'insensitive' as const } },
      // Search by round number or block number if it's a valid integer and within safe range
      ...(isNaN(Number(search)) || Number(search) > Number.MAX_SAFE_INTEGER || Number(search) < 0 ? [] : [
        { round_number: Number(search) },
        { block_number: { equals: BigInt(search) } },
      ])
    ]
  } : {};

  return await prisma.tallyRoundExecuted.findMany({
    where: {
      slash_count: { gt: 0 },
      rollup_address: { in: rollupAddresses },
      ...searchConditions
    },
    orderBy: {
      [sortBy]: sortOrder
    },
    skip: offset,
    take: limit
  });
}

export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const search = searchParams.get('search') || '';
    const rawSortBy = searchParams.get('sortBy') || 'executed_date';
    const sortBy = VALID_SORT_FIELDS.includes(rawSortBy as SortField)
      ? (rawSortBy as SortField)
      : 'executed_date';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    const rollupAddresses = await parseRollupParam(searchParams);

    // Get count and data in parallel
    const [total, rounds] = await Promise.all([
      getSlashingRoundsCount(search, rollupAddresses),
      getSlashingRounds(search, rollupAddresses, page, limit, sortBy, sortOrder)
    ]);

    // Transform to API format
    const transformedData = rounds.map(round => ({
      id: round.id,
      round_number: round.round_number,
      slash_count: round.slash_count,
      executed_date: round.executed_date?.toISOString() || null,
      deployment_tx_hash: round.transaction_hash,
      deployment_block: String(round.block_number),
      contract_address: round.contract_address,
      payload_address: round.payload_address || null,
      created_at: round.created_at.toISOString()
    }));

    const { total: benchmarkTotal } = benchmark.getResults();

    const response: SlashingHistoryApiResponse = {
      data: transformedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      benchmark: benchmarkTotal,
      status: 'ok'
    };

    return NextResponse.json(response);
  } catch (error) {
    logError(error as Error, 'Error fetching slashing history', {
      source: 'slashing-history/route.ts:GET'
    });
    return NextResponse.json(
      { error: 'Failed to fetch slashing history' },
      { status: 500 }
    );
  }
}