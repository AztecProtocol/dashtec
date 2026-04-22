import type { Address } from 'viem';

/**
 * Payload action structure
 */
export interface PayloadAction {
  target: Address;
  data: `0x${string}`;
}
