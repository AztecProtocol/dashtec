/**
 * API types for voting overview data
 */

export interface GovernanceVotecast {
  round: number;
  signalerAddress: string;
  timestamp: string;
  support: boolean;
  transactionHash: string;
  payloadAddress: string;
}

export interface GovernancePayload {
  round: number;
  proposer: string;
  status: 'Submittable' | 'Submitted';
  timestamp: string;
  payloadAddress: string;
  transactionHash?: string;
}

export interface SlashingVotecast {
  round: number;
  voterAddress: string;
  timestamp: string;
  support: boolean;
  transactionHash: string;
  slotNumber?: number | null;
  epochNumber?: number | null;
  target?: string;
}

export interface SlashedSequencer {
  sequencer: string;
  round: number;
  reason?: string;
  timestamp: string;
  slashAmount: string;
  transactionHash?: string;
}

export interface RoundData {
  lastSignalSlot: string;
  payloadWithMostSignals: string;
  executed: boolean;
  payloadURI?: string;
}

export interface VotingOverviewData {
  governance: {
    latestRound: number;
    roundData?: RoundData;
    recentVotecasts: GovernanceVotecast[];
    recentPayloads: GovernancePayload[];
  };
  slashing: {
    latestRound: number;
    latestExecutedRound: number;
    recentVotecasts: SlashingVotecast[];
    recentSlashed: SlashedSequencer[];
  };
}

export interface VotingOverviewResponse {
  data: VotingOverviewData;
  benchmark: string;
  benchmarkDetails?: Record<string, string>;
  status: 'ok' | 'error';
}
