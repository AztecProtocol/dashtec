import type { Epoch, EpochIntegrityStats } from '@dashtec/database/types';

/**
 * Epoch with calculated metrics
 */
export interface EpochWithMetrics extends Epoch {
  successRate?: number;
  participationRate?: number;
  integrityScore?: number;
}

/**
 * Epoch integrity status
 */
export type EpochIntegrityStatus = 'VALID' | 'INVALID' | 'PARTIAL' | 'UNKNOWN';

/**
 * Epoch summary for dashboard
 */
export interface EpochSummary {
  epochNumber: bigint;
  startTimestamp?: Date;
  endTimestamp?: Date;
  totalValidators: number;
  activeValidators: number;
  attestationSuccessRate: number;
  blockProductionRate: number;
  integrityStatus: EpochIntegrityStatus;
}
