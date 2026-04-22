import { ValidatorPerformance } from '@/types';

/**
 * Generate the correct link for a validator
 * Returns queue page link for queued validators, detail page for others
 * Can accept either a validator object or just an address string
 */
export const getValidatorLink = (
  validatorOrAddress: ValidatorPerformance | { address: string; isInQueue?: boolean } | string
): string => {
  // Handle string address case
  if (typeof validatorOrAddress === 'string') {
    return `/sequencers/${encodeURIComponent(validatorOrAddress)}`;
  }

  // Handle validator object case
  if (validatorOrAddress.isInQueue) {
    return `/queue?search=${encodeURIComponent(validatorOrAddress.address)}`;
  }

  return `/sequencers/${encodeURIComponent(validatorOrAddress.address)}`;
};
