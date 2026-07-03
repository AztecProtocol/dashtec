'use client';

/**
 * AttesterTableDense — denser alternative layout for the provider attester list.
 *
 * Key differences vs. AttesterTable:
 * - ~36px row height (vs. ~80px). 2x more rows visible per scroll.
 * - Single-line cells. Performance shown as `rate% · volume` with a thin 4px
 *   inline bar instead of stacked rate-above-bar.
 * - View toggle merged into the row's right-edge chevron; whole row is clickable
 *   to expand.
 * - Status chip downsized to a small dot + label.
 * - Avatar size sm. Address truncation 6/4 instead of 8/6.
 * - Mobile uses the same table, horizontally scrollable, instead of a separate
 *   card component (kills the desktop/mobile fork).
 *
 * To swap in:
 *   import { AttesterTableDense as AttesterTable } from './AttesterTableDense';
 */

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { ProviderAttester } from '@/types';
import { CopyButton } from '@/components/ui/CopyButton';
import { ValidatorAvatar } from '@/components/ui/ValidatorAvatar';
import {
  formatBalanceWithUsd,
  getPerformanceColor,
  getPerformanceColorWithBg,
} from '@/utils/formatters';
import { useStatusColors } from '@/hooks/useStatusColor';
import { AttesterDetail } from './AttesterDetail';
import { getValidatorLink } from '@/utils/validatorLinks';

type SortField = 'name' | 'status' | 'balance' | 'attestationRate' | 'blockSuccessRate';
type SortDirection = 'asc' | 'desc';

interface AttesterTableDenseProps {
  attesters: ProviderAttester[];
  expandedRow: string | null;
  onToggleRow: (address: string) => void;
  stakingTokenDecimals: number;
  stakingTokenSymbol: string;
  epochLimit: number;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
}

export const AttesterTableDense: React.FC<AttesterTableDenseProps> = ({
  attesters,
  expandedRow,
  onToggleRow,
  stakingTokenDecimals,
  stakingTokenSymbol,
  epochLimit,
  sortField,
  sortDirection,
  onSort,
}) => {
  return (
    <div className="overflow-x-auto custom-scrollbar -mx-1">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <SortableHeader field="name" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>
              Sequencer
            </SortableHeader>
            <SortableHeader field="status" sortField={sortField} sortDirection={sortDirection} onSort={onSort} className="w-28">
              Status
            </SortableHeader>
            <SortableHeader field="balance" sortField={sortField} sortDirection={sortDirection} onSort={onSort} align="right" className="w-36">
              Balance
            </SortableHeader>
            <SortableHeader field="attestationRate" sortField={sortField} sortDirection={sortDirection} onSort={onSort} align="right" className="w-44">
              Attestation
            </SortableHeader>
            <SortableHeader field="blockSuccessRate" sortField={sortField} sortDirection={sortDirection} onSort={onSort} align="right" className="w-44">
              Proposal
            </SortableHeader>
            <th className="w-8" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {attesters.map((attester) => (
            <AttesterRowDense
              key={attester.address}
              attester={attester}
              isExpanded={expandedRow === attester.address}
              onToggleRow={onToggleRow}
              stakingTokenDecimals={stakingTokenDecimals}
              stakingTokenSymbol={stakingTokenSymbol}
              epochLimit={epochLimit}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────────

interface SortableHeaderProps {
  field: SortField;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
  children: React.ReactNode;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  field,
  sortField,
  sortDirection,
  onSort,
  align = 'left',
  className = '',
  children,
}) => {
  const alignClass =
    align === 'right' ? 'text-right justify-end' :
    align === 'center' ? 'text-center justify-center' :
    'text-left justify-start';
  const isActive = onSort && sortField === field;

  const content = (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${alignClass}`}>
      {children}
      {isActive && (
        sortDirection === 'asc'
          ? <ChevronUpIcon className="h-3 w-3" />
          : <ChevronDownIcon className="h-3 w-3" />
      )}
    </span>
  );

  return (
    <th className={`px-3 py-2 ${className}`}>
      {onSort ? (
        <button
          onClick={() => onSort(field)}
          className={`w-full flex hover:text-slate-700 dark:hover:text-slate-200 transition-colors ${alignClass}`}
        >
          {content}
        </button>
      ) : content}
    </th>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Row
// ─────────────────────────────────────────────────────────────────────────────

interface AttesterRowDenseProps {
  attester: ProviderAttester;
  isExpanded: boolean;
  onToggleRow: (address: string) => void;
  stakingTokenDecimals: number;
  stakingTokenSymbol: string;
  epochLimit: number;
}

const AttesterRowDense: React.FC<AttesterRowDenseProps> = ({
  attester,
  isExpanded,
  onToggleRow,
  stakingTokenDecimals,
  stakingTokenSymbol,
  epochLimit,
}) => {
  const statusColors = useStatusColors([attester.status]);
  const statusClasses = statusColors.get(attester.status);

  const balance = attester.balance
    ? formatBalanceWithUsd(attester.balance, stakingTokenDecimals, stakingTokenSymbol, true)
    : null;

  const attestationVolume = `${attester.attestationsSuccessful}/${attester.attestationsSuccessful + attester.attestationsMissed}`;
  const proposalSucceeded = attester.checkpointsProposed + attester.checkpointsMined;
  const proposalTotal = proposalSucceeded + (attester.checkpointsMissed || 0) + attester.blocksMissed;
  const proposalVolume = `${proposalSucceeded}/${proposalTotal}`;

  const handleToggle = () => onToggleRow(attester.address);

  return (
    <>
      <tr
        onClick={handleToggle}
        className={`border-b border-slate-100 dark:border-slate-700/50 cursor-pointer transition-colors ${
          isExpanded
            ? 'bg-slate-50 dark:bg-slate-700/40'
            : 'hover:bg-slate-50/60 dark:hover:bg-slate-700/30'
        }`}
      >
        {/* Sequencer */}
        <td className="px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <ValidatorAvatar
              address={attester.address}
              xImageUrl={attester.xImageUrl}
              xHandle={attester.xHandle}
              discordAvatar={attester.discordAvatar}
              discordUsername={attester.discordUsername}
              name={attester.name}
              size="sm"
              variant="card"
              providerLogoUrl={undefined}
              providerName={undefined}
            />
            <div className="min-w-0 flex-1">
              <Link
                href={getValidatorLink(attester)}
                onClick={(e) => e.stopPropagation()}
                className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors"
              >
                {attester.name || `Sequencer ${attester.address.slice(0, 6)}`}
              </Link>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono leading-none">
                  {attester.address.slice(0, 6)}…{attester.address.slice(-4)}
                </span>
                <CopyButton textToCopy={attester.address} size="xs" />
              </div>
            </div>
          </div>
        </td>

        {/* Status */}
        <td className="px-3 py-2">
          {statusClasses && (
            <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 text-[11px] font-medium rounded ${statusClasses.bg} ${statusClasses.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusClasses.dot}`} />
              {attester.status || 'Unknown'}
            </span>
          )}
        </td>

        {/* Balance */}
        <td className="px-3 py-2 text-right tabular-nums">
          {balance ? (
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {balance.formatted}
              </div>
              {attester.isInQueue && (
                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                  pending
                </div>
              )}
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>

        {/* Attestation rate */}
        <td className="px-3 py-2">
          <InlineRateBar rate={attester.attestationRate} volume={attestationVolume} />
        </td>

        {/* Proposal rate */}
        <td className="px-3 py-2">
          <InlineRateBar rate={attester.blockSuccessRate} volume={proposalVolume} />
        </td>

        {/* Expand chevron */}
        <td className="pl-1 pr-2 py-2 text-slate-400">
          <ChevronRightIcon
            className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
          />
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
              <AttesterDetail
                attester={attester}
                stakingTokenDecimals={stakingTokenDecimals}
                stakingTokenSymbol={stakingTokenSymbol}
                epochLimit={epochLimit}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Inline rate bar — replaces the bigger PerformanceCell in the original.
// ─────────────────────────────────────────────────────────────────────────────

const InlineRateBar: React.FC<{ rate: string; volume: string }> = ({ rate, volume }) => {
  const rateValue = Number.isFinite(parseFloat(rate)) ? parseFloat(rate) : 0;
  const textColor = getPerformanceColor(`${rate}%`);
  const { bgColor } = getPerformanceColorWithBg(`${rate}%`);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-baseline gap-1.5 leading-none tabular-nums">
        <span className={`text-sm font-semibold ${textColor}`}>{rate}%</span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{volume}</span>
      </div>
      <div className="w-24 bg-slate-200/70 dark:bg-slate-700/60 rounded-full h-1 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.min(100, Math.max(0, rateValue))}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${bgColor}`}
          style={{ opacity: 0.85 }}
        />
      </div>
    </div>
  );
};
