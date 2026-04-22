import { useQuery } from '@tanstack/react-query';
import { GovernanceRoundSummary } from '@/db/queries/historical-governance';

interface GovernanceRoundsResponse {
  data: GovernanceRoundSummary[];
  meta: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
  currentRound: number;
  executionDelayInRounds: number;
  lifetimeInRounds: number;
  quorumSize: number;
  benchmark: string;
  status: 'ok' | 'error';
}

interface UseGovernanceRoundsParams {
  page?: number;
  limit?: number;
  query?: string;
}

async function fetchGovernanceRounds({ page = 1, limit = 20, query }: UseGovernanceRoundsParams, rollup?: string): Promise<GovernanceRoundsResponse> {
  const searchParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (query) {
    searchParams.append('q', query);
  }

  if (rollup && rollup !== 'active') {
    searchParams.append('rollup', rollup);
  }

  const response = await fetch(`/api/governance/rounds?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch governance rounds');
  }
  return response.json();
}

/**
 * Hook to fetch all governance rounds with payloads and signals
 * Data is grouped hierarchically: Rounds -> Payloads -> Signals
 */
export function useGovernanceRounds(params: UseGovernanceRoundsParams = {}, rollup?: string) {
  return useQuery({
    queryKey: ['governance', 'rounds', params, rollup],
    queryFn: () => fetchGovernanceRounds(params, rollup),
    staleTime: 60 * 1000, // 1 minute
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
  });
}
