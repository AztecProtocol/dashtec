import { VALIDATOR_STATUS } from '@/utils/constants';
import { ProposerVoteType, CHECKPOINT_MINED, CHECKPOINT_PROPOSED, CHECKPOINT_MISSED, BLOCKS_MISSED, ATTESTATION_SENT, ATTESTATION_MISSED } from '@dashtec/shared-types';
import type { ValidatorMigrationStatus } from '@dashtec/shared-types';

export type ValidatorStatusEnum = (typeof VALIDATOR_STATUS)[keyof typeof VALIDATOR_STATUS];
export type ValidatorHistoryEnum = typeof CHECKPOINT_MINED | typeof CHECKPOINT_PROPOSED | typeof CHECKPOINT_MISSED | typeof BLOCKS_MISSED | typeof ATTESTATION_SENT | typeof ATTESTATION_MISSED;

export type VotingHistoryEntry = {
  epoch: number | null;
  voted: boolean;
  timestamp: string;
  slot_number: number | null;
  round_number: number;
  proposal_address: string;
  vote_type: ProposerVoteType;
  transaction_hash: string;
};

export interface ValidatorEpochPerformanceData {
  epochNumber: number;
  attestationsSuccessful: number;
  attestationsMissed: number;
  checkpointsProposed: number;
  checkpointsMined: number;
  checkpointsMissed: number;
  blocksMissed: number;
}

export interface RewardSource {
  address: string;
  rewards: string;
  source: 'attester' | 'split-contract' | 'coinbase';
  label: string;
  rollupAddress?: string;
  rollupLabel?: string;
}

export interface RollupRewardsGroup {
  rollupAddress: string;
  rollupLabel: string;
  isSelected: boolean;
  sources: RewardSource[];
  totalRewards: string;
}

export interface ProviderMetadata {
  providerIdentifier: string;
  name?: string | null;
  description?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  email?: string | null;
  discord?: string | null;
}

export interface ProposalHistoryEntry {
  epoch: number;
  slot: number;
  status: ValidatorHistoryEnum;
  l2BlockNumber?: number;
  l1TransactionHash?: string;
}

export interface AttestationHistoryEntry {
  epoch: number;
  status: 'Success' | 'Missed';
  slot: number
}

export interface TallyVotingHistoryEntry {
  id: string;
  round_number: number;
  voted: boolean;
  timestamp: string;
  transaction_hash: string;
  block_number: string;
  vote_type: string;
  payload?: {
    address: string | null;
    transaction_hash: string;
    timestamp: string | null;
  }
}

/** Lifecycle event in a validator's cross-rollup journey */
export interface ValidatorJourneyEvent {
  type: 'queued' | 'deposited' | 'gse_deposited' | 'migrated' | 'withdraw_initiated' | 'withdraw_finalized' | 'slashed';
  rollupAddress: string;
  rollupLabel?: string;
  timestamp: number | null;
  blockNumber: string;
  transactionHash: string;
  amount?: string;
}

export interface Validator {
  index: string;
  address: string;
  status: ValidatorStatusEnum
  balance: number;
  attestationSuccess: string;
  proposalSuccess?: string;
  activationDate?: number;
  exitDate?: string;
  slashed?: boolean;
  withdrawalCredentials?: string;
  recentAttestations?: AttestationHistoryEntry[];
  proposalHistory?: ProposalHistoryEntry[];
  checkpointsProposedInLatestEpoch?: number;

  totalAttestationsSucceeded?: number;
  totalAttestationsMissed?: number;
  totalCheckpointsProposed?: number;
  totalCheckpointsMined?: number;
  totalCheckpointsMissed?: number;
  totalBlocksMissed?: number;
  totalParticipatingEpochs?: number;
  epochPerformanceHistory?: ValidatorEpochPerformanceData[];

  lastProposed?: string
  x_handle?: string;
  x_user_id?: string;
  x_image_url?: string;
  discordId?: string | null;
  discordUsername?: string | null;
  discordAvatar?: string | null;
  name?: string;
  votingHistory?: VotingHistoryEntry[];
  tallyVotingHistory?: TallyVotingHistoryEntry[];
  unclaimedRewards?: string;
  rewardSources?: RewardSource[];
  rewardsByRollup?: RollupRewardsGroup[];
  isInQueue?: boolean;

  provider?: ProviderMetadata | null;
  migrationStatus?: ValidatorMigrationStatus;
  depositType?: 'rollup' | 'gse' | 'migration';
  journey?: ValidatorJourneyEvent[];
}

export interface ValidatorPerformance extends Validator {
  performanceScore: number;
  rank: number;
  isInQueue?: boolean;
}

export type SlotActivityStatus =
  | ValidatorHistoryEnum
  | 'no_data';

export interface SlotActivity {
  slotNumber: number; // 0-indexed
  status: SlotActivityStatus;
  tooltip?: string; // Optional tooltip for the slot
}

export interface ValidatorEpochSlotActivity {
  validatorIndex: string;
  validatorAddress: string;
  displayName: string;
  x_handle?: string | null;
  name?: string | null;
  slots: SlotActivity[];
  provider?: ProviderMetadata | null;
}

export interface ValidatorCurrentEpochActivity {
  validatorIndex: string;
  address: string;
  checkpointsMined: number;
  checkpointsProposed: number;
  checkpointsMissed: number;
  blocksMissed: number;
  attestationsSent: number;
  attestationsMissed: number;
}

export interface ValidatorTableSummary {
  address: string,
  validator_hex_index: string,
  stake_balance: string,
  status: string,
  x_handle: string | null,
  x_user_id: string | null,
  x_image_url: string | null,
  name: string | null,
  discordId: string | null,
  discordUsername: string | null,
  discordAvatar: string | null,
  total_attestations_successful: number,
  total_attestations_missed: number,
  total_checkpoints_proposed: number,
  total_checkpoints_missed: number,
  total_checkpoints_mined: number,
  total_blocks_missed: number,
  min_epoch_number: number,
  max_epoch_number: number,
  max_epoch_with_checkpoints_proposed: number,
  max_epoch_with_checkpoints_mined: number,
  total_participating_epochs: number,
  provider?: ProviderMetadata,
}
