import { useQuery } from '@tanstack/react-query';
import type { SignalingMatrixResponse } from '@/types/api/signaling-matrix';
import { SortBy } from '@/types/signaling-matrix';

export interface UseSignalingMatrixParams {
  page?: number;
  limit?: number;
  sortBy?: SortBy;
  filterStatus?: 'all' | 'signaled' | 'no_signal';
  round?: number;
  search?: string;
}

/**
 * Fetch signaling matrix data from API with pagination
 */
async function fetchSignalingMatrix(params: UseSignalingMatrixParams, rollup?: string): Promise<SignalingMatrixResponse> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.filterStatus) queryParams.set('filterStatus', params.filterStatus);
  if (params.round) queryParams.set('round', params.round.toString());
  if (params.search) queryParams.set('search', params.search);
  if (rollup && rollup !== 'active') queryParams.set('rollup', rollup);

  const response = await fetch(`/api/governance/signaling-matrix?${queryParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch signaling matrix data');
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * Hook to fetch signaling matrix data with server-side pagination
 */
export function useSignalingMatrix(params: UseSignalingMatrixParams = {}, rollup?: string) {
  const { page = 1, limit = 10, sortBy = 'support', filterStatus = 'all', round, search } = params;

  return useQuery({
    queryKey: ['signaling-matrix', page, limit, sortBy, filterStatus, round, search, rollup],
    queryFn: () => fetchSignalingMatrix({ page, limit, sortBy, filterStatus, round, search }, rollup),
    staleTime: 1000 * 30, // 30 seconds - voting can change quickly
    refetchInterval: 1000 * 60, // Refetch every minute
    refetchIntervalInBackground: true,
  });
}
