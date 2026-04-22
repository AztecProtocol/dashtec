import { useState, useEffect } from 'react';
import { useValidatorQueue, useQueueStats } from './queries/useValidatorQueue';
import { useDebounce } from './useDebounce';

/**
 * Custom hook for managing validator queue table state
 */
export function useValidatorQueueTable(initialSearch?: string, rollupParam?: string) {
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset to page 1 when search, items per page, or rollup changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, itemsPerPage, rollupParam]);

  // Fetch queue data
  const {
    data: queueData,
    isLoading: isQueueLoading,
    error: queueError,
    refetch: refetchQueue,
  } = useValidatorQueue({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchTerm || undefined,
    rollup: rollupParam,
  });

  // Fetch queue stats
  const {
    data: statsData,
    isLoading: isStatsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQueueStats(rollupParam);

  const validators = queueData?.validatorsInQueue || [];
  const pagination = queueData?.pagination;
  const stats = statsData
    ? {
        totalQueued: statsData.totalQueued,
        nextFlushableEpoch: statsData.nextFlushableEpoch,
        flushableValidatorsCount: statsData.flushableValidatorsCount,
        contractError: statsData.contractError,
      }
    : {
        totalQueued: 0,
        nextFlushableEpoch: null,
        flushableValidatorsCount: null,
        contractError: null,
      };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const handleManualRefresh = () => {
    refetchQueue();
    refetchStats();
  };

  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  return {
    // Data
    validators,
    stats,
    isLoading: isQueueLoading,
    isStatsLoading,
    error: queueError || statsError,
    isSearching: searchTerm !== debouncedSearchTerm,

    // Search
    searchTerm,
    setSearchTerm,
    clearSearch,

    // Pagination
    currentPage,
    totalPages: pagination?.totalPages || 1,
    itemsPerPage,
    handlePageChange,
    handleItemsPerPageChange,

    // Actions
    refetch: handleManualRefresh,
  };
}
