import type { Address } from 'viem';
import { PayloadABI } from '@dashtec/shared-types';
import type { ContractClient } from '../../client';
import type { PayloadAction } from './types';

/**
 * Get URI for payload description
 */
export const getURI = (
  client: ContractClient,
  payloadAddress: Address
) =>
  async (): Promise<string> => {
    return await client.readContractWithCache({
      address: payloadAddress,
      abi: PayloadABI,
      functionName: 'getURI',
    }, {
      cacheKey: `payload:getURI:${payloadAddress}`,
      cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
    }) as string;
  };

/**
 * Get actions from payload
 */
export const getActions = (
  client: ContractClient,
  payloadAddress: Address
) =>
  async (): Promise<PayloadAction[]> => {
    const actions = await client.readContract({
      address: payloadAddress,
      abi: PayloadABI,
      functionName: 'getActions',
    }) as Array<{ target: Address; data: `0x${string}` }>;

    return actions.map(action => ({
      target: action.target,
      data: action.data,
    }));
  };
