import type { Address } from 'viem';

/**
 * Provider configuration from staking registry
 */
export interface ProviderConfiguration {
  providerAdmin: Address;
  providerTakeRate: number;
  providerRewardsRecipient: Address;
}
