/**
 * Epoch Integrity Analyzer
 *
 * Pure functions for analyzing epoch data integrity.
 * Decoupled from database operations for reuse across packages (e.g. indexer-custom).
 */

import {
  CHECKPOINT_MINED,
  CHECKPOINT_PROPOSED,
  CHECKPOINT_MISSED,
  BLOCKS_MISSED,
  ATTESTATION_SENT,
  ATTESTATION_MISSED,
} from '@dashtec/shared-types';

// Types
export interface SlotRecord {
  slot: string | bigint;
  status: string;
  validator?: string;
}

export interface EpochAnalysisInput {
  epochNumber: bigint;
  records: SlotRecord[];
  expectedValidatorsPerEpoch: number;
  slotsPerEpoch: number;
}

export interface EpochIntegrityResult {
  epochNumber: bigint;
  totalValidators: number;
  checkpointMissedCount: number;
  checkpointMinedCount: number;
  checkpointProposedCount: number;
  blocksMissedCount: number;
  attestationSentCount: number;
  attestationMissedCount: number;
  emptyValidators: number;
  issues: string[];
  expectedValidatorsPerEpoch: number;
  integrityScore: number;
  integrityStatus: 'VALID' | 'WARNING' | 'PARTIAL' | 'INVALID' | 'UNKNOWN';
}

export interface SentinelComparisonInput {
  name: string;
  url: string;
  epochData: Map<bigint, EpochSummary>;
}

export interface EpochSummary {
  epochNumber: bigint;
  totalSlots: number;
  validatorsWithData: number;
  attestationsSent: number;
  attestationsMissed: number;
  checkpointsMined: number;
  checkpointsProposed: number;
  checkpointsMissed: number;
  blocksMissed: number;
}

export interface EpochDiscrepancy {
  epochNumber: bigint;
  field: string;
  values: { sentinel: string; value: number }[];
}

export interface SentinelComparisonResult {
  epochNumber: bigint;
  consistent: boolean;
  discrepancies: EpochDiscrepancy[];
}

/**
 * Analyze epoch integrity from raw slot records
 */
export function analyzeEpochIntegrity(input: EpochAnalysisInput): EpochIntegrityResult {
  const { epochNumber, records, expectedValidatorsPerEpoch, slotsPerEpoch } = input;

  // Count unique validators
  const uniqueValidators = new Set(records.map(r => r.validator).filter(Boolean));
  const totalValidators = uniqueValidators.size;

  // Count by status
  const statusCounts = new Map<string, number>();
  records.forEach(record => {
    const count = statusCounts.get(record.status) || 0;
    statusCounts.set(record.status, count + 1);
  });

  const checkpointMissedCount = statusCounts.get(CHECKPOINT_MISSED) || 0;
  const checkpointMinedCount = statusCounts.get(CHECKPOINT_MINED) || 0;
  const checkpointProposedCount = statusCounts.get(CHECKPOINT_PROPOSED) || 0;
  const blocksMissedCount = statusCounts.get(BLOCKS_MISSED) || 0;
  const attestationSentCount = statusCounts.get(ATTESTATION_SENT) || 0;
  const attestationMissedCount = statusCounts.get(ATTESTATION_MISSED) || 0;

  const result: EpochIntegrityResult = {
    epochNumber,
    totalValidators,
    checkpointMissedCount,
    checkpointMinedCount,
    checkpointProposedCount,
    blocksMissedCount,
    attestationSentCount,
    attestationMissedCount,
    emptyValidators: Math.max(0, expectedValidatorsPerEpoch - totalValidators),
    issues: [],
    expectedValidatorsPerEpoch,
    integrityScore: 0,
    integrityStatus: 'UNKNOWN',
  };

  let score = 100;

  // Rule 1: Check total unique validators
  if (totalValidators > expectedValidatorsPerEpoch) {
    result.issues.push(`Has ${totalValidators} unique validators (max: ${expectedValidatorsPerEpoch})`);
    score -= 40;
  }

  // Rule 2: Check total block records (checkpoints + blocks-missed)
  const totalBlockRecords = checkpointMinedCount + checkpointProposedCount + checkpointMissedCount + blocksMissedCount;
  if (totalBlockRecords !== slotsPerEpoch) {
    const diff = Math.abs(totalBlockRecords - slotsPerEpoch);
    const penalty = (diff / slotsPerEpoch) * 30;
    result.issues.push(`Has ${totalBlockRecords} block records (expected: ${slotsPerEpoch})`);
    score -= penalty;
  }

  // Rule 3: Check attestation record distribution
  const totalAttestationRecords = attestationSentCount + attestationMissedCount;
  const slotsWithBlocks = checkpointMinedCount + checkpointProposedCount;
  const expectedAttestations = slotsWithBlocks * (expectedValidatorsPerEpoch - 1);
  if (totalAttestationRecords !== expectedAttestations && expectedAttestations > 0) {
    const diff = Math.abs(totalAttestationRecords - expectedAttestations);
    const maxDiff = slotsPerEpoch * expectedValidatorsPerEpoch;
    const penalty = (diff / maxDiff) * 25;
    result.issues.push(`Has ${totalAttestationRecords} attestations (expected: ${expectedAttestations})`);
    score -= penalty;
  }

  // Rule 4: Check empty validators
  if (checkpointMissedCount === 0 && blocksMissedCount === 0 && result.emptyValidators > 0) {
    const penalty = (result.emptyValidators / expectedValidatorsPerEpoch) * 20;
    result.issues.push(`Has ${result.emptyValidators} empty validators with no checkpoint-missed or blocks-missed`);
    score -= penalty;
  }

  result.integrityScore = Math.max(0, Math.round(score));

  if (result.integrityScore === 100) {
    result.integrityStatus = 'VALID';
  } else if (result.integrityScore >= 90) {
    result.integrityStatus = 'WARNING';
  } else if (result.integrityScore >= 50) {
    result.integrityStatus = 'PARTIAL';
  } else {
    result.integrityStatus = 'INVALID';
  }

  return result;
}

/**
 * Compare epoch data across multiple sentinels
 */
export function compareSentinelEpochs(
  sentinels: SentinelComparisonInput[],
  epochsToCheck: bigint[]
): SentinelComparisonResult[] {
  const results: SentinelComparisonResult[] = [];

  for (const epochNumber of epochsToCheck) {
    const discrepancies: EpochDiscrepancy[] = [];

    // Get data from all sentinels for this epoch
    const epochDataBySentinel = new Map<string, EpochSummary | undefined>();
    for (const sentinel of sentinels) {
      epochDataBySentinel.set(sentinel.name, sentinel.epochData.get(epochNumber));
    }

    // Compare fields across sentinels
    const fieldsToCompare: (keyof EpochSummary)[] = [
      'totalSlots',
      'validatorsWithData',
      'attestationsSent',
      'attestationsMissed',
      'checkpointsMined',
      'checkpointsProposed',
      'checkpointsMissed',
      'blocksMissed',
    ];

    for (const field of fieldsToCompare) {
      const values: { sentinel: string; value: number }[] = [];

      for (const [name, data] of epochDataBySentinel) {
        if (data) {
          values.push({ sentinel: name, value: data[field] as number });
        }
      }

      // Check if all values are the same
      if (values.length > 1) {
        const firstValue = values[0].value;
        const hasDiscrepancy = values.some(v => v.value !== firstValue);

        if (hasDiscrepancy) {
          discrepancies.push({ epochNumber, field, values });
        }
      }
    }

    results.push({
      epochNumber,
      consistent: discrepancies.length === 0,
      discrepancies,
    });
  }

  return results;
}

/**
 * Build epoch summary from raw validator stats history
 */
export function buildEpochSummary(
  epochNumber: bigint,
  records: SlotRecord[]
): EpochSummary {
  const summary: EpochSummary = {
    epochNumber,
    totalSlots: 0,
    validatorsWithData: 0,
    attestationsSent: 0,
    attestationsMissed: 0,
    checkpointsMined: 0,
    checkpointsProposed: 0,
    checkpointsMissed: 0,
    blocksMissed: 0,
  };

  const validators = new Set<string>();

  for (const record of records) {
    summary.totalSlots++;

    if (record.validator) {
      validators.add(record.validator);
    }

    switch (record.status) {
      case ATTESTATION_SENT:
        summary.attestationsSent++;
        break;
      case ATTESTATION_MISSED:
        summary.attestationsMissed++;
        break;
      case CHECKPOINT_MINED:
        summary.checkpointsMined++;
        break;
      case CHECKPOINT_PROPOSED:
        summary.checkpointsProposed++;
        break;
      case CHECKPOINT_MISSED:
        summary.checkpointsMissed++;
        break;
      case BLOCKS_MISSED:
        summary.blocksMissed++;
        break;
    }
  }

  summary.validatorsWithData = validators.size;

  return summary;
}
