import { useState, useEffect } from 'react';
import { ProviderListItem } from '@/types';
import { useProviders } from './queries/useProviders';
import { useDebounce } from './useDebounce';

/**
 * Sort configuration type
 */
type SortConfig = {
  key: keyof ProviderListItem | null;
  direction: 'ascending' | 'descending';
};

/**
 * Map frontend sort keys to backend sort keys
 */
function mapSortKeyToBackend(key: keyof ProviderListItem | null): string {
  if (!key) return 'timestamp';

  const mapping: Record<string, string> = {
    identifier: 'identifier',
    totalAttesters: 'totalAttesters',
    activeAttesters: 'activeAttesters',
    activeStaked: 'activeStaked',
    attestationRate: 'timestamp',
    blockSuccessRate: 'timestamp',
    takeRate: 'timestamp',
  };

  return mapping[key] || 'timestamp';
}

/**
 * Custom hook for managing provider table state with server-side pagination
 */
export function useProviderTable(rollupParam?: string) {
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'totalAttesters',
    direction: 'descending',
  });

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // Fetch data with server-side pagination
  const { data: response, isLoading, error } = useProviders({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchTerm || undefined,
    sortBy: mapSortKeyToBackend(sortConfig.key),
    sortOrder: sortConfig.direction === 'ascending' ? 'asc' : 'desc',
    rollup: rollupParam,
  });

  const providers = response?.data || [];
  const pagination = response?.pagination;
  const aggregates = response?.aggregates;

  // Handle sort
  const handleSort = (key: keyof ProviderListItem) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'ascending' ? 'descending' : 'ascending',
        };
      }
      return { key, direction: 'ascending' };
    });
    setCurrentPage(1);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  return {
    // Data
    providers,
    allProviders: providers,
    isLoading,
    error,
    aggregates,

    // Search
    searchTerm,
    setSearchTerm,

    // Pagination
    currentPage,
    totalPages: pagination?.totalPages || 1,
    itemsPerPage,
    handlePageChange,
    handleItemsPerPageChange,
    totalItems: pagination?.totalCount || 0,

    // Sorting
    sortConfig,
    handleSort,
  };
}
