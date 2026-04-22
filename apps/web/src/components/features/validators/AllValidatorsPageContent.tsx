'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';
import { ValidatorPerformance } from '@/types';
import { Skeleton, SkeletonTableRow } from '@/components/ui/Skeleton';
import { PerformanceFilterModal } from './PerformanceFilterModal';
import { ValidatorCard } from './ValidatorCard';
import { usePaginatedValidators } from '@/hooks/queries/useValidators';
import { ValidatorTableRow } from './ValidatorTableRow';
import {
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FunnelIcon,
  Bars3Icon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { TimeframeFilterButton } from '@/components/ui/TimeframeFilterButton';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { SocialVerificationModal } from './SocialVerificationModal';
import { useEpochCalculations } from '@/hooks/useEpochCalculations';
import { useEarliestEpoch } from '@/hooks/useEarliestEpoch';
import { useLoading } from '@/context/LoadingContext';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';
import { ColumnFilterDropdown, FilterOption } from '@/components/ui/ColumnFilterDropdown';
import { formatBalance } from '@/utils/formatters';
import { useRollupFilter } from '@/hooks/useRollupFilter';

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
  min?: number | string;
  max?: number | string;
  value?: string;
}

export const AllValidatorsPageContent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'rank', direction: 'ascending' });
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isMobile, setIsMobile] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [startEpoch, setStartEpoch] = useState('');
  const [endEpoch, setEndEpoch] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilter>>({});

  const router = useRouter();
  const searchParams = useSearchParams();
  const { addNotification } = useNotification();
  const { rollupParam } = useRollupFilter();
  const configState = useNetworkConfig(rollupParam);
  const { currentEpoch } = useEpochCalculations(configState);
  const { earliestEpoch } = useEarliestEpoch(rollupParam);
  const { setLoadingWindow } = useLoading();
  const { config: networkConfig } = useNetworkConfig(rollupParam);

  // Build query params for React Query hook
  const queryParams = useMemo(() => {
    const params: any = {
      page: currentPage,
      limit: itemsPerPage,
      rollup: rollupParam,
    };

    if (sortConfig.key) {
      params.sortBy = sortConfig.key;
      params.sortOrder = sortConfig.direction === 'ascending' ? 'asc' : 'desc';
    }

    if (debouncedSearchTerm) {
      params.search = debouncedSearchTerm;
    }

    if (statusFilter && statusFilter !== 'All') {
      params.status = statusFilter;
    }

    if (startEpoch) {
      params.startEpoch = startEpoch;
    }

    if (endEpoch) {
      params.endEpoch = endEpoch;
    }

    // Add column filters
    Object.entries(columnFilters).forEach(([key, filter]) => {
      if (filter.type === 'range') {
        if (filter.min !== undefined) {
          params[`${key}Min`] = filter.min.toString();
        }
        if (filter.max !== undefined) {
          params[`${key}Max`] = filter.max.toString();
        }
      } else if (filter.value) {
        params[`${key}Filter`] = filter.value;
      }
    });

    return params;
  }, [currentPage, itemsPerPage, sortConfig, debouncedSearchTerm, statusFilter, startEpoch, endEpoch, columnFilters, rollupParam]);

  // Use React Query hook to fetch validators
  const { data, isLoading, error } = usePaginatedValidators(queryParams);

  // Extract data from query result
  const allValidators = data?.validators || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 0;
  const validatorStatuses = data?.statuses || [];

  // Reset pagination when rollup changes
  useEffect(() => {
    setCurrentPage(1);
  }, [rollupParam]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);


  // Mobile detection and auto-switch to grid view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-switch to grid view on mobile
  useEffect(() => {
    if (isMobile) {
      setViewMode('grid');
    }
  }, [isMobile]);

  // Update loading window based on query state
  useEffect(() => {
    setLoadingWindow(isLoading);
  }, [isLoading, setLoadingWindow]);

  useEffect(() => {
    const error = searchParams.get('error');
    const errorMessage = searchParams.get('error_message');

    if (error && errorMessage) {
      addNotification(errorMessage, 'error', 10000);
      router.replace('/validators', { scroll: false });
    }
  }, [searchParams, router, addNotification]);

  const handleFilterSubmit = () => {
    setCurrentPage(1);
  };

  const clearFilter = () => {
    setStartEpoch('');
    setEndEpoch('');
    setCurrentPage(1);
  };

  const totalEpochsInTimeframe = useMemo(() => {
    const start = parseInt(startEpoch) || earliestEpoch || 0;
    const end = parseInt(endEpoch) || currentEpoch || 0;
    return end - start;
  }, [startEpoch, endEpoch, earliestEpoch, currentEpoch]);

  const isFilterActive = startEpoch !== '' || endEpoch !== '';

  // Server-side pagination, filtering and sorting is handled in the API
  const paginatedValidators = allValidators;

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    if (currentPage !== 1) setCurrentPage(1);
  };

  const getSortIcon = (key: SortableKeys) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? <ArrowUpIcon className="h-3 w-3 inline ml-1" /> : <ArrowDownIcon className="h-3 w-3 inline ml-1" />;
  };

  const handleColumnFilter = (columnKey: string, value: string | string[]) => {
    if (value === 'all' || (Array.isArray(value) && value.length === 0)) {
      // Remove filter
      const newFilters = { ...columnFilters };
      delete newFilters[columnKey];
      setColumnFilters(newFilters);
    } else {
      // Parse and set filter based on value format
      const filter: ColumnFilter = { type: 'value', value: value as string };

      // Handle range filters (format: "min-max")
      if (typeof value === 'string' && value.includes('-')) {
        const [minStr, maxStr] = value.split('-');

        // For balance filters, keep as strings to avoid scientific notation
        // For other numeric filters, parse as numbers
        if (columnKey === 'balance') {
          const min = minStr ? minStr : undefined;
          const max = maxStr ? maxStr : undefined;
          if (min !== undefined || max !== undefined) {
            filter.type = 'range';
            filter.min = min as any;
            filter.max = max as any;
            delete filter.value;
          }
        } else {
          const min = minStr ? parseFloat(minStr) : undefined;
          const max = maxStr ? parseFloat(maxStr) : undefined;
          if (min !== undefined || max !== undefined) {
            filter.type = 'range';
            filter.min = min;
            filter.max = max;
            delete filter.value;
          }
        }
      }

      setColumnFilters({ ...columnFilters, [columnKey]: filter });
    }

    // Reset to page 1 when filtering
    if (currentPage !== 1) setCurrentPage(1);
  };

  // Create filter options for different column types
  const balanceFilterOptions: FilterOption[] = useMemo(() => {
    const decimals = networkConfig?.stakingTokenDecimals ?? 18;
    const symbol = networkConfig?.stakingTokenSymbol ?? 'AZTEC';
    const depositAmount = networkConfig?.depositAmount ?? '200000000000000000000000';

    // Format deposit amount for display
    const formattedDeposit = formatBalance(depositAmount, decimals, symbol, true);

    // Calculate raw values for different ranges
    const rawDeposit = depositAmount.toString();
    const rawDepositLess = (BigInt(rawDeposit) - BigInt(1)).toString();

    return [
      { value: 'all', label: 'All Balances' },
      { value: `0-${rawDepositLess}`, label: `< ${formattedDeposit}`, color: '#ef4444' },
      { value: `${rawDeposit}-${rawDeposit}`, label: `${formattedDeposit}`, color: '#10b981' },
    ];
  }, [networkConfig]);

  const percentFilterOptions: FilterOption[] = [
    { value: 'all', label: 'All' },
    { value: '90-100', label: '90-100%', color: '#10b981' },
    { value: '70-90', label: '70-90%', color: '#eab308' },
    { value: '50-70', label: '50-70%', color: '#f97316' },
    { value: '0-50', label: '0-50%', color: '#ef4444' },
  ];

  const scoreFilterOptions: FilterOption[] = [
    { value: 'all', label: 'All Scores' },
    { value: '0.8-1', label: 'Excellent (0.8-1.0)', color: '#10b981' },
    { value: '0.6-0.8', label: 'Good (0.6-0.8)', color: '#3b82f6' },
    { value: '0.4-0.6', label: 'Average (0.4-0.6)', color: '#eab308' },
    { value: '0-0.4', label: 'Poor (0-0.4)', color: '#ef4444' },
  ];

  const epochFilterOptions: FilterOption[] = [
    { value: 'all', label: 'All Participation' },
    { value: '1000-', label: '1000+ epochs', color: '#10b981' },
    { value: '500-1000', label: '500-1000 epochs', color: '#3b82f6' },
    { value: '100-500', label: '100-500 epochs', color: '#eab308' },
    { value: '50-100', label: '50-100 epochs', color: '#f97316' },
    { value: '0-50', label: '0-50 epochs', color: '#ef4444' },
  ];

  const tableHeaders: {
    label: string;
    key: SortableKeys | null;
    sortable: boolean;
    className?: string;
    filterable?: boolean;
    filterKey?: string;
    filterOptions?: FilterOption[];
    showCustomInput?: boolean;
    customInputType?: 'range' | 'single';
    customInputPlaceholder?: { min?: string; max?: string; single?: string };
    customInputUnit?: string;
  }[] = [
      { label: 'Pos', key: 'rank', sortable: true, className: 'text-center w-12 px-0' },
      { label: 'Sequencer', key: 'name', sortable: true, className: 'w-1/4 pl-0' },
      { label: 'Status', key: 'status', sortable: true, className: 'w-1/12' },
      {
        label: 'Balance',
        key: 'balance',
        sortable: true,
        className: 'w-1/12',
        filterable: true,
        filterKey: 'balance',
        filterOptions: balanceFilterOptions,
        showCustomInput: false,
        customInputType: 'range' as const,
        customInputPlaceholder: {
          min: `Min ${networkConfig?.stakingTokenSymbol || 'AZTEC'}`,
          max: `Max ${networkConfig?.stakingTokenSymbol || 'AZTEC'}`
        },
        customInputUnit: networkConfig?.stakingTokenSymbol || 'AZTEC'
      },
      {
        label: 'Epoch Part.',
        key: 'totalParticipatingEpochs',
        sortable: true,
        className: 'w-1/6',
        filterable: true,
        filterKey: 'epochParticipation',
        filterOptions: epochFilterOptions,
        showCustomInput: true,
        customInputType: 'range' as const,
        customInputPlaceholder: { min: 'Min epochs', max: 'Max epochs' },
        customInputUnit: 'epochs'
      },
      {
        label: 'Attestation',
        key: 'attestationSuccess',
        sortable: true,
        className: 'w-1/6',
        filterable: true,
        filterKey: 'attestationSuccess',
        filterOptions: percentFilterOptions,
        showCustomInput: true,
        customInputType: 'range' as const,
        customInputPlaceholder: { min: 'Min %', max: 'Max %' },
        customInputUnit: '%'
      },
      {
        label: 'Proposals',
        key: 'proposalSuccess',
        sortable: true,
        className: 'w-1/6',
        filterable: true,
        filterKey: 'proposalSuccess',
        filterOptions: percentFilterOptions,
        showCustomInput: true,
        customInputType: 'range' as const,
        customInputPlaceholder: { min: 'Min %', max: 'Max %' },
        customInputUnit: '%'
      },
      {
        label: 'Score',
        key: 'performanceScore',
        sortable: true,
        className: 'text-center',
        filterable: true,
        filterKey: 'performanceScore',
        filterOptions: scoreFilterOptions,
        showCustomInput: true,
        customInputType: 'range' as const,
        customInputPlaceholder: { min: 'Min score', max: 'Max score' },
        customInputUnit: 'score (0-1)'
      },
    ];

  const statusOptions = useMemo(() => {
    const totalStatusCount = validatorStatuses.reduce((sum, { count }) => sum + count, 0);
    const allOption = { value: 'All', label: `All Statuses (${totalStatusCount})` };
    const statusesWithCounts = validatorStatuses.map(({ status, count }) => ({
      value: status,
      label: `${status.charAt(0).toUpperCase() + status.slice(1)} (${count})`
    }));
    return [allOption, ...statusesWithCounts];
  }, [validatorStatuses]);

  const itemsPerPageOptions = [
    { value: 12, label: '12' },
    { value: 25, label: '25' },
    { value: 50, label: '50' },
    { value: 100, label: '100' }
  ];

  return (
    <>
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 _tight  py-8">
        {/* Optimized Header Section */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-amber-900/20 border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-brand-violet/10 to-transparent rounded-full blur-3xl "></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-3xl  delay-1000"></div>
          </div>

          <div className="relative z-10 p-4 sm:p-6 lg:p-8">
            {/* Optimized Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
              {/* Left side: Title and subtext */}
              <div className="flex-1 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                  {/* Animated Icon */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/30 to-amber-500/20 rounded-lg sm:rounded-xl blur-sm sm:blur-md"></div>
                    <div className="relative p-2 sm:p-2.5 bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/20 dark:border-slate-700/50 shadow-md sm:shadow-lg">
                      <FunnelIcon className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors ${isFilterActive ? 'text-brand-violet' : 'text-slate-600 dark:text-slate-300'}`} />
                    </div>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-brand-violet to-amber-600 dark:from-slate-100 dark:via-accent-purple-light dark:to-amber-400 bg-clip-text text-transparent leading-tight">
                    Sequencer Registry
                  </h1>
                </div>

                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Monitor performance metrics and analyze sequencers securing Aztec's privacy-first network
                </p>
              </div>

              {/* Right side: Status indicator */}
              <div className="flex-shrink-0 flex justify-center lg:justify-end">
                <div className="inline-flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30 dark:border-slate-600/30">
                  <div className={`w-2 h-2 rounded-full ${isFilterActive ? 'bg-brand-violet ' : 'bg-emerald-500'}`}></div>
                  <div className="text-center lg:text-left">
                    <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                      {isFilterActive ? 'Filtered Analytics' : 'Live Network Data'}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {isFilterActive
                        ? `Epochs ${startEpoch || '?'} - ${endEpoch || '?'}`
                        : `${totalCount} sequencers`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls Section */}
            <div className="flex flex-col lg:flex-row justify-center lg:justify-between items-center gap-4 sm:gap-6">
              {/* Enhanced Controls Section */}
              <div className="flex flex-col lg:flex-row items-center gap-3 sm:gap-4 w-full lg:w-auto">
                {/* Search Input */}
                <div className="relative group w-full sm:w-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-violet/20 to-amber-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    <input
                      type="search"
                      placeholder="Search by name, address, handle, or provider..."
                      className="pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm w-full sm:w-80 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 border border-white/20 dark:border-slate-700/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-brand-violet focus:border-brand-violet focus:outline-none transition-all duration-300 shadow-md sm:shadow-lg"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (currentPage !== 1) setCurrentPage(1);
                      }}
                      disabled={isLoading && allValidators.length === 0}
                    />
                    <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 dark:text-slate-500 absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Enhanced Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  {/* Status Filter */}
                  <CustomSelect
                    value={statusFilter}
                    onChange={(value) => {
                      setStatusFilter(value as string);
                      if (currentPage !== 1) setCurrentPage(1);
                    }}
                    options={statusOptions}
                    disabled={isLoading && allValidators.length === 0}
                    showIndicator={true}
                    indicatorActive={statusFilter !== 'All'}
                  />

                  {/* Timeframe Filter */}
                  <TimeframeFilterButton
                    isFilterActive={isFilterActive}
                    startEpoch={startEpoch}
                    endEpoch={endEpoch}
                    onClick={() => setIsFilterModalOpen(true)}
                  />

                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-violet/20 to-amber-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 p-1 shadow-lg">
                      <button
                        onClick={() => setViewMode('table')}
                        className={`p-2 rounded-lg transition-all duration-300 ${viewMode === 'table' ? 'bg-brand-violet text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                      >
                        <Bars3Icon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all duration-300 ${viewMode === 'grid' ? 'bg-brand-violet text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                      >
                        <Squares2X2Icon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sm:hidden mb-4">
          <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {isLoading ? (
              Array.from({ length: itemsPerPage }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex justify-between items-start"><Skeleton heightClass="h-6" widthClass="w-1/3" /><Skeleton heightClass="h-5" widthClass="w-1/4" /></div>
                  <Skeleton heightClass="h-4" widthClass="w-full" />
                  <Skeleton heightClass="h-9" widthClass="w-full" />
                </div>
              ))
            ) : paginatedValidators.map((validator) => (
              <ValidatorCard
                key={validator.index}
                validator={validator}
              />
            ))}
          </div>
        ) : (
          <div className="relative rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-2xl overflow-hidden">
            {/* Subtle background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/5 via-transparent to-amber-500/5"></div>

            <div className="relative z-10 overflow-x-auto custom-scrollbar">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50/80 to-slate-100/60 dark:from-slate-700/50 dark:to-slate-800/50 backdrop-blur-sm">
                    {tableHeaders.map(header => (
                      <th key={header.label} scope="col" className={`px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap ${header.className || ''} ${header.sortable ? 'cursor-pointer hover:bg-white/50 dark:hover:bg-slate-600/30 transition-all duration-300' : ''}`}>
                        <div className={`flex items-center gap-2 ${header.className?.includes('text-center') ? 'justify-center' : ''}`}>
                          <span
                            className="relative"
                            onClick={() => header.sortable && header.key && requestSort(header.key)}
                          >
                            {header.label}
                            {header.sortable && sortConfig.key === header.key && (
                              <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-brand-violet rounded-full"></div>
                            )}
                          </span>
                          {header.sortable && getSortIcon(header.key!)}
                          {header.filterable && header.filterKey && header.filterOptions && (
                            <ColumnFilterDropdown
                              options={header.filterOptions}
                              value={(() => {
                                const filter = columnFilters[header.filterKey!];
                                if (!filter) return 'all';
                                if (filter.type === 'range') {
                                  const min = filter.min?.toString() || '';
                                  const max = filter.max?.toString() || '';
                                  return `${min}-${max}`;
                                }
                                return filter.value || 'all';
                              })()}
                              onChange={(value) => handleColumnFilter(header.filterKey!, value)}
                              label={`Filter ${header.label}`}
                              showIndicator={true}
                              showCustomInput={header.showCustomInput}
                              customInputType={header.customInputType}
                              customInputPlaceholder={header.customInputPlaceholder}
                              customInputUnit={header.customInputUnit}
                            />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-slate-200 dark:divide-slate-700">
                  {isLoading ? (
                    Array.from({ length: itemsPerPage }).map((_, i) => (
                      <SkeletonTableRow key={`skel-row-${i}`} columns={tableHeaders.length} />
                    ))
                  ) : paginatedValidators.length > 0 ? (
                    paginatedValidators.map((validator) => (
                      <ValidatorTableRow
                        key={validator.index}
                        validator={validator}
                        onInfoClick={() => setIsVerificationModalOpen(true)}
                        totalEpochsInTimeframe={totalEpochsInTimeframe}
                        totalValidators={totalCount}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={tableHeaders.length} className="text-center py-16">
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-300/30 to-slate-400/20 rounded-2xl blur-lg"></div>
                            <div className="relative p-4 bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl">
                              <svg className="h-12 w-12 text-slate-400 dark:text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          </div>
                          <div className="text-center px-4">
                            {searchTerm ? (
                              <>
                                <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">
                                  No sequencers found matching "{searchTerm}"
                                </p>
                                <p className="text-sm text-slate-400 dark:text-slate-500">
                                  Try searching for a different address or identifier, or clear your search to see all sequencers.
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">No sequencers found matching your criteria.</p>
                                <p className="text-sm text-slate-400 dark:text-slate-500">Try adjusting your filters or timeframe to see more results.</p>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalPages > 1 && !isLoading && paginatedValidators.length > 0 && (
          <div className="mt-6 relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-violet/5 via-transparent to-amber-500/5"></div>
            <div className="relative z-10 px-6 py-2 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Per page:</span>
                <CustomSelect
                  value={itemsPerPage}
                  onChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                  options={itemsPerPageOptions}
                  size="sm"
                  variant="compact"
                />
              </div>
            </div>
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showingText={`Showing ${totalCount > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to ${Math.min(currentPage * itemsPerPage, totalCount)} of ${totalCount} sequencers`}
            />
          </div>
        )}

        <PerformanceFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          startEpoch={startEpoch}
          endEpoch={endEpoch}
          setStartEpoch={setStartEpoch}
          setEndEpoch={setEndEpoch}
          handleFilterSubmit={handleFilterSubmit}
          clearFilter={clearFilter}
        />
      </main>
      <SocialVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
      />
    </>
  );
};