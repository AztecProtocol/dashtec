import { INDEPENDENT_PROVIDER_IDENTIFIER } from '@/utils/constants';
import type { ValidatorWithProvider } from '@/types/queries/signaling-matrix';
import type { ProviderWithCounts } from './types';

/**
 * Populate providers with validators
 * Returns final array of all providers including independent if applicable
 */
export function populateProvidersWithValidators(
  validators: ValidatorWithProvider[],
  providerMap: Map<string, ProviderWithCounts>,
  independentProvider: ProviderWithCounts
): ProviderWithCounts[] {
  validators.forEach(validator => {
    const providerKey = validator.providerIdentifier || INDEPENDENT_PROVIDER_IDENTIFIER;
    const isIndependent = !validator.providerIdentifier;

    if (isIndependent) {
      independentProvider.sequencerAddresses.push(validator.address);
    } else {
      if (!providerMap.has(providerKey)) {
        providerMap.set(providerKey, {
          identifier: providerKey,
          name: validator.providerName || `Provider ${providerKey}`,
          logoUrl: validator.providerLogoUrl || null,
          totalSequencers: 0,
          selectedAsProposer: 0,
          totalProposerSlots: 0,
          signalingSequencers: 0,
          totalSignals: 0,
          totalPossibleSignals: 0,
          participationRate: 0,
          networkParticipationRate: 0,
          payloadSignals: new Map(),
          sequencerAddresses: [],
        });
      }
      providerMap.get(providerKey)!.sequencerAddresses.push(validator.address);
    }
  });

  const allProviders = Array.from(providerMap.values());
  if (independentProvider.sequencerAddresses.length > 0) {
    allProviders.push(independentProvider);
  }

  return allProviders;
}
