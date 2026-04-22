import { contracts } from '@/lib/contracts';
import { createLogger } from '@dashtec/shared-utils';

const logger = createLogger('StakingRegistryContract');

/**
 * Provider configuration from staking registry
 */
export interface ProviderConfiguration {
  providerAdmin: `0x${string}`;
  providerTakeRate: number;
  providerRewardsRecipient: `0x${string}`;
}

/**
 * Get provider configuration from staking registry contract
 */
export async function getProviderConfiguration(
  providerIdentifier: bigint
): Promise<ProviderConfiguration> {
  return await contracts.stakingRegistry.getProviderConfiguration(providerIdentifier);
}

/**
 * Get staking asset address from staking registry contract
 */
export async function getStakingAssetFromRegistry(): Promise<`0x${string}`> {
  try {
    return await contracts.stakingRegistry.getStakingAsset();
  } catch (error) {
    logger.error('Error fetching staking asset from registry', { error });
    return '0x0000000000000000000000000000000000000000' as `0x${string}`;
  }
}
