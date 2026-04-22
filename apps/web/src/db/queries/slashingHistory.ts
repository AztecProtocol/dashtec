import prisma from '@/lib/prisma';

export interface ValidatorIdentityRow {
  address: string;
  name: string | null;
  x_handle: string | null;
  x_image_url: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  providerIdentifier: string | null;
  provider_name: string | null;
  provider_description: string | null;
  provider_website: string | null;
  provider_logo_url: string | null;
  provider_email: string | null;
  provider_discord: string | null;
}

/** Convicted attesters for a slashing round, ordered by amount descending. */
export function fetchConvictedAttesters(roundNumber: number, rollupAddresses: string[]) {
  return prisma.tallySlashAction.findMany({
    where: { round_number: roundNumber, rollup_address: { in: rollupAddresses } },
    select: { validator_address: true, slash_amount: true },
    orderBy: { slash_amount: 'desc' },
  });
}

/** Votes cast in a slashing round, ordered by vote date descending. */
export function fetchVotesCast(roundNumber: number, rollupAddresses: string[]) {
  return prisma.tallyVoteCast.findMany({
    where: { round_number: roundNumber, rollup_address: { in: rollupAddresses } },
    select: {
      proposer_address: true,
      vote_date: true,
      transaction_hash: true,
      block_number: true,
    },
    orderBy: { vote_date: 'desc' },
  });
}

/** Round-execution metadata for a slashing round (or null if not found). */
export function fetchRoundExecution(roundNumber: number, rollupAddresses: string[]) {
  return prisma.tallyRoundExecuted.findFirst({
    where: { round_number: roundNumber, rollup_address: { in: rollupAddresses } },
    select: {
      round_number: true,
      slash_count: true,
      executed_date: true,
      transaction_hash: true,
      block_number: true,
      contract_address: true,
    },
  });
}

/**
 * Bulk-fetch validator identity (name/handle/avatar/provider) for a set of addresses.
 * Uses a LATERAL join to pick the most recent ProviderAttester row per address.
 */
export async function fetchValidatorIdentities(
  addresses: string[],
): Promise<ValidatorIdentityRow[]> {
  if (addresses.length === 0) return [];
  return prisma.$queryRaw<ValidatorIdentityRow[]>`
    SELECT
      v.address,
      v.name,
      v.x_handle,
      v.x_image_url,
      v."discordUsername",
      v."discordAvatar",
      pa_latest."providerIdentifier",
      pm.name AS provider_name,
      pm.description AS provider_description,
      pm.website AS provider_website,
      pm."logoUrl" AS provider_logo_url,
      pm.email AS provider_email,
      pm.discord AS provider_discord
    FROM "Validator" v
    LEFT JOIN LATERAL (
      SELECT DISTINCT ON (pa."attesterAddress")
        pa."providerIdentifier"
      FROM "ProviderAttester" pa
      WHERE pa."attesterAddress" = v.address
      ORDER BY pa."attesterAddress", pa."blockNumber" DESC, pa."logIndex" DESC
    ) pa_latest ON true
    LEFT JOIN "ProviderMetadata" pm ON pm."providerIdentifier" = pa_latest."providerIdentifier"
    WHERE v.address = ANY(${addresses}::text[])
  `;
}
