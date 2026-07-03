import { useQuery } from '@tanstack/react-query';

export interface ProverDataResponse {
  config: {
    increment: number;
    maxScore: number;
    decayPerEpoch: number;
    maxShares: number;
    minShares: number;
  };
  summary: {
    proverAddress: string;
    currentEpoch: number;
    activityScore: {
      lastActiveEpoch: number;
      storedValue: number;
      currentScore: number;
      currentShares: number;
      shareMultiplier: number;
      decayPerHour: number;
      hoursUntilZero: number;
    };
    stats: {
      totalProofsSubmitted: number;
      firstProofEpoch: number;
      lastProofEpoch: number;
      longestStreak: number;
      currentStreak: number;
    };
  };
  history: {
    data: any[];
    total: number;
    currentEpoch: number;
  };
  financial?: {
    costs: {
      totalGasUsed: string;
      totalGasCostEth: string;
      avgGasCostPerProof: string;
    };
    rewards: {
      totalTokensEarned: number;
      avgTokensPerEpoch: number;
    };
  };
  benchmark?: number;
  status: string;
}

/**
 * Fetch comprehensive prover data with optional rollup filter
 */
async function fetchProverData(address: string, rollup?: string): Promise<ProverDataResponse> {
  const params = rollup && rollup !== 'active' ? `?rollup=${encodeURIComponent(rollup)}` : '';
  const response = await fetch(`/api/prover/${address}${params}`);

  if (!response.ok) {
    throw new Error('Failed to fetch prover data');
  }

  return response.json();
}

/**
 * Hook to get all prover data (summary, history, financial)
 */
export function useProverData(address: string | null, rollup?: string) {
  return useQuery({
    queryKey: ['prover', address, rollup],
    queryFn: () => fetchProverData(address!, rollup),
    enabled: !!address,
    staleTime: 60_000,
  });
}
