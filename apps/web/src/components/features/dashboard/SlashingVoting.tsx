'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldExclamationIcon, CheckCircleIcon, XCircleIcon, ChevronDownIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { SlashingVotecast, SlashedSequencer } from '@/types/api/voting-overview';
import { getTxUrl, getAddressUrl } from '@/utils/blockExplorer';
import { CopyButton } from '@/components/ui/CopyButton';
import { formatAddress, formatBalance } from '@/utils/formatters';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';

interface SlashingVotingProps {
  latestRound: number;
  latestExecutedRound: number;
  recentVotecasts: SlashingVotecast[];
  recentSlashed: SlashedSequencer[];
}

/**
 * VotecastItem component - expandable vote item with details
 */
const VotecastItem: React.FC<{ vote: SlashingVotecast }> = ({ vote }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/40 hover:border-red-500/30 dark:hover:border-red-400/20 transition-colors duration-200">
      <div
        className="flex items-center justify-between gap-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {vote.support ? (
            <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
          ) : (
            <XCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
          )}
          <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
            {formatAddress(vote.voterAddress)}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-bold text-red-600 dark:text-red-400">Round {vote.round}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{vote.timestamp}</span>
          <ChevronDownIcon
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 space-y-2 text-xs">
          {/* Transaction */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium min-w-[60px]">TX:</span>
            <a
              href={getTxUrl(vote.transactionHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 truncate"
            >
              {vote.transactionHash.substring(0, 10)}...{vote.transactionHash.substring(vote.transactionHash.length - 8)}
              <ArrowTopRightOnSquareIcon className="h-3 w-3 flex-shrink-0" />
            </a>
            <CopyButton textToCopy={vote.transactionHash} size="xs" />
          </div>

          {/* Voter/Proposer */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium min-w-[60px]">Voter:</span>
            <Link
              href={`/validators/${vote.voterAddress}`}
              className="font-mono text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:underline truncate"
            >
              {vote.voterAddress}
            </Link>
            <CopyButton textToCopy={vote.voterAddress} size="xs" />
          </div>

          {/* Target */}
          {vote.target && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium min-w-[60px]">Target:</span>
              <Link
                href={`/validators/${vote.target}`}
                className="font-mono text-red-600 dark:text-red-400 hover:underline truncate"
              >
                {formatAddress(vote.target)}
              </Link>
              <CopyButton textToCopy={vote.target} size="xs" />
            </div>
          )}

          {/* Slot Number */}
          {vote.slotNumber !== null && vote.slotNumber !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium min-w-[60px]">Slot:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {vote.slotNumber.toString()}
              </span>
            </div>
          )}

          {/* Epoch Number */}
          {vote.epochNumber !== null && vote.epochNumber !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium min-w-[60px]">Epoch:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {vote.epochNumber.toString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * SlashingVoting component displays slashing proposer voting information
 */
export const SlashingVoting: React.FC<SlashingVotingProps> = ({
  latestRound,
  latestExecutedRound,
  recentVotecasts,
  recentSlashed
}) => {
  const { config } = useNetworkConfig();
  const tokenSymbol = config!.stakingTokenSymbol;
  const tokenDecimals = config!.stakingTokenDecimals;

  return (
    <div className="flex flex-col space-y-4 sm:space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="p-1.5 sm:p-2 bg-red-500/5 dark:bg-red-500/10 rounded-lg border border-red-500/20 dark:border-red-400/20">
          <ShieldExclamationIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 dark:text-red-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
            Slashing Voting
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            Latest #{latestRound} • Executed #{latestExecutedRound}
          </p>
        </div>
      </div>

      {/* Recent Votecasts */}
      <div>
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 sm:mb-4">
          Recent Votecasts <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">(Last 5)</span>
        </h4>
        <div className="space-y-3 sm:space-y-4">
          {recentVotecasts.length > 0 ? (
            recentVotecasts.map((vote, idx) => (
              <VotecastItem key={idx} vote={vote} />
            ))
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              No recent votecasts
            </div>
          )}
        </div>
      </div>

      {/* Recently Slashed */}
      <div>
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 sm:mb-4">
          Recently Slashed <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">(Last 5)</span>
        </h4>
        <div className="space-y-2">
          {recentSlashed.length > 0 ? (
            recentSlashed.map((slashed, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/30 hover:border-amber-500/30 dark:hover:border-amber-400/20 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  {/* Left: Sequencer address */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <Link
                      href={`/validators/${slashed.sequencer}`}
                      className="text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:underline truncate"
                    >
                      {formatAddress(slashed.sequencer)}
                    </Link>
                    <CopyButton textToCopy={slashed.sequencer} size="xs" />
                    {slashed.transactionHash && (
                      <a
                        href={getTxUrl(slashed.transactionHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                      >
                        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {/* Right: Amount, Round, Time */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {formatBalance(slashed.slashAmount, tokenDecimals, tokenSymbol)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">Round {slashed.round}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{slashed.timestamp}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              No recent slashing events
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
