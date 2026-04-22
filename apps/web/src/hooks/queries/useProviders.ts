import { useQuery } from '@tanstack/react-query';
import { ProvidersApiResponse } from '@/types';

/**
 * Fetch providers from API with pagination and filtering
 */
async function fetchProviders(params: {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  rollup?: string;
}): Promise<ProvidersApiResponse> {
  const searchParams = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString(),
  });

  if (params.search) searchParams.append('search', params.search);
  if (params.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
  if (params.rollup) searchParams.append('rollup', params.rollup);

  const response = await fetch(`/api/providers?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch providers');
  }
  return response.json();
}

/**
 * Hook to fetch providers with server-side pagination, filtering, and rollup scoping
 */
export function useProviders(params: {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  rollup?: string;
}) {
  return useQuery({
    queryKey: ['providers', params],
    queryFn: () => fetchProviders(params),
    staleTime: 1000 * 60 * 5,
  });
}
