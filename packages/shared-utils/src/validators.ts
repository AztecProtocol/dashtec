import { isAddress, Address } from 'viem';

// Re-export centralized status utilities from shared-types
export { mapStatusToString } from '@dashtec/shared-types';

/**
 * Validate Ethereum address
 */
export const isValidAddress = (address: string): boolean => {
  return isAddress(address);
};

/**
 * Normalize address to lowercase
 */
export const normalizeAddress = (address: string): Address => {
  return address.toLowerCase() as Address;
};

/**
 * Generate validator hex index from address (first 10 characters after 0x in uppercase)
 */
export const getValidatorHexIndex = (address: string): string => {
  const baseHex = address.substring(2, 12).toUpperCase();
  return baseHex;
};

/**
 * Validate epoch number
 */
export const isValidEpochNumber = (epoch: bigint | number): boolean => {
  const num = BigInt(epoch);
  return num >= BigInt(0);
};

/**
 * Validate slot number
 */
export const isValidSlotNumber = (slot: bigint | number): boolean => {
  const num = BigInt(slot);
  return num >= BigInt(0);
};

/**
 * Check if address is zero address
 */
export const isZeroAddress = (address: string): boolean => {
  return address === '0x0000000000000000000000000000000000000000';
};
