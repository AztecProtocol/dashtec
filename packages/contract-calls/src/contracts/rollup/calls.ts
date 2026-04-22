import type { Address } from 'viem';
import { RollupABI } from '@dashtec/shared-types';
import type { ContractClient } from '../../client';

/**
 * Get staking asset address from rollup contract
 */
export const getStakingAsset = (
  client: ContractClient,
  rollupAddress: Address
) =>
  async (): Promise<Address> => {
    return await client.readContractWithCache<Address>(
      {
        address: rollupAddress,
        abi: RollupABI,
        functionName: 'getStakingAsset',
      },
      {
        cacheKey: `rollup:getStakingAsset:${rollupAddress}`,
        cacheDuration: 86_400_000 // 24 hours
      }
    );
  };

/**
 * Get ejection threshold from rollup contract
 */
export const getEjectionThreshold = (
  client: ContractClient,
  rollupAddress: Address
) =>
  async (): Promise<bigint> => {
    return await client.readContractWithCache<bigint>(
      {
        address: rollupAddress,
        abi: RollupABI,
        functionName: 'getEjectionThreshold',
      },
      {
        cacheKey: `rollup:getEjectionThreshold:${rollupAddress}`,
        cacheDuration: 86_400_000 // 24 hours
      }
    );
  };

/**
 * Get activation threshold from rollup contract
 */
export const getActivationThreshold = (
  client: ContractClient,
  rollupAddress: Address
) =>
  async (): Promise<bigint> => {
    return await client.readContractWithCache<bigint>(
      {
        address: rollupAddress,
        abi: RollupABI,
        functionName: 'getActivationThreshold',
      },
      {
        cacheKey: `rollup:getActivationThreshold:${rollupAddress}`,
        cacheDuration: 86_400_000 // 24 hours
      }
    );
  };

/**
 * Get exit delay from rollup contract
 */
export const getExitDelay = (
  client: ContractClient,
  rollupAddress: Address
) =>
  async (): Promise<bigint> => {
    return await client.readContractWithCache<bigint>(
      {
        address: rollupAddress,
        abi: RollupABI,
        functionName: 'getExitDelay',
      },
      {
        cacheKey: `rollup:getExitDelay:${rollupAddress}`,
        cacheDuration: 86_400_000 // 24 hours
      }
    );
  };

/**
 * Get genesis time from rollup contract
 */
export const getGenesisTime = (
  client: ContractClient,
  rollupAddress: Address
) =>
  async (): Promise<bigint> => {
    return await client.readContractWithCache<bigint>(
      {
        address: rollupAddress,
        abi: RollupABI,
        functionName: 'getGenesisTime',
      },
      {
        cacheKey: `rollup:getGenesisTime:${rollupAddress}`,
        cacheDuration: 86_400_000 // 24 hours
      }
    );
  };

/**
 * Get slot duration from rollup contract
 */
export const getSlotDuration = (
  client: ContractClient,
  rollupAddress: Address
) =>
  async (): Promise<bigint> => {
    return await client.readContractWithCache<bigint>(
      {
        address: rollupAddress,
        abi: RollupABI,
        functionName: 'getSlotDuration',
      },
      {
        cacheKey: `rollup:getSlotDuration:${rollupAddress}`,
        cacheDuration: 86_400_000 // 24 hours
      }
    );
  };

/**
 * Get epoch duration from rollup contract
 */
export const getEpochDuration = (
  client: ContractClient,
  rollupAddress: Address
) =>
  async (): Promise<bigint> => {
    return await client.readContractWithCache<bigint>(
      {
        address: rollupAddress,
        abi: RollupABI,
        functionName: 'getEpochDuration',
      },
      {
        cacheKey: `rollup:getEpochDuration:${rollupAddress}`,
        cacheDuration: 86_400_000 // 24 hours
      }
    );
  };

/**
 * Get target committee size from rollup contract
 */
export const getTargetCommitteeSize = (
  client: ContractClient,
  rollupAddress: Address
) =>
  async (): Promise<bigint> => {
    return await client.readContractWithCache<bigint>(
      {
        address: rollupAddress,
        abi: RollupABI,
        functionName: 'getTargetCommitteeSize',
      },
      {
        cacheKey: `rollup:getTargetCommitteeSize:${rollupAddress}`,
        cacheDuration: 86_400_000 // 24 hours
      }
    );
  };

/**
 * Get sequencer rewards for a specific address
 */
export const getSequencerRewards = (
  client: ContractClient,
  rollupAddress: Address
) =>
  async (sequencerAddress: Address): Promise<bigint> => {
    return await client.readContract({
      address: rollupAddress,
      abi: RollupABI,
      functionName: 'getSequencerRewards',
      args: [sequencerAddress],
    }) as bigint;
  };

/**
 * Get epoch committee for a specific epoch
 */
export const getEpochCommittee = (
  client: ContractClient,
  rollupAddress: Address
) =>
  async (epoch: bigint): Promise<Address[]> => {
    return await client.readContractWithCache<Address[]>(
      {
        address: rollupAddress,
        abi: RollupABI,
        functionName: 'getEpochCommittee',
        args: [epoch],
      },
      {
        cacheKey: `rollup:getEpochCommittee:${rollupAddress}:${epoch}`,
        cacheDuration: 60_000 // 1 minute
      }
    );
  };

/**
 * Get next flushable epoch from rollup contract
 */
export const getNextFlushableEpoch = (
  client: ContractClient,
  rollupAddress: Address
) =>
  async (): Promise<bigint> => {
    return await client.readContract({
      address: rollupAddress,
      abi: RollupABI,
      functionName: 'getNextFlushableEpoch',
    }) as bigint;
  };

/**
 * Get entry queue flush size from rollup contract
 */
export const getEntryQueueFlushSize = (
  client: ContractClient,
  rollupAddress: Address
) =>
  async (): Promise<bigint> => {
    return await client.readContract({
      address: rollupAddress,
      abi: RollupABI,
      functionName: 'getEntryQueueFlushSize',
    }) as bigint;
  };

/**
 * Get slasher contract address from rollup
 */
export const getSlasher = (
  client: ContractClient,
  rollupAddress: Address
) =>
  async (): Promise<Address> => {
    return await client.readContractWithCache<Address>(
      {
        address: rollupAddress,
        abi: RollupABI,
        functionName: 'getSlasher',
      },
      {
        cacheKey: `rollup:getSlasher:${rollupAddress}`,
        cacheDuration: 86_400_000 // 24 hours — immutable per rollup
      }
    );
  };

/**
 * Get GSE contract address from rollup
 */
export const getGSE = (
  client: ContractClient,
  rollupAddress: Address
) =>
  async (): Promise<Address> => {
    return await client.readContractWithCache<Address>(
      {
        address: rollupAddress,
        abi: RollupABI,
        functionName: 'getGSE',
      },
      {
        cacheKey: `rollup:getGSE:${rollupAddress}`,
        cacheDuration: 86_400_000 // 24 hours — immutable per rollup
      }
    );
  };

/**
 * Get epoch number for a specific checkpoint number
 */
export const getEpochForCheckpoint = (
  client: ContractClient,
  rollupAddress: Address
) =>
  async (checkpointNumber: bigint): Promise<bigint> => {
    return await client.readContractWithCache<bigint>(
      {
        address: rollupAddress,
        abi: RollupABI,
        functionName: 'getEpochForCheckpoint',
        args: [checkpointNumber],
      },
      {
        cacheKey: `rollup:getEpochForCheckpoint:${rollupAddress}:${checkpointNumber}`,
        cacheDuration: 300_000 // 5 minutes
      }
    );
  };
