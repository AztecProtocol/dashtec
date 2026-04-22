import { useQuery } from '@tanstack/react-query';
import { NetworkProvingHealthResponse } from '@/types/prover';

/** Fetch network proving health KPIs with optional rollup filter */
async function fetchNetworkProvingHealth(rollup?: string): Promise<NetworkProvingHealthResponse> {
  const params = rollup && rollup !== 'active' ? `?rollup=${encodeURIComponent(rollup)}` : '';
  const response = await fetch(`/api/prover/network/health${params}`);

  if (!response.ok) {
    throw new Error('Failed to fetch network proving health');
  }

  return response.json();
}

/** Hook to get network-wide proving health metrics */
export function useNetworkProvingHealth(rollup?: string) {
  return useQuery({
    queryKey: ['prover', 'network', 'health', rollup],
    queryFn: () => fetchNetworkProvingHealth(rollup),
    staleTime: 120_000,
  });
}
