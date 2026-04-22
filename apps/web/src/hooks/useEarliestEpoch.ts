'use client';

import { useQuery } from '@tanstack/react-query';
import { useRollupOptional } from '@/context/RollupContext';

interface EpochRangeData {
  earliest: number | null;
  latest: number | null;
}

interface EpochRangeState {
  earliestEpoch: number | null;
  latestEpoch: number | null;
  isLoadingEpoch: boolean;
  error: string | null;
}

/** Fetch earliest and latest indexed epochs from API */
async function fetchEpochRange(rollup?: string): Promise<EpochRangeData> {
  const params = rollup && rollup !== 'active' ? `?rollup=${encodeURIComponent(rollup)}` : '';
  const response = await fetch(`/api/stats/general${params}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch epoch range: ${response.statusText}`);
  }
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  const parseEpoch = (v: unknown) => (v !== null && v !== undefined && !isNaN(Number(v))) ? Number(v) : null;
  return { earliest: parseEpoch(data.earliestIndexedEpoch), latest: parseEpoch(data.latestIndexedEpoch) };
}

/** Hook to get the earliest and latest indexed epoch, auto-reads from RollupContext when no param is passed */
export const useEarliestEpoch = (rollupParam?: string): EpochRangeState => {
  const rollupCtx = useRollupOptional();
  const rollup = rollupParam ?? rollupCtx?.globalRollup ?? 'active';
  const rollupReady = rollupParam !== undefined || !rollupCtx || !rollupCtx.isLoading;

  const { data, isLoading, error } = useQuery({
    queryKey: ['epoch-range', rollup],
    queryFn: () => fetchEpochRange(rollup),
    staleTime: 1000 * 60 * 10,
    enabled: rollupReady,
  });

  return {
    earliestEpoch: data?.earliest ?? null,
    latestEpoch: data?.latest ?? null,
    isLoadingEpoch: isLoading,
    error: error ? (error instanceof Error ? error.message : String(error)) : null,
  };
};
