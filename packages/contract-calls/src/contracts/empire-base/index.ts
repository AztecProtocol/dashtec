import type { Address } from 'viem';
import type { ContractClient } from '../../client';
import * as calls from './calls';

export * from './types';

/**
 * Create empire-base contract methods bound to client and addresses
 */
export function createEmpireBase(
  client: ContractClient,
  governanceProposer: Address,
  rollupAddress: Address
) {
  return {
    getRoundData: calls.getRoundData(client, governanceProposer, rollupAddress),
    getCurrentRound: calls.getCurrentRound(client, governanceProposer),
    getExecutionDelayInRounds: calls.getExecutionDelayInRounds(client, governanceProposer),
    getQuorumSize: calls.getQuorumSize(client, governanceProposer),
    getLifetimeInRounds: calls.getLifetimeInRounds(client, governanceProposer),
    getRoundSize: calls.getRoundSize(client, governanceProposer),
  };
}

