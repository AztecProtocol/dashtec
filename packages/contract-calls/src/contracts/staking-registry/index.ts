import type { Address } from 'viem';
import type { ContractClient } from '../../client';
import * as calls from './calls';

export * from './types';

/**
 * Create staking registry contract methods bound to client and address
 */
export function createStakingRegistry(
  client: ContractClient,
  stakingRegistryAddress: Address
) {
  return {
    getProviderConfiguration: calls.getProviderConfiguration(client, stakingRegistryAddress),
    getStakingAsset: calls.getStakingAsset(client, stakingRegistryAddress),
  };
}
