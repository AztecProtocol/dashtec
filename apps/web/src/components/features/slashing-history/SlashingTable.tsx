'use client';

import React from 'react';
import Link from 'next/link';
import { SlashingRound } from './types';
import { TransactionHashCell } from './TransactionHashCell';
import { CopyButton } from '@/components/ui/CopyButton';
import { ChevronRightIcon, ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon, LinkIcon } from '@heroicons/react/24/outline';
import { getAddressUrl } from '@/utils/blockExplorer';
import { formatAddress } from '@/utils/formatters';

type SortField = 'round_number' | 'slash_count' | 'executed_date';
type SortOrder = 'asc' | 'desc';

interface SlashingTableProps {
  rounds: SlashingRound[];
  sortBy: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

/** Sortable column header */
const SortableHeader: React.FC<{
  label: string;
  field: SortField;
  currentSort: SortField;
  currentOrder: SortOrder;
  onSort: (field: SortField) => void;
}> = ({ label, field, currentSort, currentOrder, onSort }) => {
  const isActive = currentSort === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
    >
      {label}
      {isActive ? (
        currentOrder === 'asc' ? (
          <ChevronUpIcon className="h-3.5 w-3.5 text-brand-violet" />
        ) : (
          <ChevronDownIcon className="h-3.5 w-3.5 text-brand-violet" />
        )
      ) : (
        <ChevronUpDownIcon className="h-3.5 w-3.5 text-slate-400" />
      )}
    </button>
  );
};

/** Slashing rounds table with sortable columns — rows link to detail page */
export const SlashingTable: React.FC<SlashingTableProps> = ({
  rounds,
  sortBy,
  sortOrder,
  onSort,
}) => {
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50 dark:bg-slate-700/60">
            <tr>
              <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400">
                <SortableHeader label="Round" field="round_number" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
              </th>
              <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400">
                <SortableHeader label="Slashes Executed" field="slash_count" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Payload Address
              </th>
              <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400">
                <SortableHeader label="Date" field="executed_date" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Transaction Hash
              </th>
              <th className="px-6 py-4 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {rounds.map((round) => (
              <tr
                key={round.id}
                className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                {/* Round Number */}
                <td className="px-6 py-4">
                  <Link
                    href={`/slashing-history/${round.round_number}`}
                    className="text-lg font-bold text-brand-violet hover:underline"
                  >
                    #{round.round_number}
                  </Link>
                </td>

                {/* Slash count */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">
                      {round.slash_count}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      slash{round.slash_count !== 1 ? 'es' : ''}
                    </span>
                  </div>
                </td>

                {/* Payload Address */}
                <td className="px-6 py-4">
                  {round.payload_address ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-mono text-slate-700 dark:text-slate-300">
                        {formatAddress(round.payload_address)}
                      </span>
                      <CopyButton textToCopy={round.payload_address} size="xs" />
                      <a
                        href={getAddressUrl(round.payload_address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-600/50 transition-colors"
                        title="View on explorer"
                      >
                        <LinkIcon className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </td>

                {/* Date */}
                <td className="px-6 py-4">
                  {round.executed_date ? (
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {new Date(round.executed_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(round.executed_date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </td>

                {/* Transaction Hash */}
                <td className="px-6 py-4">
                  <TransactionHashCell hash={round.deployment_tx_hash} />
                </td>

                {/* Arrow */}
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/slashing-history/${round.round_number}`}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                  >
                    <ChevronRightIcon className="h-4 w-4 text-slate-400 group-hover:text-brand-violet transition-colors" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden divide-y divide-slate-200 dark:divide-slate-700">
        {rounds.map((round) => (
          <Link
            key={round.id}
            href={`/slashing-history/${round.round_number}`}
            className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-brand-violet">
                  #{round.round_number}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-full">
                  {round.slash_count} slash{round.slash_count !== 1 ? 'es' : ''}
                </span>
              </div>
              <ChevronRightIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
            </div>
            <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
              {round.executed_date && (
                <p>
                  {new Date(round.executed_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  {new Date(round.executed_date).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
              {round.payload_address && (
                <p className="font-mono">{formatAddress(round.payload_address)}</p>
              )}
              <p className="font-mono">{formatAddress(round.deployment_tx_hash)}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
};
