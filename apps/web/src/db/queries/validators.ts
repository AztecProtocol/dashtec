import { Prisma } from '@dashtec/database';
import prisma from '@/lib/prisma';
import { VALIDATOR_STATUS } from '@/utils/constants';
import {
  createValidatorAggregatesCTE,
  createMaxValuesCTE,
  createValidatorScoresCTE,
  createFinalScoresCTE,
  createRankedValidatorsCTE,
  createFinalSelection,
} from '@/db/queries/validatorAggregates';
import type {
  ValidatorListFilters,
  ValidatorListParams,
  ValidatorSortKey,
} from '@/lib/queryParams/validators';

export interface RankedValidatorRow {
  address: string;
  index: string;
  balance: bigint;
  status: string;
  activationDate: bigint;
  x_handle: string | null;
  name: string | null;
  x_user_id: string | null;
  x_image_url: string | null;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  providerIdentifier: string | null;
  provider_name: string | null;
  provider_description: string | null;
  provider_website: string | null;
  provider_logo_url: string | null;
  provider_email: string | null;
  provider_discord: string | null;
  totalAttestationsSucceeded: bigint;
  totalAttestationsMissed: bigint;
  totalCheckpointsProposed: bigint;
  totalCheckpointsMined: bigint;
  totalCheckpointsMissed: bigint;
  totalBlocksMissed: bigint;
  maxEpochWithBlocksProposed: bigint;
  maxEpochWithBlocksMined: bigint;
  totalParticipatingEpochs: bigint;
  attestationSuccess: number | null;
  proposalSuccess: number | null;
  performanceScore: string;
  rank: number;
  is_in_queue: boolean;
  migrationStatus: string | null;
  depositType: string | null;
  total_count: bigint;
  max_total_attestations: bigint;
  max_total_blocks_produced: bigint;
}

interface StatusCountRow {
  status: string;
  count: string;
}

/** Build the WHERE clause for the post-rank filter step. */
export function buildValidatorFilterClause(
  filters: ValidatorListFilters,
  isActiveRollup: boolean,
): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];

  // Validator.status is unreliable on non-active rollups, so only filter NONE there.
  if (isActiveRollup) {
    conditions.push(Prisma.sql`status != ${VALIDATOR_STATUS.NONE}`);
  }

  if (filters.search) {
    conditions.push(buildSearchClause(filters.search));
  }
  if (filters.status) {
    conditions.push(Prisma.sql`status = ${filters.status}`);
  }
  if (filters.provider) {
    conditions.push(Prisma.sql`"providerIdentifier" = ${filters.provider}`);
  }

  pushRangeFilter(conditions, 'stake_balance', filters.balanceMin, filters.balanceMax, 0, Number.MAX_SAFE_INTEGER, parseInt);
  pushRangeFilter(conditions, 'attestation_success', filters.attestationSuccessMin, filters.attestationSuccessMax, 0, 100, parseFloat);
  pushRangeFilter(conditions, 'block_production_rate', filters.proposalSuccessMin, filters.proposalSuccessMax, 0, 100, parseFloat);
  pushRangeFilter(conditions, 'performance_score', filters.performanceScoreMin, filters.performanceScoreMax, 0, 1, parseFloat);
  pushRangeFilter(conditions, 'total_participating_epochs', filters.epochParticipationMin, filters.epochParticipationMax, 0, Number.MAX_SAFE_INTEGER, parseInt);

  return conditions.length === 0
    ? Prisma.sql``
    : Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

function pushRangeFilter(
  out: Prisma.Sql[],
  column: string,
  rawMin: string | null,
  rawMax: string | null,
  defaultMin: number,
  defaultMax: number,
  parse: (s: string) => number,
): void {
  if (rawMin === null && rawMax === null) return;
  const min = rawMin !== null ? parse(rawMin) : defaultMin;
  const max = rawMax !== null ? parse(rawMax) : defaultMax;
  out.push(Prisma.sql`${Prisma.raw(column)} BETWEEN ${min} AND ${max}`);
}

function buildSearchClause(search: string): Prisma.Sql {
  const like = `%${search.toLowerCase()}%`;
  return Prisma.sql`(
    LOWER(address) ILIKE ${like} OR
    LOWER(validator_hex_index) ILIKE ${like} OR
    LOWER(COALESCE(x_handle, '')) ILIKE ${like} OR
    LOWER(COALESCE("discordUsername", '')) ILIKE ${like} OR
    LOWER(COALESCE(name, '')) ILIKE ${like} OR
    LOWER(COALESCE(provider_name, '')) ILIKE ${like} OR
    LOWER(COALESCE("providerIdentifier", '')) ILIKE ${like}
  )`;
}

const SORT_COLUMN_BY_KEY: Record<ValidatorSortKey, string> = {
  rank: 'rank',
  name: 'name',
  x_handle: 'COALESCE(x_handle, "discordUsername")',
  status: 'status',
  balance: 'stake_balance',
  totalParticipatingEpochs: 'total_participating_epochs',
  attestationSuccess: 'attestations_volume_abs',
  proposalSuccess: 'block_production_volume_abs',
  performanceScore: 'performance_score',
};

const NULLS_LAST_KEYS: ReadonlySet<ValidatorSortKey> = new Set([
  'name',
  'x_handle',
  'attestationSuccess',
]);

export function buildValidatorOrderClause(
  sortBy: ValidatorSortKey,
  sortOrder: 'asc' | 'desc',
): Prisma.Sql {
  const column = SORT_COLUMN_BY_KEY[sortBy];
  const direction = sortOrder === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;
  if (NULLS_LAST_KEYS.has(sortBy)) {
    const nulls = sortOrder === 'desc' || sortBy === 'attestationSuccess'
      ? Prisma.sql`NULLS LAST`
      : Prisma.sql`NULLS LAST`;
    // attestationSuccess uses NULLS FIRST when ascending in the original code.
    if (sortBy === 'attestationSuccess' && sortOrder === 'asc') {
      return Prisma.sql`ORDER BY ${Prisma.raw(column)} ${direction} NULLS FIRST`;
    }
    return Prisma.sql`ORDER BY ${Prisma.raw(column)} ${direction} ${nulls}`;
  }
  return Prisma.sql`ORDER BY ${Prisma.raw(column)} ${direction}`;
}

/** Run the multi-CTE ranked-validator query. */
export async function fetchRankedValidators(params: ValidatorListParams): Promise<RankedValidatorRow[]> {
  const epochFilter = params.startEpoch !== null && params.endEpoch !== null
    ? Prisma.sql`AND vep.epoch_number BETWEEN ${params.startEpoch} AND ${params.endEpoch}`
    : Prisma.sql``;

  const filterClause = buildValidatorFilterClause(params.filters, params.isActiveRollup);
  const orderClause = buildValidatorOrderClause(params.sortBy, params.sortOrder);
  const limitClause = params.showAll ? Prisma.sql`` : Prisma.sql`LIMIT ${params.limit}`;
  const offsetClause = params.showAll ? Prisma.sql`` : Prisma.sql`OFFSET ${(params.page - 1) * params.limit}`;

  return prisma.$queryRaw<RankedValidatorRow[]>`
    WITH
    ${createValidatorAggregatesCTE({
      epochFilter,
      rollupAddresses: params.rollupAddresses,
      isActiveRollup: params.isActiveRollup,
    })},
    ${createMaxValuesCTE()},
    ${createValidatorScoresCTE()},
    ${createFinalScoresCTE()},
    ${createRankedValidatorsCTE()},
    filtered_validators AS (
      SELECT
        *,
        COUNT(*) OVER () AS total_count
      FROM all_ranked_validators
      ${filterClause}
    )
    ${createFinalSelection({ sourceTable: 'filtered_validators', includeCount: true })}
    ${orderClause}
    ${limitClause}
    ${offsetClause}
  `;
}

/** Status histogram for the same dataset, with the same search/provider filters. */
export async function fetchValidatorStatusCounts(
  params: ValidatorListParams,
): Promise<{ status: string; count: number }[]> {
  const { filters, isActiveRollup, rollupAddresses } = params;

  const searchClause = filters.search ? Prisma.sql`AND ${buildSearchClause(filters.search)}` : Prisma.sql``;
  const providerClause = filters.provider
    ? Prisma.sql`AND "providerIdentifier" = ${filters.provider}`
    : Prisma.sql``;

  const statusExpr = isActiveRollup
    ? Prisma.sql`v.status`
    : Prisma.sql`vr.migration_status AS status`;

  const rows = await prisma.$queryRaw<StatusCountRow[]>`
    WITH validators_with_provider AS (
      SELECT
        ${statusExpr},
        v.address,
        v.validator_hex_index,
        v.x_handle,
        v."discordUsername",
        v.name,
        pa_latest."providerIdentifier",
        pm.name as provider_name
      FROM "ValidatorRollup" vr
      JOIN "Validator" v ON v.address = vr.address
      LEFT JOIN LATERAL (
        SELECT DISTINCT ON (pa."attesterAddress")
          pa."providerIdentifier"
        FROM "ProviderAttester" pa
        WHERE pa."attesterAddress" = v.address
        ORDER BY pa."attesterAddress", pa."blockNumber" DESC, pa."logIndex" DESC
      ) pa_latest ON true
      LEFT JOIN "ProviderMetadata" pm ON pm."providerIdentifier" = pa_latest."providerIdentifier"
      WHERE vr.rollup_address IN (${Prisma.join(rollupAddresses)})
        AND v.rollup_address IN (${Prisma.join(rollupAddresses)})
        AND v.status NOT IN (${VALIDATOR_STATUS.NONE})
    )
    SELECT status, COUNT(*)::text AS count
    FROM validators_with_provider
    WHERE 1=1
    ${searchClause}
    ${providerClause}
    GROUP BY status
    ORDER BY count DESC;
  `;

  return rows
    .filter(item => (isActiveRollup ? item.status !== VALIDATOR_STATUS.NONE : true))
    .map(item => ({ status: item.status, count: parseInt(item.count, 10) }));
}
