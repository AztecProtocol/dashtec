import type { Address } from 'viem';
import { StakingRegistryABI } from '@dashtec/shared-types';
import type { ContractClient } from '../../client';
import type { ProviderConfiguration } from './types';

/**
 * Get provider configuration from staking registry contract
 */
export const getProviderConfiguration = (
  client: ContractClient,
  stakingRegistryAddress: Address
) =>
  async (providerIdentifier: bigint): Promise<ProviderConfiguration> => {
    const result = await client.readContractWithCache<[Address, number, Address]>(
      {
        address: stakingRegistryAddress,
        abi: StakingRegistryABI,
        functionName: 'providerConfigurations',
        args: [providerIdentifier],
      },
      {
        cacheKey: `staking-registry:providerConfiguration:${stakingRegistryAddress}:${providerIdentifier}`,
        cacheDuration: 300_000 // 5 minutes
      }
    );

    return {
      providerAdmin: result[0],
      providerTakeRate: result[1],
      providerRewardsRecipient: result[2],
    };
  };

/**
 * Get staking asset address from staking registry contract
 */
export const getStakingAsset = (
  client: ContractClient,
  stakingRegistryAddress: Address
) =>
  async (): Promise<Address> => {
    return await client.readContractWithCache<Address>(
      {
        address: stakingRegistryAddress,
        abi: StakingRegistryABI,
        functionName: 'STAKING_ASSET',
      },
      {
        cacheKey: `staking-registry:stakingAsset:${stakingRegistryAddress}`,
        cacheDuration: 86_400_000 // 24 hours
      }
    );
  };
