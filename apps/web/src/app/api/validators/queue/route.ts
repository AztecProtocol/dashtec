import { NextRequest, NextResponse } from 'next/server';
import prisma, { debugSql } from '@/lib/prisma';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { parseRollupParam } from '@/lib/rollupParam';
import {
  createQueueWithRankQuery,
  createQueueCountQuery,
  type QueueWithRankRow,
  type QueueCountRow
} from '@/db/queries/queue';
import type { QueuedValidator, QueueApiResponse } from '@/types/api/queue';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
  const search = searchParams.get('search') || '';
  const offset = (page - 1) * limit;
  const rollupAddresses = await parseRollupParam(searchParams);

  try {
    benchmark.start('fetchQueue');

    const [countResult, queuedValidatorsWithRank] = await Promise.all([
      prisma.$queryRaw<QueueCountRow[]>(createQueueCountQuery(search || undefined, rollupAddresses)),
      prisma.$queryRaw<QueueWithRankRow[]>(createQueueWithRankQuery({
        search: search || undefined,
        limit,
        offset,
        rollupAddresses
      }))
    ]);

    const filteredCount = Number(countResult[0].total);

    benchmark.end('fetchQueue');

    benchmark.start('processData');

    const queueData = queuedValidatorsWithRank.map((v) => ({
      position: Number(v.rank),
      address: v.attester_address,
      withdrawerAddress: v.withdrawer_address,
      transactionHash: v.transaction_hash,
      queuedAt: v.queued_at.toISOString(),
      providerIdentifier: v.provider_identifier,
      providerName: v.provider_name,
      providerLogoUrl: v.provider_logo_url,
      index: `#${v.rank}`,
    }));

    benchmark.end('processData');

    const totalPages = Math.ceil(filteredCount / limit);
    const { total, details } = benchmark.getResults();

    return NextResponse.json({
      validatorsInQueue: queueData,
      filteredCount: filteredCount,
      pagination: {
        page,
        limit,
        total: filteredCount,
        totalPages,
      },
      benchmark: total,
      benchmarks: details,
      status: 'ok'
    });

  } catch (error) {
    logError(error as Error, 'VALIDATORS_QUEUE_FETCH_ERROR', {
      source: 'validators/queue/route.ts:GET',
      page,
      limit,
      search,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      error: 'Failed to fetch sequencer queue. Please try again later.'
    }, { status: 500 });
  }
}