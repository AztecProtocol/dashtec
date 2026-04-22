import { NextResponse, NextRequest } from 'next/server';
import prisma, { debugSql } from '@/lib/prisma';
import {
  createProvidersWithAttestersQuery,
  createProvidersCountQuery,
  createNetworkAggregatesQuery,
} from '@/db/queries/providers';
import { createBenchmark } from '@/services/benchmark';
import { logError } from '@/services/error/errorLogger';
import { parseRollupParam } from '@/lib/rollupParam';
import { getActiveRollupAddress } from '@/services/rollupRegistry';
import type { ProviderListItem, ProvidersApiResponse } from '@/types';
import type {
  ProviderWithAttestersRow,
  NetworkAggregatesRow,
} from '@/types/queries/providers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();

  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'timestamp';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const offset = (page - 1) * limit;
    const rollupAddresses = await parseRollupParam(searchParams);
    const activeRollup = await getActiveRollupAddress();
    const isActiveRollup = rollupAddresses.length === 1 && rollupAddresses[0] === activeRollup;
    const rollupOptions = { rollupAddresses, isActiveRollup };

    benchmark.start('fetchProviders');

    const [countResult, providers, aggregateRows] = await Promise.all([
      prisma.$queryRaw<[{ total: string }]>(createProvidersCountQuery(search)),
      prisma.$queryRaw<ProviderWithAttestersRow[]>(
        createProvidersWithAttestersQuery({
          search,
          sortBy,
          sortOrder,
          limit,
          offset,
          ...rollupOptions
        })
      ),
      prisma.$queryRaw<NetworkAggregatesRow[]>(createNetworkAggregatesQuery(rollupOptions)),
    ]);

    const totalCount = parseInt(countResult[0].total, 10);

    benchmark.end('fetchProviders');

    benchmark.start('processData');

    // Process provider data
    const providersWithStats: ProviderListItem[] = providers.map((provider) => ({
      id: provider.id,
      identifier: provider.providerIdentifier,
      name: provider.providerName,
      admin: provider.providerAdmin as `0x${string}`,
      takeRate: provider.providerTakeRate,
      rewardsRecipient: provider.rewardsRecipient as `0x${string}`,
      totalAttesters: Number(provider.total_attesters),
      activeAttesters: Number(provider.active_attesters),
      queuedAttesters: Number(provider.queued_attesters),
      totalStaked: Number(provider.total_staked),
      activeStaked: Number(provider.active_staked),
      metadata: {
        name: provider.metadataName,
        description: provider.metadataDescription,
        website: provider.metadataWebsite,
        logoUrl: provider.metadataLogoUrl,
        email: provider.metadataEmail,
        discord: provider.metadataDiscord,
      },
    }));

    const aggregateRow = aggregateRows[0];
    const aggregates = aggregateRow
      ? {
        totalSequencers: Number(aggregateRow.total_sequencers),
        activeSequencers: Number(aggregateRow.active_sequencers),
        activeStaked: Number(aggregateRow.active_staked),
        totalStaked: Number(aggregateRow.total_staked),
      }
      : undefined;

    benchmark.end('processData');

    const { total, details } = benchmark.getResults();

    const response: ProvidersApiResponse = {
      data: providersWithStats,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      aggregates,
      benchmark: total,
      benchmarks: details,
      status: 'ok'
    };

    return NextResponse.json(response);
  } catch (error) {
    logError(error as Error, 'PROVIDERS_FETCH_ERROR', {
      source: 'providers/route.ts:GET'
    });
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}
