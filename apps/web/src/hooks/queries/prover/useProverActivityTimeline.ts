import { useQuery } from '@tanstack/react-query';
import { NetworkActivityTimelineResponse } from '@/types/prover';

/**
 * Fetch network-wide prover activity timeline with optional rollup filter
 */
async function fetchActivityTimeline(
  groupBy: 'day' | 'week',
  rollup?: string,
): Promise<NetworkActivityTimelineResponse> {
  const params = new URLSearchParams({ groupBy });
  if (rollup && rollup !== 'active') params.set('rollup', rollup);
  const response = await fetch(`/api/prover/network/activity-timeline?${params}`);

  if (!response.ok) {
    throw new Error('Failed to fetch network activity timeline');
  }

  return response.json();
}

/**
 * Hook to get network-wide prover activity timeline data
 */
export function useProverActivityTimeline(groupBy: 'day' | 'week' = 'day', rollup?: string) {
  return useQuery({
    queryKey: ['prover', 'network', 'activity-timeline', groupBy, rollup],
    queryFn: () => fetchActivityTimeline(groupBy, rollup),
    staleTime: 120_000,
  });
}
