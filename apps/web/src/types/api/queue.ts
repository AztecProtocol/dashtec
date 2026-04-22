/**
 * Queue API response types
 */

import { BaseApiResponse } from './base';

/**
 * Queued validator entity
 */
export interface QueuedValidator {
  position: number;
  address: string;
  withdrawerAddress: string;
  transactionHash: string;
  queuedAt: string;
  providerIdentifier: string | null;
  providerName: string | null;
  providerLogoUrl: string | null;
  index: string;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  totalQueued: number;
  nextFlushableEpoch: number | null;
  flushableValidatorsCount: number | null;
  contractError: string | null;
}

/**
 * Response type for GET /api/validators/queue
 */
export interface QueueApiResponse extends BaseApiResponse {
  validatorsInQueue: QueuedValidator[];
  filteredCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Response type for GET /api/validators/queue/stats
 */
export interface QueueStatsResponse extends BaseApiResponse {
  totalQueued: number;
  nextFlushableEpoch: number | null;
  flushableValidatorsCount: number | null;
  contractError: string | null;
}

/**
 * Request params for queue endpoint
 */
export interface ValidatorQueueParams {
  page?: number;
  limit?: number;
  search?: string;
  rollup?: string;
}
