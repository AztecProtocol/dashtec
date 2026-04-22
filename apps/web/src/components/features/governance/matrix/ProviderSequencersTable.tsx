'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { useProviderSequencers } from '@/hooks/queries/useProviderSequencers';
import { Skeleton } from '@/components/ui/Skeleton';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { SequencerTableRow } from './SequencerTableRow';
import type { Payload, ProviderSequencerSortBy } from '@/types/signaling-matrix';
import { useRollupFilter } from '@/hooks/useRollupFilter';

interface ProviderSequencersTableProps {
  providerIdentifier: string;
  roundNumber: number;
  payloads: Payload[];
}

/**
 * Table showing sequencers for a provider with pagination, sorting, and search
 */
export const ProviderSequencersTable: React.FC<ProviderSequencersTableProps> = ({
  providerIdentifier,
  roundNumber,
  payloads,
}) => {
  const { rollupParam } = useRollupFilter();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState<ProviderSequencerSortBy>('signals');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const payloadAddresses = payloads.map(p => p.address);

  const { data, isLoading, error } = useProviderSequencers({
    providerIdentifier,
    roundNumber,
    payloadAddresses,
    page,
    limit,
    sortBy,
    search: debouncedSearch || undefined,
  }, rollupParam);

  // Show message if no payloads detected
  if (payloads.length === 0) {
    return (
      <div className="bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700 p-8">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No payloads detected for this round
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-2">
            Sequencers cannot signal without active payloads
          </p>
        </div>
      </div>
    );
  }


  if (isLoading) {
    return (
      <div className="bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700">
        {/* Controls Skeleton */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Skeleton widthClass="w-64" heightClass="h-9" className="rounded-lg" />
          <Skeleton widthClass="w-32" heightClass="h-9" className="rounded-lg" />
        </div>

        {/* Table Skeleton */}
        <div className="overflow-x-auto">
          <div className="min-w-full text-sm">
            {/* Header Skeleton */}
            <div className="bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-12 gap-4 items-center px-6 py-3">
                <div className="col-span-3">
                  <Skeleton widthClass="w-24" heightClass="h-4" />
                </div>
                <div className="col-span-7">
                  <div className="flex items-center gap-4 overflow-x-auto">
                    {Array.from({ length: payloads.length || 3 }).map((_, i) => (
                      <div key={i} className="flex-shrink-0 min-w-[150px] text-center">
                        <Skeleton widthClass="w-20" heightClass="h-4" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-span-2 flex justify-end">
                  <Skeleton widthClass="w-32" heightClass="h-4" />
                </div>
              </div>
            </div>

            {/* Body Skeleton */}
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 items-center px-6 py-4">
                  {/* Sequencer Info */}
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <Skeleton widthClass="w-8" heightClass="h-8" className="rounded-full" />
                      <div className="flex flex-col gap-2 flex-1">
                        <Skeleton widthClass="w-32" heightClass="h-4" />
                        <Skeleton widthClass="w-24" heightClass="h-3" />
                      </div>
                    </div>
                  </div>

                  {/* Signal Status per Payload */}
                  <div className="col-span-7">
                    <div className="flex items-center gap-4 overflow-x-auto">
                      {Array.from({ length: payloads.length || 3 }).map((_, j) => (
                        <div key={j} className="flex-shrink-0 min-w-[150px] flex items-center justify-center">
                          <Skeleton widthClass="w-5" heightClass="h-5" className="rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Proposing Opportunity */}
                  <div className="col-span-2 flex justify-end">
                    <Skeleton widthClass="w-20" heightClass="h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700 p-6">
        <p className="text-center text-red-500 dark:text-red-400 text-sm">
          {error instanceof Error ? error.message : 'Failed to load sequencers'}
        </p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { sequencers, pagination } = data;

  return (
    <div className="bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700">
      {/* Controls */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search sequencers..."
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet dark:focus:border-accent-purple-light outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <CustomSelect
          value={sortBy}
          onChange={(value) => setSortBy(value as 'name' | 'signals' | 'opportunities')}
          options={[
            { value: 'signals', label: 'Sort by Signals' },
            { value: 'opportunities', label: 'Sort by Opportunities' },
            { value: 'name', label: 'Sort by Name' },
          ]}
          size="sm"
          variant="compact"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="min-w-full text-sm">
          {/* Header — hidden on mobile, sequencer cards are self-descriptive */}
          <div className="hidden lg:block bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-12 gap-4 items-center px-6 py-3">
              <div className="col-span-3 text-left font-medium">Sequencer</div>
              <div className="col-span-7">
                <div className="flex items-center gap-4 overflow-x-auto">
                  {payloads.map(payload => (
                    <div key={payload.address} className="flex-shrink-0 min-w-[150px] text-center font-medium">
                      <div className="truncate" title={payload.address}>
                        {payload.address.slice(0, 6)}...{payload.address.slice(-4)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-2 text-right font-medium">
                <div>Proposer Status</div>
                <div className="flex items-center justify-end gap-1 text-xs font-normal mt-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400">Mined</span>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <span className="text-amber-600 dark:text-amber-400">Proposed</span>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <span className="text-red-600 dark:text-red-400">Missed</span>
                </div>
              </div>
            </div>
          </div>
          {/* Body */}
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {sequencers.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                {debouncedSearch ? 'No sequencers found matching your search' : 'No sequencers in this provider'}
              </div>
            ) : (
              sequencers.map(sequencer => (
                <SequencerTableRow
                  key={sequencer.address}
                  sequencer={sequencer}
                  payloads={payloads}
                  roundNumber={roundNumber}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pagination */}
      <PaginationControls
        currentPage={page}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
        showingText={`Showing ${(page - 1) * limit + 1} to ${Math.min(page * limit, pagination.totalCount)} of ${pagination.totalCount} sequencers`}
      />
    </div>
  );
};
