import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@dashtec/database';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { parseRollupParam } from '@/lib/rollupParam';
import {
  createValidatorAggregatesCTE,
  createMaxValuesCTE,
  createValidatorScoresCTE,
  createFinalScoresCTE,
  createRankedValidatorsCTE,
  createFinalSelection,
} from '@/db/queries/validatorAggregates';

export const dynamic = 'force-dynamic';

async function searchValidators(
  startEpoch: number | null,
  endEpoch: number | null,
  searchQuery: string | null,
  rollupAddresses: string[]
): Promise<any[]> {

  if (!searchQuery) {
    return []; // Do not return all validators if search query is empty
  }

  const epochFilter =
    startEpoch !== null && endEpoch !== null
      ? Prisma.sql`AND vep.epoch_number BETWEEN ${startEpoch} AND ${endEpoch}`
      : Prisma.sql``;

  const searchLike = `%${searchQuery}%`;
  const searchFilter = Prisma.sql`
    WHERE (
      LOWER(address) ILIKE ${searchLike} OR
      LOWER(validator_hex_index) ILIKE ${searchLike} OR
      LOWER(COALESCE(x_handle, '')) ILIKE ${searchLike} OR
      LOWER(COALESCE(name, '')) ILIKE ${searchLike} OR
      LOWER(COALESCE("discordUsername", '')) ILIKE ${searchLike} OR
      LOWER(COALESCE(provider_name, '')) ILIKE ${searchLike} OR
      LOWER(COALESCE("providerIdentifier", '')) ILIKE ${searchLike}
    )
  `;

  const result = await prisma.$queryRaw<any[]>`
    WITH
    ${createValidatorAggregatesCTE({ epochFilter, rollupAddresses })},
    ${createMaxValuesCTE()},
    ${createValidatorScoresCTE()},
    ${createFinalScoresCTE()},
    ${createRankedValidatorsCTE()}
    ${createFinalSelection({ sourceTable: 'all_ranked_validators', includeCount: false })}
    ${searchFilter}
    ORDER BY rank ASC
  `;

  return result.map(r => ({
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
    totalAttestationsSucceeded: Number(r.totalAttestationsSucceeded),
    totalAttestationsMissed: Number(r.totalAttestationsMissed),
    totalCheckpointsProposed: Number(r.totalCheckpointsProposed),
    totalCheckpointsMined: Number(r.totalCheckpointsMined),
    totalBlocksMissed: Number(r.totalBlocksMissed),
    maxEpochWithBlocksProposed: Number(r.maxEpochWithBlocksProposed),
    maxEpochWithBlocksMined: Number(r.maxEpochWithBlocksMined),
    totalParticipatingEpochs: Number(r.totalParticipatingEpochs),
    attestationSuccess: r.attestationSuccess,
    proposalSuccess: r.proposalSuccess,
    performanceScore: Number(r.performanceScore),
    rank: r.rank,
    provider: r.providerIdentifier ? {
      providerIdentifier: r.providerIdentifier,
      name: r.provider_name,
      description: r.provider_description,
      website: r.provider_website,
      logoUrl: r.provider_logo_url,
      email: r.provider_email,
      discord: r.provider_discord,
    } : undefined,
  }));
}

async function searchQueuedValidators(searchQuery: string, rollupAddresses: string[]) {
  if (!searchQuery) return [];

  // Search in validator queue with position calculated using window function
  const queuedValidators = await prisma.$queryRaw<Array<{
    id: string;
    attester_address: string;
    withdrawer_address: string;
    queued_at: Date;
    transaction_hash: string;
    position: number;
  }>>`
    WITH ranked_queue AS (
      SELECT 
        id,
        attester_address,
        withdrawer_address,
        queued_at,
        transaction_hash,
        ROW_NUMBER() OVER (ORDER BY queued_at ASC) as position
      FROM "ValidatorQueue"
      WHERE rollup_address IN (${Prisma.join(rollupAddresses)})
    )
    SELECT 
      id,
      attester_address,
      withdrawer_address,
      queued_at,
      transaction_hash,
      position::integer
    FROM ranked_queue
    WHERE 
      attester_address ILIKE ${'%' + searchQuery + '%'} 
    ORDER BY position ASC
  `;

  return queuedValidators.map(v => ({
    ...v,
    position: Number(v.position)
  }));
}

export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();
  try {
    const { searchParams } = new URL(request.url);
    const startEpochParam = searchParams.get('startEpoch');
    const endEpochParam = searchParams.get('endEpoch');
    const searchQuery = searchParams.get('q');

    if (!searchQuery) {
      return NextResponse.json({ error: 'Search query parameter "q" is required.' }, { status: 400 });
    }

    const startEpoch = startEpochParam ? parseInt(startEpochParam, 10) : null;
    const endEpoch = endEpochParam ? parseInt(endEpochParam, 10) : null;
    const rollupAddresses = await parseRollupParam(searchParams);

    // Search both active validators and queued validators
    const [validators, queuedValidators] = await Promise.all([
      searchValidators(startEpoch, endEpoch, searchQuery, rollupAddresses),
      searchQueuedValidators(searchQuery, rollupAddresses)
    ]);

    const { total } = benchmark.getResults();
    return NextResponse.json({
      validators: validators,
      queuedValidators: queuedValidators,
      benchmark: total,
      status: 'ok'
    });

  } catch (error) {
    // Log the actual error details
    logError(error as Error, 'SEARCH_API_ERROR', {
      source: 'search/route.ts:GET',
      timestamp: new Date().toISOString()
    });

    // Return user-friendly message
    return NextResponse.json({
      error: 'Failed to fetch search results. Please try again later.'
    }, { status: 500 });
  }
}