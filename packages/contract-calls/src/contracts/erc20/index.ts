import type { Address } from 'viem';
import type { ContractClient } from '../../client';
import * as calls from './calls';

export * from './types';

/**
 * Create ERC20 contract methods bound to client and address
 */
export function createERC20(
  client: ContractClient,
  tokenAddress: Address
) {
  return {
    getTokenSymbol: calls.getTokenSymbol(client, tokenAddress),
    getTokenDecimals: calls.getTokenDecimals(client, tokenAddress),
    getTokenName: calls.getTokenName(client, tokenAddress),
  };
}
