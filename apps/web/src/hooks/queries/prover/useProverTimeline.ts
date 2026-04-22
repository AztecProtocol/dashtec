import { useQuery } from '@tanstack/react-query';
import type { ProverTimelineResponse, ProverTimelineParams } from '@/types/prover';

/**
 * Fetch prover timeline with optional rollup filter
 */
async function fetchProverTimeline(
  address: string,
  params: ProverTimelineParams = {},
  rollup?: string,
): Promise<ProverTimelineResponse> {
  const searchParams = new URLSearchParams();

  if (params.groupBy) {
    searchParams.set('groupBy', params.groupBy);
  }
  if (rollup && rollup !== 'active') searchParams.set('rollup', rollup);

  const qs = searchParams.toString();
  const url = `/api/prover/${address}/timeline${qs ? `?${qs}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch prover timeline');
  }

  return response.json();
}

/**
 * Hook to get prover timeline
 */
export function useProverTimeline(
  address: string | null,
  params: ProverTimelineParams = {},
  rollup?: string,
) {
  return useQuery({
    queryKey: ['prover', 'timeline', address, params, rollup],
    queryFn: () => fetchProverTimeline(address!, params, rollup),
    enabled: !!address,
    staleTime: 60_000,
  });
}
