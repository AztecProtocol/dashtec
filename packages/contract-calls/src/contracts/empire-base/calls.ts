import type { Address } from 'viem';
import { EmpireBaseABI } from '@dashtec/shared-types';
import type { ContractClient } from '../../client';
import type { RoundAccounting } from './types';

/**
 * Get round data from governance proposer contract
 */
export const getRoundData = (
  client: ContractClient,
  governanceProposer: Address,
  rollupAddress: Address
) =>
  async (round: number | bigint): Promise<RoundAccounting> => {
    return await client.readContractWithCache<RoundAccounting>(
      {
        address: governanceProposer,
        abi: EmpireBaseABI,
        functionName: 'getRoundData',
        args: [rollupAddress, BigInt(round)]
      },
      {
        cacheKey: `empire-base:getRoundData:${governanceProposer}:${rollupAddress}:${round}`,
        cacheDuration: 1_000
      }
    );
  };

/**
 * Get current round number from governance proposer contract
 */
export const getCurrentRound = (
  client: ContractClient,
  governanceProposer: Address
) =>
  async (): Promise<bigint> => {
    return await client.readContractWithCache<bigint>(
      {
        address: governanceProposer,
        abi: EmpireBaseABI,
        functionName: 'getCurrentRound',
        args: []
      },
      {
        cacheKey: `empire-base:getCurrentRound:${governanceProposer}`,
        cacheDuration: 12_000 // 12 seconds - roughly one slot
      }
    );
  };

/**
 * Get execution delay in rounds from governance proposer contract
 */
export const getExecutionDelayInRounds = (
  client: ContractClient,
  governanceProposer: Address
) =>
  async (): Promise<bigint> => {
    return await client.readContractWithCache<bigint>(
      {
        address: governanceProposer,
        abi: EmpireBaseABI,
        functionName: 'EXECUTION_DELAY_IN_ROUNDS',
        args: []
      },
      {
        cacheKey: `empire-base:executionDelayInRounds:${governanceProposer}`,
        cacheDuration: 86_400_000 // 1 day - immutable value
      }
    );
  };

/**
 * Get quorum size from governance proposer contract
 */
export const getQuorumSize = (
  client: ContractClient,
  governanceProposer: Address
) =>
  async (): Promise<bigint> => {
    return await client.readContractWithCache<bigint>(
      {
        address: governanceProposer,
        abi: EmpireBaseABI,
        functionName: 'QUORUM_SIZE',
        args: []
      },
      {
        cacheKey: `empire-base:quorumSize:${governanceProposer}`,
        cacheDuration: 86_400_000 // 1 day - immutable value
      }
    );
  };

/**
 * Get lifetime in rounds from governance proposer contract
 */
export const getLifetimeInRounds = (
  client: ContractClient,
  governanceProposer: Address
) =>
  async (): Promise<bigint> => {
    return await client.readContractWithCache<bigint>(
      {
        address: governanceProposer,
        abi: EmpireBaseABI,
        functionName: 'LIFETIME_IN_ROUNDS',
        args: []
      },
      {
        cacheKey: `empire-base:lifetimeInRounds:${governanceProposer}`,
        cacheDuration: 86_400_000 // 1 day - immutable value
      }
    );
  };

/**
 * Get round size (slots per round) from governance proposer contract
 */
export const getRoundSize = (
  client: ContractClient,
  governanceProposer: Address
) =>
  async (): Promise<bigint> => {
    return await client.readContractWithCache<bigint>(
      {
        address: governanceProposer,
        abi: EmpireBaseABI,
        functionName: 'ROUND_SIZE',
        args: []
      },
      {
        cacheKey: `empire-base:roundSize:${governanceProposer}`,
        cacheDuration: 86_400_000 // 1 day - immutable value
      }
    );
  };

