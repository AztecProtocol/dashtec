import { NetworkConfig } from '@/types';
import { contracts, getContractsForRollup } from '@/lib/contracts';
import { getActiveRollupAddress } from '@/services/rollupRegistry';
import { NETWORK_DEFAULTS } from '@/constants/networkDefaults';
import type { Address } from 'viem';

const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  genesisTime: NETWORK_DEFAULTS.GENESIS_TIME,
  slotDuration: NETWORK_DEFAULTS.SLOT_DURATION,
  epochDurationSlots: NETWORK_DEFAULTS.EPOCH_DURATION_SLOTS,
  stakingTokenSymbol: NETWORK_DEFAULTS.STAKING_TOKEN_SYMBOL,
  stakingTokenDecimals: NETWORK_DEFAULTS.STAKING_TOKEN_DECIMALS,
  minimumStake: NETWORK_DEFAULTS.MINIMUM_STAKE,
  depositAmount: NETWORK_DEFAULTS.DEPOSIT_AMOUNT,
};

/** Fetch network config from a specific rollup contract */
async function fetchNetworkConfigForRollup(rollupAddress: Address): Promise<NetworkConfig> {
  const { rollup } = getContractsForRollup(rollupAddress);

  const stakingAssetAddress = await rollup.getStakingAsset();

  const erc20 = contracts.createERC20(stakingAssetAddress);

  const [
    genesisTime,
    slotDuration,
    epochDurationSlots,
    tokenSymbol,
    tokenDecimals,
    minimumStake,
    depositAmount,
  ] = await Promise.all([
    rollup.getGenesisTime(),
    rollup.getSlotDuration(),
    rollup.getEpochDuration(),
    erc20.getTokenSymbol(),
    erc20.getTokenDecimals(),
    rollup.getEjectionThreshold(),
    rollup.getActivationThreshold(),
  ]);

  return {
    genesisTime: Number(genesisTime),
    slotDuration: Number(slotDuration),
    epochDurationSlots: Number(epochDurationSlots),
    stakingTokenSymbol: String(tokenSymbol),
    stakingTokenDecimals: Number(tokenDecimals),
    minimumStake: minimumStake.toString(),
    depositAmount: depositAmount.toString(),
  };
}

/** Retrieve network config for a rollup address, fallback to active rollup from registry */
export async function getNetworkConfigFromCacheOrContract(rollupAddress?: string): Promise<NetworkConfig> {
  try {
    const address = (rollupAddress || await getActiveRollupAddress()) as Address;
    return await fetchNetworkConfigForRollup(address);
  } catch (error) {
    console.warn("Using default network configuration due to fetch failure.", error);
    return DEFAULT_NETWORK_CONFIG;
  }
}
