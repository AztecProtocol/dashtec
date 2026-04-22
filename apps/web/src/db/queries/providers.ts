import { Prisma } from '@dashtec/database';
import { VALIDATOR_STATUS } from '@/utils/constants';
import { rollupWhereClause, rollupWhereClauseFor } from '@/lib/rollupParam';

/** Shared rollup filtering options for provider queries */
interface RollupOptions {
  rollupAddresses?: string[];
  isActiveRollup?: boolean;
}

/**
 * Get all providers with their attesters and aggregated performance
 */
export function createProvidersWithAttestersQuery(options?: {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
} & RollupOptions): Prisma.Sql {
  const { search, sortBy = 'total_attesters', sortOrder = 'desc', limit, offset, rollupAddresses, isActiveRollup = true } = options || {};

  const searchCondition = search
    ? Prisma.sql`AND (
        p."providerIdentifier" ILIKE ${`%${search}%`}
        OR p."providerAdmin" ILIKE ${`%${search}%`}
        OR COALESCE(pm.name, 'Provider ' || p."providerIdentifier") ILIKE ${`%${search}%`}
      )`
    : Prisma.empty;

  let orderByClause: Prisma.Sql;
  switch (sortBy) {
    case 'identifier':
      orderByClause = Prisma.sql`p."providerIdentifier"`;
      break;
    case 'totalAttesters':
      orderByClause = Prisma.sql`total_attesters`;
      break;
    case 'activeAttesters':
      orderByClause = Prisma.sql`active_attesters`;
      break;
    case 'totalStaked':
      orderByClause = Prisma.sql`total_staked`;
      break;
    case 'activeStaked':
      orderByClause = Prisma.sql`active_staked`;
      break;
    case 'createdAt':
      orderByClause = Prisma.sql`p.timestamp`;
      break;
    default:
      orderByClause = Prisma.sql`total_attesters`;
  }

  const orderDirection = sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const limitClause = limit ? Prisma.sql`LIMIT ${limit}` : Prisma.empty;
  const offsetClause = offset ? Prisma.sql`OFFSET ${offset}` : Prisma.empty;

  return Prisma.sql`
    SELECT
      p.id,
      p."providerIdentifier",
      COALESCE(pm.name, 'Provider ' || p."providerIdentifier") as "providerName",
      p."providerAdmin",
      p."providerTakeRate",
      p."rewardsRecipient",
      p."blockNumber",
      p."txHash",
      p.timestamp,
      pm.name as "metadataName",
      pm.description as "metadataDescription",
      pm.website as "metadataWebsite",
      pm."logoUrl" as "metadataLogoUrl",
      pm.email as "metadataEmail",
      pm.discord as "metadataDiscord",
      ${!isActiveRollup && rollupAddresses?.length
      ? Prisma.sql`COUNT(CASE WHEN vr.address IS NOT NULL THEN mpvl."attesterAddress" END) as total_attesters,
      COUNT(CASE WHEN vr.migration_status = 'active' THEN vr.address END) as active_attesters,
      COALESCE(SUM(CASE WHEN vr.migration_status = 'active' THEN CAST(v.stake_balance AS NUMERIC) ELSE 0 END), 0) as active_staked,
      COALESCE(SUM(CASE WHEN vr.address IS NOT NULL THEN CAST(COALESCE(v.stake_balance, '0') AS NUMERIC) ELSE 0 END), 0) as total_staked`
      : Prisma.sql`COUNT(CASE WHEN v.address IS NOT NULL AND v.status NOT IN (${VALIDATOR_STATUS.NONE}) THEN mpvl."attesterAddress" END) as total_attesters,
      COUNT(CASE WHEN v.status = ${VALIDATOR_STATUS.ACTIVE} AND v.address IS NOT NULL THEN v.address END) as active_attesters,
      COALESCE(SUM(CASE WHEN v.status = ${VALIDATOR_STATUS.ACTIVE} AND v.address IS NOT NULL THEN CAST(v.stake_balance AS NUMERIC) ELSE 0 END), 0) as active_staked,
      COALESCE(SUM(CASE WHEN v.address IS NOT NULL AND v.status NOT IN (${VALIDATOR_STATUS.NONE}) THEN CAST(v.stake_balance AS NUMERIC) ELSE 0 END), 0) as total_staked`}
    FROM "Provider" p
    LEFT JOIN "ProviderMetadata" pm ON p."providerIdentifier" = pm."providerIdentifier"
    LEFT JOIN "MaterializerProviderValidatorList" mpvl ON p."providerIdentifier" = mpvl."providerIdentifier"
    LEFT JOIN "Validator" v ON LOWER(mpvl."attesterAddress") = LOWER(v.address)
    ${!isActiveRollup && rollupAddresses?.length
      ? Prisma.sql`LEFT JOIN "ValidatorRollup" vr ON mpvl."attesterAddress" = vr.address AND ${rollupWhereClauseFor('vr', rollupAddresses)}`
      : Prisma.empty}
    WHERE 1=1
    ${searchCondition}
    GROUP BY p.id, p."providerIdentifier", p."providerAdmin", p."providerTakeRate",
             p."rewardsRecipient", p."blockNumber", p."txHash", p.timestamp, pm.id
    ORDER BY ${orderByClause} ${orderDirection}
    ${limitClause}
    ${offsetClause}
  `;
}

/**
 * Get total count of providers (for pagination)
 */
export function createProvidersCountQuery(search?: string): Prisma.Sql {
  const searchCondition = search
    ? Prisma.sql`AND (
        "providerIdentifier" ILIKE ${`%${search}%`}
        OR "providerAdmin" ILIKE ${`%${search}%`}
        OR ('Provider ' || "providerIdentifier") ILIKE ${`%${search}%`}
      )`
    : Prisma.empty;

  return Prisma.sql`
    SELECT COUNT(DISTINCT id) as total
    FROM "Provider"
    WHERE 1=1
    ${searchCondition}
  `;
}

/**
 * Get network-wide aggregates for all providers (not paginated)
 */
export function createNetworkAggregatesQuery(options?: RollupOptions): Prisma.Sql {
  const { rollupAddresses, isActiveRollup = true } = options || {};
  return Prisma.sql`
    SELECT
      ${!isActiveRollup && rollupAddresses?.length
      ? Prisma.sql`COUNT(CASE WHEN vr.address IS NOT NULL THEN mpvl."attesterAddress" END) as total_sequencers,
      COUNT(CASE WHEN vr.migration_status = 'active' THEN vr.address END) as active_sequencers,
      COALESCE(SUM(CASE WHEN vr.migration_status = 'active' THEN CAST(v.stake_balance AS NUMERIC) ELSE 0 END), 0) as active_staked,
      COALESCE(SUM(CASE WHEN vr.address IS NOT NULL THEN CAST(COALESCE(v.stake_balance, '0') AS NUMERIC) ELSE 0 END), 0) as total_staked`
      : Prisma.sql`COUNT(CASE WHEN v.status NOT IN (${VALIDATOR_STATUS.NONE}) THEN mpvl."attesterAddress" END) as total_sequencers,
      COUNT(CASE WHEN v.status = ${VALIDATOR_STATUS.ACTIVE} AND v.address IS NOT NULL THEN v.address END) as active_sequencers,
      COALESCE(SUM(CASE WHEN v.status = ${VALIDATOR_STATUS.ACTIVE} AND v.address IS NOT NULL THEN CAST(v.stake_balance AS NUMERIC) ELSE 0 END), 0) as active_staked,
      COALESCE(SUM(CASE WHEN v.status NOT IN (${VALIDATOR_STATUS.NONE}) THEN CAST(COALESCE(v.stake_balance, '0') AS NUMERIC) ELSE 0 END), 0) as total_staked`}
    FROM "Provider" p
    LEFT JOIN "MaterializerProviderValidatorList" mpvl ON p."providerIdentifier" = mpvl."providerIdentifier"
    LEFT JOIN "Validator" v ON LOWER(mpvl."attesterAddress") = LOWER(v.address)
    ${!isActiveRollup && rollupAddresses?.length
      ? Prisma.sql`LEFT JOIN "ValidatorRollup" vr ON mpvl."attesterAddress" = vr.address AND ${rollupWhereClauseFor('vr', rollupAddresses)}`
      : Prisma.empty}
    LEFT JOIN "ValidatorQueue" vq ON LOWER(mpvl."attesterAddress") = LOWER(vq.attester_address)
  `;
}

/**
 * Get attesters for a specific provider
 */
export function createProviderAttestersQuery(providerIdentifier: string, options?: RollupOptions): Prisma.Sql {
  const { rollupAddresses, isActiveRollup = true } = options || {};
  return Prisma.sql`
    SELECT
      mpvl."providerIdentifier",
      mpvl."attesterAddress",
      mpvl."timestamp",
      mpvl."blockNumber",
      mpvl."txHash",
      'ADD' as "last_event",
      v.name,
      v.validator_hex_index,
      v.status,
      ${!isActiveRollup && rollupAddresses?.length
      ? Prisma.sql`vr.migration_status as migration_status`
      : Prisma.sql`NULL as migration_status`},
      v.stake_balance,
      v.x_handle,
      v.x_image_url,
      v."discordUsername",
      v."discordAvatar",
      CASE
        WHEN vq.attester_address IS NOT NULL AND v.address IS NULL AND (v.status IS NULL)
        THEN true
        ELSE false
      END as is_in_queue
    FROM "MaterializerProviderValidatorList" mpvl
    LEFT JOIN "Validator" v ON mpvl."attesterAddress" = v.address
    ${!isActiveRollup && rollupAddresses?.length
      ? Prisma.sql`LEFT JOIN "ValidatorRollup" vr ON mpvl."attesterAddress" = vr.address AND ${rollupWhereClauseFor('vr', rollupAddresses)}`
      : Prisma.empty}
    LEFT JOIN "ValidatorQueue" vq ON mpvl."attesterAddress" = vq.attester_address
    WHERE mpvl."providerIdentifier" = ${providerIdentifier}
    ${!isActiveRollup && rollupAddresses?.length
      ? Prisma.sql`AND (vr.address IS NOT NULL OR vq.attester_address IS NOT NULL)`
      : Prisma.sql`AND ((v.address IS NOT NULL AND v.status NOT IN (${VALIDATOR_STATUS.NONE})) OR vq.attester_address IS NOT NULL)`}
    ORDER BY mpvl."blockNumber" DESC, mpvl."logIndex" DESC
  `;
}

/**
 * Get aggregated performance for provider attesters
 */
export function createProviderPerformanceQuery(
  attesterAddresses: string[],
  epochLimit?: number,
  rollupAddresses?: string[]
): Prisma.Sql {
  const rollupFilter = rollupAddresses?.length
    ? Prisma.sql`AND ${rollupWhereClause(rollupAddresses)}`
    : Prisma.empty;

  if (epochLimit) {
    return Prisma.sql`
      WITH latest_epochs AS (
        SELECT
          validator_address,
          attestations_successful,
          attestations_missed,
          checkpoints_proposed,
          checkpoints_mined,
          checkpoints_missed,
          blocks_missed
        FROM (
          SELECT
            validator_address,
            attestations_successful,
            attestations_missed,
            checkpoints_proposed,
            checkpoints_mined,
            checkpoints_missed,
            blocks_missed,
            ROW_NUMBER() OVER (PARTITION BY validator_address ORDER BY epoch_number::bigint DESC) as rn
          FROM "ValidatorEpochPerformance"
          WHERE LOWER(validator_address) = ANY(${attesterAddresses.map(a => a.toLowerCase())}::varchar[])
          ${rollupFilter}
        ) ranked
        WHERE rn <= ${epochLimit}
      )
      SELECT
        validator_address,
        SUM(attestations_successful) as total_attestations_successful,
        SUM(attestations_missed) as total_attestations_missed,
        SUM(checkpoints_proposed) as total_checkpoints_proposed,
        SUM(checkpoints_mined) as total_checkpoints_mined,
        SUM(checkpoints_missed) as total_checkpoints_missed,
        SUM(blocks_missed) as total_blocks_missed
      FROM latest_epochs
      GROUP BY validator_address
    `;
  }

  return Prisma.sql`
    SELECT
      validator_address,
      SUM(attestations_successful) as total_attestations_successful,
      SUM(attestations_missed) as total_attestations_missed,
      SUM(checkpoints_proposed) as total_checkpoints_proposed,
      SUM(checkpoints_mined) as total_checkpoints_mined,
      SUM(checkpoints_missed) as total_checkpoints_missed,
      SUM(blocks_missed) as total_blocks_missed
    FROM "ValidatorEpochPerformance"
    WHERE LOWER(validator_address) = ANY(${attesterAddresses.map(a => a.toLowerCase())}::varchar[])
    ${rollupFilter}
    GROUP BY validator_address
  `;
}

/**
 * Get recent performance history for provider attesters (last N epochs)
 */
export function createProviderPerformanceHistoryQuery(
  attesterAddresses: string[],
  limit: number = 10
): Prisma.Sql {
  return Prisma.sql`
    SELECT
      validator_address,
      epoch_number,
      attestations_successful,
      attestations_missed,
      checkpoints_proposed,
      checkpoints_mined,
      checkpoints_missed,
      blocks_missed,
      ROW_NUMBER() OVER (PARTITION BY validator_address ORDER BY epoch_number::bigint DESC) as rn
    FROM "ValidatorEpochPerformance"
    WHERE LOWER(validator_address) = ANY(${attesterAddresses.map(a => a.toLowerCase())}::varchar[])
    AND rn <= ${limit}
    ORDER BY epoch_number DESC
  `;
}

/**
 * Get a single provider by identifier
 */
export function createProviderByIdentifierQuery(identifier: string): Prisma.Sql {
  return Prisma.sql`
    SELECT
      p.id,
      p."providerIdentifier",
      p."providerAdmin",
      p."providerTakeRate",
      p."rewardsRecipient",
      p."blockNumber",
      p."txHash",
      p.timestamp,
      pm.name as "metadataName",
      pm.description as "metadataDescription",
      pm.website as "metadataWebsite",
      pm."logoUrl" as "metadataLogoUrl",
      pm.email as "metadataEmail",
      pm.discord as "metadataDiscord"
    FROM "Provider" p
    LEFT JOIN "ProviderMetadata" pm ON p."providerIdentifier" = pm."providerIdentifier"
    WHERE p."providerIdentifier" = ${identifier}
  `;
}

/**
 * Get provider stats aggregated across all attesters
 */
export function createProviderStatsQuery(
  providerIdentifier: string,
  epochLimit?: number
): Prisma.Sql {
  if (epochLimit) {
    return Prisma.sql`
      WITH provider_validators AS (
        SELECT DISTINCT
          mpvl."attesterAddress",
          v.status,
          v.stake_balance
        FROM "MaterializerProviderValidatorList" mpvl
        LEFT JOIN "Validator" v ON LOWER(mpvl."attesterAddress") = LOWER(v.address)
        WHERE mpvl."providerIdentifier" = ${providerIdentifier}
          AND v.address IS NOT NULL
      ),
      latest_performance AS (
        SELECT
          validator_address,
          attestations_successful,
          attestations_missed,
          checkpoints_proposed,
          checkpoints_mined,
          checkpoints_missed,
          blocks_missed
        FROM (
          SELECT
            validator_address,
            attestations_successful,
            attestations_missed,
            checkpoints_proposed,
            checkpoints_mined,
            checkpoints_missed,
            blocks_missed,
            ROW_NUMBER() OVER (PARTITION BY validator_address ORDER BY epoch_number::bigint DESC) as rn
          FROM "ValidatorEpochPerformance"
          WHERE LOWER(validator_address) IN (SELECT LOWER("attesterAddress") FROM provider_validators)
        ) ranked
        WHERE rn <= ${epochLimit}
      )
      SELECT
        COUNT(DISTINCT pv."attesterAddress") as total_attesters,
        COUNT(DISTINCT CASE WHEN pv.status = ${VALIDATOR_STATUS.ACTIVE} THEN pv."attesterAddress" END) as active_attesters,
        COALESCE(SUM(pv.stake_balance), 0) as total_staked,
        COALESCE(SUM(lp.attestations_successful), 0) as total_attestations_successful,
        COALESCE(SUM(lp.attestations_missed), 0) as total_attestations_missed,
        COALESCE(SUM(lp.checkpoints_proposed), 0) as total_checkpoints_proposed,
        COALESCE(SUM(lp.checkpoints_mined), 0) as total_checkpoints_mined,
        COALESCE(SUM(lp.checkpoints_missed), 0) as total_checkpoints_missed,
        COALESCE(SUM(lp.blocks_missed), 0) as total_blocks_missed
      FROM provider_validators pv
      LEFT JOIN latest_performance lp ON LOWER(pv."attesterAddress") = LOWER(lp.validator_address)
    `;
  }

  return Prisma.sql`
    WITH provider_validators AS (
      SELECT DISTINCT
        mpvl."attesterAddress",
        v.status,
        v.stake_balance
      FROM "MaterializerProviderValidatorList" mpvl
      LEFT JOIN "Validator" v ON LOWER(mpvl."attesterAddress") = LOWER(v.address)
      WHERE mpvl."providerIdentifier" = ${providerIdentifier}
        AND v.address IS NOT NULL
    )
    SELECT
      COUNT(DISTINCT pv."attesterAddress") as total_attesters,
      COUNT(DISTINCT CASE WHEN pv.status = ${VALIDATOR_STATUS.ACTIVE} THEN pv."attesterAddress" END) as active_attesters,
      COALESCE(SUM(pv.stake_balance), 0) as total_staked,
      COALESCE(SUM(vep.attestations_successful), 0) as total_attestations_successful,
      COALESCE(SUM(vep.attestations_missed), 0) as total_attestations_missed,
      COALESCE(SUM(vep.checkpoints_proposed), 0) as total_checkpoints_proposed,
      COALESCE(SUM(vep.checkpoints_mined), 0) as total_checkpoints_mined,
      COALESCE(SUM(vep.checkpoints_missed), 0) as total_checkpoints_missed,
      COALESCE(SUM(vep.blocks_missed), 0) as total_blocks_missed
    FROM provider_validators pv
    LEFT JOIN "ValidatorEpochPerformance" vep ON LOWER(pv."attesterAddress") = LOWER(vep.validator_address)
  `;
}

/**
 * Per-rollup remaining-sequencer breakdown for a provider.
 * Joins MaterializerProviderValidatorList → Validator (via lowercased address)
 * and groups by the validator's current rollup_address. Excludes None status.
 */
export function createProviderRollupBreakdownQuery(identifier: string): Prisma.Sql {
  return Prisma.sql`
    SELECT v.rollup_address, COUNT(DISTINCT v.address)::bigint as remaining_count
    FROM "MaterializerProviderValidatorList" mpvl
    JOIN "Validator" v ON LOWER(mpvl."attesterAddress") = LOWER(v.address)
    WHERE mpvl."providerIdentifier" = ${identifier}
      AND v.status NOT IN (${VALIDATOR_STATUS.NONE})
    GROUP BY v.rollup_address
    ORDER BY remaining_count DESC
  `;
}

export function createProvidersConcentrationQuery(topN: number = 3): Prisma.Sql {
  return Prisma.sql`
    WITH provider_validators AS (
      SELECT
        p.id,
        p."providerIdentifier",
        COALESCE(pm.name, 'Provider ' || p."providerIdentifier") as "providerName",
        COUNT(CASE WHEN v.address IS NOT NULL THEN mpvl."attesterAddress" END) as validator_count
      FROM "Provider" p
      LEFT JOIN "ProviderMetadata" pm ON p."providerIdentifier" = pm."providerIdentifier"
      LEFT JOIN "MaterializerProviderValidatorList" mpvl ON p."providerIdentifier" = mpvl."providerIdentifier"
      LEFT JOIN "Validator" v ON LOWER(mpvl."attesterAddress") = LOWER(v.address)
      WHERE v.status NOT IN (${VALIDATOR_STATUS.NONE})
      GROUP BY p.id, p."providerIdentifier", pm.name
      HAVING COUNT(CASE WHEN v.address IS NOT NULL THEN mpvl."attesterAddress" END) > 0
    ),
    total_validators AS (
      SELECT SUM(validator_count) as total FROM provider_validators
    ),
    top_providers AS (
      SELECT
        "providerName",
        validator_count,
        ROW_NUMBER() OVER (ORDER BY validator_count DESC) as rank
      FROM provider_validators
      ORDER BY validator_count DESC
      LIMIT ${topN}
    )
    SELECT
      tp."providerName",
      tp.validator_count,
      tp.rank,
      tv.total as total_validators,
      ROUND((tp.validator_count::numeric / NULLIF(tv.total, 0)::numeric * 100), 2) as percentage
    FROM top_providers tp
    CROSS JOIN total_validators tv
    ORDER BY tp.rank
  `;
}
