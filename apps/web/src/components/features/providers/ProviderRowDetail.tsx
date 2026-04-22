'use client';

import React from 'react';
import { useProviderDetail } from '@/hooks/queries/useProviderDetail';
import { useRollupFilter } from '@/hooks/useRollupFilter';
import { useAttesterTable } from '@/hooks/useAttesterTable';
import { AttesterTableDense as AttesterTable } from './AttesterTableDense';
import { useApp } from '@/context/AppContext';
import {
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Tooltip } from '@/components/ui/Tooltip';

interface ProviderRowDetailProps {
  providerIdentifier: string;
}

/**
 * Component that displays provider attesters in an expandable row
 */
export const ProviderRowDetail: React.FC<ProviderRowDetailProps> = ({ providerIdentifier }) => {
  const { networkConfig: config } = useApp();
  const { rollupParam } = useRollupFilter();
  const { data: provider, isLoading, error } = useProviderDetail(providerIdentifier, 30, rollupParam);

  const {
    expandedRow,
    currentPage,
    searchQuery,
    sortField,
    sortDirection,
    sortedAttesters,
    paginatedAttesters,
    totalPages,
    startIndex,
    endIndex,
    handleToggleRow,
    handleSort,
    handleSearchChange,
    handleClearSearch,
    handleNextPage,
    handlePreviousPage,
  } = useAttesterTable({
    attesters: provider?.attesters,
    itemsPerPage: 5,
    enableSort: true,
    enableSearch: true,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Failed to load provider details
          </p>
        </div>
      </div>
    );
  }

  if (!provider.attesters || provider.attesters.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No sequencers found for this provider
        </p>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-4 space-y-4">
      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Total Sequencers */}
        <div className="bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-violet/10 dark:bg-brand-violet/20 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-brand-violet dark:text-accent-purple-light" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-light">Total Sequencers</div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{provider.totalAttesters}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{provider.activeAttesters} active</div>
            </div>
          </div>
        </div>

        {/* Attestation Performance */}
        <div className="bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100/50 dark:bg-green-900/30 rounded-lg">
              <ShieldCheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-light">Attestation Rate</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{provider.attestationRate}%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{provider.attestationsSuccessful}/{provider.attestationsSuccessful + provider.attestationsMissed}</div>
            </div>
          </div>
        </div>

        {/* Block Success */}
        <div className="bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg">
              <CubeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-light">Proposal Rate</div>
                <Tooltip content={<>Checkpoint missed: blocks were proposed but checkpoint was not attested.<br />Block missed: no block proposals were sent at all.</>}>
                  <InformationCircleIcon className="h-3 w-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                </Tooltip>
              </div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{provider.blockSuccessRate}%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{provider.checkpointsSuccessful}/{provider.checkpointsSuccessful + (provider.checkpointsMissed || 0) + provider.blocksMissed}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sequencers Table */}
      <div>
        <div className="mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Managed Sequencers
            </h4>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {searchQuery ? `${sortedAttesters.length} of ${provider?.attesters?.length || 0}` : sortedAttesters.length} {sortedAttesters.length === 1 ? 'sequencer' : 'sequencers'} {searchQuery && 'found'}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-48">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-violet dark:focus:ring-accent-purple-light focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                title="Clear search"
              >
                <XMarkIcon className="h-3 w-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {sortedAttesters.length === 0 && searchQuery ? (
          <div className="text-center py-8">
            <MagnifyingGlassIcon className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              No sequencers found matching "{searchQuery}"
            </p>
            <button
              onClick={handleClearSearch}
              className="text-xs text-brand-violet dark:text-accent-purple-light hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <AttesterTable
            attesters={paginatedAttesters}
            expandedRow={expandedRow}
            onToggleRow={handleToggleRow}
            stakingTokenDecimals={config?.stakingTokenDecimals || 18}
            stakingTokenSymbol={config?.stakingTokenSymbol || 'STK'}
            epochLimit={30}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="h-3.5 w-3.5" />
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
