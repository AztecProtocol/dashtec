import { ProviderMetadata } from '@/types';

export interface ValidatorInfo {
  name?: string;
  x_handle?: string;
  x_image_url?: string;
  discordUsername?: string;
  discordAvatar?: string;
  provider?: ProviderMetadata | null;
}

// New Tally-based slashing history types
export interface SlashingRound {
  id: string;
  round_number: number;
  slash_count: number;
  executed_date: string | null;
  deployment_tx_hash: string;
  deployment_block: string;
  contract_address: string;
  payload_address: string | null;
  created_at: string;
}

export interface SlashingConviction {
  validator_address: string;
  slash_amount: string;
  validator?: ValidatorInfo | null;
}

export interface SlashingVote {
  proposer_address: string;
  voted_at: string | null;
  transaction_hash: string;
  block_number: string;
  validator?: ValidatorInfo | null;
}

export interface SlashingRoundDetail {
  round_number: number;
  slash_count: number;
  executed_date: string | null;
  deployment_tx_hash: string;
  deployment_block: string;
  contract_address: string;
  convicted_attesters: SlashingConviction[];
  votes_cast: SlashingVote[];
}

export interface SlashingHistoryApiResponse {
  data: SlashingRound[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  benchmark: string;
}

export interface SlashingDetailApiResponse {
  data: SlashingRoundDetail;
  benchmark: string;
}

// Legacy types (for backward compatibility)
export interface SlashPayloadData {
  id: string;
  payload_address: string;
  attester_address: string;
  offenses: number;
  amount: string;
  attesterValidator?: ValidatorInfo | null;
}

export interface ProposerVote {
  id: string;
  vote_type: string;
  signaler_address: string;
  payload_address: string;
  round_number: number;
  slot_number: string | null;
  epoch_number: string | null;
  block_number: string;
  transaction_hash: string;
  vote_date: string | null;
  timestamp: string | null;
  created_at: string;
  signalerValidator?: ValidatorInfo | null;
}

export interface RoundStatusEvent {
  id: string;
  transaction_hash: string;
  timestamp: string | null;
  block_number: string;
}

export interface RoundStatus {
  status: 'PENDING' | 'SUBMITTABLE' | 'SUBMITTED';
  hasQuorum: boolean;
  voteCount: number;
  quorumThreshold: number;
  submittableEvent: RoundStatusEvent | null;
  submittedEvent: RoundStatusEvent | null;
}

export interface SlashFactoryPayload {
  id: string;
  payload_address: string;
  creator_address: string;
  block_number: string;
  transaction_hash: string;
  timestamp: string | null;
  first_signal_timestamp: string | null;
  created_at: string;
  creatorValidator?: ValidatorInfo | null;
  slashPayloadData: SlashPayloadData[];
  proposerVotes: ProposerVote[];
  roundStatuses: Record<number, RoundStatus>;
}

export interface ApiResponse {
  data: SlashFactoryPayload[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}