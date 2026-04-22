import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { PaginatedValidatorsResponse } from '@/types/api';

/**
 * Fetch watchlist validators from dedicated API endpoint
 */
async function fetchWatchlistValidators(addresses: string[]): Promise<PaginatedValidatorsResponse> {
  if (addresses.length === 0) {
    return {
      validators: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: 1,
      limit: 0,
      maxTotalAttestations: 0,
      maxTotalBlocksProduced: 0,
      statuses: [],
      benchmark: '0ms',
      status: 'ok'
    };
  }

  const response = await fetch('/api/validators/watchlist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ addresses }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch watchlist validators');
  }

  const data = await response.json();
  return data;
}

/**
 * Custom hook to fetch watchlist validators
 */
export function useWatchlistValidators(
  addresses: string[]
): UseQueryResult<PaginatedValidatorsResponse, Error> {
  return useQuery<PaginatedValidatorsResponse, Error>({
    queryKey: ['watchlist-validators', [...addresses].sort().join(',')],
    queryFn: () => fetchWatchlistValidators(addresses),
    staleTime: 30 * 1000, // 30 seconds
    enabled: addresses.length > 0,
  });
}
