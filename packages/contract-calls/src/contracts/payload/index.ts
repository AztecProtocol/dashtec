import type { Address } from 'viem';
import type { ContractClient } from '../../client';
import * as calls from './calls';

export * from './types';

/**
 * Create payload contract methods bound to client and address
 */
export function createPayload(
  client: ContractClient,
  payloadAddress: Address
) {
  return {
    getURI: calls.getURI(client, payloadAddress),
    getActions: calls.getActions(client, payloadAddress),
  };
}
