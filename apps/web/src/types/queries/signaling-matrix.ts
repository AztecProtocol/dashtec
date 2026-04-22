/**
 * Types for signaling matrix queries
 */

export interface ValidatorWithProvider {
  address: string;
  name: string | null;
  status: string;
  providerIdentifier: string | null;
  providerName: string | null;
  providerLogoUrl: string | null;
  xHandle: string | null;
  xUserId: string | null;
  xImageUrl: string | null;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
}

export interface GovernanceSignal {
  signalerAddress: string;
  payloadAddress: string;
  roundNumber: number;
  voteDate: Date | null;
  transactionHash: string;
}

export interface GovernancePayloadInfo {
  payloadAddress: string;
  roundNumber: number;
  isSubmitted: boolean;
  isSubmittable: boolean;
  submittedTimestamp: string | null;
  submittableTimestamp: string | null;
  submittedTransactionHash: string | null;
  submittableTransactionHash: string | null;
}

export interface SignalingMatrixData {
  validators: ValidatorWithProvider[];
  signals: GovernanceSignal[];
  payloads: GovernancePayloadInfo[];
  currentRound: number;
  quorumSize: number;
  roundSize: number;
  lifetimeInRounds: number;
}

export interface ProviderSignalingStats {
  providerIdentifier: string;
  providerName: string | null;
  providerLogoUrl: string | null;
  totalSequencers: number;
  activeSequencers: number;
  sequencers: {
    address: string;
    name: string | null;
    isActive: boolean;
  }[];
}