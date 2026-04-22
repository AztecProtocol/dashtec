import type { Address } from 'viem';

/**
 * Round accounting data from GovernanceProposer.getRoundData
 */
export interface RoundAccounting {
  lastSignalSlot: bigint;
  payloadWithMostSignals: Address;
  executed: boolean;
}
