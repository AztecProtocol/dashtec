import type { RankedValidatorRow } from '@/db/queries/validators';
import type { ValidatorPerformance } from '@/types/validator';

/**
 * Map a single ranked-validator query row into the API DTO consumed by the
 * dashboard. Numbers come back from Postgres as bigint via Prisma; we coerce
 * to number for the wire format. Provider columns are flattened into a
 * nested object.
 *
 * The cast preserves the original route's behavior — Postgres `status` is a
 * free-form text column, but the API type narrows to ValidatorStatusEnum.
 */
export function mapValidatorRow(r: RankedValidatorRow): ValidatorPerformance {
  return {
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
    provider: r.providerIdentifier
      ? {
          providerIdentifier: r.providerIdentifier,
          name: r.provider_name,
          description: r.provider_description,
          website: r.provider_website,
          logoUrl: r.provider_logo_url,
          email: r.provider_email,
          discord: r.provider_discord,
        }
      : null,
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
    isInQueue: r.is_in_queue,
    migrationStatus: r.migrationStatus || 'active',
    depositType: r.depositType || 'rollup',
  } as unknown as ValidatorPerformance;
}
