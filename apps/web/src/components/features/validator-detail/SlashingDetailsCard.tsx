'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ShieldExclamationIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, InformationCircleIcon, ClockIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { CopyButton } from '@/components/ui/CopyButton';
import { ValidatorAvatar } from '@/components/ui/ValidatorAvatar';
import { formatBalance, formatTimestamp, formatAddress, formatBalanceWithUsd } from '@/utils/formatters';
import { TransactionHashCell } from '../slashing-history/TransactionHashCell';
import { useApp } from '@/context/AppContext';
import { Tooltip } from '@/components/ui/Tooltip';
import { getAddressUrl } from '@/utils/blockExplorer';
import { ProviderMetadata } from '@/types';

interface ExecutedSlash {
  id: string;
  payload_address: string | null;
  amount: number;
  slashed_date: string;
  timestamp: string | null;
  transaction_hash: string;
  block_number: string;
  round_number: number;
  validator_provider?: ProviderMetadata;
  payloadDetails: {
    offenses: number;
    proposedAmount: number;
    payload: {
      creator_address: string;
      created_at: string;
      timestamp: string | null;
      transaction_hash: string;
      block_number: string;
      creator_name?: string | null;
      creator_x_username?: string | null;
      creator_x_profile_image?: string | null;
      creator_discord_username?: string | null;
      creator_discord_id?: string | null;
      creator_discord_avatar?: string | null;
      creator_provider?: ProviderMetadata;
    };
  } | null;
}

export interface SlashingData {
  executed: ExecutedSlash[];
}

interface SlashingDetailsCardProps {
  slashingData: SlashingData;
}

// Pagination component matching the page style
const TablePagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}> = ({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-4 py-3 border-t border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/20 gap-2 sm:gap-0">
      <div className="text-xs text-slate-500 dark:text-slate-400 order-2 sm:order-1">
        <span className="hidden sm:inline">Showing </span>{startItem}-{endItem} of {totalItems}
      </div>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 sm:p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </button>
        <span className="px-3 sm:px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 min-w-[60px] text-center">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 sm:p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRightIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </button>
      </div>
    </div>
  );
};

type TabType = 'executed';

type SlashGroup = Omit<ExecutedSlash, 'id' | 'amount' | 'timestamp' | 'validator_provider'> & {
  total_amount: number;
  slash_count: number;
  slashes: ExecutedSlash[];
};

interface SlashGroupCardProps {
  group: SlashGroup;
  tokenDecimals: number;
  tokenSymbol: string;
}

const SlashGroupCard: React.FC<SlashGroupCardProps> = ({ group, tokenDecimals, tokenSymbol }) => {
  const { formatted: totalFormatted } = formatBalanceWithUsd(
    group.total_amount,
    tokenDecimals,
    tokenSymbol,
    true
  );

  const deductedPerSlash = group.payloadDetails?.proposedAmount
    ? formatBalanceWithUsd(group.payloadDetails.proposedAmount, tokenDecimals, tokenSymbol, true)
    : null;

  return (
    <Link
      key={`${group.round_number}-${group.transaction_hash}`}
      href={`/slashing-history/${group.round_number}`}
      className="group relative block overflow-hidden rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-red-200/50 dark:border-red-800/30 hover:border-red-300 dark:hover:border-red-700/50 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer"
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-3 sm:space-y-0">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur"></div>
                <div className="relative w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                {totalFormatted} slashed
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-800/30">
                <span className="font-medium text-red-600 dark:text-red-400">Round #{group.round_number}</span>
              </div>
              {group.slash_count > 1 && (
                <>
                  <span className="text-slate-500 dark:text-slate-400">•</span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/30">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{group.slash_count} slashes</span>
                  </div>
                </>
              )}
              {deductedPerSlash && (
                <>
                  <span className="text-slate-500 dark:text-slate-400">•</span>
                  <span>Deducted: <span>{deductedPerSlash.formatted}</span> per Slash</span>
                </>
              )}
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 dark:bg-slate-700/50 rounded-lg border border-slate-200/50 dark:border-slate-600/30">
            <ClockIcon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {group.slashed_date ? formatTimestamp(Math.floor(new Date(group.slashed_date).getTime() / 1000)) : 'N/A'}
            </span>
          </div>
        </div>

        {group.payloadDetails && (
          <div className="mb-3 p-3 bg-white/80 dark:bg-slate-700/30 backdrop-blur-sm rounded-lg border border-slate-200/50 dark:border-slate-600/30">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 uppercase tracking-wider">Payload Information</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Payload:</span>
              <a
                href={getAddressUrl(group.payload_address || '')}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-mono text-xs text-brand-violet dark:text-accent-purple-light hover:underline transition-colors inline-flex items-center gap-1"
              >
                {formatAddress(group.payload_address || '')}
                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
              </a>
              <div onClick={(e) => e.stopPropagation()}>
                <CopyButton textToCopy={group.payload_address || ''} size="xs" />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-3 border-t border-slate-200/50 dark:border-slate-600/30">
          <div className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium">Execution Block:</span>
            <span className="font-mono">{group.block_number}</span>
          </div>
          <span className="hidden sm:block text-slate-300 dark:text-slate-600">•</span>
          <div className="min-w-0">
            <TransactionHashCell hash={group.transaction_hash} compact />
          </div>
        </div>
      </div>
    </Link>
  );
};

export const SlashingDetailsCard: React.FC<SlashingDetailsCardProps> = ({ slashingData }) => {

  // Tab and pagination state
  const [activeTab, setActiveTab] = useState<TabType>('executed');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 2;

  const { networkConfig: config } = useApp();

  // Group slashes by round, payload, tx hash, and execution block
  const groupedSlashes = useMemo(() => {
    const groups = new Map<string, {
      round_number: number;
      payload_address: string | null;
      transaction_hash: string;
      block_number: string;
      slashed_date: string;
      total_amount: number;
      slash_count: number;
      slashes: ExecutedSlash[];
      payloadDetails: ExecutedSlash['payloadDetails'];
    }>();

    slashingData.executed.forEach(slash => {
      const key = `${slash.round_number}-${slash.payload_address}-${slash.transaction_hash}-${slash.block_number}`;
      if (!groups.has(key)) {
        groups.set(key, {
          round_number: slash.round_number,
          payload_address: slash.payload_address,
          transaction_hash: slash.transaction_hash,
          block_number: slash.block_number,
          slashed_date: slash.slashed_date,
          total_amount: 0,
          slash_count: 0,
          slashes: [],
          payloadDetails: slash.payloadDetails
        });
      }
      const group = groups.get(key)!;
      group.total_amount += slash.amount;
      group.slash_count += 1;
      group.slashes.push(slash);
    });

    return Array.from(groups.values());
  }, [slashingData.executed]);

  // Get current tab data with search filtering
  const currentTabData = useMemo(() => {
    if (!searchQuery) return groupedSlashes;

    const searchLower = searchQuery.toLowerCase();
    return groupedSlashes.filter(group => {
      return (
        group.transaction_hash.toLowerCase().includes(searchLower) ||
        group.block_number.includes(searchLower) ||
        (group.payload_address?.toLowerCase().includes(searchLower)) ||
        group.round_number.toString().includes(searchLower)
      );
    });
  }, [groupedSlashes, searchQuery]);

  // Pagination calculations for current tab
  const paginatedTabData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return currentTabData.slice(startIndex, startIndex + itemsPerPage);
  }, [currentTabData, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(currentTabData.length / itemsPerPage);
  }, [currentTabData.length, itemsPerPage]);


  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Memoize search handler to prevent re-renders
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Calculate stats
  const totalExecuted = groupedSlashes.length;
  const totalSlashCount = useMemo(() => {
    return slashingData.executed.length;
  }, [slashingData.executed]);

  const uniqueRoundsCount = useMemo(() => {
    const rounds = new Set(slashingData.executed.map(s => s.round_number));
    return rounds.size;
  }, [slashingData.executed]);

  const totalAmountSlashed = useMemo(() => {
    return slashingData.executed.reduce((sum, slash) => sum + slash.amount, 0);
  }, [slashingData.executed]);

  const hasAnySlashingActivity = totalExecuted > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/50 shadow-2xl">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-500/10 dark:bg-red-500/20 rounded-lg">
            <ShieldExclamationIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-red-600 to-rose-600 dark:from-slate-100 dark:via-red-400 dark:to-rose-400 bg-clip-text text-transparent">
            Slashing Details
          </h3>
        </div>

        {!hasAnySlashingActivity ? (
          <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-slate-700/40 border border-white/30 dark:border-slate-600/30 p-4">
            <div className="flex items-center gap-3 py-3">
              <div className="flex-shrink-0">
                <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800/50">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  No slashing executions
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  This sequencer has not had any slashes executed against them
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Slashes */}
              <div className="rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-red-200/50 dark:border-red-800/30 p-5">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                    {totalSlashCount}
                  </div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                    <span>Total Slashes</span>
                  </div>
                </div>
              </div>

              {/* Unique Rounds */}
              <div className="rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/30 p-5">
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-700 dark:text-slate-200 mb-1">
                    {uniqueRoundsCount}
                  </div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div>
                    <span>Slashing Rounds</span>
                  </div>
                </div>
              </div>

              {/* Total Amount Slashed */}
              <div className="rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-red-200/50 dark:border-red-800/30 p-5">
                <div className="text-center">
                  {(() => {
                    const { formatted } = formatBalanceWithUsd(totalAmountSlashed, config?.stakingTokenDecimals || 18, config?.stakingTokenSymbol || 'STK', true);
                    return (
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">{formatted}</div>
                    );
                  })()}
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    <span>Total Slashed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <div>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                  <MagnifyingGlassIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search slashed rounds..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="relative w-full pl-10 pr-4 py-3 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-violet focus:border-brand-violet transition-all"
                />
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
              {/* Description */}
              <div className="mb-4 p-4 bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-start gap-3">
                  <InformationCircleIcon className="h-5 w-5 text-brand-violet dark:text-accent-purple-light flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    <strong className="text-brand-violet dark:text-accent-purple-light">Slashed Rounds:</strong> These are slashing penalties that have been executed on-chain after reaching consensus.
                    The sequencer's stake has been reduced by the specified amount in these completed slashing rounds.
                  </div>
                </div>
              </div>

              {currentTabData.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400">
                    {searchQuery
                      ? `No slashed rounds found matching "${searchQuery}"`
                      : 'No slashed rounds found.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paginatedTabData.map((group) => (
                    <SlashGroupCard
                      key={`${group.round_number}-${group.transaction_hash}`}
                      group={group}
                      tokenDecimals={config?.stakingTokenDecimals || 18}
                      tokenSymbol={config?.stakingTokenSymbol || 'STK'}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={currentTabData.length}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};