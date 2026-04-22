import { NextResponse, NextRequest } from 'next/server';
import prisma, { combineSql } from '@/lib/prisma';
import { Prisma } from '@dashtec/database';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { PaginatedValidatorsResponse } from '@/types/api';
import {
  createValidatorAggregatesCTE,
  createMaxValuesCTE,
  createValidatorScoresCTE,
  createFinalScoresCTE,
  createRankedValidatorsCTE,
  createFinalSelection,
} from '@/db/queries/validatorAggregates';
import {
  createPerformanceHistoryQuery,
  createStatusCountsQuery,
  PerformanceHistoryRow,
  StatusCountRow
} from '@/db/queries/validatorPerformanceHistory';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const benchmark = createBenchmark();

  try {
    const body = await request.json();
    const { addresses } = body;

    // Validate addresses
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json({
        error: 'Invalid request. Please provide an array of validator addresses.'
      }, { status: 400 });
    }

    const lowerAddresses = addresses.map((addr: string) => addr.toLowerCase());
    const epochFilter = Prisma.sql``;

    // Multi-stage CTE query for maximum performance with global ranks
    benchmark.start('queryExecution');
    const result = await prisma.$queryRaw<any[]>`
      WITH
      ${createValidatorAggregatesCTE({ epochFilter })},
      ${createMaxValuesCTE()},
      ${createValidatorScoresCTE()},
      ${createFinalScoresCTE()},
      ${createRankedValidatorsCTE()}
      ${createFinalSelection({ sourceTable: 'all_ranked_validators', includeCount: false })}
      WHERE LOWER(address) = ANY(${lowerAddresses}::text[])
      ORDER BY rank ASC
    `;
    benchmark.end('queryExecution');

    // Extract metadata from first row
    const totalCount = result.length;
    const maxTotalAttestations = result.length > 0 ? result[0].max_total_attestations : 0;
    const maxTotalBlocksProduced = result.length > 0 ? result[0].max_total_blocks_produced : 0;

    // Fetch performance history for last 10 epochs for each validator
    benchmark.start('performanceHistory');
    const validatorAddresses = result.map(r => r.address);

    const performanceHistory = validatorAddresses.length > 0
      ? await prisma.$queryRaw<PerformanceHistoryRow[]>(
        createPerformanceHistoryQuery(validatorAddresses, { limit: 10 })
      )
      : [];

    benchmark.end('performanceHistory');

    // Group performance history by validator address
    const historyByValidator = performanceHistory.reduce((acc, row) => {
      if (!acc[row.validator_address]) {
        acc[row.validator_address] = [];
      }
      acc[row.validator_address].push({
        epochNumber: Number(row.epoch_number),
        attestationsSuccessful: row.attestations_successful,
        attestationsMissed: row.attestations_missed,
        checkpointsProposed: row.checkpoints_proposed,
        checkpointsMined: row.checkpoints_mined,
        checkpointsMissed: row.checkpoints_missed,
        blocksMissed: row.blocks_missed,
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Clean up the response and attach epoch performance history
    const validators = result.map(r => ({
      address: r.address,
      index: r.index,
      balance: Number(r.balance),
      status: r.status,
      activationDate: Number(r.activationDate),
      x_handle: r.x_handle,
      name: r.name,
      x_user_id: r.x_user_id,
      x_image_url: r.x_image_url,
      discordId: r.discordId,
      discordUsername: r.discordUsername,
      discordAvatar: r.discordAvatar,
      provider: r.providerIdentifier ? {
        providerIdentifier: r.providerIdentifier,
        name: r.provider_name,
        description: r.provider_description,
        website: r.provider_website,
        logoUrl: r.provider_logo_url,
        email: r.provider_email,
        discord: r.provider_discord,
      } : null,
      totalAttestationsSucceeded: Number(r.totalAttestationsSucceeded),
      totalAttestationsMissed: Number(r.totalAttestationsMissed),
      totalCheckpointsProposed: Number(r.totalCheckpointsProposed),
      totalCheckpointsMined: Number(r.totalCheckpointsMined),
      totalCheckpointsMissed: Number(r.totalCheckpointsMissed),
      totalBlocksMissed: Number(r.totalBlocksMissed),
      maxEpochWithBlocksProposed: Number(r.maxEpochWithBlocksProposed),
      maxEpochWithBlocksMined: Number(r.maxEpochWithBlocksMined),
      totalParticipatingEpochs: Number(r.totalParticipatingEpochs),
      attestationSuccess: r.attestationSuccess,
      proposalSuccess: r.proposalSuccess,
      performanceScore: Number(r.performanceScore),
      rank: r.rank,
      epochPerformanceHistory: historyByValidator[r.address] || []
    }));

    // Get status counts for the watchlist
    benchmark.start('statusCounts');
    const statusCounts = await prisma.$queryRaw<StatusCountRow[]>(
      createStatusCountsQuery(lowerAddresses)
    );
    benchmark.end('statusCounts');

    const statuses = statusCounts.map(item => ({
      status: item.status,
      count: parseInt(item.count)
    }));

    const { total, details } = benchmark.getResults();

    const response: PaginatedValidatorsResponse = {
      validators,
      totalCount,
      totalPages: 1,
      currentPage: 1,
      limit: totalCount,
      maxTotalAttestations,
      maxTotalBlocksProduced,
      statuses,
      benchmark: total,
      benchmarks: details,
      status: 'ok'
    };

    return NextResponse.json(response);

  } catch (error) {
    // Log the actual error details
    logError(error as Error, 'WATCHLIST_VALIDATORS_FETCH_ERROR', {
      source: 'validators/watchlist/route.ts:POST',
      timestamp: new Date().toISOString()
    });

    // Return user-friendly message
    return NextResponse.json({
      error: 'Failed to fetch watchlist sequencers. Please try again later.'
    }, { status: 500 });
  }
}
