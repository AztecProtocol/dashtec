'use client';

import React from 'react';
import { CopyButton } from '@/components/ui/CopyButton';
import { LinkIcon } from '@heroicons/react/24/outline';
import { getTxUrl, getExplorerName } from '@/utils/blockExplorer';
import { formatAddress } from '@/utils/formatters';

interface TransactionHashCellProps {
  hash: string;
  compact?: boolean;
}

export const TransactionHashCell: React.FC<TransactionHashCellProps> = ({ hash, compact = false }) => (
  <div className="flex items-center gap-1 flex-wrap">
    <p className={`${compact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'} font-mono text-slate-700 dark:text-slate-300`}>
      {formatAddress(hash)}
    </p>
    <CopyButton textToCopy={hash} size="xs" />
    <a
      href={getTxUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="p-0.5 sm:p-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-600/50 transition-colors"
      title={`View on ${getExplorerName()}`}
    >
      <LinkIcon className="h-3 w-3 text-slate-600 dark:text-slate-400" />
    </a>
  </div>
);