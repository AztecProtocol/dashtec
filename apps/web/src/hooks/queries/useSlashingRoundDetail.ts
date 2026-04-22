import { useQuery } from '@tanstack/react-query';
import { SlashingDetailApiResponse } from '@/components/features/slashing-history/types';

/**
 * Fetch slashing round detail data from API
 */
const fetchSlashingRoundDetail = async (roundNumber: number): Promise<SlashingDetailApiResponse> => {
  const response = await fetch(`/api/slashing-history/${roundNumber}`);

  if (!response.ok) {
    throw new Error('Failed to fetch round detail');
  }

  return response.json();
};

/**
 * React Query hook for fetching slashing round detail
 * Provides automatic caching, refetching, and loading states
 */
export const useSlashingRoundDetail = (roundNumber: number) => {
  return useQuery({
    queryKey: ['slashing-round-detail', roundNumber],
    queryFn: () => fetchSlashingRoundDetail(roundNumber),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
  });
};
