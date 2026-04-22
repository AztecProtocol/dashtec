/**
 * Proposer vote type — matches Prisma schema
 *
 * Using a const object + derived type instead of a TS enum, per project
 * convention (string unions only). Callers can keep using
 * `ProposerVoteType.GOVERNANCE_PROPOSER` for values and `ProposerVoteType`
 * for the type annotation.
 */
export const ProposerVoteType = {
  GOVERNANCE_PROPOSER: 'GOVERNANCE_PROPOSER',
  SLASHING_PROPOSER: 'SLASHING_PROPOSER',
} as const;
export type ProposerVoteType = (typeof ProposerVoteType)[keyof typeof ProposerVoteType];

export const GOVERNANCE_PROPOSER = ProposerVoteType.GOVERNANCE_PROPOSER;
export const SLASHING_PROPOSER = ProposerVoteType.SLASHING_PROPOSER;

/**
 * Basic proposer vote interface
 */
export interface ProposerVote {
  id: string;
  vote_type: ProposerVoteType;
  signaler_address: string;
  payload_address: string;
  round_number: number;
  slot_number?: bigint | null;
  epoch_number?: bigint | null;
  block_number: string;
  transaction_hash: string;
  log_index: string;
  timestamp?: string | null;
  vote_date?: Date | null;
  contract_address?: string | null;
  created_at: Date;
}

/**
 * Proposer payload with vote count
 */
export interface ProposerPayloadWithVotes {
  payloadAddress: string;
  roundNumber: number;
  voteCount: number;
  creatorAddress?: string;
  timestamp?: string;
  votes: ProposerVote[];
}

/**
 * Slash proposal details
 */
export interface SlashProposal {
  payloadAddress: string;
  creatorAddress: string;
  targets: SlashTarget[];
  totalAmount: string;
  voteCount: number;
  executed: boolean;
}

/**
 * Slash target information
 */
export interface SlashTarget {
  attesterAddress: string;
  amount: string;
  offenses: number;
}

/**
 * Governance proposal
 */
export interface GovernanceProposal {
  payloadAddress: string;
  creatorAddress?: string;
  proposalId?: string;
  voteCount: number;
  timestamp?: string;
  submitted: boolean;
}
