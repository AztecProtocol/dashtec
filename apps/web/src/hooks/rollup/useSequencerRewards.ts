'use client';

import { useQuery } from '@tanstack/react-query';

/**
 * Hook to get sequencer rewards for a specific coinbase address, scoped to a rollup version
 */
export function useSequencerRewards(coinbaseAddress?: string, rollupParam?: string) {
  const query = useQuery({
    queryKey: ['sequencer-rewards', coinbaseAddress, rollupParam],
    queryFn: async () => {
      if (!coinbaseAddress) return null;

      const params = rollupParam ? `?rollup=${rollupParam}` : '';
      const response = await fetch(`/api/rewards/${coinbaseAddress}${params}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch rewards');
      }

      return response.json() as Promise<{ address: string; rewards: string }>;
    },
    enabled: !!coinbaseAddress && /^0x[a-fA-F0-9]{40}$/.test(coinbaseAddress),
  });

  return {
    rewards: query.data?.rewards,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
