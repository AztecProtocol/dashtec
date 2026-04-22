import { useQuery } from '@tanstack/react-query';
import { ProviderDetail, ProviderDetailApiResponse } from '@/types';

/**
 * Fetch provider detail from API
 */
async function fetchProviderDetail(identifier: string, epochLimit?: number, rollupParam?: string): Promise<ProviderDetail> {
  const url = new URL(`/api/providers/${encodeURIComponent(identifier)}`, window.location.origin);
  if (epochLimit) url.searchParams.set('epochLimit', epochLimit.toString());
  if (rollupParam) url.searchParams.set('rollup', rollupParam);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch provider detail');
  }
  const data: ProviderDetailApiResponse = await response.json();
  return data.data;
}

/**
 * Hook to fetch provider detail by identifier, scoped to a rollup version
 */
export function useProviderDetail(identifier: string, epochLimit?: number, rollupParam?: string) {
  return useQuery({
    queryKey: ['provider-detail', identifier, epochLimit, rollupParam],
    queryFn: () => fetchProviderDetail(identifier, epochLimit, rollupParam),
    staleTime: 1000 * 60 * 5,
  });
}
