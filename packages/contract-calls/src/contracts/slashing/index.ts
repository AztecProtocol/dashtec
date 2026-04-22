import type { Address } from 'viem';
import type { ContractClient } from '../../client';
import * as calls from './calls';

export * from './types';

/**
 * Create slashing contract methods bound to client and address
 */
export function createSlashing(
  client: ContractClient,
  slashingProposerAddress: Address
) {
  return {
    getSlashingQuorumSize: calls.getSlashingQuorumSize(client, slashingProposerAddress),
  };
}
