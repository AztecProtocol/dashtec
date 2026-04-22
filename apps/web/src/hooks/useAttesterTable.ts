import { useState, useMemo } from 'react';
import { ProviderAttester } from '@/types';

type SortField = 'name' | 'status' | 'balance' | 'attestationRate' | 'blockSuccessRate';
type SortDirection = 'asc' | 'desc';

interface UseAttesterTableOptions {
  attesters: ProviderAttester[] | undefined;
  itemsPerPage?: number;
  enableSort?: boolean;
  enableSearch?: boolean;
  initialSortField?: SortField;
  initialSortDirection?: SortDirection;
}

/**
 * Unified hook for managing attester table state and logic
 * Handles sorting, pagination, search, and row expansion
 */
export const useAttesterTable = ({
  attesters,
  itemsPerPage = 10,
  enableSort = true,
  enableSearch = false,
  initialSortField = 'attestationRate',
  initialSortDirection = 'desc',
}: UseAttesterTableOptions) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>(initialSortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Toggle expanded row
   */
  const handleToggleRow = (address: string) => {
    setExpandedRow(expandedRow === address ? null : address);
  };

  /**
   * Handle sorting by field
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  /**
   * Handle search change
   */
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  /**
   * Clear search
   */
  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  /**
   * Sort and filter attesters
   */
  const processedAttesters = useMemo(() => {
    if (!attesters) return [];

    let filtered = attesters;

    // Apply search filter if enabled
    if (enableSearch && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = attesters.filter(attester => {
        const name = attester.name?.toLowerCase() || '';
        const address = attester.address.toLowerCase();
        return name.includes(query) || address.includes(query);
      });
    }

    // Apply sorting if enabled
    if (enableSort) {
      return [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'name':
            aValue = a.name || a.address;
            bValue = b.name || b.address;
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'balance':
            aValue = parseFloat(a.balance || '0');
            bValue = parseFloat(b.balance || '0');
            break;
          case 'attestationRate': {
            // Sort by rate first, then by volume
            const aRate = parseFloat(a.attestationRate);
            const bRate = parseFloat(b.attestationRate);
            if (aRate !== bRate) {
              aValue = aRate;
              bValue = bRate;
            } else {
              // If rates are equal, sort by volume (total attestations)
              aValue = a.attestationsSuccessful + a.attestationsMissed;
              bValue = b.attestationsSuccessful + b.attestationsMissed;
            }
            break;
          }
          case 'blockSuccessRate': {
            // Sort by rate first, then by volume
            const aRate = parseFloat(a.blockSuccessRate);
            const bRate = parseFloat(b.blockSuccessRate);
            if (aRate !== bRate) {
              aValue = aRate;
              bValue = bRate;
            } else {
              // If rates are equal, sort by volume (total blocks)
              aValue = a.checkpointsProposed + a.checkpointsMined + (a.checkpointsMissed || 0) + a.blocksMissed;
              bValue = b.checkpointsProposed + b.checkpointsMined + (b.checkpointsMissed || 0) + b.blocksMissed;
            }
            break;
          }
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Default sort by epochs participated for detail page
    return [...filtered].sort((a, b) => {
      const aEpochs = a.performanceHistory?.length || 0;
      const bEpochs = b.performanceHistory?.length || 0;

      if (aEpochs !== bEpochs) return bEpochs - aEpochs;

      const aAttestations = a.attestationsSuccessful + a.attestationsMissed;
      const bAttestations = b.attestationsSuccessful + b.attestationsMissed;
      return bAttestations - aAttestations;
    });
  }, [attesters, sortField, sortDirection, searchQuery, enableSort, enableSearch]);

  /**
   * Calculate pagination
   */
  const totalPages = Math.ceil(processedAttesters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAttesters = processedAttesters.slice(startIndex, endIndex);

  /**
   * Navigate to next page
   */
  const handleNextPage = () => {
    setCurrentPage(p => Math.min(totalPages, p + 1));
  };

  /**
   * Navigate to previous page
   */
  const handlePreviousPage = () => {
    setCurrentPage(p => Math.max(1, p - 1));
  };

  return {
    // State
    expandedRow,
    currentPage,
    sortField,
    sortDirection,
    searchQuery,

    // Computed values
    sortedAttesters: processedAttesters,
    paginatedAttesters,
    totalPages,
    startIndex,
    endIndex,

    // Handlers
    handleToggleRow,
    handleSort,
    handleSearchChange,
    handleClearSearch,
    handleNextPage,
    handlePreviousPage,
    setCurrentPage,
  };
};
