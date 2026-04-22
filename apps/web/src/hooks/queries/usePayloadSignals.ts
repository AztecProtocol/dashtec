import { useQuery } from '@tanstack/react-query';
import { GovernanceSignal } from '@/db/queries/historical-governance';

interface PayloadSignalsResponse {
  data: GovernanceSignal[];
  meta: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
  payloadAddress: string;
  roundNumber: number;
  benchmark: string;
  status: 'ok' | 'error';
}

interface UsePayloadSignalsParams {
  payloadAddress: string;
  roundNumber: number;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

async function fetchPayloadSignals({
  payloadAddress,
  roundNumber,
  page = 1,
  limit = 50,
}: UsePayloadSignalsParams, rollup?: string): Promise<PayloadSignalsResponse> {
  const searchParams = new URLSearchParams({
    roundNumber: roundNumber.toString(),
    page: page.toString(),
    limit: limit.toString(),
  });

  if (rollup && rollup !== 'active') {
    searchParams.append('rollup', rollup);
  }

  const response = await fetch(
    `/api/governance/payloads/${payloadAddress}/signals?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch payload signals');
  }

  return response.json();
}

/**
 * Hook to fetch signals for a specific governance payload
 * Lazy-loads data only when needed (e.g., when payload is expanded)
 */
export function usePayloadSignals(params: UsePayloadSignalsParams, rollup?: string) {
  return useQuery({
    queryKey: [
      'governance',
      'payloads',
      params.payloadAddress,
      'signals',
      params.roundNumber,
      params.page,
      params.limit,
      rollup,
    ],
    queryFn: () => fetchPayloadSignals(params, rollup),
    enabled: params.enabled !== false,
    staleTime: 60 * 1000, // 1 minute
    placeholderData: (previousData) => previousData,
  });
}
