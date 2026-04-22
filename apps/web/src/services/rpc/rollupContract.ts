import { contracts, getContractsForRollup } from '@/lib/contracts';
import { NETWORK_DEFAULTS } from '@/constants/networkDefaults';
import { createLogger } from '@dashtec/shared-utils';
import type { Address } from 'viem';

const logger = createLogger('RollupContract');

/**
 * Get staking asset address from rollup contract
 */
export async function getStakingAsset(): Promise<`0x${string}`> {
  try {
    return await contracts.rollup.getStakingAsset();
  } catch (error) {
    logger.error('Error fetching staking asset', { error });
    return NETWORK_DEFAULTS.STAKING_ASSET as `0x${string}`;
  }
}

/**
 * Get ejection threshold from rollup contract
 */
export async function getEjectionThreshold(): Promise<bigint> {
  try {
    return await contracts.rollup.getEjectionThreshold();
  } catch (error) {
    logger.error('Error fetching ejection threshold', { error });
    return BigInt(NETWORK_DEFAULTS.MINIMUM_STAKE);
  }
}

/**
 * Get activation threshold from rollup contract
 */
export async function getActivationThreshold(): Promise<bigint> {
  try {
    return await contracts.rollup.getActivationThreshold();
  } catch (error) {
    logger.error('Error fetching activation threshold', { error });
    return BigInt(NETWORK_DEFAULTS.DEPOSIT_AMOUNT);
  }
}

/**
 * Get exit delay from rollup contract
 */
export async function getExitDelay(): Promise<bigint> {
  try {
    return await contracts.rollup.getExitDelay();
  } catch (error) {
    logger.error('Error fetching exit delay', { error });
    return BigInt(0);
  }
}

/**
 * Get genesis time from rollup contract
 */
export async function getGenesisTime(): Promise<bigint> {
  try {
    return await contracts.rollup.getGenesisTime();
  } catch (error) {
    logger.error('Error fetching genesis time', { error });
    return BigInt(NETWORK_DEFAULTS.GENESIS_TIME);
  }
}

/**
 * Get slot duration from rollup contract
 */
export async function getSlotDuration(): Promise<bigint> {
  try {
    return await contracts.rollup.getSlotDuration();
  } catch (error) {
    logger.error('Error fetching slot duration', { error });
    return BigInt(NETWORK_DEFAULTS.SLOT_DURATION);
  }
}

/**
 * Get epoch duration from rollup contract
 */
export async function getEpochDuration(): Promise<bigint> {
  try {
    return await contracts.rollup.getEpochDuration();
  } catch (error) {
    logger.error('Error fetching epoch duration', { error });
    return BigInt(NETWORK_DEFAULTS.EPOCH_DURATION_SLOTS);
  }
}

/**
 * Get target committee size from rollup contract
 */
export async function getTargetCommitteeSize(): Promise<bigint> {
  try {
    return await contracts.rollup.getTargetCommitteeSize();
  } catch (error) {
    logger.error('Error fetching target committee size', { error });
    return BigInt(NETWORK_DEFAULTS.TARGET_COMMITTEE_SIZE);
  }
}

/**
 * Get sequencer rewards for a specific address, optionally targeting a specific rollup contract
 */
export async function getSequencerRewards(
  sequencerAddress: `0x${string}`,
  rollupAddress?: string
): Promise<bigint> {
  try {
    const rollup = rollupAddress
      ? getContractsForRollup(rollupAddress as Address).rollup
      : contracts.rollup;
    return await rollup.getSequencerRewards(sequencerAddress);
  } catch (error) {
    logger.error('Error fetching sequencer rewards', { error, sequencerAddress, rollupAddress });
    return BigInt(0);
  }
}

/**
 * Get epoch committee for a specific epoch
 */
export async function getEpochCommittee(epoch: bigint): Promise<`0x${string}`[]> {
  try {
    return await contracts.rollup.getEpochCommittee(epoch);
  } catch (error) {
    logger.error('Error fetching epoch committee', { error, epoch: epoch.toString() });
    return [];
  }
}

/**
 * Get next flushable epoch from rollup contract
 */
export async function getNextFlushableEpoch(): Promise<bigint> {
  try {
    return await contracts.rollup.getNextFlushableEpoch();
  } catch (error) {
    logger.error('Error fetching next flushable epoch', { error });
    return BigInt(0);
  }
}

/**
 * Get entry queue flush size from rollup contract
 */
export async function getEntryQueueFlushSize(): Promise<bigint> {
  try {
    return await contracts.rollup.getEntryQueueFlushSize();
  } catch (error) {
    logger.error('Error fetching entry queue flush size', { error });
    return BigInt(0);
  }
}
