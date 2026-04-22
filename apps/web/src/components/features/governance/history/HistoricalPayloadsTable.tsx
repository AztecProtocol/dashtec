'use client';

import { useState, useEffect } from 'react';
import { useGovernanceRounds } from '@/hooks/queries/useGovernanceRounds';
import { SkeletonTableRow } from '@/components/ui/Skeleton';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { HistoricalRoundRow } from './HistoricalRoundRow';
import { useRollupFilter } from '@/hooks/useRollupFilter';

/**
 * HistoricalPayloadsTable - Shows governance data grouped by rounds
 * Layout: Nested Tables (Rounds -> Payloads -> Signals)
 */
export const HistoricalPayloadsTable: React.FC = () => {
  const { rollupParam } = useRollupFilter();
  // Pagination & Search State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, error, isPlaceholderData } = useGovernanceRounds({
    page,
    limit,
    query: debouncedQuery,
  }, rollupParam);

  const rounds = data?.data || [];
  const meta = data?.meta;
  const quorumSize = data?.quorumSize || 17;

  if (error) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-center text-red-500 dark:text-red-400">
          Failed to load historical payloads
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <DocumentTextIcon className="h-5 w-5 text-brand-violet dark:text-accent-purple-light" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Historical Rounds
          </h3>
          {meta && (
            <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {meta.totalCount} total
            </span>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search Round #..."
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet dark:focus:border-accent-purple-light outline-none transition-all"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="hidden sm:table-header-group bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-3 w-10"></th>
              <th className="px-6 py-3">Round</th>
              <th className="px-6 py-3">Status Summary</th>
              <th className="px-6 py-3 text-right">Payloads</th>
              <th className="px-6 py-3 text-right">Signals</th>
              <th className="px-6 py-3 text-center">Matrix</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {isLoading || isPlaceholderData ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4 w-10">
                    <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-24"></div>
                      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-20"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-8 ml-auto"></div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12 ml-auto"></div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-24 mx-auto"></div>
                  </td>
                </tr>
              ))
            ) : rounds.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                  No governance rounds found matching your criteria
                </td>
              </tr>
            ) : (
              rounds.map((round) => (
                <HistoricalRoundRow
                  key={round.roundNumber}
                  round={round}
                  quorumSize={quorumSize}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {meta && (
        <PaginationControls
          currentPage={page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
          showingText={`Showing ${(page - 1) * limit + 1} to ${Math.min(page * limit, meta.totalCount)} of ${meta.totalCount} rounds`}
        />
      )}
    </div>
  );
};
