'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ScaleIcon, CheckCircleIcon, XCircleIcon, ClockIcon, ChevronDownIcon, ArrowTopRightOnSquareIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { GovernanceVotecast, GovernancePayload, RoundData } from '@/types/api/voting-overview';
import { getTxUrl, getAddressUrl } from '@/utils/blockExplorer';
import { CopyButton } from '@/components/ui/CopyButton';
import { formatAddress } from '@/utils/formatters';

interface GovernanceVotingProps {
  latestRound: number;
  roundData?: RoundData;
  recentVotecasts: GovernanceVotecast[];
  recentPayloads: GovernancePayload[];
}

/**
 * VotecastItem component - expandable vote item with details
 */
const VotecastItem: React.FC<{ vote: GovernanceVotecast }> = ({ vote }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/40 hover:border-brand-violet/30 dark:hover:border-accent-purple-light/20 transition-colors duration-200">
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
            {formatAddress(vote.signalerAddress)}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-bold text-brand-violet dark:text-accent-purple-light">Round {vote.round}</span>
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
              className="font-mono text-brand-violet dark:text-accent-purple-light hover:underline flex items-center gap-1 truncate"
            >
              {vote.transactionHash.substring(0, 10)}...{vote.transactionHash.substring(vote.transactionHash.length - 8)}
              <ArrowTopRightOnSquareIcon className="h-3 w-3 flex-shrink-0" />
            </a>
            <CopyButton textToCopy={vote.transactionHash} size="xs" />
          </div>

          {/* Signaler */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium min-w-[60px]">Signaler:</span>
            <Link
              href={`/validators/${vote.signalerAddress}`}
              className="font-mono text-slate-700 dark:text-slate-300 hover:text-brand-violet dark:hover:text-accent-purple-light hover:underline truncate"
            >
              {formatAddress(vote.signalerAddress)}
            </Link>
            <CopyButton textToCopy={vote.signalerAddress} size="xs" />
          </div>

          {/* Proposal */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium min-w-[60px]">Proposal:</span>
            <a
              href={getAddressUrl(vote.payloadAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-slate-700 dark:text-slate-300 hover:text-brand-violet dark:hover:text-accent-purple-light hover:underline flex items-center gap-1 truncate"
            >
              {vote.payloadAddress.substring(0, 6)}...{vote.payloadAddress.substring(vote.payloadAddress.length - 4)}
              <ArrowTopRightOnSquareIcon className="h-3 w-3 flex-shrink-0" />
            </a>
            <CopyButton textToCopy={vote.payloadAddress} size="xs" />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * GovernanceVoting component displays governance proposer voting information
 */
export const GovernanceVoting: React.FC<GovernanceVotingProps> = ({
  latestRound,
  roundData,
  recentVotecasts,
  recentPayloads
}) => {
  return (
    <div className="flex flex-col space-y-4 sm:space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="p-1.5 sm:p-2 bg-brand-violet/5 dark:bg-brand-violet/10 rounded-lg border border-brand-violet/20 dark:border-accent-purple-light/20">
          <ScaleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-violet dark:text-accent-purple-light" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
            Governance Signal
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            Latest round #{latestRound}
          </p>
        </div>
      </div>

      {/* Round Data */}
      {roundData && (
        <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-white/70 via-white/60 to-white/50 dark:from-slate-700/50 dark:via-slate-700/40 dark:to-slate-800/40 backdrop-blur-md border border-white/40 dark:border-slate-600/40 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <InformationCircleIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light flex-shrink-0" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Round #{latestRound} Details</h4>
          </div>
          <div className="space-y-3 text-xs">
            {/* Last Signal Slot */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Last Signal Slot:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{roundData.lastSignalSlot}</span>
            </div>

            {/* Payload with Most Signals */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Payload with Most Signals:</span>
              <div className="flex items-center gap-2">
                <a
                  href={getAddressUrl(roundData.payloadWithMostSignals)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-brand-violet dark:text-accent-purple-light hover:underline flex items-center gap-1 text-xs truncate"
                >
                  {formatAddress(roundData.payloadWithMostSignals)}
                  <ArrowTopRightOnSquareIcon className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
            </div>

            {/* Payload URI */}
            {roundData.payloadURI && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium min-w-[80px] flex-shrink-0">Payload URI:</span>
                <a
                  href={roundData.payloadURI}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-violet dark:text-accent-purple-light hover:underline flex items-center gap-1 text-xs break-all"
                >
                  {roundData.payloadURI}
                  <ArrowTopRightOnSquareIcon className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
            )}

            {/* Executed Status */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Round Executed:</span>
              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${roundData.executed ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'}`}>
                {roundData.executed ? 'True' : 'False'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Votecasts */}
      <div>
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 sm:mb-4">
          Recent Signal Casted <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">(Last 5)</span>
        </h4>
        <div className="space-y-3 sm:space-y-4">
          {recentVotecasts.length > 0 ? (
            recentVotecasts.map((vote, idx) => (
              <VotecastItem key={idx} vote={vote} />
            ))
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              No recent signal casted
            </div>
          )}
        </div>
      </div>

      {/* Recent Payloads */}
      <div>
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 sm:mb-4">
          Submittable Proposals <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">(Last 3)</span>
        </h4>
        <div className="space-y-3 sm:space-y-4">
          {recentPayloads.length > 0 ? (
            recentPayloads.map((payload, idx) => (
              <div key={idx} className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/40 hover:border-brand-violet/30 dark:hover:border-accent-purple-light/20 transition-colors duration-200">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ClockIcon className={`w-4 h-4 flex-shrink-0 ${payload.status === 'Submittable' ? 'text-blue-500' : 'text-green-500'}`} />
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">{payload.proposer}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${payload.status === 'Submittable' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-green-500/20 text-green-600 dark:text-green-400'}`}>
                        {payload.status}
                      </span>
                      <span className="text-[10px] font-bold text-brand-violet dark:text-accent-purple-light">Round {payload.round}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Proposal:</span>
                    <a
                      href={getAddressUrl(payload.payloadAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-brand-violet dark:text-accent-purple-light hover:underline flex items-center gap-1"
                    >
                      {formatAddress(payload.payloadAddress)}
                      <ArrowTopRightOnSquareIcon className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              No recent proposals
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
