/**
 * Provider API types
 */

import { BaseApiResponse } from './base';

/**
 * Provider metadata
 */
export interface ProviderMetadata {
  name: string | null;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  email: string | null;
  discord: string | null;
}

/**
 * Provider list item - used in providers table/list view
 */
export interface ProviderListItem {
  id: string;
  identifier: string;
  name: string;
  admin: string;
  takeRate: number;
  rewardsRecipient: string;
  totalAttesters: number;
  activeAttesters: number;
  queuedAttesters: number;
  totalStaked: number;
  activeStaked: number;
  metadata: ProviderMetadata;
}

/**
 * Performance history entry for an epoch
 */
export interface PerformanceHistoryEntry {
  validator_address: string;
  epoch_number: string;
  attestations_successful: number;
  attestations_missed: number;
  checkpoints_proposed: number;
  checkpoints_mined: number;
  checkpoints_missed: number;
  blocks_missed: number;
}

/**
 * Individual attester under a provider
 */
export interface ProviderAttester {
  address: string;
  name: string | null;
  status: string;
  balance: string | null;
  xHandle: string | null;
  xImageUrl: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  attestationsSuccessful: number;
  attestationsMissed: number;
  attestationRate: string;
  checkpointsProposed: number;
  checkpointsMined: number;
  checkpointsMissed: number;
  blocksMissed: number;
  blockSuccessRate: string;
  performanceHistory?: PerformanceHistoryEntry[];
  isInQueue: boolean;
}

/**
 * Provider detail - includes full attester list
 */
export interface ProviderDetail {
  id: string;
  identifier: string;
  admin: string;
  takeRate: number;
  rewardsRecipient: string;
  createdAt: Date;
  blockNumber: string;
  txHash: string;
  totalAttesters: number;
  activeAttesters: number;
  totalStaked: string;
  attestationRate: string;
  attestationsSuccessful: number;
  attestationsMissed: number;
  blockSuccessRate: string;
  checkpointsSuccessful: number;
  checkpointsProposed: number;
  checkpointsMined: number;
  checkpointsMissed: number;
  blocksMissed: number;
  attesters: ProviderAttester[];
  metadata: ProviderMetadata;
  rollupBreakdown?: Array<{
    rollupAddress: string;
    remainingCount: number;
  }>;
}

/**
 * Network-wide aggregates for providers
 */
export interface ProviderAggregates {
  totalSequencers: number;
  activeSequencers: number;
  totalStaked: number;
  activeStaked: number;
}

/**
 * Response type for GET /api/providers
 */
export interface ProvidersApiResponse extends BaseApiResponse {
  data: ProviderListItem[];
  pagination?: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  aggregates?: ProviderAggregates;
}

/**
 * Response type for GET /api/providers/[identifier]
 */
export interface ProviderDetailApiResponse extends BaseApiResponse {
  data: ProviderDetail;
}

