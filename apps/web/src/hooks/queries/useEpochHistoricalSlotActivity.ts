import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { ValidatorEpochSlotActivity } from '@/types';

interface EpochHistoricalSlotActivityResponse {
  activities: ValidatorEpochSlotActivity[];
  error?: string;
}

/**
 * Fetch historical slot activity for a specific epoch with rollup filter
 */
async function fetchEpochHistoricalSlotActivity(
  epochNumber: number,
  rollup?: string,
): Promise<EpochHistoricalSlotActivityResponse> {
  const params = rollup && rollup !== 'active' ? `?rollup=${encodeURIComponent(rollup)}` : '';
  const response = await fetch(`/api/epochs/${epochNumber}/historical${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API request failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(`API Error: ${data.error}`);

  return data;
}

/**
 * Hook to fetch historical slot activity for a past epoch
 */
export function useEpochHistoricalSlotActivity(
  epochNumber: number | undefined,
  rollup?: string,
  options?: {
    enabled?: boolean;
  }
): UseQueryResult<EpochHistoricalSlotActivityResponse, Error> {
  return useQuery<EpochHistoricalSlotActivityResponse, Error>({
    queryKey: ['epoch-historical-slot-activity', epochNumber, rollup],
    queryFn: () => fetchEpochHistoricalSlotActivity(epochNumber!, rollup),
    enabled: epochNumber !== undefined && !isNaN(epochNumber) && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
