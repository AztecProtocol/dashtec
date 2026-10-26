import { useQuery, UseQueryResult } from '@tanstack/react-query';
import type { RollupVersionStats } from '@/types/rollup';

interface RollupVersionsResponse {
  versions: RollupVersionStats[];
  active: string;
  benchmark: string;
  status: string;
}

/** Fetch rollup versions from /api/rollups */
export function useRollupVersions(): UseQueryResult<RollupVersionsResponse, Error> {
  return useQuery<RollupVersionsResponse, Error>({
    queryKey: ['rollup-versions'],
    queryFn: async () => {
      const res = await fetch('/api/rollups');
      if (!res.ok) throw new Error('Failed to fetch rollup versions');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
