/**
 * Centralized API type definitions
 * These types match the actual API response structures from backend routes
 */

import { ValidatorPerformance } from '@/types';

// ============================================================================
// BASE API RESPONSE TYPES
// ============================================================================

/**
 * Base API response structure that all responses should extend
 */
export interface BaseApiResponse {
  benchmark: string;
  benchmarks?: Record<string, string>;
  status: 'ok' | 'error';
}

/**
 * API error response structure
 */
export interface ApiErrorResponse extends BaseApiResponse {
  error: string;
  status: 'error';
}

// ============================================================================
// VALIDATORS API
// ============================================================================

/**
 * Query parameters for fetching paginated validators
 */
export interface ValidatorsQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: string;
  startEpoch?: string;
  endEpoch?: string;
  balanceMin?: string;
  balanceMax?: string;
  attestationSuccessMin?: string;
  attestationSuccessMax?: string;
  proposalSuccessMin?: string;
  proposalSuccessMax?: string;
  performanceScoreMin?: string;
  performanceScoreMax?: string;
  epochParticipationMin?: string;
  epochParticipationMax?: string;
  show?: string;
  [key: string]: string | number | undefined;
}

/**
 * Status count structure
 */
export interface StatusCount {
  status: string;
  count: number;
}

/**
 * Response type for paginated validators API
 */
export interface PaginatedValidatorsResponse extends BaseApiResponse {
  validators: ValidatorPerformance[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  maxTotalAttestations: number;
  maxTotalBlocksProduced: number;
  statuses: StatusCount[];
}

// ============================================================================
// STAKING API
// ============================================================================

/**
 * Staking overview data structure
 */
export interface StakingData extends BaseApiResponse {
  totalStaked: number;
  totalStakedFormatted: string;
  unclaimedRewards: number;
  unclaimedRewardsFormatted: string;
  minimumDeposit: number;
  minimumDepositFormatted: string;
  minimumStake: number;
  minimumStakeFormatted: string;
  lastUpdated: string;
}

// ============================================================================
// SLASHING HISTORY API
// ============================================================================

/**
 * Validator info structure
 */
export interface ValidatorInfo {
  name?: string;
  x_handle?: string;
  x_image_url?: string;
  discordUsername?: string;
  discordAvatar?: string;
}

/**
 * Slashing round data structure
 */
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

/**
 * Slashing conviction data structure
 */
export interface SlashingConviction {
  validator_address: string;
  slash_amount: string;
  validator?: ValidatorInfo | null;
}

/**
 * Slashing vote data structure
 */
export interface SlashingVote {
  proposer_address: string;
  voted_at: string | null;
  transaction_hash: string;
  block_number: string;
  validator?: ValidatorInfo | null;
}

/**
 * Slashing round detail structure
 */
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

/**
 * Pagination metadata structure
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Parameters for fetching slashing history
 */
export interface SlashingHistoryParams {
  page: number;
  limit?: number;
  search?: string;
  sortBy?: 'round_number' | 'slash_count' | 'executed_date';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Response type for slashing history API
 */
export interface SlashingHistoryApiResponse extends BaseApiResponse {
  data: SlashingRound[];
  pagination: PaginationMeta;
}

/**
 * Response type for slashing detail API
 */
export interface SlashingDetailApiResponse extends BaseApiResponse {
  data: SlashingRoundDetail;
}
