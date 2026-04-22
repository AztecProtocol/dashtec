import type { ProviderWithCounts } from './types';
import { paginate } from '../helpers';

/**
 * Paginate providers and pin independent provider to the top of every page
 */
export function paginateProviders(
  filteredProviders: ProviderWithCounts[],
  independentProvider: ProviderWithCounts | null,
  options: {
    page: number;
    limit: number;
    filterStatus: 'all' | 'signaled' | 'no_signal';
  }
): {
  paginatedProviders: ProviderWithCounts[];
  totalCount: number;
} {
  const totalCount = filteredProviders.length;
  const { skip: startIndex } = paginate(options.page, options.limit, totalCount);
  const paginatedProviders = filteredProviders.slice(startIndex, startIndex + options.limit);

  if (independentProvider) {
    const shouldShowIndependent = options.filterStatus === 'all' ||
      (options.filterStatus === 'signaled' && independentProvider.participationRate > 0) ||
      (options.filterStatus === 'no_signal' && independentProvider.participationRate === 0);

    if (shouldShowIndependent) {
      paginatedProviders.unshift(independentProvider);
    }
  }

  return {
    paginatedProviders,
    totalCount,
  };
}
