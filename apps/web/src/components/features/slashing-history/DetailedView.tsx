'use client';

import React, { useState, useMemo } from 'react';
import { ValidatorCell } from './ValidatorCell';
import { TransactionHashCell } from './TransactionHashCell';
import { SlashFactoryPayload, RoundStatus } from './types';
import { MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon, CheckCircleIcon, ClockIcon, ExclamationCircleIcon, LinkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { bigIntToOffense, getOffenseDescription } from '@/utils/constants';
import { formatBalance, formatTimestamp } from '@/utils/formatters';
import { useApp } from '@/context/AppContext';
import { Tooltip } from '@/components/ui/Tooltip';
import { getTxUrl } from '@/utils/blockExplorer';

interface DetailedViewProps {
  payload: SlashFactoryPayload;
}

// Pagination component for tables
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
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/20">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Showing {startItem}-{endItem} of {totalItems}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </button>
        <span className="px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRightIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </button>
      </div>
    </div>
  );
};

// Search input component
const SearchInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}> = ({ value, onChange, placeholder }) => (
  <div className="relative mb-3">
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-violet focus:border-brand-violet"
    />
    <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
  </div>
);

// Status badge component
const StatusBadge: React.FC<{ roundStatus: RoundStatus }> = ({ roundStatus }) => {
  const { status, submittableEvent, submittedEvent } = roundStatus;
  
  const getStatusStyles = () => {
    switch (status) {
      case 'SUBMITTED':
        return {
          className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
          icon: CheckCircleIcon,
          text: 'Submitted',
          tooltip: 'This round has been submitted to the blockchain and is final.'
        };
      case 'SUBMITTABLE':
        return {
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
          icon: ExclamationCircleIcon,
          text: 'Submittable',
          tooltip: 'This round has reached quorum and can be submitted to the blockchain.'
        };
      case 'PENDING':
      default:
        return {
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
          icon: ClockIcon,
          text: 'Pending',
          tooltip: 'This round is still collecting votes and has not reached quorum yet.'
        };
    }
  };

  const { className, icon: Icon, text, tooltip } = getStatusStyles();
  
  // Get transaction hash from the appropriate event
  const transactionHash = status === 'SUBMITTED' && submittedEvent 
    ? submittedEvent.transaction_hash 
    : status === 'SUBMITTABLE' && submittableEvent 
    ? submittableEvent.transaction_hash 
    : null;

  const badge = (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}>
        <Icon className="h-3 w-3" />
        {text}
      </span>
      {transactionHash && (
        <a
          href={getTxUrl(transactionHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-mono text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
          title={`View transaction: ${transactionHash}`}
        >
          <LinkIcon className="h-3 w-3" />
          {transactionHash.slice(0, 4)}...{transactionHash.slice(-3)}
        </a>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltip}>
      {badge}
    </Tooltip>
  );
};

// Quorum badge component
const QuorumBadge: React.FC<{ roundStatus: RoundStatus }> = ({ roundStatus }) => {
  const { hasQuorum, voteCount, quorumThreshold } = roundStatus;
  
  const tooltip = hasQuorum 
    ? `This round has reached quorum with ${voteCount} votes out of ${quorumThreshold} required.`
    : `This round needs ${quorumThreshold - voteCount} more votes to reach the quorum of ${quorumThreshold}.`;
  
  return (
    <Tooltip content={tooltip}>
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        hasQuorum 
          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      }`}>
        {voteCount}/{quorumThreshold} {hasQuorum ? '✓' : '✗'}
      </span>
    </Tooltip>
  );
};

export const DetailedView: React.FC<DetailedViewProps> = ({ payload }) => {
  // Slash Data state
  const [slashDataSearch, setSlashDataSearch] = useState('');
  const [slashDataPage, setSlashDataPage] = useState(1);
  const slashDataItemsPerPage = 5;

  // Proposer Votes state
  const [votesSearch, setVotesSearch] = useState('');
  const [votesPage, setVotesPage] = useState(1);
  const votesItemsPerPage = 5;
  
  // Round expansion state
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  
  // Vote pagination state for each round
  const [roundVotePage, setRoundVotePage] = useState<Map<number, number>>(new Map());
  const votesPerRound = 5;

  const { networkConfig: config } = useApp();
  // Filter and paginate slash data
  const filteredSlashData = useMemo(() => {
    if (!slashDataSearch) return payload.slashPayloadData;
    
    const searchLower = slashDataSearch.toLowerCase();
    return payload.slashPayloadData.filter(data => 
      data.attester_address.toLowerCase().includes(searchLower) ||
      data.attesterValidator?.name?.toLowerCase().includes(searchLower) ||
      data.attesterValidator?.x_handle?.toLowerCase().includes(searchLower) ||
      data.attesterValidator?.discordUsername?.toLowerCase().includes(searchLower) ||
      data.offenses.toString().includes(searchLower) ||
      data.amount.includes(searchLower)
    );
  }, [payload.slashPayloadData, slashDataSearch]);

  const paginatedSlashData = useMemo(() => {
    const startIndex = (slashDataPage - 1) * slashDataItemsPerPage;
    return filteredSlashData.slice(startIndex, startIndex + slashDataItemsPerPage);
  }, [filteredSlashData, slashDataPage, slashDataItemsPerPage]);

  const slashDataTotalPages = Math.ceil(filteredSlashData.length / slashDataItemsPerPage);

  // Group proposer votes by round number
  const votesByRound = useMemo(() => {
    const grouped = new Map<number, typeof payload.proposerVotes>();
    payload.proposerVotes.forEach(vote => {
      const existing = grouped.get(vote.round_number) || [];
      existing.push(vote);
      grouped.set(vote.round_number, existing);
    });
    
    // Sort rounds in descending order (newest first)
    return new Map([...grouped.entries()].sort(([a], [b]) => b - a));
  }, [payload.proposerVotes]);

  // Filter rounds based on search
  const filteredRounds = useMemo(() => {
    if (!votesSearch) return votesByRound;
    
    const searchLower = votesSearch.toLowerCase();
    const filtered = new Map<number, typeof payload.proposerVotes>();
    
    for (const [roundNumber, votes] of votesByRound) {
      const matchingVotes = votes.filter(vote => 
        vote.signaler_address.toLowerCase().includes(searchLower) ||
        vote.signalerValidator?.name?.toLowerCase().includes(searchLower) ||
        vote.signalerValidator?.x_handle?.toLowerCase().includes(searchLower) ||
        vote.signalerValidator?.discordUsername?.toLowerCase().includes(searchLower) ||
        vote.transaction_hash.toLowerCase().includes(searchLower) ||
        roundNumber.toString().includes(searchLower)
      );
      
      if (matchingVotes.length > 0) {
        filtered.set(roundNumber, matchingVotes);
      }
    }
    
    return filtered;
  }, [votesByRound, votesSearch]);

  // Paginate rounds
  const paginatedRounds = useMemo(() => {
    const roundEntries = Array.from(filteredRounds.entries());
    const startIndex = (votesPage - 1) * votesItemsPerPage;
    return roundEntries.slice(startIndex, startIndex + votesItemsPerPage);
  }, [filteredRounds, votesPage, votesItemsPerPage]);

  const votesTotalPages = Math.ceil(filteredRounds.size / votesItemsPerPage);

  // Toggle round expansion
  const toggleRoundExpansion = (roundNumber: number) => {
    const newExpanded = new Set(expandedRounds);
    if (newExpanded.has(roundNumber)) {
      newExpanded.delete(roundNumber);
    } else {
      newExpanded.add(roundNumber);
      // Initialize vote page for this round if not exists
      if (!roundVotePage.has(roundNumber)) {
        setRoundVotePage(new Map(roundVotePage.set(roundNumber, 1)));
      }
    }
    setExpandedRounds(newExpanded);
  };

  // Get current page for a round
  const getRoundVotePage = (roundNumber: number) => {
    return roundVotePage.get(roundNumber) || 1;
  };

  // Set page for a specific round
  const setRoundVotePageNumber = (roundNumber: number, page: number) => {
    const newPageMap = new Map(roundVotePage);
    newPageMap.set(roundNumber, page);
    setRoundVotePage(newPageMap);
  };

  // Paginate votes for a specific round
  const getPaginatedVotesForRound = (votes: any[], roundNumber: number) => {
    const currentPage = getRoundVotePage(roundNumber);
    const startIndex = (currentPage - 1) * votesPerRound;
    return votes.slice(startIndex, startIndex + votesPerRound);
  };

  // Get total pages for a round
  const getTotalPagesForRound = (votes: any[]) => {
    return Math.ceil(votes.length / votesPerRound);
  };

  // Reset pages when search changes
  React.useEffect(() => {
    setSlashDataPage(1);
  }, [slashDataSearch]);

  React.useEffect(() => {
    setVotesPage(1);
  }, [votesSearch]);

  return (
    <div className="bg-slate-50/50 dark:bg-slate-700/20 p-3 sm:p-4 lg:p-6 border-t border-slate-200 dark:border-slate-600">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Slash Data Table */}
        <div>
          <h4 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 sm:mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="hidden sm:inline">Slash Data ({payload.slashPayloadData.length})</span>
            <span className="sm:hidden">Slash ({payload.slashPayloadData.length})</span>
          </h4>
          
          {payload.slashPayloadData.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">No slash data</p>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
              {/* Search */}
              <div className="p-3 border-b border-slate-200 dark:border-slate-600">
                <SearchInput
                  value={slashDataSearch}
                  onChange={setSlashDataSearch}
                  placeholder="Search attesters, names, amounts..."
                />
              </div>

              {filteredSlashData.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  No results found for "{slashDataSearch}"
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full">
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Convicted Attester
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Offense
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                        {paginatedSlashData.map((data) => (
                          <tr key={data.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3">
                              <ValidatorCell 
                                address={data.attester_address}
                                validator={data.attesterValidator}
                                compact
                                showLink={true}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Tooltip content={getOffenseDescription(bigIntToOffense(data.offenses))}>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 cursor-help">
                                  {bigIntToOffense(data.offenses)}
                                  <InformationCircleIcon className="w-3 h-3" />
                                </span>
                              </Tooltip>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
                              {formatBalance(data.amount, config?.stakingTokenDecimals || 18, config?.stakingTokenSymbol || 'STK', true)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <TablePagination
                    currentPage={slashDataPage}
                    totalPages={slashDataTotalPages}
                    onPageChange={setSlashDataPage}
                    itemsPerPage={slashDataItemsPerPage}
                    totalItems={filteredSlashData.length}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Proposer Votes by Round */}
        <div>
          <h4 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 sm:mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="hidden sm:inline">Proposer Votes by Round ({votesByRound.size} rounds, {payload.proposerVotes.length} total votes)</span>
            <span className="sm:hidden">Votes ({votesByRound.size}r, {payload.proposerVotes.length}v)</span>
          </h4>
          
          {payload.proposerVotes.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">No votes</p>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
              {/* Search */}
              <div className="p-3 border-b border-slate-200 dark:border-slate-600">
                <SearchInput
                  value={votesSearch}
                  onChange={setVotesSearch}
                  placeholder="Search rounds, signalers, names, hashes..."
                />
              </div>

              {filteredRounds.size === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  No results found for "{votesSearch}"
                </div>
              ) : (
                <>
                  <div className="space-y-0">
                    {paginatedRounds.map(([roundNumber, votes], index) => (
                      <div key={roundNumber} className={`${index > 0 ? 'border-t border-slate-200 dark:border-slate-600' : ''}`}>
                        {/* Round Header */}
                        <div className="bg-slate-50/50 dark:bg-slate-700/30 px-4 py-3 border-b border-slate-200 dark:border-slate-600">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleRoundExpansion(roundNumber)}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
                              >
                                Round {roundNumber}
                                {expandedRounds.has(roundNumber) ? (
                                  <ChevronUpIcon className="h-4 w-4" />
                                ) : (
                                  <ChevronDownIcon className="h-4 w-4" />
                                )}
                              </button>
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                {votes.length} vote{votes.length !== 1 ? 's' : ''}
                              </span>
                              {/* Status and Quorum badges */}
                              {payload.roundStatuses[roundNumber] && (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                                  <StatusBadge roundStatus={payload.roundStatuses[roundNumber]} />
                                  <QuorumBadge roundStatus={payload.roundStatuses[roundNumber]} />
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                              {votes.length > 0 && votes[0].timestamp 
                                ? formatTimestamp(parseInt(votes[0].timestamp))
                                : 'N/A'
                              }
            </div>
                          </div>
                        </div>

                        {/* Round Details Table - Only show when expanded */}
                        {expandedRounds.has(roundNumber) && (() => {
                          const paginatedVotes = getPaginatedVotesForRound(votes, roundNumber);
                          const totalPages = getTotalPagesForRound(votes);
                          const currentPage = getRoundVotePage(roundNumber);
                          
                          return (
                            <div>
                              {/* Desktop Table View */}
                              <div className="hidden sm:block overflow-x-auto">
                                <table className="min-w-full">
                                  <thead className="bg-slate-50 dark:bg-slate-700">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Proposer
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Block
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Tx Hash
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Vote Date
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-600">
                                    {paginatedVotes.map((vote) => (
                                      <tr key={vote.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <td className="px-4 py-2">
                                          <ValidatorCell 
                                            address={vote.signaler_address}
                                            validator={vote.signalerValidator}
                                            compact
                                            showLink={true}
                                          />
                                        </td>
                                        <td className="px-4 py-2">
                                          <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                                            {vote.block_number}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2">
                                          <TransactionHashCell hash={vote.transaction_hash} compact />
                                        </td>
                                        <td className="px-4 py-2">
                                          <span className="text-xs text-slate-600 dark:text-slate-400">
                                            {vote.vote_date 
                                              ? new Date(vote.vote_date).toLocaleString()
                                              : vote.timestamp 
                                                ? formatTimestamp(parseInt(vote.timestamp))
                                                : 'N/A'
                                            }
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              
                              {/* Mobile Card View */}
                              <div className="sm:hidden space-y-2">
                                {paginatedVotes.map((vote) => (
                                  <div key={vote.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 p-3">
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                          Proposer
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                          Block {vote.block_number}
                                        </span>
                                      </div>
                                      <ValidatorCell 
                                        address={vote.signaler_address}
                                        validator={vote.signalerValidator}
                                        compact
                                        showLink={true}
                                      />
                                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center justify-between text-xs">
                                          <TransactionHashCell hash={vote.transaction_hash} compact />
                                          <span className="text-slate-500 dark:text-slate-400">
                                            {vote.vote_date 
                                              ? new Date(vote.vote_date).toLocaleDateString()
                                              : vote.timestamp 
                                                ? formatTimestamp(parseInt(vote.timestamp)).split(' ')[0]
                                                : 'N/A'
                                            }
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Vote Pagination for this round */}
                              {totalPages > 1 && (
                                <TablePagination
                                  currentPage={currentPage}
                                  totalPages={totalPages}
                                  onPageChange={(page) => setRoundVotePageNumber(roundNumber, page)}
                                  itemsPerPage={votesPerRound}
                                  totalItems={votes.length}
                                />
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                  
                  <TablePagination
                    currentPage={votesPage}
                    totalPages={votesTotalPages}
                    onPageChange={setVotesPage}
                    itemsPerPage={votesItemsPerPage}
                    totalItems={filteredRounds.size}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};