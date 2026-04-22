'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useWatchlistValidators } from '@/hooks/queries/useWatchlistValidators';
import { WatchlistValidatorCard } from './WatchlistValidatorCard';
import { WatchlistAggregatedMetrics } from './WatchlistAggregatedMetrics';
import { WatchlistStatusBreakdown } from './WatchlistStatusBreakdown';
import { StarIcon, SparklesIcon, ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/solid';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { useNotification } from '@/context/NotificationContext';
import Link from 'next/link';

/**
 * Watchlist page content component
 * Displays watchlisted sequencers with aggregated metrics, status breakdown, and enhanced UI
 */
export const WatchlistPageContent: React.FC = () => {
  const { watchlist, clearWatchlist } = useWatchlist();
  const { addNotification } = useNotification();
  const { data: watchlistData, isLoading: loading } = useWatchlistValidators(watchlist);
  const [currentPage, setCurrentPage] = useState(1);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const itemsPerPage = 4;

  const handleClearWatchlist = () => {
    clearWatchlist();
    setShowClearConfirm(false);
    addNotification('Watchlist cleared successfully', 'success');
  };

  // Get validators from the dedicated watchlist API
  const validators = useMemo(() => {
    if (!watchlistData) return [];
    return watchlistData.validators;
  }, [watchlistData]);

  // Calculate status counts from API response
  const statusCounts = useMemo(() => {
    if (!watchlistData?.statuses) return {};
    return watchlistData.statuses.reduce((acc, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {} as Record<string, number>);
  }, [watchlistData]);

  // Paginate validators
  const totalPages = Math.ceil(validators.length / itemsPerPage);
  const paginatedValidators = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return validators.slice(startIndex, startIndex + itemsPerPage);
  }, [validators, currentPage]);

  if (loading) {
    return (
      <main className="flex-grow container mx-auto">
        {/* Hero Section */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-yellow-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-yellow-900/20 border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
              {/* Left side: Title and subtext */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  {/* Animated Icon */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/30 to-amber-500/20 rounded-lg sm:rounded-xl blur-sm sm:blur-md"></div>
                    <div className="relative p-2 sm:p-2.5 bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/20 dark:border-slate-700/50 shadow-md sm:shadow-lg">
                      <StarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-yellow-600 to-amber-600 dark:from-slate-100 dark:via-yellow-400 dark:to-amber-400 bg-clip-text text-transparent leading-tight">
                    Your Watchlist
                  </h1>
                </div>

                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  Loading your watchlist...
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Skeleton */}
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg p-6">
                <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                  <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow container mx-auto">
      {/* Navigation */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/60 transition-all duration-300 hover:shadow-lg"
        >
          <ArrowLeftIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Back to Dashboard</span>
        </Link>
      </div>

      {/* Hero Section */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-yellow-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-yellow-900/20 border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col items-start gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Animated Icon */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/30 to-amber-500/20 rounded-lg sm:rounded-xl blur-sm sm:blur-md"></div>
                <div className="relative p-2 sm:p-2.5 bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/20 dark:border-slate-700/50 shadow-md sm:shadow-lg">
                  <StarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-yellow-600 to-amber-600 dark:from-slate-100 dark:via-yellow-400 dark:to-amber-400 bg-clip-text text-transparent leading-tight">
                Your Watchlist
              </h1>
            </div>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {validators.length > 0 ? (
                <>
                  Tracking{' '}
                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                    {validators.length} sequencer{validators.length !== 1 ? 's' : ''}
                  </span>
                  {' '}across the network. Monitor attestations, block proposals, and performance metrics in real-time.
                </>
              ) : (
                'Build your personal dashboard to monitor sequencer performance, track attestations, and stay informed about network activity'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {validators.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-xl">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-amber-500/5"></div>

          <div className="relative z-10 text-center py-24 px-6">
            {/* Icon container with glassmorphism */}
            <div className="relative mb-8 inline-block">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-amber-500/10 rounded-3xl blur-2xl"></div>
              <div className="relative p-8 bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm rounded-3xl border border-white/30 dark:border-slate-600/30 shadow-2xl">
                <div className="relative">
                  <StarIcon className="h-20 w-20 text-slate-300 dark:text-slate-600 mx-auto" />
                  <SparklesIcon className="h-8 w-8 text-yellow-500 dark:text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
                </div>
              </div>
            </div>

            <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-yellow-600 to-amber-600 dark:from-slate-100 dark:via-yellow-400 dark:to-amber-400 bg-clip-text text-transparent mb-3">
              Start Your Watchlist
            </h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
              Curate your own list of top sequencers. Track attestations, monitor block proposals, and analyze performance all in one place.
            </p>
            <Link
              href="/validators"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
            >
              <StarIcon className="h-5 w-5" />
              Browse All Sequencers
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Status Breakdown & Validator Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Performance Overview & Status Breakdown */}
            <div className="lg:col-span-1 space-y-6">
              <WatchlistStatusBreakdown statusCounts={statusCounts} totalCount={validators.length} />
              <WatchlistAggregatedMetrics validators={validators} />
            </div>

            {/* Validator Cards - Right Columns */}
            <div className="lg:col-span-3">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Your Sequencers
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Detailed performance breakdown for each tracked node
                  </p>
                </div>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="group inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 ml-4"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm font-medium">Clear All</span>
                </button>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {paginatedValidators.map((validator) => (
                  <WatchlistValidatorCard
                    key={validator.address}
                    validator={validator}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              <div className="mt-8">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  showingText={`Showing ${((currentPage - 1) * itemsPerPage) + 1} to ${Math.min(currentPage * itemsPerPage, validators.length)} of ${validators.length} sequencers`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Clear Watchlist
              </h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to remove all {validators.length} sequencer{validators.length !== 1 ? 's' : ''} from your watchlist? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClearWatchlist}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </main>
  );
};
