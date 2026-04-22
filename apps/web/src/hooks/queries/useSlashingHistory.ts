import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  SlashingHistoryApiResponse,
  SlashingHistoryParams,
} from '@/types/api';

/**
 * Fetch slashing history with pagination, search, and rollup filter
 */
async function fetchSlashingHistory(
  params: SlashingHistoryParams,
  rollup?: string,
): Promise<SlashingHistoryApiResponse> {
  const urlParams = new URLSearchParams({
    page: params.page.toString(),
    limit: (params.limit ?? 20).toString(),
  });
  if (params.search) urlParams.append('search', params.search);
  if (params.sortBy) urlParams.append('sortBy', params.sortBy);
  if (params.sortOrder) urlParams.append('sortOrder', params.sortOrder);
  if (rollup && rollup !== 'active') urlParams.append('rollup', rollup);

  const response = await fetch(`/api/slashing-history?${urlParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch slashing history');
  }
  return response.json();
}

/**
 * Hook to fetch slashing history with React Query and rollup filter
 */
export function useSlashingHistory(
  params: SlashingHistoryParams,
  rollup?: string,
): UseQueryResult<SlashingHistoryApiResponse, Error> {
  return useQuery<SlashingHistoryApiResponse, Error>({
    queryKey: ['slashing-history', params.page, params.limit, params.search, params.sortBy, params.sortOrder, rollup],
    queryFn: () => fetchSlashingHistory(params, rollup),
    staleTime: 30 * 1000,
  });
}
