import { useQuery } from '@tanstack/react-query';
import { ValidatorPerformance } from '@/types';

interface TopValidatorsResponse {
  validators: ValidatorPerformance[];
}

/**
 * Fetch top validator performance data from API
 */
async function fetchTopValidators(startEpoch: string, endEpoch: string, rollup?: string): Promise<TopValidatorsResponse> {
  const params = new URLSearchParams();
  if (startEpoch) params.append('startEpoch', startEpoch);
  if (endEpoch) params.append('endEpoch', endEpoch);
  if (rollup) params.append('rollup', rollup);

  const response = await fetch(`/api/dashboard/top-validators?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch sequencer performance');
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

/**
 * Hook to fetch top validator performance data for a given epoch range
 */
export function useTopValidators(startEpoch: string, endEpoch: string, limit?: number, rollup?: string) {
  return useQuery({
    queryKey: ['top-validators', startEpoch, endEpoch, rollup],
    queryFn: () => fetchTopValidators(startEpoch, endEpoch, rollup),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!startEpoch && !!endEpoch,
    select: (data) => ({
      ...data,
      validators: limit ? data.validators.slice(0, limit) : data.validators
    })
  });
}
