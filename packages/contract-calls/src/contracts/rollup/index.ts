import type { Address } from 'viem';
import type { ContractClient } from '../../client';
import * as calls from './calls';

export * from './types';

/**
 * Create rollup contract methods bound to client and address
 */
export function createRollup(
  client: ContractClient,
  rollupAddress: Address
) {
  return {
    getStakingAsset: calls.getStakingAsset(client, rollupAddress),
    getEjectionThreshold: calls.getEjectionThreshold(client, rollupAddress),
    getActivationThreshold: calls.getActivationThreshold(client, rollupAddress),
    getExitDelay: calls.getExitDelay(client, rollupAddress),
    getGenesisTime: calls.getGenesisTime(client, rollupAddress),
    getSlotDuration: calls.getSlotDuration(client, rollupAddress),
    getEpochDuration: calls.getEpochDuration(client, rollupAddress),
    getTargetCommitteeSize: calls.getTargetCommitteeSize(client, rollupAddress),
    getSequencerRewards: calls.getSequencerRewards(client, rollupAddress),
    getEpochCommittee: calls.getEpochCommittee(client, rollupAddress),
    getNextFlushableEpoch: calls.getNextFlushableEpoch(client, rollupAddress),
    getEntryQueueFlushSize: calls.getEntryQueueFlushSize(client, rollupAddress),
    getEpochForCheckpoint: calls.getEpochForCheckpoint(client, rollupAddress),
    getSlasher: calls.getSlasher(client, rollupAddress),
    getGSE: calls.getGSE(client, rollupAddress),
  };
}
