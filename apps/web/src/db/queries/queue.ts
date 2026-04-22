import { Prisma } from '@dashtec/database';
import { rollupWhereClauseFor } from '@/lib/rollupParam';

export type { QueueWithRankRow, QueueCountRow } from '@/types/queries/queue';

/**
 * Get queued validators with their rank/position
 */
export function createQueueWithRankQuery(options: {
  search?: string;
  limit: number;
  offset: number;
  rollupAddresses?: string[];
}): Prisma.Sql {
  const { search, limit, offset, rollupAddresses } = options;

  const searchCondition = search
    ? Prisma.sql`
        WHERE (
          attester_address ILIKE ${`%${search}%`} OR
          withdrawer_address ILIKE ${`%${search}%`} OR
          transaction_hash ILIKE ${`%${search}%`}
        )
      `
    : Prisma.empty;

  return Prisma.sql`
    WITH AttesterRanked AS (
    SELECT
      "providerIdentifier",
      "attesterAddress",
      "blockNumber",
      "logIndex",
      ROW_NUMBER() OVER (
        PARTITION BY "providerIdentifier", "attesterAddress"
        ORDER BY "blockNumber", "logIndex"
      ) AS rn
    FROM "ProviderAttester"
    ),
    DripRanked AS (
    SELECT
      "providerIdentifier",
      "attesterAddress",
      "blockNumber",
      "logIndex",
      ROW_NUMBER() OVER (
        PARTITION BY "providerIdentifier", "attesterAddress"
        ORDER BY "blockNumber", "logIndex"
      ) AS rn
    FROM "ProviderQueueDrip"
    ),
    AllEvents AS (
      SELECT "providerIdentifier", "attesterAddress", "blockNumber", "logIndex", 'ADD' as event_type
      FROM AttesterRanked
      UNION ALL
      SELECT "providerIdentifier", "attesterAddress", "blockNumber", "logIndex", 'DRIP' as event_type
      FROM DripRanked
    ),
    LatestState AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY "providerIdentifier", "attesterAddress"
          ORDER BY "blockNumber" DESC, "logIndex" DESC
        ) as rn
      FROM AllEvents
    ),
    ranked_validators AS (
      SELECT
        vq.attester_address,
        vq.withdrawer_address,
        vq.transaction_hash,
        vq.queued_at,
        p."providerIdentifier" as provider_identifier,
        p."name" as provider_name,
        p."logoUrl" as provider_logo_url,
        ROW_NUMBER() OVER (ORDER BY queued_at ASC) as rank
      FROM "ValidatorQueue" as vq
      LEFT JOIN LatestState ls ON ls."attesterAddress" = "vq"."attester_address"
      LEFT JOIN "ProviderMetadata" p ON p."providerIdentifier" = ls."providerIdentifier"
      WHERE (ls.rn = 1 or ls.rn is null)
      ${rollupAddresses?.length ? Prisma.sql`AND ${rollupWhereClauseFor('vq', rollupAddresses)}` : Prisma.empty}
    )
    SELECT * FROM ranked_validators
    ${searchCondition}
    ORDER BY queued_at ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
}

/**
 * Get count of queued validators (with optional search filter)
 */
export function createQueueCountQuery(search?: string, rollupAddresses?: string[]): Prisma.Sql {
  const rollupFilter = rollupAddresses?.length
    ? Prisma.sql`AND ${rollupWhereClauseFor('"ValidatorQueue"', rollupAddresses)}`
    : Prisma.empty;

  const searchCondition = search
    ? Prisma.sql`
        AND (
          attester_address ILIKE ${`%${search}%`} OR
          withdrawer_address ILIKE ${`%${search}%`} OR
          transaction_hash ILIKE ${`%${search}%`}
        )
      `
    : Prisma.empty;

  return Prisma.sql`
    SELECT COUNT(*) as total
    FROM "ValidatorQueue"
    WHERE 1=1
    ${rollupFilter}
    ${searchCondition}
  `;
}

