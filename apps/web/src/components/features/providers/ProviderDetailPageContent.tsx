'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CopyButton } from '@/components/ui/CopyButton';
import { formatBalanceWithUsd, getPerformanceColor } from '@/utils/formatters';
import { useTokenPrice } from '@/hooks/queries/useTokenPrice';
import { useApp } from '@/context/AppContext';
import { useProviderDetail } from '@/hooks/queries/useProviderDetail';
import { useRollupFilter } from '@/hooks/useRollupFilter';
import { useAttesterTable } from '@/hooks/useAttesterTable';
import { AttesterTableDense as AttesterTable } from './AttesterTableDense';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import { VALIDATOR_STATUS } from '@/utils/constants';
import { useStatusColors } from '@/hooks/useStatusColor';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CubeIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  QueueListIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Tooltip } from '@/components/ui/Tooltip';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { ProviderAvatar } from '@/components/ui/ProviderAvatar';

interface ProviderDetailPageContentProps {
  identifier: string;
}

const EPOCH_LIMIT_OPTIONS = [
  { label: 'Last 10 Epochs', value: 10 },
  { label: 'Last 30 Epochs', value: 30 },
  { label: 'Last 50 Epochs', value: 50 },
];

/**
 * Provider detail page content component
 */
export function ProviderDetailPageContent({ identifier }: ProviderDetailPageContentProps) {
  const { networkConfig: config } = useApp();
  const stakingTokenSymbol = config?.stakingTokenSymbol ?? 'STK';
  const { rollupParam } = useRollupFilter();
  const [epochLimit, setEpochLimit] = useState(30);
  const { data: provider, isLoading, error } = useProviderDetail(identifier, epochLimit, rollupParam);
  const { data: priceData } = useTokenPrice(stakingTokenSymbol);
  const currentPrice = priceData?.currentPrice ?? null;

  /** Split attesters into managed (active) vs queued */
  const { managedAttesters, queuedAttesters } = useMemo(() => {
    if (!provider?.attesters) return { managedAttesters: [], queuedAttesters: [] };
    const managed = provider.attesters.filter(a => !a.isInQueue && a.status !== VALIDATOR_STATUS.QUEUE);
    const queued = provider.attesters.filter(a => a.isInQueue || a.status === VALIDATOR_STATUS.QUEUE);
    return { managedAttesters: managed, queuedAttesters: queued };
  }, [provider?.attesters]);

  const {
    currentPage,
    searchQuery,
    expandedRow,
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
    setCurrentPage,
  } = useAttesterTable({
    attesters: managedAttesters,
    itemsPerPage: 10,
    enableSort: true,
    enableSearch: true,
  });

  const {
    currentPage: queuePage,
    expandedRow: queueExpandedRow,
    sortedAttesters: sortedQueued,
    paginatedAttesters: paginatedQueued,
    totalPages: queueTotalPages,
    startIndex: queueStartIndex,
    endIndex: queueEndIndex,
    handleToggleRow: handleQueueToggleRow,
    setCurrentPage: setQueuePage,
  } = useAttesterTable({
    attesters: queuedAttesters,
    itemsPerPage: 10,
    enableSort: false,
    enableSearch: false,
  });

  const clearSearch = handleClearSearch;

  const handleEpochLimitChange = (value: number) => {
    setEpochLimit(value);
    setCurrentPage(1);
  };

  // Calculate status distribution for managed (non-queued) attesters only
  const statusDistribution = useMemo(() => {
    if (!managedAttesters.length) return { statuses: [], distribution: {} };
    const distribution: Record<string, number> = {};
    managedAttesters.forEach(attester => {
      const status = attester.status || 'Unknown';
      distribution[status] = (distribution[status] || 0) + 1;
    });
    return {
      statuses: Object.keys(distribution),
      distribution
    };
  }, [managedAttesters]);

  // Get status colors for all statuses
  const statusColors = useStatusColors(statusDistribution.statuses);

  if (error) {
    notFound();
  }

  if (isLoading) {
    return (
      <PageTransitionWrapper>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Link Skeleton */}
          <div className="mb-6">
            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>

          {/* Provider Info Card Skeleton */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg mb-8">
            <div className="p-6">
              {/* Header Skeleton */}
              <div className="mb-6">
                <div className="h-9 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
                <div className="h-5 w-96 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              </div>

              {/* Stats Grid Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i}>
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
                    <div className="h-7 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>

              {/* Performance Stats Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
                      <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sequencers Section Skeleton */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Sequencer Table Skeleton */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
            {/* Desktop Table Skeleton */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-white/60 dark:bg-slate-700/60">
                    <tr>
                      <th className="px-4 py-4 w-16">
                        <div className="h-4 w-10 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      </th>
                      <th className="px-4 py-4">
                        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      </th>
                      <th className="px-4 py-4">
                        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      </th>
                      <th className="px-4 py-4">
                        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      </th>
                      <th className="px-4 py-4">
                        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      </th>
                      <th className="px-4 py-4">
                        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                    {[...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-4">
                          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
                            <div className="space-y-2">
                              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto"></div>
                            <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto"></div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto"></div>
                            <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto"></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card Skeleton */}
            <div className="lg:hidden space-y-4 p-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                        <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
                    <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                    <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination Skeleton */}
          <div className="flex items-center justify-between mt-6">
            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              <div className="h-9 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
          </div>
        </main>
      </PageTransitionWrapper>
    );
  }

  if (!provider) {
    notFound();
  }


  return (
    <PageTransitionWrapper>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/providers"
            className="inline-flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/60 transition-all duration-300 hover:shadow-lg"
          >
            <ArrowLeftIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Back to Providers</span>
          </Link>
        </div>

        {/* Provider Info Card */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
          {/* Subtle background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/50 pointer-events-none"></div>
          {/* Elegant Mesh Gradient - Top Right */}
          <div className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-gradient-to-br from-brand-violet/5 via-amber-500/5 to-transparent blur-3xl opacity-60 pointer-events-none"></div>

          <div className="relative z-10 p-4 sm:p-6 md:p-8">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <div className="mb-3">
                <div className="flex items-center gap-3 mb-2">
                  <ProviderAvatar
                    logoUrl={provider.metadata.logoUrl}
                    name={provider.metadata.name || provider.identifier}
                    size="2xl"
                    className="ring-2 ring-slate-300 dark:ring-slate-600"
                  />
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                      {provider.metadata.name || `Provider ${provider.identifier}`}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-mono">
                      ID: {provider.identifier}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-slate-600 dark:text-slate-400 font-mono text-sm break-all">
                    {provider.admin}
                  </p>
                  <CopyButton textToCopy={provider.admin} size="sm" />
                </div>
                {provider.metadata.description && (
                  <p className="text-slate-600 dark:text-slate-300 text-sm mb-3 max-w-3xl">
                    {provider.metadata.description}
                  </p>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  {provider.metadata.website && (
                    <a
                      href={provider.metadata.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-violet dark:text-accent-purple-light hover:underline"
                    >
                      {provider.metadata.website}
                    </a>
                  )}
                  {provider.metadata.website && provider.metadata.email && (
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                  )}
                  {provider.metadata.email && (
                    <a
                      href={`mailto:${provider.metadata.email}`}
                      className="text-sm text-brand-violet dark:text-accent-purple-light hover:underline"
                    >
                      {provider.metadata.email}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {/* Managed Sequencers + Status Distribution */}
              <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 font-light mb-1">
                  Managed Sequencers
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {managedAttesters.length}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(statusDistribution.distribution).map(([status, count]) => {
                    const classes = statusColors.get(status);
                    if (!classes) return null;
                    return (
                      <div
                        key={status}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md ${classes.bg} ${classes.text}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${classes.dot}`}></span>
                        <span>{status}</span>
                        <span className="ml-0.5 font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Queued Sequencers */}
              <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 font-light mb-1">
                  Queued Sequencers
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {queuedAttesters.length}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Waiting for activation</p>
              </div>

              {/* Total Staked */}
              <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 font-light mb-1">
                  Total Active Staked
                </div>
                {(() => {
                  const { formatted, usd } = formatBalanceWithUsd(
                    provider.totalStaked,
                    config?.stakingTokenDecimals || 18,
                    config?.stakingTokenSymbol || 'STK',
                    currentPrice,
                    true
                  );
                  return (
                    <>
                      <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatted}</p>
                      {usd && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{usd}</p>}
                    </>
                  );
                })()}
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Only validating sequencers</p>
              </div>

              {/* Commission */}
              <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 font-light mb-1">
                  Commission Rate
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {(provider.takeRate / 100).toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Cumulative performance (last {epochLimit} epochs participated)
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 p-2 bg-green-100/50 dark:bg-green-900/20 rounded-lg">
                      <ShieldCheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                        Attestation Rate
                      </div>
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        {provider.attestationRate}%
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {provider.attestationsSuccessful} succeeded • {provider.attestationsMissed} missed
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 p-2 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg">
                      <CubeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Proposal Rate
                        </div>
                        <Tooltip content={<>Checkpoint missed: blocks were proposed but checkpoint was not attested.<br />Block missed: no block proposals were sent at all.</>}>
                          <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                        </Tooltip>
                      </div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {provider.blockSuccessRate}%
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                        <span>{provider.checkpointsMined} mined • {provider.checkpointsProposed} proposed</span>
                        <br />
                        <span>{provider.checkpointsMissed} checkpoint missed • {provider.blocksMissed} block missed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Managed Sequencers Section */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Managed Sequencers
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {searchQuery ? `${sortedAttesters.length} of ${managedAttesters.length}` : managedAttesters.length} {managedAttesters.length === 1 ? 'sequencer' : 'sequencers'} {searchQuery && 'found'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-violet dark:focus:ring-accent-purple-light focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                >
                  <XMarkIcon className="h-3.5 w-3.5 text-slate-400" />
                </button>
              )}
            </div>

            {/* Epoch Limit Filter */}
            <div className="inline-flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
              {EPOCH_LIMIT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleEpochLimitChange(option.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${epochLimit === option.value
                    ? 'bg-brand-violet text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {sortedAttesters.length === 0 ? (
          <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="relative p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 mb-4">
                {searchQuery ? (
                  <MagnifyingGlassIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                ) : (
                  <UserGroupIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                )}
              </div>

              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {searchQuery ? 'No sequencers found' : 'No managed sequencers'}
              </h3>

              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
                {searchQuery
                  ? `No sequencers matching "${searchQuery}"`
                  : 'This provider has no managed sequencers'}
              </p>

              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-violet dark:text-accent-purple-light hover:bg-brand-violet/5 dark:hover:bg-accent-purple-light/5 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Clear search
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg">
              <div className="relative">
                <AttesterTable
                  attesters={paginatedAttesters}
                  expandedRow={expandedRow}
                  onToggleRow={handleToggleRow}
                  stakingTokenDecimals={config?.stakingTokenDecimals || 18}
                  stakingTokenSymbol={config?.stakingTokenSymbol || 'STK'}
                  epochLimit={epochLimit}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </div>
            </div>

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showingText={`Showing ${startIndex + 1}-${Math.min(endIndex, sortedAttesters.length)} of ${sortedAttesters.length}`}
            />
          </>
        )}

        {/* Queued Sequencers Section */}
        {queuedAttesters.length > 0 && (
          <div className="mt-10">
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <QueueListIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Queued Sequencers
                </h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {queuedAttesters.length} {queuedAttesters.length === 1 ? 'sequencer' : 'sequencers'} waiting for activation
              </p>
            </div>

            <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg">
              <div className="relative">
                <AttesterTable
                  attesters={paginatedQueued}
                  expandedRow={queueExpandedRow}
                  onToggleRow={handleQueueToggleRow}
                  stakingTokenDecimals={config?.stakingTokenDecimals || 18}
                  stakingTokenSymbol={config?.stakingTokenSymbol || 'STK'}
                  epochLimit={epochLimit}
                />
              </div>
            </div>

            {queueTotalPages > 1 && (
              <PaginationControls
                currentPage={queuePage}
                totalPages={queueTotalPages}
                onPageChange={setQueuePage}
                showingText={`Showing ${queueStartIndex + 1}-${Math.min(queueEndIndex, sortedQueued.length)} of ${sortedQueued.length}`}
              />
            )}
          </div>
        )}
      </main>
    </PageTransitionWrapper>
  );
}
