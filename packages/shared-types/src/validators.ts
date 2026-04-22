import type { Validator, ValidatorAttestation, ValidatorEpochPerformance } from '@dashtec/database/types';

/**
 * Validator with aggregated performance data
 */
export interface ValidatorWithPerformance extends Validator {
  totalAttestations?: number;
  successRate?: number;
  totalCheckpointsProposed?: number;
}

/**
 * Validator contract status (from getAttesterView).
 *
 * Modeled as a const object + derived numeric union instead of a TS enum,
 * per project convention. Callers continue to use
 * `ValidatorContractStatus.None` for values and `ValidatorContractStatus`
 * for the type.
 */
export const ValidatorContractStatus = {
  None: 0,
  Validating: 1,
  Zombie: 2,
  Exiting: 3,
} as const;
export type ValidatorContractStatus = (typeof ValidatorContractStatus)[keyof typeof ValidatorContractStatus];

/**
 * Validator contract status string mapping
 */
export type ValidatorContractStatusString = 'None' | 'Validating' | 'Zombie' | 'Exiting' | 'Queue';

/**
 * Validator status constants for UI and DB usage
 */
export const VALIDATOR_STATUS = {
  ACTIVE: 'Validating' as const,
  ZOMBIE: 'Zombie' as const,
  EXITING: 'Exiting' as const,
  QUEUE: 'Queue' as const,
  NONE: 'None' as const,
};

/**
 * Validator status descriptions for display
 */
export const VALIDATOR_STATUS_DESCRIPTIONS: Record<string, string> = {
  [VALIDATOR_STATUS.ACTIVE]: 'Participating as sequencer',
  [VALIDATOR_STATUS.ZOMBIE]: 'Not participating as sequencer, but have funds in setup. Hit if slashed and going below the minimum stake requirement',
  [VALIDATOR_STATUS.EXITING]: 'In the process of exiting the system - sequencer has initiated withdrawal',
  [VALIDATOR_STATUS.QUEUE]: 'Waiting in queue for activation',
  [VALIDATOR_STATUS.NONE]: 'Status cannot be determined',
  'active': 'Deposited on this rollup and currently active',
  'migrated': 'Originally deposited on this rollup but has since migrated to a newer rollup version',
  'exiting': 'Withdrawal initiated on this rollup, pending finalization',
  'exited': 'Withdrawal finalized on this rollup',
};

/** Get human-readable description for a validator status */
export function getValidatorStatusDescription(status: string): string {
  return VALIDATOR_STATUS_DESCRIPTIONS[status] || VALIDATOR_STATUS_DESCRIPTIONS[VALIDATOR_STATUS.NONE];
}

/** Map numeric contract status to string */
export function mapStatusToString(status: number): ValidatorContractStatusString {
  switch (status) {
    case ValidatorContractStatus.None:
      return 'None';
    case ValidatorContractStatus.Validating:
      return 'Validating';
    case ValidatorContractStatus.Zombie:
      return 'Zombie';
    case ValidatorContractStatus.Exiting:
      return 'Exiting';
    default:
      return 'None';
  }
}

/**
 * Slashing offense types.
 *
 * Modeled as a const object + derived string union instead of a TS enum,
 * per project convention. Callers continue to use `Offense.UNKNOWN` for
 * values and `Offense` for the type.
 */
export const Offense = {
  UNKNOWN: 'Unknown',
  DATA_WITHHOLDING: 'Data Withholding',
  VALID_EPOCH_PRUNED: 'Valid Epoch Pruned',
  INACTIVITY: 'Inactivity',
  BROADCASTED_INVALID_BLOCK_PROPOSAL: 'Broadcasted Invalid Block Proposal',
  PROPOSED_INSUFFICIENT_ATTESTATIONS: 'Proposed Insufficient Attestations',
  PROPOSED_INCORRECT_ATTESTATIONS: 'Proposed Incorrect Attestations',
  ATTESTED_DESCENDANT_OF_INVALID: 'Attested Descendant of Invalid',
} as const;
export type Offense = (typeof Offense)[keyof typeof Offense];

/** Map numeric offense to enum */
export function bigIntToOffense(offense: number): Offense {
  switch (offense) {
    case 0: return Offense.UNKNOWN;
    case 1: return Offense.DATA_WITHHOLDING;
    case 2: return Offense.VALID_EPOCH_PRUNED;
    case 3: return Offense.INACTIVITY;
    case 4: return Offense.BROADCASTED_INVALID_BLOCK_PROPOSAL;
    case 5: return Offense.PROPOSED_INSUFFICIENT_ATTESTATIONS;
    case 6: return Offense.PROPOSED_INCORRECT_ATTESTATIONS;
    case 7: return Offense.ATTESTED_DESCENDANT_OF_INVALID;
    default: return Offense.UNKNOWN;
  }
}

/** Get human-readable description for an offense */
export function getOffenseDescription(offense: Offense): string {
  switch (offense) {
    case Offense.UNKNOWN:
      return 'A manual override that sequencers can vote on, even if node detects no offense.';
    case Offense.DATA_WITHHOLDING:
      return 'An epoch that could\'ve been proven was not and resulted in a prune.';
    case Offense.VALID_EPOCH_PRUNED:
      return 'The sequencer pruned a valid epoch that should have been maintained.';
    case Offense.INACTIVITY:
      return 'Sequencer has missed a certain % of attestations in a certain epoch.';
    case Offense.BROADCASTED_INVALID_BLOCK_PROPOSAL:
      return 'A sequencer has proposed an invalid block (i.e. bad state root).';
    case Offense.PROPOSED_INSUFFICIENT_ATTESTATIONS:
      return 'A proposer pushed to L1 a block with insufficient committee attestations.';
    case Offense.PROPOSED_INCORRECT_ATTESTATIONS:
      return 'A proposer pushed to L1 a block with incorrect committee attestations (e.g., signature from a non-committee member).';
    case Offense.ATTESTED_DESCENDANT_OF_INVALID:
      return 'A committee member attested to a block that was built as a descendant of an invalid block (a block with invalid attestations).';
    default:
      return 'Unknown offense type.';
  }
}

/**
 * Validator migration status — derived from lifecycle events + current rollup_address
 */
export type ValidatorMigrationStatus = 'active' | 'migrated' | 'exiting' | 'exited';

/**
 * Validator status enum (legacy)
 */
export type ValidatorStatus = 'active' | 'pending' | 'exited' | 'slashed';

/**
 * Validator queue entry
 */
export interface ValidatorQueueEntry {
  attesterAddress: string;
  withdrawerAddress: string;
  queuedAt: Date;
  blockNumber: string;
}

/**
 * Validator social profile
 */
export interface ValidatorSocialProfile {
  xHandle?: string;
  xUserId?: string;
  xImageUrl?: string;
  discordId?: string;
  discordUsername?: string;
  discordAvatar?: string;
  name?: string;
}
