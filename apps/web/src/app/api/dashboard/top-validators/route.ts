import { NextResponse, NextRequest } from 'next/server';
import prisma, { combineSql } from '@/lib/prisma';
import { ValidatorTableSummary } from '@/types';
import { Prisma } from '@dashtec/database';
import { calculatePerformanceScores } from '@/lib/performance';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { parseRollupParam, rollupWhereClauseFor } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';

async function getValidatorPerformance(startEpoch: number, endEpoch: number, rollupAddresses: string[]): Promise<ValidatorTableSummary[]> {
  const rollupFilter = Prisma.sql`AND ${rollupWhereClauseFor('vep', rollupAddresses)}`;
  const epochFilter = Prisma.sql`WHERE vep.epoch_number BETWEEN ${startEpoch} AND ${endEpoch}`;
  const result = await prisma.$queryRaw<any[]>`
        SELECT
            v.address, v.validator_hex_index, v.stake_balance, v.status, v.activation_date, v.x_handle, v.name,
            v.x_user_id, v.x_image_url, v."discordId", v."discordUsername", v."discordAvatar",
            COALESCE(SUM(vep.attestations_successful), 0) AS total_attestations_successful,
            COALESCE(SUM(vep.attestations_missed), 0) AS total_attestations_missed,
            COALESCE(SUM(vep.checkpoints_proposed), 0) AS total_checkpoints_proposed,
            COALESCE(SUM(vep.checkpoints_mined), 0) AS total_checkpoints_mined,
            COALESCE(SUM(vep.checkpoints_missed), 0) AS total_checkpoints_missed,
            COALESCE(SUM(vep.blocks_missed), 0) AS total_blocks_missed,
            COALESCE(MAX(CASE WHEN vep.checkpoints_proposed != 0 THEN vep.epoch_number ELSE NULL END), 0) AS max_epoch_with_checkpoints_proposed,
            COALESCE(MAX(CASE WHEN vep.checkpoints_mined != 0 THEN vep.epoch_number ELSE NULL END), 0) AS max_epoch_with_checkpoints_mined,
            pa_latest."providerIdentifier" AS "providerIdentifier",
            pm.name AS provider_name,
            pm.description AS provider_description,
            pm.website AS provider_website,
            pm."logoUrl" AS provider_logo_url,
            pm.email AS provider_email,
            pm.discord AS provider_discord
        FROM "Validator" v
        LEFT JOIN "ValidatorEpochPerformance" vep ON v.address = vep.validator_address 
        LEFT JOIN LATERAL (
          SELECT DISTINCT ON (pa."attesterAddress")
            pa."providerIdentifier"
          FROM "ProviderAttester" pa
          WHERE pa."attesterAddress" = v.address
          ORDER BY pa."attesterAddress", pa."blockNumber" DESC, pa."logIndex" DESC
        ) pa_latest ON true
        LEFT JOIN "ProviderMetadata" pm
            ON pa_latest."providerIdentifier" = pm."providerIdentifier"
        ${epochFilter}
        ${rollupFilter}
        GROUP BY v.address, v.validator_hex_index, v.stake_balance, v.status, v.activation_date, v.x_handle, v.name, v.x_user_id, v.x_image_url, v."discordId", v."discordUsername", v."discordAvatar",
                 pa_latest."providerIdentifier", pm.name, pm.description, pm.website, pm."logoUrl", pm.email, pm.discord
        ORDER BY v.validator_hex_index ASC;
    `;

  return result.map(r => ({
    ...r,
    stake_balance: Number(r.stake_balance),
    activation_date: Number(r.activation_date),
    total_attestations_successful: Number(r.total_attestations_successful),
    total_attestations_missed: Number(r.total_attestations_missed),
    total_checkpoints_proposed: Number(r.total_checkpoints_proposed),
    total_checkpoints_mined: Number(r.total_checkpoints_mined),
    total_checkpoints_missed: Number(r.total_checkpoints_missed),
    total_blocks_missed: Number(r.total_blocks_missed),
    max_epoch_with_checkpoints_proposed: Number(r.max_epoch_with_checkpoints_proposed),
    max_epoch_with_checkpoints_mined: Number(r.max_epoch_with_checkpoints_mined),
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

export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();

  const { searchParams } = new URL(request.url);
  const startEpochParam = searchParams.get('startEpoch');
  const endEpochParam = searchParams.get('endEpoch');

  if (!startEpochParam || !endEpochParam) {
    return NextResponse.json({ error: 'startEpoch and endEpoch parameters are required.' }, { status: 400 });
  }

  const startEpoch = parseInt(startEpochParam, 10);
  const endEpoch = parseInt(endEpochParam, 10);

  if (isNaN(startEpoch) || isNaN(endEpoch)) {
    return NextResponse.json({ error: 'Invalid epoch parameters.' }, { status: 400 });
  }

  const rollupAddresses = await parseRollupParam(searchParams);

  try {
    const allValidatorsData = await getValidatorPerformance(startEpoch, endEpoch, rollupAddresses);
    const rankedValidators = calculatePerformanceScores(allValidatorsData);

    const top10Validators = rankedValidators
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 10);

    const { total } = benchmark.getResults();

    return NextResponse.json({
      validators: top10Validators,
      benchmark: total,
      status: 'ok'
    });

  } catch (error) {
    // Log the actual error details
    logError(error as Error, 'TOP_VALIDATORS_FETCH_ERROR', {
      source: 'dashboard/top-validators/route.ts:GET',
      startEpoch,
      endEpoch,
      timestamp: new Date().toISOString()
    });

    // Return user-friendly message
    return NextResponse.json({
      error: 'Failed to fetch top sequencers. Please try again later.'
    }, { status: 500 });
  }
}