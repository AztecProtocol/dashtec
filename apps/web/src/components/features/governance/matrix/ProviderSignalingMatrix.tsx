'use client';

import React, { useState } from 'react';
import { useSignalingMatrix } from '@/hooks/queries/useSignalingMatrix';
import { useDebounce } from '@/hooks/useDebounce';
import { PayloadDetailsSection } from './PayloadDetailsSection';
import { MatrixHeader } from './MatrixHeader';
import { MatrixTableHeader } from './MatrixTableHeader';
import { ProviderRow } from './ProviderRow';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { Skeleton } from '@/components/ui/Skeleton';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { SortBy, FilterStatus } from '@/types/signaling-matrix';
import { useRollupFilter } from '@/hooks/useRollupFilter';

interface ProviderSignalingMatrixProps {
  round?: number;
}

/**
 * ProviderSignalingMatrix - Main matrix view with server-side pagination
 * Uses useSignalingMatrix hook directly, no prop drilling
 */
export const ProviderSignalingMatrix: React.FC<ProviderSignalingMatrixProps> = ({ round }) => {
  const { rollupParam } = useRollupFilter();
  const [sortBy, setSortBy] = useState<SortBy>('support');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [selectedPayloads, setSelectedPayloads] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch data with pagination
  const { data, isLoading, error } = useSignalingMatrix({
    page: currentPage,
    limit: itemsPerPage,
    sortBy,
    filterStatus,
    round,
    search: debouncedSearchQuery || undefined,
  }, rollupParam);

  const toggleProvider = (providerId: string) => {
    const newExpanded = new Set(expandedProviders);
    if (newExpanded.has(providerId)) {
      newExpanded.delete(providerId);
    } else {
      newExpanded.add(providerId);
    }
    setExpandedProviders(newExpanded);
  };

  const togglePayloadFilter = (payloadAddress: string) => {
    const newSelected = new Set(selectedPayloads);
    if (newSelected.has(payloadAddress)) {
      newSelected.delete(payloadAddress);
    } else {
      newSelected.add(payloadAddress);
    }
    setSelectedPayloads(newSelected);
  };

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, sortBy, selectedPayloads, debouncedSearchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="rounded-2xl bg-gradient-to-r from-brand-violet/10 to-amber-500/10 p-6 border border-brand-violet/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Skeleton widthClass="w-10" heightClass="h-10" className="rounded-xl" />
              <div className="space-y-2">
                <Skeleton widthClass="w-64" heightClass="h-6" />
                <Skeleton widthClass="w-48" heightClass="h-4" />
              </div>
            </div>
            <div className="flex gap-3">
              <Skeleton widthClass="w-40" heightClass="h-9" className="rounded-lg" />
              <Skeleton widthClass="w-32" heightClass="h-9" className="rounded-lg" />
            </div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3">
                <Skeleton widthClass="w-16" heightClass="h-8" className="mb-2" />
                <Skeleton widthClass="w-24" heightClass="h-4" />
              </div>
            ))}
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Payload Details Skeleton */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4 overflow-x-auto">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 min-w-[280px]">
                  <Skeleton widthClass="w-full" heightClass="h-32" className="rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          {/* Table Header Skeleton */}
          <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-3">
                <Skeleton widthClass="w-24" heightClass="h-4" />
              </div>
              <div className="col-span-7">
                <Skeleton widthClass="w-32" heightClass="h-4" />
              </div>
              <div className="col-span-2">
                <Skeleton widthClass="w-20" heightClass="h-4" />
              </div>
            </div>
          </div>

          {/* Provider Rows Skeleton */}
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 items-center px-6 py-4">
                <div className="col-span-3 flex items-center gap-3">
                  <Skeleton widthClass="w-8" heightClass="h-8" className="rounded-full" />
                  <div className="space-y-2">
                    <Skeleton widthClass="w-32" heightClass="h-4" />
                    <Skeleton widthClass="w-20" heightClass="h-3" />
                  </div>
                </div>
                <div className="col-span-7 flex gap-4">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} widthClass="w-28" heightClass="h-12" className="rounded" />
                  ))}
                </div>
                <div className="col-span-2 flex justify-end">
                  <Skeleton widthClass="w-16" heightClass="h-6" />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Skeleton */}
          <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <Skeleton widthClass="w-48" heightClass="h-4" />
              <div className="flex items-center gap-2">
                <Skeleton widthClass="w-20" heightClass="h-8" className="rounded-lg" />
                <div className="flex gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} widthClass="w-8" heightClass="h-8" className="rounded-lg" />
                  ))}
                </div>
                <Skeleton widthClass="w-16" heightClass="h-8" className="rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-center text-red-500 dark:text-red-400">
          {error instanceof Error ? error.message : 'Failed to load matrix data'}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-center text-slate-500 dark:text-slate-400">
          No data available
        </p>
      </div>
    );
  }

  const { currentRound, epoch, payloads, providers, pagination, quorumSize, totalNetwork } = data;

  // Determine if viewing a historical round
  const isHistorical = round !== undefined && round !== currentRound;

  // Filter payloads based on selection (if none selected, show all)
  const visiblePayloads = selectedPayloads.size === 0
    ? payloads
    : payloads.filter(p => selectedPayloads.has(p.address));

  // Calculate stats
  const payloadSupport = new Map<string, number>();
  payloads.forEach(payload => {
    let supportCount = 0;
    providers.forEach(provider => {
      const counts = provider.payloadSignals[payload.address];
      if (counts) supportCount += counts.supportCount;
    });
    payloadSupport.set(payload.address, supportCount);
  });

  const stats = {
    totalProviders: pagination.totalCount,
    activeProviders: totalNetwork.activeProviders,
    totalSequencers: totalNetwork.activeSignalingSequencers,
    payloadSupport,
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <MatrixHeader
        currentRound={round || currentRound}
        epoch={epoch}
        stats={stats}
        payloadsCount={payloads.length}
        quorumSize={quorumSize}
        isHistorical={isHistorical}
      />

      {/* Payloads Table */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Payload Details Section */}
        <PayloadDetailsSection
          payloads={visiblePayloads}
          quorumSize={quorumSize}
          allPayloads={payloads}
          selectedPayloads={selectedPayloads}
          onTogglePayload={togglePayloadFilter}
          sortBy={sortBy}
          filterStatus={filterStatus}
          onSortChange={setSortBy}
          onFilterChange={setFilterStatus}
          epoch={epoch}
        />

        {/* Search Bar */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="relative w-full sm:max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search providers by name or identifier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-violet/20 dark:focus:ring-accent-purple-light/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {pagination.totalCount} provider{pagination.totalCount !== 1 ? 's' : ''} found
            </p>
          )}
        </div>

        {/* Table Header */}
        <MatrixTableHeader payloads={visiblePayloads} />

        {/* Provider Rows */}
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {providers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              No providers match the selected filters
            </div>
          ) : (
            providers.map(provider => (
              <ProviderRow
                key={provider.identifier}
                provider={provider}
                payloads={visiblePayloads}
                roundNumber={round || currentRound}
                isExpanded={expandedProviders.has(provider.identifier)}
                onToggleExpand={() => toggleProvider(provider.identifier)}
                networkTotalSignals={totalNetwork.signals}
              />
            ))
          )}
        </div>

        {/* Pagination Controls */}
        <PaginationControls
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setCurrentPage}
          showingText={`Showing ${(pagination.page - 1) * pagination.limit + 1} to ${Math.min(pagination.page * pagination.limit, pagination.totalCount)} of ${pagination.totalCount} providers`}
        />
      </div>
    </div>
  );
};
