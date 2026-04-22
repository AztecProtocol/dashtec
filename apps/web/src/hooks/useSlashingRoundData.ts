import { useMemo } from 'react';
import { useSlashingRoundDetail } from './queries/useSlashingRoundDetail';

interface GroupedConviction {
  validator_address: string;
  total_slash_amount: number;
  slash_count: number;
  validator: any;
}

/**
 * Hook that fetches slashing round data and calculates grouped convictions
 */
export function useSlashingRoundData(roundNumber: number) {
  const query = useSlashingRoundDetail(roundNumber);
  const detail = query.data?.data || null;

  // Group convicted attesters by address and sum amounts
  const groupedConvictions = useMemo(() => {
    if (!detail) return [];

    const groups = new Map<string, GroupedConviction>();

    detail.convicted_attesters.forEach(conviction => {
      const address = conviction.validator_address.toLowerCase();
      if (!groups.has(address)) {
        groups.set(address, {
          validator_address: conviction.validator_address,
          total_slash_amount: 0,
          slash_count: 0,
          validator: conviction.validator
        });
      }
      const group = groups.get(address)!;
      group.total_slash_amount += Number(conviction.slash_amount);
      group.slash_count += 1;
    });

    return Array.from(groups.values());
  }, [detail]);

  // Count addresses slashed more than once
  const multipleSlashCount = useMemo(() => {
    return groupedConvictions.filter(g => g.slash_count > 1).length;
  }, [groupedConvictions]);

  return {
    ...query,
    detail,
    groupedConvictions,
    multipleSlashCount,
    uniqueCount: groupedConvictions.length,
  };
}
