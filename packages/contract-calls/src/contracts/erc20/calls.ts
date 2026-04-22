import type { Address } from 'viem';
import { ERC20ABI } from '@dashtec/shared-types';
import type { ContractClient } from '../../client';

/**
 * Get ERC20 token symbol
 */
export const getTokenSymbol = (
  client: ContractClient,
  tokenAddress: Address
) =>
  async (): Promise<string> => {
    return await client.readContractWithCache<string>(
      {
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: 'symbol',
      },
      {
        cacheKey: `erc20:symbol:${tokenAddress}`,
        cacheDuration: 86_400_000 // 24 hours
      }
    );
  };

/**
 * Get ERC20 token decimals
 */
export const getTokenDecimals = (
  client: ContractClient,
  tokenAddress: Address
) =>
  async (): Promise<number> => {
    return await client.readContractWithCache<number>(
      {
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: 'decimals',
      },
      {
        cacheKey: `erc20:decimals:${tokenAddress}`,
        cacheDuration: 86_400_000 // 24 hours
      }
    );
  };

/**
 * Get ERC20 token name
 */
export const getTokenName = (
  client: ContractClient,
  tokenAddress: Address
) =>
  async (): Promise<string> => {
    return await client.readContractWithCache<string>(
      {
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: 'name',
      },
      {
        cacheKey: `erc20:name:${tokenAddress}`,
        cacheDuration: 86_400_000 // 24 hours
      }
    );
  };
