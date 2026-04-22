import { useQuery } from '@tanstack/react-query';
import type { ProviderSequencersResponse } from '@/app/api/governance/provider-sequencers/route';
import { ProviderSequencerSortBy, SortBy } from '@/types/signaling-matrix';

export interface UseProviderSequencersParams {
  providerIdentifier: string | null;
  roundNumber: number | null;
  payloadAddresses: string[];
  page?: number;
  limit?: number;
  sortBy?: ProviderSequencerSortBy;
  search?: string;
}

/**
 * Fetch provider sequencers with signal counts
 */
async function fetchProviderSequencers(
  params: Omit<UseProviderSequencersParams, 'providerIdentifier' | 'roundNumber'> & {
    providerIdentifier: string;
    roundNumber: number;
  },
  rollup?: string
): Promise<ProviderSequencersResponse> {
  const queryParams = new URLSearchParams();

  queryParams.set('providerIdentifier', params.providerIdentifier);
  queryParams.set('roundNumber', params.roundNumber.toString());
  queryParams.set('payloadAddresses', params.payloadAddresses.join(','));
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.search) queryParams.set('search', params.search);
  if (rollup && rollup !== 'active') queryParams.set('rollup', rollup);

  const response = await fetch(`/api/governance/provider-sequencers?${queryParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch provider sequencers');
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * Hook to fetch sequencers for a specific provider
 */
export function useProviderSequencers(params: UseProviderSequencersParams, rollup?: string) {
  const {
    providerIdentifier,
    roundNumber,
    payloadAddresses,
    page = 1,
    limit = 10,
    sortBy = 'signals',
    search,
  } = params;

  return useQuery({
    queryKey: [
      'provider-sequencers',
      providerIdentifier,
      roundNumber,
      payloadAddresses.join(','),
      page,
      limit,
      sortBy,
      search,
      rollup,
    ],
    queryFn: () =>
      fetchProviderSequencers({
        providerIdentifier: providerIdentifier!,
        roundNumber: roundNumber!,
        payloadAddresses,
        page,
        limit,
        sortBy,
        search,
      }, rollup),
    enabled: !!providerIdentifier && !!roundNumber && payloadAddresses.length > 0,
    staleTime: 1000 * 30, // 30 seconds
  });
}
