import { INDEPENDENT_PROVIDER_IDENTIFIER } from '@/utils/constants';
import type { ProviderWithCounts } from './types';

/**
 * Filter and sort providers based on search, filterStatus, and sortBy criteria
 * Handles independent provider separation and pinning
 */
export function filterAndSortProviders(
  allProviders: ProviderWithCounts[],
  options: {
    sortBy: 'name' | 'support' | 'opportunities';
    filterStatus: 'all' | 'signaled' | 'no_signal';
    search?: string;
  }
): {
  filteredProviders: ProviderWithCounts[];
  independentProvider: ProviderWithCounts | null;
} {
  const independentProviderIndex = allProviders.findIndex(
    p => p.identifier === INDEPENDENT_PROVIDER_IDENTIFIER
  );
  const independentProvider = independentProviderIndex >= 0
    ? allProviders[independentProviderIndex]
    : null;
  const regularProviders = allProviders.filter(
    p => p.identifier !== INDEPENDENT_PROVIDER_IDENTIFIER
  );

  let filteredProviders = regularProviders;
  if (options.filterStatus !== 'all') {
    filteredProviders = regularProviders.filter(provider => {
      const hasSignaled = provider.participationRate > 0;
      return options.filterStatus === 'signaled' ? hasSignaled : !hasSignaled;
    });
  }

  if (options.search) {
    const searchLower = options.search.toLowerCase();
    filteredProviders = filteredProviders.filter(provider =>
      provider.name.toLowerCase().includes(searchLower) ||
      provider.identifier.toLowerCase().includes(searchLower)
    );
  }

  filteredProviders.sort((a, b) => {
    switch (options.sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'support': {
        const aSupport = Array.from(a.payloadSignals.values()).reduce(
          (sum, p) => sum + p.supportCount,
          0
        );
        const bSupport = Array.from(b.payloadSignals.values()).reduce(
          (sum, p) => sum + p.supportCount,
          0
        );
        return bSupport - aSupport;
      }
      case 'opportunities':
        return b.totalProposerSlots - a.totalProposerSlots;
      default:
        return 0;
    }
  });

  return {
    filteredProviders,
    independentProvider,
  };
}
