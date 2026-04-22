import { useQuery } from '@tanstack/react-query';
import { ProverLeaderboardResponse } from '@/types/prover';

/**
 * Fetch the prover leaderboard with optional rollup filter
 */
async function fetchProverLeaderboard(limit: number, rollup?: string): Promise<ProverLeaderboardResponse> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (rollup && rollup !== 'active') params.set('rollup', rollup);
  const response = await fetch(`/api/prover/network/leaderboard?${params}`);

  if (!response.ok) {
    throw new Error('Failed to fetch prover leaderboard');
  }

  return response.json();
}

/**
 * Hook to get the top provers leaderboard
 */
export function useProverLeaderboard(limit: number = 20, rollup?: string) {
  return useQuery({
    queryKey: ['prover', 'leaderboard', limit, rollup],
    queryFn: () => fetchProverLeaderboard(limit, rollup),
    staleTime: 120_000,
  });
}
