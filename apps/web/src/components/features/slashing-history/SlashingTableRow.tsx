'use client';

import React, { memo } from 'react';
import { ValidatorCell } from './ValidatorCell';
import { TransactionHashCell } from './TransactionHashCell';
import { DetailedView } from './DetailedView';
import { SlashFactoryPayload } from './types';
import { CopyButton } from '@/components/ui/CopyButton';
import { formatBalance, formatAddress, formatBalanceWithUsd } from '@/utils/formatters';
import { BalanceWithUsd } from '@/components/ui/BalanceWithUsd';
import { EyeIcon, EyeSlashIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useApp } from '@/context/AppContext';

interface SlashingTableRowProps {
  payload: SlashFactoryPayload;
  isExpanded: boolean;
  onToggleRow: (payloadId: string) => void;
}

const formatCreatedAt = (createdAt: string) => {
  try {
    const date = new Date(createdAt);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  } catch {
    return 'Invalid Date';
  }
};

// Calculate total slash amount for a payload
const calculateTotalSlashAmount = (payload: SlashFactoryPayload): string => {
  const total = payload.slashPayloadData.reduce((sum, data) => {
    return sum + Number(data.amount || '0');
  }, 0);
  return total.toString();
};

// Get total votes/signals count
const getTotalVotesCount = (payload: SlashFactoryPayload): number => {
  return payload.proposerVotes.length;
};

// Get first vote date
const getFirstVoteDate = (payload: SlashFactoryPayload): { date: Date | null; hasVote: boolean } => {
  if (payload.proposerVotes.length === 0) return { date: null, hasVote: false };
  
  const sortedVotes = [...payload.proposerVotes].sort((a, b) => {
    const timestampA = a.timestamp ? parseInt(a.timestamp) : 0;
    const timestampB = b.timestamp ? parseInt(b.timestamp) : 0;
    return timestampA - timestampB;
  });
  
  const firstVote = sortedVotes[0];
  return {
    date: firstVote.timestamp ? new Date(parseInt(firstVote.timestamp) * 1000) : null,
    hasVote: true
  };
};

// Get last vote date
const getLastVoteDate = (payload: SlashFactoryPayload): { date: Date | null; hasVote: boolean } => {
  if (payload.proposerVotes.length === 0) return { date: null, hasVote: false };
  
  const sortedVotes = [...payload.proposerVotes].sort((a, b) => {
    const timestampA = a.timestamp ? parseInt(a.timestamp) : 0;
    const timestampB = b.timestamp ? parseInt(b.timestamp) : 0;
    return timestampB - timestampA;
  });
  
  const lastVote = sortedVotes[0];
  return {
    date: lastVote.timestamp ? new Date(parseInt(lastVote.timestamp) * 1000) : null,
    hasVote: true
  };
};

export const SlashingTableRow: React.FC<SlashingTableRowProps> = memo(({ 
  payload, 
  isExpanded, 
  onToggleRow 
}) => {
  const { networkConfig: config } = useApp();

  const slashAmount = calculateTotalSlashAmount(payload);
  const { formatted: slashFormatted } = formatBalanceWithUsd(
    slashAmount,
    config?.stakingTokenDecimals || 18,
    config?.stakingTokenSymbol || 'STK',
    true
  );

  return (
    <React.Fragment>
      <tr 
        className={`hover:bg-white/60 dark:hover:bg-slate-700/40 transition-colors ${
          isExpanded ? 'bg-white/40 dark:bg-slate-700/20' : ''
        }`}
      >
        {/* Toggle Detail Button */}
        <td className="px-4 py-4 text-center">
          <button
            onClick={() => onToggleRow(payload.id)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-600/60 transition-colors"
            title={isExpanded ? 'Hide details' : 'Show details'}
          >
            {isExpanded ? (
              <EyeSlashIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            ) : (
              <EyeIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            )}
          </button>
        </td>

        {/* Payload Address */}
        <td className="px-4 py-4">
          <div className="flex items-center gap-1">
            <p className="text-sm font-mono text-slate-700 dark:text-slate-300">
              {formatAddress(payload.payload_address)}
            </p>
            <CopyButton textToCopy={payload.payload_address} size="xs" />
          </div>
        </td>
        
        {/* Creator */}
        <td className="px-4 py-4">
          <ValidatorCell 
            address={payload.creator_address}
            validator={payload.creatorValidator}
            showLink={true}
          />
        </td>
        
        
        {/* Slash Amount */}
        <td className="px-4 py-4">
          <div className="flex flex-col">
            <BalanceWithUsd
              formatted={slashFormatted}
              className="text-sm font-semibold text-red-600 dark:text-red-400"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {payload.slashPayloadData.length} violation{payload.slashPayloadData.length !== 1 ? 's' : ''}
            </span>
          </div>
        </td>
        
        {/* Total Votes */}
        <td className="px-4 py-4">
          <div className="flex items-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              {getTotalVotesCount(payload)}
            </span>
          </div>
        </td>
        
        {/* First Vote Date */}
        <td className="px-6 py-4 whitespace-nowrap">
          {(() => {
            const firstVote = getFirstVoteDate(payload);
            if (!firstVote.hasVote || !firstVote.date) {
              return <span className="text-sm text-slate-500 dark:text-slate-400">N/A</span>;
            }
            return (
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <div className="flex flex-col">
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {firstVote.date.toLocaleDateString()}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {firstVote.date.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            );
          })()}
        </td>
        
        {/* Last Vote Date */}
        <td className="px-6 py-4 whitespace-nowrap">
          {(() => {
            const lastVote = getLastVoteDate(payload);
            if (!lastVote.hasVote || !lastVote.date) {
              return <span className="text-sm text-slate-500 dark:text-slate-400">N/A</span>;
            }
            return (
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <div className="flex flex-col">
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {lastVote.date.toLocaleDateString()}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {lastVote.date.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            );
          })()}
        </td>
        
        {/* Transaction Hash */}
        <td className="px-4 py-4">
          <TransactionHashCell hash={payload.transaction_hash} />
        </td>
        
        {/* Payload Created */}
        <td className="px-6 py-4 whitespace-nowrap">
          {payload.timestamp ? (
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <div className="flex flex-col">
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {new Date(parseInt(payload.timestamp) * 1000).toLocaleDateString()}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {new Date(parseInt(payload.timestamp) * 1000).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-sm text-slate-500 dark:text-slate-400">N/A</span>
          )}
        </td>
      </tr>
      
      {/* Expanded Details Row */}
      {isExpanded && (
        <tr>
          <td colSpan={10} className="p-0">
            <DetailedView payload={payload} />
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});

SlashingTableRow.displayName = 'SlashingTableRow';