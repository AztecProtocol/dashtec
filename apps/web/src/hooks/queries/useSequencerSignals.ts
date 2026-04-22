import { useQuery } from '@tanstack/react-query';
import type { SequencerSignalsResponse } from '@/types/api/sequencer-signals';

/**
 * Fetch sequencer signals from dedicated API endpoint
 */
async function fetchSequencerSignals(
  sequencerAddress: string,
  roundNumber: number,
  payloadAddress?: string,
  rollup?: string
): Promise<SequencerSignalsResponse> {
  const params = new URLSearchParams({ sequencerAddress, roundNumber: roundNumber.toString() });
  if (payloadAddress) {
    params.append('payloadAddress', payloadAddress);
  }
  if (rollup && rollup !== 'active') {
    params.append('rollup', rollup);
  }

  const response = await fetch(`/api/governance/sequencer-signals?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch sequencer signals');
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * Hook to fetch signals for a specific sequencer, optionally filtered by payload
 */
export function useSequencerSignals(
  sequencerAddress: string | null,
  roundNumber: number | null,
  payloadAddress?: string | null,
  rollup?: string,
) {
  return useQuery({
    queryKey: ['sequencer-signals', sequencerAddress, roundNumber, payloadAddress, rollup],
    queryFn: () => fetchSequencerSignals(sequencerAddress!, roundNumber!, payloadAddress || undefined, rollup),
    enabled: !!sequencerAddress && !!roundNumber, // Only fetch when sequencer address is provided
    staleTime: 1000 * 60, // 1 minute
  });
}