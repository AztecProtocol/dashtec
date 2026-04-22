import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { EpochAttestationMetrics } from '@/types';

interface CurrentEpochStatsResponse {
  totalActiveValidators: number;
  totalExitingValidators: number;
  totalZombieValidators: number;
  totalProviders: number;
  totalQueuedValidators: number;
  top3Concentration: number | null;
  topProviders: Array<{ name: string; validatorCount: number }> | null;
  currentEpochMetrics: EpochAttestationMetrics;
  benchmark: string;
  benchmarks?: Record<string, string>;
  status: string;
}

/** Fetch current epoch statistics from API */
async function fetchCurrentEpochStats(rollup?: string): Promise<CurrentEpochStatsResponse> {
  const params = rollup ? `?rollup=${encodeURIComponent(rollup)}` : '';
  const response = await fetch(`/api/dashboard/current-epoch-stats${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch current stats');
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

/** Hook to fetch current epoch statistics, refetches on each slot boundary */
export function useCurrentEpochStats(currentEpoch?: number, currentSlot?: number, rollup?: string) {
  const query = useQuery({
    queryKey: ['current-epoch-stats', currentEpoch, rollup],
    queryFn: () => fetchCurrentEpochStats(rollup),
    staleTime: 1000 * 30,
    enabled: currentEpoch !== undefined && currentEpoch !== 0,
  });

  // Refetch when slot changes (without creating new cache entries)
  useEffect(() => {
    if (currentSlot !== undefined && currentSlot > 0 && query.data) {
      query.refetch();
    }
  }, [currentSlot]);

  return query;
}
