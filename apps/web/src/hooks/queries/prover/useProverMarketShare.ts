import { useQuery } from '@tanstack/react-query';
import { ProverMarketShareResponse } from '@/types/prover';

/**
 * Fetch prover market share with optional rollup filter
 */
async function fetchProverMarketShare(rollup?: string): Promise<ProverMarketShareResponse> {
  const params = rollup && rollup !== 'active' ? `?rollup=${encodeURIComponent(rollup)}` : '';
  const response = await fetch(`/api/prover/network/market-share${params}`);

  if (!response.ok) {
    throw new Error('Failed to fetch prover market share');
  }

  return response.json();
}

/**
 * Hook to get prover market share distribution
 */
export function useProverMarketShare(rollup?: string) {
  return useQuery({
    queryKey: ['prover', 'network', 'market-share', rollup],
    queryFn: () => fetchProverMarketShare(rollup),
    staleTime: 120_000,
  });
}
