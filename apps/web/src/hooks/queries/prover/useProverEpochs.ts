import { useQuery } from '@tanstack/react-query';
import type { ProverEpochsResponse, ProverEpochsParams } from '@/types/prover';

/**
 * Fetch prover epochs with optional rollup filter
 */
async function fetchProverEpochs(
  address: string,
  params: ProverEpochsParams = {},
  rollup?: string,
): Promise<ProverEpochsResponse> {
  const searchParams = new URLSearchParams();

  if (params.sortOrder) {
    searchParams.set('sortOrder', params.sortOrder);
  }
  if (rollup && rollup !== 'active') searchParams.set('rollup', rollup);

  const qs = searchParams.toString();
  const url = `/api/prover/${address}/epochs${qs ? `?${qs}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch prover epochs');
  }

  return response.json();
}

/**
 * Hook to get prover epochs
 */
export function useProverEpochs(
  address: string | null,
  params: ProverEpochsParams = {},
  rollup?: string,
) {
  return useQuery({
    queryKey: ['prover', 'epochs', address, params, rollup],
    queryFn: () => fetchProverEpochs(address!, params, rollup),
    enabled: !!address,
    staleTime: 300_000,
  });
}
