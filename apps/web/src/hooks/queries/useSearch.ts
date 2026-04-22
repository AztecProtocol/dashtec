import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { ValidatorPerformance } from '@/types';

interface SearchResponse {
  validators: ValidatorPerformance[];
  queuedValidators: any[];
}

/**
 * Fetch search results from API
 */
async function fetchSearchResults(params: URLSearchParams): Promise<SearchResponse> {
  const response = await fetch(`/api/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch search results');
  }
  const data = await response.json();
  return {
    validators: data.validators || [],
    queuedValidators: data.queuedValidators || [],
  };
}

/**
 * Custom hook to fetch search results
 */
export function useSearch(
  query: string,
  startEpoch?: string,
  endEpoch?: string
): UseQueryResult<SearchResponse, Error> {
  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (startEpoch) params.append('startEpoch', startEpoch);
  if (endEpoch) params.append('endEpoch', endEpoch);

  return useQuery<SearchResponse, Error>({
    queryKey: ['search', query, startEpoch, endEpoch],
    queryFn: () => fetchSearchResults(params),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!query,
  });
}
