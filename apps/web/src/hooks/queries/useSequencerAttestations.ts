import { useQuery } from '@tanstack/react-query';
import type { SequencerAttestationsResponse } from '@/app/api/governance/sequencer-attestations/route';

/**
 * Hook to fetch attestations for a specific sequencer in a round
 */
export function useSequencerAttestations(
  sequencerAddress: string | null,
  roundNumber: number,
  rollup?: string
) {
  return useQuery({
    queryKey: ['sequencer-attestations', sequencerAddress, roundNumber, rollup],
    queryFn: async (): Promise<SequencerAttestationsResponse> => {
      if (!sequencerAddress) {
        throw new Error('Sequencer address is required');
      }

      const params = new URLSearchParams({
        sequencerAddress,
        roundNumber: roundNumber.toString(),
      });

      if (rollup && rollup !== 'active') {
        params.append('rollup', rollup);
      }

      const response = await fetch(`/api/governance/sequencer-attestations?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch sequencer attestations');
      }

      return response.json();
    },
    enabled: !!sequencerAddress,
    staleTime: 30000, // 30 seconds
  });
}
