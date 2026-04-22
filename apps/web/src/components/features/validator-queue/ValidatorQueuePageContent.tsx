'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  QueueListIcon,
  XMarkIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { useEpochCalculations } from '@/hooks/useEpochCalculations';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';
import { useValidatorQueueTable } from '@/hooks/useValidatorQueueTable';
import { useRollupFilter } from '@/hooks/useRollupFilter';
import { QueueStatCards } from './QueueStatCards';
import { QueueFlushStatus } from './QueueFlushStatus';
import { QueueLegend } from './QueueLegend';
import { QueueTableRow } from './QueueTableRow';

const queueTableHeaders = [
  'Pos',
  'Sequencer Address',
  'Provider',
  'Withdrawer Address',
  'Queued Date & Time',
  'Est. Activation',
  'Transaction Hash',
];

const itemsPerPageOptions = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
];

export const ValidatorQueuePageContent: React.FC = () => {
  const searchParams = useSearchParams();
  const { rollupParam } = useRollupFilter();
  const configState = useNetworkConfig(rollupParam);
  const { nextEpochTime, currentEpoch, totalSlotsInEpoch, slotDuration } =
    useEpochCalculations(configState);

  const {
    validators,
    stats,
    isLoading,
    isStatsLoading,
    error,
    isSearching,
    searchTerm,
    setSearchTerm,
    clearSearch,
    currentPage,
    totalPages,
    itemsPerPage,
    handlePageChange,
    handleItemsPerPageChange,
    refetch,
  } = useValidatorQueueTable(searchParams.get('search') || '', rollupParam);

  const [cooldown, setCooldown] = useState(0);
  const [isPageChanging, setIsPageChanging] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleManualRefresh = () => {
    if (cooldown === 0) {
      refetch();
      setCooldown(5);
    }
  };

  const handlePageChangeWithLoading = (page: number) => {
    setIsPageChanging(true);
    handlePageChange(page);
    setTimeout(() => setIsPageChanging(false), 300);
  };

  return (
    <PageTransitionWrapper>
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/60 transition-all duration-300 hover:shadow-lg"
          >
            <ArrowLeftIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Back to Dashboard
            </span>
          </Link>
        </div>

        {/* Hero Section */}
        <div className="relative mb-4 overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          {/* Subtle background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/50 pointer-events-none"></div>
          {/* Elegant Mesh Gradient - Top Right */}
          <div className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-gradient-to-br from-brand-violet/5 via-amber-500/5 to-transparent blur-3xl opacity-60 pointer-events-none"></div>

          <div className="relative z-10 p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              {/* Clean Icon Container */}
              <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 flex-shrink-0">
                <QueueListIcon className="h-5 w-5 sm:h-6 sm:w-6 text-brand-violet dark:text-accent-purple-light" />
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                  Sequencer Queue
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-slate-500 dark:text-slate-400 font-light leading-relaxed mt-1">
                  Live tracking of sequencers waiting for activation
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <QueueStatCards
          totalQueued={stats.totalQueued}
          nextEpochTime={nextEpochTime}
          currentEpoch={currentEpoch}
          isLoading={isStatsLoading}
        />

        {/* Queue Flush Status */}
        <QueueFlushStatus
          nextFlushableEpoch={stats.nextFlushableEpoch}
          flushableValidatorsCount={stats.flushableValidatorsCount}
          currentEpoch={currentEpoch}
          totalQueued={stats.totalQueued}
          totalSlotsInEpoch={totalSlotsInEpoch}
          slotDuration={slotDuration}
          isLoading={isStatsLoading}
          contractError={stats.contractError}
        />

        {/* Main Content */}
        <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/50 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/5 via-transparent to-amber-500/5"></div>

          {/* Page changing overlay */}
          {isPageChanging && (
            <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 z-50 flex items-center justify-center backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-violet"></div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Loading sequencers...
                </p>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="relative z-10 p-6 border-b border-white/20 dark:border-slate-700/50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative group flex-1 max-w-md">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-violet/20 to-amber-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <input
                    type="search"
                    placeholder="Search sequencer, withdrawer, or transaction..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-10 ${searchTerm ? 'pr-10' : 'pr-4'
                      } py-3 w-full rounded-xl text-sm bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 border border-white/20 dark:border-slate-700/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-brand-violet focus:border-brand-violet focus:outline-none transition-all duration-300 shadow-lg`}
                  />
                  {isSearching ? (
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-violet"></div>
                    </div>
                  ) : (
                    <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                  )}
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
                      title="Clear search"
                    >
                      <XMarkIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={handleManualRefresh}
                disabled={cooldown > 0}
                className="group relative inline-flex items-center gap-3 px-4 py-3 text-sm font-semibold bg-gradient-to-r from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 text-slate-700 dark:text-slate-200 rounded-xl border border-white/30 dark:border-slate-600/30 hover:from-white dark:hover:from-slate-700 hover:to-white/80 dark:hover:to-slate-800/80 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
              >
                <ArrowPathIcon
                  className={`h-4 w-4 ${cooldown > 0
                    ? ''
                    : 'group-hover:scale-110 transition-transform duration-200'
                    }`}
                />
                <span>{cooldown > 0 ? `Refresh in ${cooldown}s` : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Queue Legend */}
          <QueueLegend
            flushableValidatorsCount={stats.flushableValidatorsCount}
            isLoading={isStatsLoading}
            contractError={stats.contractError}
          />

          {/* Table */}
          <div className="relative z-10 overflow-x-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-white/20 dark:divide-slate-700/50">
              <thead className="bg-gradient-to-r from-slate-50/80 to-slate-100/60 dark:from-slate-800/80 dark:to-slate-900/60">
                <tr>
                  {queueTableHeaders.map((header, index) => (
                    <th
                      key={header}
                      scope="col"
                      className={`${index === 0 ? '!text-center w-12 pl-6' : 'px-6'
                        } py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20 dark:divide-slate-700/50">
                {isLoading ? (
                  Array.from({ length: itemsPerPage }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="pl-6 py-4 whitespace-nowrap text-center">
                        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-40"></div>
                          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-40"></div>
                          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded-lg w-32"></div>
                      </td>
                    </tr>
                  ))
                ) : validators.length > 0 ? (
                  validators.map((validator) => (
                    <QueueTableRow
                      key={validator.address}
                      validator={validator}
                      flushableValidatorsCount={stats.flushableValidatorsCount}
                      totalSlotsInEpoch={totalSlotsInEpoch}
                      slotDuration={slotDuration}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={queueTableHeaders.length} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-slate-300/30 to-slate-400/20 rounded-2xl blur-lg"></div>
                          <div className="relative p-4 bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl">
                            <QueueListIcon className="h-12 w-12 text-slate-400 dark:text-slate-500" />
                          </div>
                        </div>
                        <div className="text-center px-4">
                          {searchTerm ? (
                            <>
                              <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">
                                No sequencers found matching "{searchTerm}"
                              </p>
                              <p className="text-sm text-slate-400 dark:text-slate-500">
                                Try searching for a different address or transaction hash, or clear
                                your search to see all queued sequencers.
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">
                                The activation queue is currently empty.
                              </p>
                              <p className="text-sm text-slate-400 dark:text-slate-500">
                                New sequencers will appear here when they join the queue.
                              </p>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="relative z-10 p-6 border-t border-white/20 dark:border-slate-700/50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {searchTerm && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-violet/10 dark:bg-accent-purple-light/10 rounded-lg border border-brand-violet/20">
                      <span className="text-xs font-medium text-brand-violet dark:text-accent-purple-light">
                        Filtered Results
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Per page:
                  </span>
                  <CustomSelect
                    value={itemsPerPage}
                    onChange={(value) => handleItemsPerPageChange(Number(value))}
                    options={itemsPerPageOptions}
                    size="sm"
                    variant="compact"
                  />
                  <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span>
                      Showing {validators.length} of {stats.totalQueued} sequencers
                    </span>
                  </div>
                </div>

                <nav className="inline-flex rounded-xl shadow-lg" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChangeWithLoading(1)}
                    disabled={currentPage === 1}
                    className="group relative inline-flex items-center px-3 py-2 rounded-l-xl border border-white/20 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-brand-violet dark:hover:text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    title="Go to first page"
                  >
                    <ChevronDoubleLeftIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                  </button>
                  <button
                    onClick={() => handlePageChangeWithLoading(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="group relative inline-flex items-center px-3 py-2 border border-white/20 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-brand-violet dark:hover:text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    title="Previous page"
                  >
                    <ChevronLeftIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border-t border-b border-white/20 dark:border-slate-600/50 bg-white/90 dark:bg-slate-800/90 text-sm font-bold text-slate-700 dark:text-slate-200">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      handlePageChangeWithLoading(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="group relative inline-flex items-center px-3 py-2 border border-white/20 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-brand-violet dark:hover:text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    title="Next page"
                  >
                    <ChevronRightIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                  </button>
                  <button
                    onClick={() => handlePageChangeWithLoading(totalPages)}
                    disabled={currentPage === totalPages}
                    className="group relative inline-flex items-center px-3 py-2 rounded-r-xl border border-white/20 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-brand-violet dark:hover:text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    title="Go to last page"
                  >
                    <ChevronDoubleRightIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                  </button>
                </nav>
              </div>
            </div>
          )}
        </div>
      </main>
    </PageTransitionWrapper>
  );
};
