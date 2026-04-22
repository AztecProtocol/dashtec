import { useQuery, UseQueryResult } from '@tanstack/react-query';

export interface EpochIntegrityItem {
  epochNumber: number;
  integrity: number;
}

interface EpochsIntegrityResponse {
  epochs: EpochIntegrityItem[];
  totalPages: number;
  totalEpochs: number;
}

interface UseEpochsIntegrityParams {
  page: number;
  limit: number;
  search?: string;
  startEpoch?: string;
  endEpoch?: string;
}

/**
 * Fetch epochs integrity data with pagination, filters, and rollup filter
 */
async function fetchEpochsIntegrity(params: UseEpochsIntegrityParams, rollup?: string): Promise<EpochsIntegrityResponse> {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });

  if (params.search) searchParams.append('q', params.search);
  if (params.startEpoch) searchParams.append('startEpoch', params.startEpoch);
  if (params.endEpoch) searchParams.append('endEpoch', params.endEpoch);
  if (rollup && rollup !== 'active') searchParams.append('rollup', rollup);

  const response = await fetch(`/api/epochs/integrity?${searchParams.toString()}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API request failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(`API Error: ${data.error}`);

  return data;
}

/**
 * Hook to fetch epochs integrity data with pagination, filters, and rollup filter
 */
export function useEpochsIntegrity(
  params: UseEpochsIntegrityParams,
  rollup?: string,
  options?: {
    enabled?: boolean;
  }
): UseQueryResult<EpochsIntegrityResponse, Error> {
  return useQuery<EpochsIntegrityResponse, Error>({
    queryKey: ['epochs-integrity', params.page, params.limit, params.search, params.startEpoch, params.endEpoch, rollup],
    queryFn: () => fetchEpochsIntegrity(params, rollup),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}
