import { useState, useEffect } from 'react';
import { usePaginatedValidators } from './queries/useValidators';
import { useDebounce } from './useDebounce';

/**
 * Sort configuration type
 */
type SortableKeys =
  | 'rank'
  | 'name'
  | 'status'
  | 'balance'
  | 'attestationSuccess'
  | 'proposalSuccess'
  | 'performanceScore'
  | 'lastProposed'
  | 'x_handle'
  | 'totalParticipatingEpochs';

interface SortConfig {
  key: SortableKeys | null;
  direction: 'ascending' | 'descending';
}

interface ColumnFilter {
  type: 'range' | 'value';
  min?: number;
  max?: number;
  value?: string;
}

/**
 * Custom hook for managing validator table state with server-side pagination
 */
export function useValidatorTable(
  startEpoch?: string,
  endEpoch?: string
) {
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'rank',
    direction: 'ascending',
  });

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilter>>({});

  // View state
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // Build query params object
  const queryParams: Record<string, any> = {
    page: currentPage,
    limit: itemsPerPage,
  };

  if (debouncedSearchTerm) {
    queryParams.search = debouncedSearchTerm;
  }

  if (statusFilter && statusFilter !== 'All') {
    queryParams.status = statusFilter;
  }

  if (startEpoch) queryParams.startEpoch = startEpoch;
  if (endEpoch) queryParams.endEpoch = endEpoch;

  // Add column filters
  Object.entries(columnFilters).forEach(([column, filter]) => {
    if (filter.type === 'range') {
      if (filter.min !== undefined) queryParams[`${column}_min`] = filter.min;
      if (filter.max !== undefined) queryParams[`${column}_max`] = filter.max;
    } else if (filter.type === 'value' && filter.value) {
      queryParams[column] = filter.value;
    }
  });

  // Add sorting
  if (sortConfig.key) {
    queryParams.sortBy = sortConfig.key;
    queryParams.sortOrder = sortConfig.direction === 'ascending' ? 'asc' : 'desc';
  }

  // Fetch data with React Query
  const { data: response, isLoading, error, refetch } = usePaginatedValidators(queryParams);

  const validators = response?.validators || [];
  const totalCount = response?.totalCount || 0;
  const totalPages = response?.totalPages || 0;
  const validatorStatuses = response?.statuses || [];

  // Handle sort
  const handleSort = (key: SortableKeys) => {
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

  // Handle column filters
  const handleColumnFilterChange = (column: string, filter: ColumnFilter | null) => {
    setColumnFilters((prev) => {
      if (filter === null) {
        const { [column]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [column]: filter };
    });
    setCurrentPage(1);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setStatusFilter('All');
    setColumnFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  return {
    // Data
    validators,
    isLoading,
    error,
    totalCount,
    totalPages,
    validatorStatuses,

    // Search
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,

    // Pagination
    currentPage,
    itemsPerPage,
    handlePageChange,
    handleItemsPerPageChange,

    // Sorting
    sortConfig,
    handleSort,

    // Filters
    statusFilter,
    setStatusFilter,
    columnFilters,
    handleColumnFilterChange,
    clearAllFilters,

    // View
    viewMode,
    setViewMode,

    // Actions
    refetch,
  };
}
