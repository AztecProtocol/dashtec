import { useQuery } from '@tanstack/react-query';
import { GovernancePayloadInfo } from '@/db/queries/historical-governance';

interface RoundPayloadsResponse {
  data: GovernancePayloadInfo[];
  meta: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
  roundNumber: number;
  benchmark: string;
  status: 'ok' | 'error';
}

interface UseRoundPayloadsParams {
  roundNumber: number;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

async function fetchRoundPayloads({
  roundNumber,
  page = 1,
  limit = 20,
}: UseRoundPayloadsParams, rollup?: string): Promise<RoundPayloadsResponse> {
  const searchParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (rollup && rollup !== 'active') {
    searchParams.append('rollup', rollup);
  }

  const response = await fetch(
    `/api/governance/rounds/${roundNumber}/payloads?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch round payloads');
  }

  return response.json();
}

/**
 * Hook to fetch payloads for a specific governance round
 * Lazy-loads data only when needed (e.g., when round is expanded)
 */
export function useRoundPayloads(params: UseRoundPayloadsParams, rollup?: string) {
  return useQuery({
    queryKey: ['governance', 'rounds', params.roundNumber, 'payloads', params.page, params.limit, rollup],
    queryFn: () => fetchRoundPayloads(params, rollup),
    enabled: params.enabled !== false,
    staleTime: 60 * 1000, // 1 minute
    placeholderData: (previousData) => previousData,
  });
}
