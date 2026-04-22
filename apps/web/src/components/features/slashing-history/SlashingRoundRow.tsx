'use client';

import React from 'react';
import { SlashingRound } from './types';
import { TransactionHashCell } from './TransactionHashCell';
import { SlashingRoundDetail } from './SlashingRoundDetail';
import { CopyButton } from '@/components/ui/CopyButton';
import { EyeIcon, EyeSlashIcon, LinkIcon } from '@heroicons/react/24/outline';
import { getAddressUrl } from '@/utils/blockExplorer';
import Link from 'next/link';

interface SlashingRoundRowProps {
  round: SlashingRound;
  isExpanded: boolean;
  onToggleRow: (roundId: string) => void;
}

/**
 * Desktop table row component for slashing rounds
 */
export const SlashingRoundRow: React.FC<SlashingRoundRowProps> = ({
  round,
  isExpanded,
  onToggleRow
}) => {
  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
        {/* View Toggle */}
        <td className="px-4 py-4">
          <button
            onClick={() => onToggleRow(round.id)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            title={isExpanded ? 'Hide details' : 'Show details'}
          >
            {isExpanded ? (
              <EyeSlashIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            ) : (
              <EyeIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            )}
          </button>
        </td>

        {/* Round Number */}
        <td className="px-4 py-4">
          <Link
            href={`/slashing-history/${round.round_number}`}
            className="text-lg font-bold text-brand-violet hover:text-brand-violet-dark transition-colors"
          >
            #{round.round_number}
          </Link>
        </td>

        {/* Payload Address */}
        <td className="px-4 py-4">
          {round.payload_address ? (
            <div className="flex items-center gap-1">
              <span className="text-sm font-mono text-slate-700 dark:text-slate-300">
                {round.payload_address.slice(0, 6)}...{round.payload_address.slice(-4)}
              </span>
              <CopyButton textToCopy={round.payload_address} size="xs" />
              <a
                href={getAddressUrl(round.payload_address)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-600/50 transition-colors"
                title="View on explorer"
              >
                <LinkIcon className="h-3 w-3 text-slate-600 dark:text-slate-400" />
              </a>
            </div>
          ) : (
            <span className="text-sm text-slate-500 dark:text-slate-400">N/A</span>
          )}
        </td>

        {/* Slashes Executed */}
        <td className="px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-red-600 dark:text-red-400">
              {round.slash_count}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              slash{round.slash_count !== 1 ? 'es' : ''}
            </span>
          </div>
        </td>

        {/* Executed Date */}
        <td className="px-4 py-4">
          {round.executed_date ? (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {new Date(round.executed_date).toLocaleDateString()}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(round.executed_date).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          ) : (
            <span className="text-sm text-slate-500 dark:text-slate-400">N/A</span>
          )}
        </td>

        {/* Transaction Hash */}
        <td className="px-4 py-4">
          <TransactionHashCell hash={round.deployment_tx_hash} />
        </td>
      </tr>

      {/* Expanded Details */}
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-0 py-0">
            <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-600">
              <SlashingRoundDetail roundNumber={round.round_number} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};