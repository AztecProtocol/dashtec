import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { ValidatorEpochSlotActivity } from '@/types';

interface EpochLiveSlotActivityResponse {
  activities: ValidatorEpochSlotActivity[];
}

/**
 * Fetch live slot activity for a specific epoch with rollup filter
 */
async function fetchEpochLiveSlotActivity(
  epochNumber: number,
  rollup?: string,
): Promise<EpochLiveSlotActivityResponse> {
  const params = rollup && rollup !== 'active' ? `?rollup=${encodeURIComponent(rollup)}` : '';
  const response = await fetch(`/api/epochs/${epochNumber}/live-slot-activity${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API request failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(`API Error: ${data.error}`);

  return data;
}

/**
 * Hook to fetch live slot activity for current epoch
 * Automatically refetches at specified interval for real-time updates
 */
export function useEpochLiveSlotActivity(
  epochNumber: number | undefined,
  rollup?: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
): UseQueryResult<EpochLiveSlotActivityResponse, Error> {
  return useQuery<EpochLiveSlotActivityResponse, Error>({
    queryKey: ['epoch-live-slot-activity', epochNumber, rollup],
    queryFn: () => fetchEpochLiveSlotActivity(epochNumber!, rollup),
    enabled: epochNumber !== undefined && epochNumber >= 0 && (options?.enabled ?? true),
    staleTime: 0,
    refetchInterval: options?.refetchInterval ?? 3000,
    refetchIntervalInBackground: true,
  });
}
