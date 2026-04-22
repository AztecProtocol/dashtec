import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { StakingData } from '@/types/api';

/**
 * Fetch staking overview data
 */
async function fetchStakingData(rollup?: string): Promise<StakingData> {
  const params = rollup ? `?rollup=${encodeURIComponent(rollup)}` : '';
  const response = await fetch(`/api/staking/overview${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch staking data');
  }
  return response.json();
}

/**
 * Hook to fetch staking overview data with React Query
 */
export function useStakingData(rollup?: string): UseQueryResult<StakingData, Error> {
  return useQuery<StakingData, Error>({
    queryKey: ['staking', 'overview', rollup],
    queryFn: () => fetchStakingData(rollup),
    staleTime: 60 * 1000, // 1 minute
  });
}
