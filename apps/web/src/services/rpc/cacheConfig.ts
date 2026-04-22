/**
 * Cache duration constants for RPC calls
 * All durations in milliseconds
 */

export const CACHE_DURATION = {
  // Constant network parameters (24 hours)
  GENESIS_TIME: 24 * 60 * 60 * 1000,
  SLOT_DURATION: 24 * 60 * 60 * 1000,
  EPOCH_DURATION: 24 * 60 * 60 * 1000,
  EJECTION_THRESHOLD: 24 * 60 * 60 * 1000,
  ACTIVATION_THRESHOLD: 24 * 60 * 60 * 1000,
  EXIT_DELAY: 24 * 60 * 60 * 1000,
  TARGET_COMMITTEE_SIZE: 24 * 60 * 60 * 1000,
  STAKING_ASSET: 24 * 60 * 60 * 1000,

  // Token information (6 hours)
  TOKEN_SYMBOL: 6 * 60 * 60 * 1000,
  TOKEN_DECIMALS: 6 * 60 * 60 * 1000,
  TOKEN_NAME: 6 * 60 * 60 * 1000,

  // Slashing parameters (3 hours)
  SLASHING_QUORUM: 3 * 60 * 60 * 1000,

  // Dynamic data with parameters (shorter cache)
  SEQUENCER_REWARDS: 5 * 60 * 1000, // 5 minutes
  EPOCH_COMMITTEE: 10 * 60 * 1000, // 10 minutes

  // Queue data (1 minute)
  NEXT_FLUSHABLE_EPOCH: 1 * 60 * 1000,
  ENTRY_QUEUE_FLUSH_SIZE: 1 * 60 * 1000,

  // Provider configuration (5 minutes)
  PROVIDER_CONFIGURATION: 5 * 60 * 1000,
} as const;

/**
 * Cache keys for RPC calls
 */
export const CACHE_KEY = {
  GENESIS_TIME: 'genesis-time',
  SLOT_DURATION: 'slot-duration',
  EPOCH_DURATION: 'epoch-duration',
  EJECTION_THRESHOLD: 'ejection-threshold',
  ACTIVATION_THRESHOLD: 'activation-threshold',
  EXIT_DELAY: 'exit-delay',
  TARGET_COMMITTEE_SIZE: 'target-committee-size',
  STAKING_ASSET: 'staking-asset',
  SLASHING_QUORUM: 'slashing-quorum-size',
  NEXT_FLUSHABLE_EPOCH: 'next-flushable-epoch',
  ENTRY_QUEUE_FLUSH_SIZE: 'entry-queue-flush-size',
  SEQUENCER_REWARDS: 'sequencer-rewards'
} as const;

/**
 * Generate cache key for parameterized RPC calls
 */
export function generateCacheKey(base: string, ...params: (string | number | bigint)[]): string {
  return `${base}-${params.join('-')}`;
}
