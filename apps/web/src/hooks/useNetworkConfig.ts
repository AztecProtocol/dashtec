import { useQuery } from '@tanstack/react-query';
import { NetworkConfig } from '@/types';
import { NETWORK_DEFAULTS } from '@/constants/networkDefaults';
import { useRollupOptional } from '@/context/RollupContext';

export interface NetworkConfigState {
  config: NetworkConfig | null;
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  genesisTime: NETWORK_DEFAULTS.GENESIS_TIME,
  slotDuration: NETWORK_DEFAULTS.SLOT_DURATION,
  epochDurationSlots: NETWORK_DEFAULTS.EPOCH_DURATION_SLOTS,
  stakingTokenSymbol: NETWORK_DEFAULTS.STAKING_TOKEN_SYMBOL,
  stakingTokenDecimals: NETWORK_DEFAULTS.STAKING_TOKEN_DECIMALS,
  minimumStake: NETWORK_DEFAULTS.MINIMUM_STAKE,
  depositAmount: NETWORK_DEFAULTS.DEPOSIT_AMOUNT,
};

/** Fetch network config from API for a specific rollup */
async function fetchNetworkConfig(rollup?: string): Promise<NetworkConfig> {
  const params = rollup && rollup !== 'active' ? `?rollup=${encodeURIComponent(rollup)}` : '';
  const response = await fetch(`/api/network/config${params}`);
  if (!response.ok) throw new Error('Failed to fetch network configuration');
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

/** Hook to get network config, auto-reads from RollupContext when no param is passed */
export const useNetworkConfig = (rollupParam?: string): NetworkConfigState => {
  const rollupCtx = useRollupOptional();
  const rollup = rollupParam ?? rollupCtx?.globalRollup ?? 'active';
  // Wait for rollup context to resolve before fetching (skip when outside provider or explicit param)
  const rollupReady = rollupParam !== undefined || !rollupCtx || !rollupCtx.isLoading;

  const { data, isLoading, error } = useQuery({
    queryKey: ['network-config', rollup],
    queryFn: () => fetchNetworkConfig(rollup),
    staleTime: 1000 * 60 * 10,
    placeholderData: DEFAULT_NETWORK_CONFIG,
    enabled: rollupReady,
  });

  return {
    config: data ?? DEFAULT_NETWORK_CONFIG,
    isLoading,
    error: error ? (error instanceof Error ? error.message : String(error)) : null,
  };
}