import { Prisma } from '@dashtec/database';

// Re-export types from centralized location
export type {
  BaseCTEOptions,
  SourceCTEOptions,
  ValidatorAggregatesCTEOptions,
  ValidatorScoresCTEOptions,
  FinalSelectionOptions
} from '@/types/queries/validatorAggregates';

import type {
  BaseCTEOptions,
  SourceCTEOptions,
  ValidatorAggregatesCTEOptions,
  ValidatorScoresCTEOptions,
  FinalSelectionOptions
} from '@/types/queries/validatorAggregates';
import { VALIDATOR_STATUS } from '@dashtec/shared-types';

/**
 * Stage 1: Aggregate validator performance data
 * Single Responsibility: Only handles data aggregation from database
 */
export function createValidatorAggregatesCTE(options: ValidatorAggregatesCTEOptions = {}): Prisma.Sql {
  const {
    targetTable = 'all_validator_aggregates',
    epochFilter = Prisma.sql``,
    rollupAddresses = [],
    isActiveRollup = false,
  } = options;

  return Prisma.sql`
    ${Prisma.raw(targetTable)} AS (
      SELECT
        v.address,
        v.validator_hex_index,
        v.stake_balance,
        v.status,
        v.activation_date,
        v.x_handle,
        v.name,
        v.x_user_id,
        v.x_image_url,
        v."discordId",
        v."discordUsername",
        v."discordAvatar",
        vr.migration_status,
        vr.deposit_type,
        CASE WHEN vq.attester_address IS NOT NULL THEN true ELSE false END as is_in_queue,
        pa_latest."providerIdentifier",
        pm.name AS provider_name,
        pm.description AS provider_description,
        pm.website AS provider_website,
        pm."logoUrl" AS provider_logo_url,
        pm.email AS provider_email,
        pm.discord AS provider_discord,
        COALESCE(SUM(vep.attestations_successful), 0) AS total_attestations_successful,
        COALESCE(SUM(vep.attestations_missed), 0) AS total_attestations_missed,
        COALESCE(SUM(vep.checkpoints_proposed), 0) AS total_checkpoints_proposed,
        COALESCE(SUM(vep.checkpoints_mined), 0) AS total_checkpoints_mined,
        COALESCE(SUM(vep.checkpoints_missed), 0) AS total_checkpoints_missed,
        COALESCE(SUM(vep.blocks_missed), 0) AS total_blocks_missed,
        COALESCE(MAX(CASE WHEN vep.checkpoints_proposed != 0 THEN vep.epoch_number ELSE NULL END), 0) AS max_epoch_with_checkpoints_proposed,
        COALESCE(MAX(CASE WHEN vep.checkpoints_mined != 0 THEN vep.epoch_number ELSE NULL END), 0) AS max_epoch_with_checkpoints_mined,
        COALESCE(COUNT(DISTINCT vep.epoch_number), 0) AS total_participating_epochs
      FROM "ValidatorRollup" vr
      JOIN "Validator" v ON v.address = vr.address
      LEFT JOIN "ValidatorEpochPerformance" vep
        ON v.address = vep.validator_address
        AND vep.rollup_address = vr.rollup_address
        ${epochFilter}
      LEFT JOIN "ValidatorQueue" vq
        ON v.address = vq.attester_address
        AND vq.rollup_address = vr.rollup_address
      LEFT JOIN LATERAL (
        SELECT DISTINCT ON (pa."attesterAddress")
          pa."providerIdentifier"
        FROM "ProviderAttester" pa
        WHERE pa."attesterAddress" = v.address
        ORDER BY pa."attesterAddress", pa."blockNumber" DESC, pa."logIndex" DESC
      ) pa_latest ON true
      LEFT JOIN "ProviderMetadata" pm
        ON pa_latest."providerIdentifier" = pm."providerIdentifier"
      WHERE vr.rollup_address IN (${Prisma.join(rollupAddresses)})
      AND v.rollup_address IN (${Prisma.join(rollupAddresses)})
      AND v.status NOT IN (${VALIDATOR_STATUS.NONE})
      GROUP BY
        v.address, v.validator_hex_index, v.stake_balance, v.status,
        v.activation_date, v.x_handle, v.name, v.x_user_id,
        v.x_image_url, v."discordId", v."discordUsername", v."discordAvatar",
        vr.migration_status, vr.deposit_type, vq.attester_address,
        pa_latest."providerIdentifier", pm.name, pm.description, pm.website, pm."logoUrl", pm.email, pm.discord
    )
  `;
}

/**
 * Stage 2: Calculate max values for normalization
 * Single Responsibility: Only handles normalization value calculation
 */
export function createMaxValuesCTE(options: SourceCTEOptions = {}): Prisma.Sql {
  const {
    targetTable = 'max_values',
    sourceTable = 'all_validator_aggregates',
  } = options;

  return Prisma.sql`
    ${Prisma.raw(targetTable)} AS (
      SELECT
        MAX(total_attestations_successful + total_attestations_missed) AS max_total_attestations,
        MAX(total_checkpoints_proposed + total_checkpoints_mined) AS max_total_blocks_produced
      FROM ${Prisma.raw(sourceTable)}
    )
  `;
}

/**
 * Stage 3: Calculate rates and normalized scores
 * Single Responsibility: Handles performance score calculation logic
 */
export function createValidatorScoresCTE(options: ValidatorScoresCTEOptions = {}): Prisma.Sql {
  const {
    targetTable = 'all_validator_scores',
    sourceTable = 'all_validator_aggregates',
    maxValuesTable = 'max_values',
  } = options;

  return Prisma.sql`
    ${Prisma.raw(targetTable)} AS (
      SELECT
        va.*,
        -- Calculate attestation success rate
        CASE
          WHEN (va.total_attestations_successful + va.total_attestations_missed) > 0
          THEN ROUND((va.total_attestations_successful::numeric /
                     (va.total_attestations_successful + va.total_attestations_missed)) * 100, 2)
          ELSE NULL
        END AS attestation_success,

        -- Calculate block production rate
        CASE
          WHEN (va.total_checkpoints_proposed + va.total_checkpoints_mined + va.total_checkpoints_missed + va.total_blocks_missed) > 0
          THEN ROUND(((va.total_checkpoints_proposed + va.total_checkpoints_mined)::numeric /
                     (va.total_checkpoints_proposed + va.total_checkpoints_mined + va.total_checkpoints_missed + va.total_blocks_missed)) * 100, 2)
          ELSE 0
        END AS block_production_rate,

        -- Calculate attestation volume score (0-0.25)
        CASE
          WHEN mv.max_total_attestations > 0
          THEN ((va.total_attestations_successful + va.total_attestations_missed)::numeric / mv.max_total_attestations) * 0.25
          ELSE 0
        END AS attestation_volume_score,

        -- Calculate attestation success rate score (0-0.35)
        CASE
          WHEN (va.total_attestations_successful + va.total_attestations_missed) > 0
          THEN (va.total_attestations_successful::numeric / (va.total_attestations_successful + va.total_attestations_missed)) * 0.35
          ELSE 0
        END AS attestation_success_score,

        -- Calculate block production volume score (0-0.20)
        CASE
          WHEN mv.max_total_blocks_produced > 0
          THEN ((va.total_checkpoints_proposed + va.total_checkpoints_mined)::numeric / mv.max_total_blocks_produced) * 0.20
          ELSE 0
        END AS block_volume_score,

        -- Calculate block production success rate score (0-0.20)
        CASE
          WHEN (va.total_checkpoints_proposed + va.total_checkpoints_mined + va.total_checkpoints_missed + va.total_blocks_missed) > 0
          THEN ((va.total_checkpoints_proposed + va.total_checkpoints_mined)::numeric /
               (va.total_checkpoints_proposed + va.total_checkpoints_mined + va.total_checkpoints_missed + va.total_blocks_missed)) * 0.20
          ELSE 0
        END AS block_success_score,
        va.total_checkpoints_proposed + va.total_checkpoints_mined - va.total_checkpoints_missed - va.total_blocks_missed as block_production_volume_abs,
        va.total_attestations_successful - va.total_attestations_missed as attestations_volume_abs,
        mv.max_total_attestations,
        mv.max_total_blocks_produced
      FROM ${Prisma.raw(sourceTable)} va
      CROSS JOIN ${Prisma.raw(maxValuesTable)} mv
    )
  `;
}

/**
 * Stage 4: Calculate final performance scores
 * Single Responsibility: Combines component scores into final score
 */
export function createFinalScoresCTE(options: SourceCTEOptions = {}): Prisma.Sql {
  const {
    targetTable = 'all_final_scores',
    sourceTable = 'all_validator_scores',
  } = options;

  return Prisma.sql`
    ${Prisma.raw(targetTable)} AS (
      SELECT
        *,
        ROUND(
          attestation_volume_score +
          attestation_success_score +
          block_volume_score +
          block_success_score,
          3
        ) AS performance_score
      FROM ${Prisma.raw(sourceTable)}
    )
  `;
}

/**
 * Stage 5: Assign global ranks
 * Single Responsibility: Handles ranking logic
 */
export function createRankedValidatorsCTE(options: SourceCTEOptions = {}): Prisma.Sql {
  const {
    targetTable = 'all_ranked_validators',
    sourceTable = 'all_final_scores',
  } = options;

  return Prisma.sql`
    ${Prisma.raw(targetTable)} AS (
      SELECT
        *,
        ROW_NUMBER() OVER (ORDER BY performance_score DESC, total_attestations_successful DESC) AS rank
      FROM ${Prisma.raw(sourceTable)}
    )
  `;
}

/**
 * Final selection with all fields
 * Single Responsibility: Maps database columns to API response format
 */
export function createFinalSelection(options: FinalSelectionOptions = {}): Prisma.Sql {
  const {
    sourceTable = 'all_ranked_validators',
    includeCount = false,
  } = options;

  const countColumn = includeCount
    ? Prisma.sql`, COUNT(*) OVER () AS total_count`
    : Prisma.sql``;

  return Prisma.sql`
    SELECT
      address,
      validator_hex_index AS index,
      stake_balance AS balance,
      status,
      activation_date AS "activationDate",
      x_handle,
      name,
      x_user_id AS "x_user_id",
      x_image_url AS "x_image_url",
      "discordId",
      "discordUsername",
      "discordAvatar",
      "providerIdentifier",
      provider_name,
      provider_description,
      provider_website,
      provider_logo_url,
      provider_email,
      provider_discord,
      total_attestations_successful AS "totalAttestationsSucceeded",
      total_attestations_missed AS "totalAttestationsMissed",
      total_checkpoints_proposed AS "totalCheckpointsProposed",
      total_checkpoints_mined AS "totalCheckpointsMined",
      total_checkpoints_missed AS "totalCheckpointsMissed",
      total_blocks_missed AS "totalBlocksMissed",
      max_epoch_with_checkpoints_proposed AS "maxEpochWithBlocksProposed",
      max_epoch_with_checkpoints_mined AS "maxEpochWithBlocksMined",
      total_participating_epochs AS "totalParticipatingEpochs",
      attestation_success AS "attestationSuccess",
      block_production_rate AS "proposalSuccess",
      performance_score AS "performanceScore",
      rank::integer AS rank,
      is_in_queue,
      migration_status AS "migrationStatus",
      deposit_type AS "depositType"
      ${countColumn},
      max_total_attestations::integer,
      max_total_blocks_produced::integer
    FROM ${Prisma.raw(sourceTable)}
  `;
}
