'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SlashingTable } from './SlashingTable';
import { PaginationControls } from './PaginationControls';
import { SlashingStatsSection } from './SlashingStatsSection';
import { useSlashingHistory } from '@/hooks/queries/useSlashingHistory';
import { useRollupFilter } from '@/hooks/useRollupFilter';
import {
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Skeleton } from '@/components/ui/Skeleton';

type SortField = 'round_number' | 'slash_count' | 'executed_date';
type SortOrder = 'asc' | 'desc';

export const SlashingHistoryPageContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>('executed_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const searchParams = useSearchParams();

  const { rollupParam } = useRollupFilter();
  const urlSearchParam = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(urlSearchParam);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(urlSearchParam);

  const { data, isLoading: loading } = useSlashingHistory({
    page: currentPage,
    limit: 20,
    search: debouncedSearchTerm,
    sortBy,
    sortOrder,
  }, rollupParam);

  const rounds = data?.data || [];
  const totalPages = data?.pagination.totalPages || 1;
  const totalCount = data?.pagination.total || 0;

  /** Debounce search input */
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  /** Toggle sort on a column — cycles: desc → asc → desc */
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <main>
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
          <div className="relative z-10 p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Slashing History
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-light">
                  Penalties applied to sequencers who violated protocol rules
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="mb-6">
          <SlashingStatsSection rollup={rollupParam} />
        </div>

        {/* Table skeleton */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="hidden lg:block">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/60">
                <tr>
                  {['Round', 'Slashes Executed', 'Payload Address', 'Date', 'Transaction Hash', ''].map((h, i) => (
                    <th
                      key={i}
                      className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-28" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-28" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile skeleton */}
          <div className="lg:hidden divide-y divide-slate-200 dark:divide-slate-700">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-24" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                </div>
                <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Slashing History
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-light">
                Penalties applied to sequencers who violated protocol rules
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mb-6">
        <SlashingStatsSection rollup={rollupParam} />
      </div>

      {/* Search + Count */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Executed Rounds
            </h2>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              ({totalCount})
            </span>
          </div>
        </div>

        <div className="relative w-full sm:max-w-md">
          <input
            type="search"
            placeholder="Search by round number or address..."
            className="pl-10 pr-4 py-2.5 rounded-xl text-sm w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-violet focus:border-brand-violet focus:outline-none transition-all duration-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        {rounds.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative mb-6 inline-block">
              <div className="p-6 bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-600">
                {searchTerm ? (
                  <MagnifyingGlassIcon className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto" />
                ) : (
                  <ExclamationTriangleIcon className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto" />
                )}
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              {searchTerm ? 'No Results Found' : 'No Slashing Events'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              {searchTerm
                ? `No rounds match "${searchTerm}". Try a different search.`
                : 'No slashing events have been recorded yet.'}
            </p>
          </div>
        ) : (
          <SlashingTable
            rounds={rounds}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        )}

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </main>
  );
};
