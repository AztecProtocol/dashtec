import { ValidatorAttestationData } from '../types/validatorStats';

/**
 * Epoch Service Interface
 *
 * Defines operations for managing epoch and attestation data
 */
export interface IEpochService {
  /**
   * Ensure an epoch exists in the database
   */
  ensureEpochExists(epochNumber: bigint): Promise<void>;

  /**
   * Save a validator attestation
   */
  saveValidatorAttestation(data: ValidatorAttestationData): Promise<void>;

  /**
   * Update validator performance for a specific epoch
   */
  updateValidatorEpochPerformance(epochNumber: bigint, validatorAddress: string): Promise<void>;

  /**
   * Update epoch-level aggregates
   */
  updateEpochAggregates(epochNumber: bigint): Promise<void>;
}
