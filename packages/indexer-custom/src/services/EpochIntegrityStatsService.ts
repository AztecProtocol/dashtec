import { prisma } from '../lib/prisma';
import { createLogger, analyzeEpochIntegrity as analyzeIntegrity, EpochIntegrityResult, SlotRecord } from '@dashtec/shared-utils';
import { config } from '../config/config';

const logger = createLogger('EpochIntegrityStatsService');

interface ValidatorAttestationRecord {
  id: string;
  slot_number: bigint;
  epoch_number: bigint;
  validator_address: string;
  status: string;
  timestamp: Date;
}

// Re-export for backward compatibility
export type EpochIntegrityCheck = EpochIntegrityResult;

/**
 * Service for managing epoch integrity statistics
 */
export class EpochIntegrityStatsService {
  /**
   * Get epochs to check for integrity
   */
  async getEpochsToCheck(limit: number, maxEpoch?: bigint): Promise<bigint[]> {
    try {
      const epochsWithData = await prisma.validatorAttestation.findMany({
        distinct: ['epoch_number'],
        where: {
          rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
          ...(maxEpoch && maxEpoch > 0n ? { epoch_number: { lte: maxEpoch } } : {}),
        },
        select: {
          epoch_number: true,
        },
        orderBy: {
          epoch_number: 'desc',
        },
        take: limit,
      });

      return epochsWithData.map((epoch: { epoch_number: bigint }) => epoch.epoch_number);
    } catch (error) {
      logger.error('Failed to fetch epochs to check', { error });
      return [];
    }
  }

  /**
   * Get attestations for a specific epoch
   */
  async getEpochAttestations(epochNumber: bigint): Promise<ValidatorAttestationRecord[] | null> {
    try {
      const attestations = await prisma.validatorAttestation.findMany({
        where: {
          epoch_number: epochNumber,
          rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
        },
        select: {
          id: true,
          slot_number: true,
          epoch_number: true,
          validator_address: true,
          status: true,
          timestamp: true,
        },
        orderBy: {
          slot_number: 'asc',
        },
      });

      return attestations;
    } catch (error) {
      logger.error(`Failed to fetch attestations for epoch ${epochNumber}`, { error });
      return null;
    }
  }

  /**
   * Convert attestation records to slot records for the analyzer
   */
  private toSlotRecords(attestations: ValidatorAttestationRecord[]): SlotRecord[] {
    return attestations.map(att => ({
      slot: att.slot_number,
      status: att.status,
      validator: att.validator_address,
    }));
  }

  /**
   * Analyze epoch integrity based on attestations and blocks
   * Uses the decoupled analyzer from shared-utils
   */
  async analyzeEpochIntegrity(
    epochNumber: bigint,
    attestations: ValidatorAttestationRecord[] | null,
    expectedValidatorsPerEpoch: number,
    slotsPerEpoch: number
  ): Promise<EpochIntegrityResult | null> {
    if (attestations === null) {
      return null;
    }

    const records = this.toSlotRecords(attestations);

    return analyzeIntegrity({
      epochNumber,
      records,
      expectedValidatorsPerEpoch,
      slotsPerEpoch,
    });
  }

  /**
   * Analyze and save epoch integrity (convenience method)
   */
  async analyzeAndSave(
    epochNumber: bigint,
    expectedValidatorsPerEpoch: number,
    slotsPerEpoch: number
  ): Promise<{ status: 'success' | 'error'; hasIssues: boolean }> {
    try {
      const attestations = await this.getEpochAttestations(epochNumber);
      if (attestations === null) {
        logger.warn(`Skipping epoch ${epochNumber} due to database error`);
        return { status: 'error', hasIssues: false };
      }

      const analysis = await this.analyzeEpochIntegrity(epochNumber, attestations, expectedValidatorsPerEpoch, slotsPerEpoch);

      if (analysis === null) {
        logger.warn(`Skipping epoch ${epochNumber} due to data error`);
        return { status: 'error', hasIssues: false };
      }

      await this.saveIntegrityStats(analysis);

      return {
        status: 'success',
        hasIssues: analysis.integrityStatus !== 'VALID'
      };
    } catch (error) {
      logger.error(`Failed to analyze and save epoch ${epochNumber}`, { error });
      return { status: 'error', hasIssues: false };
    }
  }

  /**
   * Save epoch integrity stats to database
   */
  private async saveIntegrityStats(analysis: EpochIntegrityResult): Promise<void> {
    try {
      await this.createOrUpdateIntegrityStats({
        epoch_number: analysis.epochNumber,
        expected_validators: analysis.expectedValidatorsPerEpoch,
        actual_validators: analysis.totalValidators,
        block_missed_validators: analysis.checkpointMissedCount + analysis.blocksMissedCount,
        block_mined_validators: analysis.checkpointMinedCount,
        block_proposed_validators: analysis.checkpointProposedCount,
        attestation_sent_validators: analysis.attestationSentCount,
        attestation_missed_validators: analysis.attestationMissedCount,
        empty_validators: analysis.emptyValidators,
        integrity_score: analysis.integrityScore,
        integrity_status: analysis.integrityStatus,
        issues: analysis.issues,
      });

      logger.debug(`Saved integrity stats for epoch ${analysis.epochNumber}`);
    } catch (error) {
      logger.error(`Failed to save integrity stats for epoch ${analysis.epochNumber}`, { error });
    }
  }

  /**
   * Create or update integrity stats for an epoch
   */
  private async createOrUpdateIntegrityStats(data: {
    epoch_number: bigint;
    expected_validators?: number;
    actual_validators?: number;
    block_missed_validators?: number;
    block_mined_validators?: number;
    block_proposed_validators?: number;
    attestation_sent_validators?: number;
    attestation_missed_validators?: number;
    empty_validators?: number;
    integrity_score?: number;
    integrity_status?: string;
    issues?: string[];
  }) {
    try {
      return await prisma.epochIntegrityStats.upsert({
        where: {
          epoch_number_rollup_address: { epoch_number: data.epoch_number, rollup_address: config.ROLLUP_CONTRACT_ADDRESS }
        },
        update: {
          expected_validators: data.expected_validators,
          actual_validators: data.actual_validators,
          block_missed_validators: data.block_missed_validators,
          block_mined_validators: data.block_mined_validators,
          block_proposed_validators: data.block_proposed_validators,
          attestation_sent_validators: data.attestation_sent_validators,
          attestation_missed_validators: data.attestation_missed_validators,
          empty_validators: data.empty_validators,
          integrity_score: data.integrity_score,
          integrity_status: data.integrity_status,
          issues: data.issues,
          last_checked_at: new Date(),
          updated_at: new Date()
        },
        create: {
          epoch_number: data.epoch_number,
          rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
          expected_validators: data.expected_validators || 48,
          actual_validators: data.actual_validators || 0,
          block_missed_validators: data.block_missed_validators || 0,
          block_mined_validators: data.block_mined_validators || 0,
          block_proposed_validators: data.block_proposed_validators || 0,
          attestation_sent_validators: data.attestation_sent_validators || 0,
          attestation_missed_validators: data.attestation_missed_validators || 0,
          empty_validators: data.empty_validators || 0,
          integrity_score: data.integrity_score || 0,
          integrity_status: data.integrity_status || 'UNKNOWN',
          issues: data.issues || [],
          last_checked_at: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to create/update integrity stats', { error, data });
      throw error;
    }
  }
}
