'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { useDashboard } from '@/context/DashboardContext';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import {
  BuildingOffice2Icon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ProviderTableRow } from './ProviderTableRow';
import { ProviderRowDetail } from './ProviderRowDetail';
import { useProviderTable } from '@/hooks/useProviderTable';
import { useRollupFilter } from '@/hooks/useRollupFilter';
import type { ProviderListItem } from '@/types';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { Tooltip } from '@/components/ui/Tooltip';
import { ProviderAvatar } from '@/components/ui/ProviderAvatar';
import { CopyButton } from '@/components/ui/CopyButton';
import { formatBalanceWithUsd } from '@/utils/formatters';

/** Mobile card for a single provider row — dense layout. */
const ProviderMobileCard: React.FC<{
  provider: ProviderListItem;
  isExpanded: boolean;
  onToggle: () => void;
  stakingTokenDecimals: number;
  stakingTokenSymbol: string;
}> = ({ provider, isExpanded, onToggle, stakingTokenDecimals, stakingTokenSymbol }) => {
  const balance = formatBalanceWithUsd(
    provider.activeStaked,
    stakingTokenDecimals,
    stakingTokenSymbol,
    true,
  );

  return (
    <div
      onClick={onToggle}
      className={`bg-white dark:bg-slate-800 rounded-lg border transition-colors cursor-pointer ${
        isExpanded
          ? 'border-brand-violet/30 dark:border-accent-purple-light/30'
          : 'border-slate-200 dark:border-slate-700 active:bg-slate-50 dark:active:bg-slate-700/40'
      }`}
    >
      <div className="px-3 py-2.5">
        {/* Header: avatar + name + chevron */}
        <div className="flex items-center gap-2.5">
          <ProviderAvatar
            logoUrl={provider.metadata.logoUrl}
            name={provider.metadata.name || provider.identifier}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <Link
              href={`/providers/${encodeURIComponent(provider.identifier)}`}
              onClick={(e) => e.stopPropagation()}
              className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-violet dark:hover:text-accent-purple-light leading-tight"
            >
              {provider.metadata.name || `Provider ${provider.identifier}`}
            </Link>
            <div className="flex items-center gap-1 leading-none mt-0.5" onClick={(e) => e.stopPropagation()}>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {provider.admin.slice(0, 6)}…{provider.admin.slice(-4)}
              </span>
              <CopyButton textToCopy={provider.admin} size="xs" />
            </div>
          </div>
          <ChevronRightIcon
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        </div>

        {/* Stat row */}
        <div className="mt-2.5 grid grid-cols-3 gap-2 text-center tabular-nums">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Sequencers</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {provider.activeAttesters}<span className="text-slate-400 dark:text-slate-500 mx-0.5">/</span>{provider.totalAttesters}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Staked</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {balance.formatted}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Commission</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {(provider.takeRate / 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Expanded row detail */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50" onClick={(e) => e.stopPropagation()}>
          <ProviderRowDetail providerIdentifier={provider.identifier} />
        </div>
      )}
    </div>
  );
};

/** Reusable column header with chevron-style sort indicator and tooltip on the label. */
const SortHeader: React.FC<{
  field: keyof ProviderListItem;
  sortConfig: { key: keyof ProviderListItem | null; direction: 'ascending' | 'descending' };
  onSort: (field: keyof ProviderListItem) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
  tooltip?: string;
  children: React.ReactNode;
}> = ({ field, sortConfig, onSort, align = 'left', className = '', tooltip, children }) => {
  const alignClass =
    align === 'right' ? 'text-right justify-end' :
    align === 'center' ? 'text-center justify-center' :
    'text-left justify-start';
  const isActive = sortConfig.key === field;

  const labelNode = (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {children}
      {isActive && (
        sortConfig.direction === 'ascending'
          ? <ChevronUpIcon className="h-3 w-3" />
          : <ChevronDownIcon className="h-3 w-3" />
      )}
    </span>
  );

  return (
    <th className={`px-3 py-2 ${className}`}>
      <button
        onClick={() => onSort(field)}
        className={`w-full flex items-center hover:text-slate-700 dark:hover:text-slate-200 transition-colors ${alignClass}`}
      >
        {tooltip ? <Tooltip content={tooltip}>{labelNode}</Tooltip> : labelNode}
      </button>
    </th>
  );
};

/**
 * Providers page content component
 */
export function ProvidersPageContent() {
  const { networkConfig } = useApp();
  const { totalProviders } = useDashboard();
  const { rollupParam } = useRollupFilter();
  const { stakingTokenSymbol, stakingTokenDecimals, depositAmount } = networkConfig ?? {
    stakingTokenSymbol: 'AZTEC',
    stakingTokenDecimals: 18,
    depositAmount: 0,
  };
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null);
  const {
    providers: paginatedProviders,
    allProviders,
    isLoading,
    error,
    aggregates,
    searchTerm,
    setSearchTerm,
    currentPage,
    totalPages,
    itemsPerPage,
    handlePageChange,
    handleItemsPerPageChange,
    totalItems,
    sortConfig,
    handleSort,
  } = useProviderTable(rollupParam);

  const handleToggleRow = (identifier: string) => {
    setExpandedRow(expandedRow === identifier ? null : identifier);
  };

  const itemsPerPageOptions = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' },
    { value: 100, label: '100' }
  ];

  return (
    <PageTransitionWrapper>
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-amber-900/20 border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-brand-violet/10 to-transparent rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
              {/* Left side: Title and subtext */}
              <div className="flex-1 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                  {/* Animated Icon */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/30 to-amber-500/20 rounded-lg sm:rounded-xl blur-sm sm:blur-md"></div>
                    <div className="relative p-2 sm:p-2.5 bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/20 dark:border-slate-700/50 shadow-md sm:shadow-lg">
                      <BuildingOffice2Icon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-300" />
                    </div>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-brand-violet to-amber-600 dark:from-slate-100 dark:via-accent-purple-light dark:to-amber-400 bg-clip-text text-transparent leading-tight">
                    Staking Providers
                  </h1>
                </div>

                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Monitor staking providers and their managed sequencers on the Aztec Network
                </p>
              </div>

              {/* Right side: Network Stats */}
            </div>

            {/* Search Section */}
            <div className="flex flex-col lg:flex-row justify-center lg:justify-between items-center gap-4 sm:gap-6 mt-6">
              <div className="relative group w-full sm:w-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-violet/20 to-amber-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <input
                    type="search"
                    placeholder="Search providers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 sm:pl-12 pr-10 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm w-full sm:w-80 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 border border-white/20 dark:border-slate-700/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-brand-violet focus:border-brand-violet focus:outline-none transition-all duration-300 shadow-md sm:shadow-lg"
                  />
                  <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 dark:text-slate-500 absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
                    >
                      <XMarkIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-12 text-center">
            <BuildingOffice2Icon className="h-16 w-16 mx-auto text-red-400 mb-4" />
            <p className="text-red-600 dark:text-red-400">
              Error loading providers: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                [...Array(itemsPerPage)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                      <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                      <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                    </div>
                  </div>
                ))
              ) : paginatedProviders.length > 0 ? (
                paginatedProviders.map((provider: ProviderListItem) => (
                  <ProviderMobileCard
                    key={provider.id}
                    provider={provider}
                    isExpanded={expandedRow === provider.identifier}
                    onToggle={() => handleToggleRow(provider.identifier)}
                    stakingTokenDecimals={stakingTokenDecimals}
                    stakingTokenSymbol={stakingTokenSymbol}
                  />
                ))
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                  <BuildingOffice2Icon className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                  {searchTerm ? (
                    <>
                      <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">
                        No providers found matching &quot;{searchTerm}&quot;
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        Try a different search term, or clear your search.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">No providers found</p>
                      <p className="text-sm text-slate-400 dark:text-slate-500">There are currently no staking providers in the network.</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Desktop Table View — dense */}
            <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <SortHeader field="identifier" sortConfig={sortConfig} onSort={handleSort} tooltip="Unique identifier and admin address of the staking provider">
                        Provider
                      </SortHeader>
                      <SortHeader field="totalAttesters" sortConfig={sortConfig} onSort={handleSort} align="right" className="w-28" tooltip="Active / total sequencers managed by this provider">
                        Sequencers
                      </SortHeader>
                      <SortHeader field="activeStaked" sortConfig={sortConfig} onSort={handleSort} align="right" className="w-40" tooltip="Staked tokens for active sequencers">
                        Active staked
                      </SortHeader>
                      <SortHeader field="takeRate" sortConfig={sortConfig} onSort={handleSort} align="right" className="w-28" tooltip="Commission percentage taken by the provider from staking rewards">
                        Commission
                      </SortHeader>
                      <th className="w-8" aria-hidden />
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      [...Array(itemsPerPage)].map((_, i) => (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 animate-pulse">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700" />
                              <div className="space-y-1.5 flex-1">
                                <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-32" />
                                <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="space-y-1.5">
                              <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-12 ml-auto" />
                              <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-10 ml-auto" />
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="space-y-1.5">
                              <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-24 ml-auto" />
                              <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-16 ml-auto" />
                            </div>
                          </td>
                          <td className="px-3 py-2.5"><div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-12 ml-auto" /></td>
                          <td className="px-3 py-2.5"><div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-14 ml-auto" /></td>
                          <td className="pl-1 pr-3 py-2.5"><div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                        </tr>
                      ))
                    ) : paginatedProviders.length > 0 ? (
                      paginatedProviders.map((provider: ProviderListItem) => (
                        <ProviderTableRow
                          key={provider.id}
                          provider={provider}
                          isExpanded={expandedRow === provider.identifier}
                          onToggleRow={handleToggleRow}
                          networkActiveStaked={aggregates?.activeStaked ?? 0}
                        />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-12">
                          <BuildingOffice2Icon className="h-10 w-10 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
                          {searchTerm ? (
                            <>
                              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                No providers found matching &ldquo;{searchTerm}&rdquo;
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Try a different search term or clear your search.
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">No providers found</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">There are currently no staking providers in the network.</p>
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && !isLoading && (
          <div className="mt-6 relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-violet/5 via-transparent to-amber-500/5"></div>
            <div className="relative z-10 px-6 py-2 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Per page:</span>
                <CustomSelect
                  value={itemsPerPage}
                  onChange={(value) => handleItemsPerPageChange(Number(value))}
                  options={itemsPerPageOptions}
                  size="sm"
                  variant="compact"
                />
              </div>
            </div>
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              showingText={`Showing ${totalItems > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} providers`}
            />
          </div>
        )}
      </main>
    </PageTransitionWrapper>
  );
}
