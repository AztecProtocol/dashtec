import { useState, useMemo, useCallback } from "react";

export type NetworkType = 'mainnet' | 'sepolia';

export interface NetworkConfig {
  value: NetworkType;
  label: string;
  gradient: readonly [string, string, string];
  domain: string | undefined;
}

const NETWORKS: readonly NetworkConfig[] = [
  {
    value: 'mainnet',
    label: 'Mainnet',
    gradient: ['#10B981', '#059669', '#047857'],
    domain: process.env.NEXT_PUBLIC_MAINNET_DOMAIN,
  },
  {
    value: 'sepolia',
    label: 'Sepolia',
    gradient: ['#EC4899', '#F97316', '#EF4444'],
    domain: process.env.NEXT_PUBLIC_TESTNET_DOMAIN,
  },
] as const;

const DEFAULT_NETWORK: NetworkType =
  (process.env.NEXT_PUBLIC_NETWORK_TYPE as NetworkType) || 'mainnet';

export const useNetworks = () => {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>(DEFAULT_NETWORK);

  const currentNetwork = useMemo(
    () => NETWORKS.find(n => n.value === selectedNetwork) ?? NETWORKS[0],
    [selectedNetwork]
  );

  const getDomain = useCallback((network: NetworkType): string | undefined => {
    return NETWORKS.find(n => n.value === network)?.domain;
  }, []);

  const switchNetwork = useCallback((network: NetworkType) => {
    const targetDomain = getDomain(network);

    if (!targetDomain) {
      console.warn(`[useNetworks] No domain configured for network: ${network}`);
      return;
    }

    if (network === selectedNetwork) return;

    setSelectedNetwork(network);

    const { protocol, pathname, search } = window.location;
    window.location.href = `${protocol}//${targetDomain}${pathname}${search}`;
  }, [selectedNetwork, getDomain]);

  return {
    networks: NETWORKS,
    selectedNetwork,
    currentNetwork,
    getDomain,
    switchNetwork,
  };
};
