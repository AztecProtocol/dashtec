import { Prisma } from '@dashtec/database';
import prisma from '@/lib/prisma';
import { VALIDATOR_STATUS } from '@dashtec/shared-types';

/**
 * Migration between two rollup versions, from the old rollup's point of view.
 *
 * The cohort is every validator with a ValidatorRollup row on `from`. Its
 * migration_status already says where each one went: 'migrated' once the
 * collector sees it on the current rollup, 'exiting'/'exited' from the old
 * rollup's withdrawal events, and 'active' while it is still only on `from`.
 */

export type MigrationBucket = 'migrated' | 'active' | 'exiting' | 'exited';

interface BucketRow {
  bucket: MigrationBucket;
  count: bigint;
  stake: string;
}

interface ProviderRow {
  provider_identifier: string | null;
  provider_name: string | null;
  provider_logo_url: string | null;
  migrated: bigint;
  active: bigint;
  exiting: bigint;
  exited: bigint;
  active_stake: string;
}

interface RemainingRow {
  address: string;
  validator_hex_index: string | null;
  name: string | null;
  x_handle: string | null;
  discordUsername: string | null;
  x_image_url: string | null;
  status: string;
  stake_text: string;
  provider_identifier: string | null;
  provider_name: string | null;
  total_count: bigint;
}

function cohortCTE(fromRollup: string): Prisma.Sql {
  return Prisma.sql`
    cohort AS (
      SELECT
        v.address,
        v.validator_hex_index,
        v.name,
        v.x_handle,
        v."discordUsername",
        v.x_image_url,
        v.status,
        COALESCE(v.stake_balance, 0)::numeric(78, 0) AS stake,
        vr.migration_status AS bucket,
        pa_latest."providerIdentifier" AS provider_identifier,
        pm.name AS provider_name,
        pm."logoUrl" AS provider_logo_url
      FROM "ValidatorRollup" vr
      JOIN "Validator" v ON v.address = vr.address
      LEFT JOIN LATERAL (
        SELECT DISTINCT ON (pa."attesterAddress")
          pa."providerIdentifier"
        FROM "ProviderAttester" pa
        WHERE pa."attesterAddress" = v.address
        ORDER BY pa."attesterAddress", pa."blockNumber" DESC, pa."logIndex" DESC
      ) pa_latest ON true
      LEFT JOIN "ProviderMetadata" pm
        ON pm."providerIdentifier" = pa_latest."providerIdentifier"
      WHERE vr.rollup_address = ${fromRollup}
        AND v.status != ${VALIDATOR_STATUS.NONE}
    )
  `;
}

export async function fetchMigrationSummary(fromRollup: string) {
  const rows = await prisma.$queryRaw<BucketRow[]>`
    WITH ${cohortCTE(fromRollup)}
    SELECT bucket, COUNT(*) AS count, SUM(stake)::text AS stake
    FROM cohort
    GROUP BY bucket
  `;

  const empty = { count: 0, stake: '0' };
  const summary: Record<MigrationBucket, { count: number; stake: string }> = {
    migrated: { ...empty },
    active: { ...empty },
    exiting: { ...empty },
    exited: { ...empty },
  };
  for (const row of rows) {
    if (row.bucket in summary) {
      summary[row.bucket] = { count: Number(row.count), stake: row.stake ?? '0' };
    }
  }
  return summary;
}

export async function fetchMigrationByProvider(fromRollup: string) {
  const rows = await prisma.$queryRaw<ProviderRow[]>`
    WITH ${cohortCTE(fromRollup)}
    SELECT
      provider_identifier,
      MAX(provider_name) AS provider_name,
      MAX(provider_logo_url) AS provider_logo_url,
      COUNT(*) FILTER (WHERE bucket = 'migrated') AS migrated,
      COUNT(*) FILTER (WHERE bucket = 'active') AS active,
      COUNT(*) FILTER (WHERE bucket = 'exiting') AS exiting,
      COUNT(*) FILTER (WHERE bucket = 'exited') AS exited,
      COALESCE(SUM(stake) FILTER (WHERE bucket = 'active'), 0)::text AS active_stake
    FROM cohort
    GROUP BY provider_identifier
    ORDER BY COUNT(*) FILTER (WHERE bucket = 'active') DESC, COUNT(*) DESC
  `;

  return rows.map((row) => ({
    providerIdentifier: row.provider_identifier,
    name: row.provider_name,
    logoUrl: row.provider_logo_url,
    migrated: Number(row.migrated),
    remaining: Number(row.active),
    exiting: Number(row.exiting),
    exited: Number(row.exited),
    remainingStake: row.active_stake,
  }));
}

export async function fetchRemainingValidators(
  fromRollup: string,
  { search, provider, page, limit }: { search?: string; provider?: string; page: number; limit: number },
) {
  const like = search ? `%${search.toLowerCase()}%` : null;
  const searchClause = like
    ? Prisma.sql`AND (
        LOWER(address) LIKE ${like} OR
        LOWER(COALESCE(name, '')) LIKE ${like} OR
        LOWER(COALESCE(x_handle, '')) LIKE ${like} OR
        LOWER(COALESCE("discordUsername", '')) LIKE ${like} OR
        LOWER(COALESCE(provider_name, '')) LIKE ${like}
      )`
    : Prisma.empty;
  // 'independent' selects validators without a provider, which have no identifier to match.
  const providerClause = provider === 'independent'
    ? Prisma.sql`AND provider_identifier IS NULL`
    : provider
      ? Prisma.sql`AND provider_identifier = ${provider}`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<RemainingRow[]>`
    WITH ${cohortCTE(fromRollup)}
    SELECT
      address, validator_hex_index, name, x_handle, "discordUsername", x_image_url,
      status, stake::text AS stake_text, provider_identifier, provider_name,
      COUNT(*) OVER () AS total_count
    FROM cohort
    WHERE bucket = 'active'
    ${searchClause}
    ${providerClause}
    -- cohort.stake is numeric; the text copy above would sort lexicographically.
    ORDER BY cohort.stake DESC, address
    LIMIT ${limit}
    OFFSET ${(page - 1) * limit}
  `;

  return {
    total: rows.length > 0 ? Number(rows[0].total_count) : 0,
    items: rows.map((row) => ({
      address: row.address,
      index: row.validator_hex_index,
      name: row.name,
      xHandle: row.x_handle,
      discordUsername: row.discordUsername,
      imageUrl: row.x_image_url,
      status: row.status,
      stake: row.stake_text,
      provider: row.provider_identifier
        ? { providerIdentifier: row.provider_identifier, name: row.provider_name }
        : null,
    })),
  };
}
