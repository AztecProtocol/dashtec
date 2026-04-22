import { prisma } from '../lib/prisma';
import { IEpochService } from '../interfaces/IEpochService';
import { ValidatorAttestationData } from '../types/validatorStats';
import { CHECKPOINT_MINED, CHECKPOINT_PROPOSED, CHECKPOINT_MISSED, BLOCKS_MISSED, ATTESTATION_SENT, ATTESTATION_MISSED } from '@dashtec/shared-types';
import { createLogger } from '@dashtec/shared-utils';
import { config } from '../config/config';

const logger = createLogger('EpochService');

/**
 * Epoch Service
 *
 * Handles all epoch and attestation-related database operations
 */
export class EpochService implements IEpochService {
  /**
   * Ensure an epoch exists in the database
   */
  async ensureEpochExists(epochNumber: bigint): Promise<void> {
    try {
      await prisma.epoch.createMany({
        data: [{ epoch_number: epochNumber, rollup_address: config.ROLLUP_CONTRACT_ADDRESS }],
        skipDuplicates: true,
      });
      logger.debug(`Ensured epoch ${epochNumber} exists`);
    } catch (error) {
      logger.error(`Failed to ensure epoch ${epochNumber} exists`, { error });
      throw error;
    }
  }

  /**
   * Save a validator attestation
   */
  async saveValidatorAttestation(data: ValidatorAttestationData): Promise<void> {
    try {
      // Check epoch integrity score before updating
      const epochIntegrity = await prisma.epochIntegrityStats.findUnique({
        where: { epoch_number_rollup_address: { epoch_number: data.epoch_number, rollup_address: config.ROLLUP_CONTRACT_ADDRESS } },
        select: { integrity_score: true },
      });

      if (epochIntegrity?.integrity_score.toNumber() === 100) {
        logger.debug(`Integrity score for epoch ${data.epoch_number} is already 100. Skipping update`);
        return;
      }

      await prisma.validatorAttestation.upsert({
        where: {
          composite_attestation_key: {
            slot_number: data.slot_number,
            validator_address: data.validator_address.toLowerCase(),
            rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
          },
        },
        create: {
          slot_number: data.slot_number,
          epoch_number: data.epoch_number,
          validator_address: data.validator_address.toLowerCase(),
          rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
          timestamp: data.timestamp || new Date(),
          status: data.status,
          committee_index: data.committee_index,
        },
        update: {
          status: data.status,
          timestamp: data.timestamp || new Date(),
          committee_index: data.committee_index,
        },
      });
      logger.debug(`Saved validator attestation for ${data.validator_address} at slot ${data.slot_number}`);
    } catch (error) {
      logger.error(`Failed to save attestation for validator ${data.validator_address} at slot ${data.slot_number}`, { error });
      throw error;
    }
  }

  /**
   * Update validator performance for a specific epoch
   */
  async updateValidatorEpochPerformance(epochNumber: bigint, validatorAddress: string): Promise<void> {
    logger.debug(`Recalculating epoch performance for validator ${validatorAddress}, epoch ${epochNumber}`);

    try {
      const attestationsInEpoch = await prisma.validatorAttestation.findMany({
        where: {
          epoch_number: epochNumber,
          validator_address: validatorAddress.toLowerCase(),
          rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
        },
      });

      let successfulAttestations = 0;
      let missedAttestations = 0;
      let proposedBlocks = 0;
      let minedBlocks = 0;
      let missedCheckpoints = 0;
      let missedBlocks = 0;

      for (const att of attestationsInEpoch) {
        switch (att.status) {
          case ATTESTATION_SENT:
            successfulAttestations++;
            break;
          case ATTESTATION_MISSED:
            missedAttestations++;
            break;
          case CHECKPOINT_PROPOSED:
            proposedBlocks++;
            break;
          case CHECKPOINT_MINED:
            minedBlocks++;
            break;
          case CHECKPOINT_MISSED:
            missedCheckpoints++;
            break;
          case BLOCKS_MISSED:
            missedBlocks++;
            break;
        }
      }

      await prisma.validatorEpochPerformance.upsert({
        where: {
          unique_validator_epoch_performance: {
            epoch_number: epochNumber,
            validator_address: validatorAddress.toLowerCase(),
            rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
          },
        },
        create: {
          epoch_number: epochNumber,
          validator_address: validatorAddress.toLowerCase(),
          rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
          attestations_successful: successfulAttestations,
          attestations_missed: missedAttestations,
          checkpoints_proposed: proposedBlocks,
          checkpoints_mined: minedBlocks,
          checkpoints_missed: missedCheckpoints,
          blocks_missed: missedBlocks,
          calculated_at: new Date(),
        },
        update: {
          attestations_successful: successfulAttestations,
          attestations_missed: missedAttestations,
          checkpoints_proposed: proposedBlocks,
          checkpoints_mined: minedBlocks,
          checkpoints_missed: missedCheckpoints,
          blocks_missed: missedBlocks,
          calculated_at: new Date(),
        },
      });
      logger.debug(`Upserted recalculated epoch performance for validator ${validatorAddress}, epoch ${epochNumber}`);
    } catch (error) {
      logger.error(`Failed to update performance for validator ${validatorAddress} in epoch ${epochNumber}`, { error });
      throw error;
    }
  }

  /**
   * Update epoch-level aggregates
   */
  async updateEpochAggregates(epochNumber: bigint): Promise<void> {
    logger.debug(`Updating aggregates for Epoch ${epochNumber}`);

    try {
      const performanceRecords = await prisma.validatorEpochPerformance.findMany({
        where: { epoch_number: epochNumber, rollup_address: config.ROLLUP_CONTRACT_ADDRESS },
      });

      if (performanceRecords.length === 0) {
        logger.warn(`No validator performance records found for epoch ${epochNumber}. Setting aggregates to 0`);


        await prisma.epoch.upsert({
          where: { epoch_number_rollup_address: { epoch_number: epochNumber, rollup_address: config.ROLLUP_CONTRACT_ADDRESS } },
          create: {
            epoch_number: epochNumber,
            rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
            actual_proposals: 0,
            missed_proposals: 0,
            total_attestations_successful: BigInt(0),
            total_attestations_missed: BigInt(0),
            total_attestations_expected: BigInt(0),
            total_checkpoints_mined: BigInt(0),
            total_checkpoints_proposed: BigInt(0),
            total_checkpoints_missed: BigInt(0),
            total_blocks_missed: BigInt(0),
          },
          update: {
            actual_proposals: 0,
            missed_proposals: 0,
            total_attestations_successful: BigInt(0),
            total_attestations_missed: BigInt(0),
            total_attestations_expected: BigInt(0),
            total_checkpoints_mined: BigInt(0),
            total_checkpoints_proposed: BigInt(0),
            total_checkpoints_missed: BigInt(0),
            total_blocks_missed: BigInt(0),
          },
        });
        return;
      }

      let totalActualProposals = 0;
      let totalMissedProposals = 0;
      let totalSuccessfulAttestations = 0;
      let totalMissedAttestations = 0;
      let totalAttestations = 0;
      let totalCheckpointsMissed = 0;
      let totalBlocksMissed = 0;
      let totalBlocksMined = 0;
      let totalBlocksProposed = 0;

      for (const record of performanceRecords) {
        totalActualProposals += record.checkpoints_proposed || 0;
        totalMissedProposals += (record.checkpoints_missed || 0) + (record.blocks_missed || 0);
        totalSuccessfulAttestations += record.attestations_successful || 0;
        totalMissedAttestations += record.attestations_missed || 0;
        totalAttestations += (record.attestations_missed || 0) + (record.attestations_successful || 0);
        totalBlocksMined += record.checkpoints_mined || 0;
        totalBlocksProposed += record.checkpoints_proposed || 0;
        totalCheckpointsMissed += record.checkpoints_missed || 0;
        totalBlocksMissed += record.blocks_missed || 0;
      }

      await prisma.epoch.update({
        where: { epoch_number_rollup_address: { epoch_number: epochNumber, rollup_address: config.ROLLUP_CONTRACT_ADDRESS } },
        data: {
          actual_proposals: totalActualProposals,
          missed_proposals: totalMissedProposals,
          total_attestations_successful: BigInt(totalSuccessfulAttestations),
          total_attestations_missed: BigInt(totalMissedAttestations),
          total_attestations_expected: BigInt(totalMissedAttestations + totalSuccessfulAttestations),
          total_checkpoints_mined: BigInt(totalBlocksMined),
          total_checkpoints_proposed: BigInt(totalBlocksProposed),
          total_checkpoints_missed: BigInt(totalCheckpointsMissed),
          total_blocks_missed: BigInt(totalBlocksMissed),
        },
      });

      logger.info(`Updated aggregates for Epoch ${epochNumber}. Proposals: ${totalActualProposals}, Missed: ${totalMissedProposals}, Successful Att: ${totalSuccessfulAttestations}, Missed Att: ${totalMissedAttestations}, Checkpoints Missed: ${totalCheckpointsMissed}, Blocks Missed: ${totalBlocksMissed}, Mined Block: ${totalBlocksMined}, Proposed Block: ${totalBlocksProposed}`);
    } catch (error) {
      logger.error(`Failed to update aggregates for epoch ${epochNumber}`, { error });
      throw error;
    }
  }
}
