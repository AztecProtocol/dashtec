'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { type SlashingRoundDetail as SlashingRoundDetailType, type ValidatorInfo } from './types';
import { ValidatorCell } from './ValidatorCell';
import { TransactionHashCell } from './TransactionHashCell';
import { formatBalance, formatBalanceWithUsd } from '@/utils/formatters';
import { BalanceWithUsd } from '@/components/ui/BalanceWithUsd';
import { useApp } from '@/context/AppContext';
import { useSlashingRoundData } from '@/hooks/useSlashingRoundData';
import {
  ExclamationTriangleIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface SlashingRoundDetailProps {
  roundNumber: number;
}

interface ConvictionItemProps {
  conviction: {
    validator_address: string;
    slash_count: number;
    total_slash_amount: string | number;
    validator?: ValidatorInfo | null;
  };
  tokenDecimals: number;
  tokenSymbol: string;
}

const ConvictionItem: React.FC<ConvictionItemProps> = ({ conviction, tokenDecimals, tokenSymbol }) => {
  const { formatted } = formatBalanceWithUsd(
    conviction.total_slash_amount,
    tokenDecimals,
    tokenSymbol,
    true
  );

  return (
    <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3 sm:p-4 border border-red-200 dark:border-red-800/30">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          <ValidatorCell
            address={conviction.validator_address}
            validator={conviction.validator}
            showLink={true}
          />
          {conviction.slash_count > 1 && (
            <div className="mt-1 text-[10px] text-purple-600 dark:text-purple-400 font-medium">
              Slashed {conviction.slash_count} times in this round
            </div>
          )}
        </div>
        <div className="sm:text-right flex-shrink-0">
          <div className="text-[10px] sm:text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-0.5 sm:mb-1">
            Total Slash Amount
          </div>
          <BalanceWithUsd
            formatted={formatted}
            className="text-xs sm:text-sm font-semibold text-red-700 dark:text-red-300"
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Component that loads and displays detailed information for a specific slashing round
 */
export const SlashingRoundDetail: React.FC<SlashingRoundDetailProps> = ({ roundNumber }) => {
  const { detail, isLoading, error: queryError, groupedConvictions, multipleSlashCount, uniqueCount } = useSlashingRoundData(roundNumber);
  const [convictionsPage, setConvictionsPage] = useState(1);
  const [votesPage, setVotesPage] = useState(1);
  const [convictionsSearch, setConvictionsSearch] = useState('');
  const [votesSearch, setVotesSearch] = useState('');
  const { networkConfig: config } = useApp();

  // Pagination settings
  const CONVICTIONS_PER_PAGE = 8;
  const VOTES_PER_PAGE = 4;

  // Filtered and paginated data
  const paginatedConvictions = useMemo(() => {
    if (!detail) return { data: [], totalPages: 0, filteredCount: 0 };

    // Filter by search term
    const filtered = groupedConvictions.filter(conviction =>
      conviction.validator_address.toLowerCase().includes(convictionsSearch.toLowerCase()) ||
      (conviction.validator?.name && conviction.validator.name.toLowerCase().includes(convictionsSearch.toLowerCase())) ||
      (conviction.validator?.x_handle && conviction.validator.x_handle.toLowerCase().includes(convictionsSearch.toLowerCase())) ||
      (conviction.validator?.provider?.name && conviction.validator.provider.name.toLowerCase().includes(convictionsSearch.toLowerCase())) ||
      (conviction.validator?.provider?.providerIdentifier && conviction.validator.provider.providerIdentifier.toLowerCase().includes(convictionsSearch.toLowerCase()))
    );

    const start = (convictionsPage - 1) * CONVICTIONS_PER_PAGE;
    const end = start + CONVICTIONS_PER_PAGE;

    return {
      data: filtered.slice(start, end),
      totalPages: Math.ceil(filtered.length / CONVICTIONS_PER_PAGE),
      filteredCount: filtered.length,
    };
  }, [groupedConvictions, convictionsPage, convictionsSearch, detail]);

  const paginatedVotes = useMemo(() => {
    if (!detail) return { data: [], totalPages: 0, filteredCount: 0 };

    // Filter by search term
    const filtered = detail.votes_cast.filter(vote =>
      vote.proposer_address.toLowerCase().includes(votesSearch.toLowerCase()) ||
      (vote.validator?.name && vote.validator.name.toLowerCase().includes(votesSearch.toLowerCase())) ||
      (vote.validator?.x_handle && vote.validator.x_handle.toLowerCase().includes(votesSearch.toLowerCase())) ||
      (vote.validator?.provider?.name && vote.validator.provider.name.toLowerCase().includes(votesSearch.toLowerCase())) ||
      (vote.validator?.provider?.providerIdentifier && vote.validator.provider.providerIdentifier.toLowerCase().includes(votesSearch.toLowerCase())) ||
      vote.transaction_hash.toLowerCase().includes(votesSearch.toLowerCase())
    );

    const start = (votesPage - 1) * VOTES_PER_PAGE;
    const end = start + VOTES_PER_PAGE;

    return {
      data: filtered.slice(start, end),
      totalPages: Math.ceil(filtered.length / VOTES_PER_PAGE),
      filteredCount: filtered.length
    };
  }, [detail, votesPage, votesSearch]);

  // Reset pagination when search changes
  useEffect(() => {
    setConvictionsPage(1);
  }, [convictionsSearch]);

  useEffect(() => {
    setVotesPage(1);
  }, [votesSearch]);

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

  if (queryError || !detail) {
    return (
      <div className="p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {queryError instanceof Error ? queryError.message : 'Failed to load round details'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-900/20 rounded-lg flex-shrink-0">
          <ExclamationTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 break-words">
            Round #{detail.round_number} Details
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {detail.slash_count} slash{detail.slash_count !== 1 ? 'es' : ''} executed
            {detail.executed_date && (
              <span className="block sm:inline">
                {' '}on {new Date(detail.executed_date).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Convicted Attesters */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h4 className="text-md font-semibold text-slate-900 dark:text-slate-100">
                  Convicted Sequencers ({convictionsSearch ? paginatedConvictions.filteredCount : uniqueCount})
                </h4>
              </div>
              {multipleSlashCount > 0 && (
                <div className="text-xs text-slate-600 dark:text-slate-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-md border border-purple-200 dark:border-purple-800/30">
                  {multipleSlashCount} slashed multiple times
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {detail.slash_count} total slash{detail.slash_count !== 1 ? 'es' : ''} executed across {uniqueCount} unique sequencer{uniqueCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by address, name, handle, or provider..."
              value={convictionsSearch}
              onChange={(e) => setConvictionsSearch(e.target.value)}
              className="w-full pl-3 pr-4 py-2 text-sm border border-red-200 dark:border-red-800/30 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
            {convictionsSearch && (
              <button
                onClick={() => setConvictionsSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            )}
          </div>

          {detail.convicted_attesters.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No convicted sequencers found
              </p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {paginatedConvictions.data.map((conviction, index) => (
                <ConvictionItem
                  key={`${conviction.validator_address}_${index}`}
                  conviction={conviction}
                  tokenDecimals={config?.stakingTokenDecimals || 18}
                  tokenSymbol={config?.stakingTokenSymbol || 'STK'}
                />
              ))}

              {/* Convictions Pagination */}
              {paginatedConvictions.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-3 sm:pt-4">
                  <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                    Showing {((convictionsPage - 1) * CONVICTIONS_PER_PAGE) + 1}-{Math.min(convictionsPage * CONVICTIONS_PER_PAGE, paginatedConvictions.filteredCount)} of {paginatedConvictions.filteredCount}{convictionsSearch && ` (filtered from ${uniqueCount})`}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConvictionsPage(p => Math.max(1, p - 1))}
                      disabled={convictionsPage === 1}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeftIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </button>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400">
                      {convictionsPage} / {paginatedConvictions.totalPages}
                    </span>
                    <button
                      onClick={() => setConvictionsPage(p => Math.min(paginatedConvictions.totalPages, p + 1))}
                      disabled={convictionsPage === paginatedConvictions.totalPages}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRightIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Votes Cast */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h4 className="text-md font-semibold text-slate-900 dark:text-slate-100">
                Votes Cast ({votesSearch ? paginatedVotes.filteredCount : detail.votes_cast.length})
              </h4>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by address, name, handle, provider, or tx hash..."
              value={votesSearch}
              onChange={(e) => setVotesSearch(e.target.value)}
              className="w-full pl-3 pr-4 py-2 text-sm border border-green-200 dark:border-green-800/30 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
            {votesSearch && (
              <button
                onClick={() => setVotesSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            )}
          </div>

          {detail.votes_cast.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No votes cast found
              </p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {paginatedVotes.data.map((vote, index) => (
                <div
                  key={`${vote.proposer_address}_${index}`}
                  className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3 sm:p-4 border border-green-200 dark:border-green-800/30"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
                    <div className="flex-1 min-w-0">
                      <ValidatorCell
                        address={vote.proposer_address}
                        validator={vote.validator}
                        showLink={true}
                      />
                    </div>
                    {vote.voted_at && (
                      <div className="sm:text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                          <ClockIcon className="h-3 w-3" />
                          <span>
                            {new Date(vote.voted_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-[10px] sm:text-xs text-green-500 dark:text-green-400 font-mono">
                          {new Date(vote.voted_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-green-200 dark:border-green-800/30">
                    <div className="text-[10px] sm:text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider mb-0.5 sm:mb-1">
                      Transaction
                    </div>
                    <TransactionHashCell hash={vote.transaction_hash} />
                  </div>
                </div>
              ))}

              {/* Votes Pagination */}
              {paginatedVotes.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-3 sm:pt-4">
                  <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                    Showing {((votesPage - 1) * VOTES_PER_PAGE) + 1}-{Math.min(votesPage * VOTES_PER_PAGE, paginatedVotes.filteredCount)} of {paginatedVotes.filteredCount}{votesSearch && ` (filtered from ${detail.votes_cast.length})`}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setVotesPage(p => Math.max(1, p - 1))}
                      disabled={votesPage === 1}
                      className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeftIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </button>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400">
                      {votesPage} / {paginatedVotes.totalPages}
                    </span>
                    <button
                      onClick={() => setVotesPage(p => Math.min(paginatedVotes.totalPages, p + 1))}
                      disabled={votesPage === paginatedVotes.totalPages}
                      className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRightIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer with execution info */}
      {detail.executed_date && (
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-600">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
            <span>
              Executed: {new Date(detail.executed_date).toLocaleString()}
            </span>
            <span>
              Block: #{detail.deployment_block}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};