import { Address } from 'viem';

/**
 * Types for Rollup contract AttesterView
 */

export interface G1Point {
  x: bigint;
  y: bigint;
}

export interface Exit {
  withdrawalId: bigint;
  amount: bigint;
  exitableAt: bigint;
  recipientOrWithdrawer: Address;
  isRecipient: boolean;
  exists: boolean;
}

export interface AttesterConfig {
  publicKey: G1Point;
  withdrawer: Address;
}

export interface AttesterView {
  status: number; // uint8 from contract
  effectiveBalance: bigint;
  exit: Exit;
  config: AttesterConfig;
}
