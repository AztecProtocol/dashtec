import { useQuery } from '@tanstack/react-query';
import { VotingOverviewResponse } from '@/types/api/voting-overview';

/**
 * Fetch voting overview data from API
 */
async function fetchVotingOverview(rollup?: string): Promise<VotingOverviewResponse> {
  const params = rollup ? `?rollup=${encodeURIComponent(rollup)}` : '';
  const response = await fetch(`/api/dashboard/voting-overview${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch voting overview');
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

/**
 * Hook to fetch voting overview data (governance and slashing)
 */
export function useVotingOverview(rollup?: string) {
  return useQuery({
    queryKey: ['voting-overview', rollup],
    queryFn: () => fetchVotingOverview(rollup),
    staleTime: 1000 * 60 * 2, // 2 minutes - voting data changes less frequently
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  });
}
