import { useQuery } from '@tanstack/react-query';
import type { ProverProjectionsResponse, ProverProjectionsParams } from '@/types/prover';

/**
 * Fetch prover projections with optional rollup filter
 */
async function fetchProverProjections(
  address: string,
  params: ProverProjectionsParams,
  rollup?: string,
): Promise<ProverProjectionsResponse> {
  const searchParams = new URLSearchParams();

  searchParams.set('currentScore', params.currentScore.toString());
  if (params.targetScore !== undefined) {
    searchParams.set('targetScore', params.targetScore.toString());
  }
  if (rollup && rollup !== 'active') searchParams.set('rollup', rollup);

  const url = `/api/prover/${address}/projections?${searchParams.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch prover projections');
  }

  return response.json();
}

/**
 * Hook to get prover projections
 */
export function useProverProjections(
  address: string | null,
  params: ProverProjectionsParams | null,
  rollup?: string,
) {
  return useQuery({
    queryKey: ['prover', 'projections', address, params, rollup],
    queryFn: () => fetchProverProjections(address!, params!, rollup),
    enabled: !!address && !!params && params.currentScore > 0,
    staleTime: 60_000,
  });
}
