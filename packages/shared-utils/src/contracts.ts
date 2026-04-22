import { type Address, type Hash, type Hex } from 'viem';

/**
 * Contract event log data
 */
export interface ContractEventLog {
  address: Address;
  blockNumber: bigint;
  transactionHash: Hash;
  logIndex: number;
  timestamp?: bigint;
}

/**
 * Create unique key for contract event
 */
export const createEventKey = (txHash: string, logIndex: string | number): string => {
  return `${txHash}-${logIndex}`;
};

/**
 * Parse hex string to BigInt
 */
export const hexToBigInt = (hex: Hex): bigint => {
  return BigInt(hex);
};

/**
 * Convert BigInt to hex string
 */
export const bigIntToHex = (value: bigint): Hex => {
  return `0x${value.toString(16)}` as Hex;
};

/**
 * Sleep utility for delays
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry logic for async functions
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await sleep(delayMs * (i + 1));
      }
    }
  }

  throw lastError!;
};
