'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TrophyIcon, ChevronLeftIcon, ChevronRightIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@/components/ui/Tooltip';
import { useProverLeaderboard } from '@/hooks/queries/prover/useProverLeaderboard';
import { useRollupFilter } from '@/hooks/useRollupFilter';
import { Skeleton } from '@/components/ui/Skeleton';
import { CopyButton } from '@/components/ui/CopyButton';
import { formatAddress } from '@/utils/formatters';
import { ProverLeaderboardItem } from '@/types/prover';

const ITEMS_PER_PAGE = 10;

/**
 * Compact skeleton row matching TopSequencersCard style
 */
const CompactSkeletonRow: React.FC = () => (
  <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-50 dark:bg-slate-700/20 rounded-xl border border-slate-200 dark:border-slate-600/20">
    <Skeleton heightClass="h-7 sm:h-9" widthClass="w-7 sm:w-9" />
    <div className="flex-1 min-w-0">
      <Skeleton heightClass="h-3 sm:h-4" widthClass="w-2/3 mb-1" />
      <Skeleton heightClass="h-2 sm:h-3" widthClass="w-1/2" />
    </div>
    <Skeleton heightClass="h-5 sm:h-6" widthClass="w-16 sm:w-20" />
  </div>
);

/**
 * Rank badge with top-3 brand-violet highlight
 */
const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  const isTop3 = rank <= 3;
  return (
    <div
      className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border flex-shrink-0 ${
        isTop3
          ? 'bg-brand-violet/10 border-brand-violet/30 dark:bg-accent-purple-light/10 dark:border-accent-purple-light/30'
          : 'bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600/50'
      }`}
    >
      <span
        className={`text-[10px] sm:text-xs font-bold ${
          isTop3
            ? 'text-brand-violet dark:text-accent-purple-light'
            : 'text-slate-700 dark:text-slate-300'
        }`}
      >
        #{rank}
      </span>
    </div>
  );
};

/**
 * Single leaderboard row
 */
const LeaderboardRow: React.FC<{ prover: ProverLeaderboardItem }> = ({ prover }) => {
  const epochSpan = prover.lastEpoch - prover.firstEpoch;

  return (
    <div className="group relative flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-600/40 hover:border-brand-violet/40 dark:hover:border-accent-purple-light/30 transition-colors duration-200">
      {/* Total proofs - floating top right */}
      <div className="absolute top-0 right-0 -translate-x-1/8 -translate-y-1/4 z-10">
        <div className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600/40 shadow-sm">
          <span className="font-bold text-xs sm:text-sm text-brand-violet dark:text-accent-purple-light">
            {prover.totalProofs.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Rank badge */}
      <RankBadge rank={prover.rank} />

      {/* Address + copy */}
      <div className="relative flex items-center flex-wrap gap-x-1.5 sm:gap-x-2 gap-y-1 sm:gap-y-1.5 min-w-0 flex-1 z-10">
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Link
            href={`/prover?address=${prover.proverId}`}
            className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-50 hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors group-hover:text-brand-violet dark:group-hover:text-accent-purple-light font-mono"
          >
            {formatAddress(prover.proverId, 6)}
          </Link>
          <CopyButton textToCopy={prover.proverId} size="xs" />
        </div>

        {/* Epoch stats */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-100 dark:bg-slate-800/40 rounded-md border border-slate-200/50 dark:border-slate-600/30">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Epochs:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {prover.firstEpoch}
            </span>
            <span className="text-slate-400 dark:text-slate-500">-</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {prover.lastEpoch}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-100 dark:bg-slate-800/40 rounded-md border border-slate-200/50 dark:border-slate-600/30">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Span:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {epochSpan.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProverLeaderboardTableProps {
  limit?: number;
}

/**
 * ProverLeaderboardTable displays top provers ranked by total proof submissions
 */
export const ProverLeaderboardTable: React.FC<ProverLeaderboardTableProps> = ({
  limit = 20,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const { rollupParam } = useRollupFilter();
  const { data, isLoading } = useProverLeaderboard(limit, rollupParam);

  const allProvers = data?.provers || [];
  const totalPages = Math.ceil(allProvers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const provers = allProvers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="flex flex-col space-y-4 sm:space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="p-1.5 sm:p-2 bg-brand-violet/5 dark:bg-brand-violet/10 rounded-lg border border-brand-violet/20 dark:border-accent-purple-light/20">
          <TrophyIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-violet dark:text-accent-purple-light" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              Prover Leaderboard
            </h3>
            <Tooltip content="Provers ranked by total proof submissions. Click an address to view detailed activity score, decay status, and proof history">
              <InformationCircleIcon className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
            </Tooltip>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            Top {allProvers.length} provers by total proofs
            {totalPages > 1 ? ` • Page ${currentPage}/${totalPages}` : ''}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3 sm:space-y-4 flex-1 flex flex-col">
        {isLoading ? (
          Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
            <CompactSkeletonRow key={`skel-row-${i}`} />
          ))
        ) : provers.length > 0 ? (
          provers.map((prover) => (
            <LeaderboardRow key={prover.proverId} prover={prover} />
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800/50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-dashed border-slate-300 dark:border-slate-700">
            <TrophyIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-slate-400 dark:text-slate-500 mb-3 sm:mb-4" />
            <h4 className="font-semibold text-sm sm:text-base text-slate-600 dark:text-slate-300">
              No Data Available
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              No prover leaderboard data available yet.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="py-2 px-4 text-sm flex gap-2 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600/30 hover:border-slate-300 dark:hover:border-slate-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            Prev
          </button>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="py-2 px-4 text-sm flex gap-2 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600/30 hover:border-slate-300 dark:hover:border-slate-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRightIcon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          </button>
        </div>
      ) : null}
    </div>
  );
};
