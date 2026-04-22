'use client';

import React from 'react';
import { ProviderAttester } from '@/types';
import { AttesterTableRow } from './AttesterTableRow';
import { AttesterMobileCard } from './AttesterMobileCard';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

type SortField = 'name' | 'status' | 'balance' | 'attestationRate' | 'blockSuccessRate';
type SortDirection = 'asc' | 'desc';

interface AttesterTableProps {
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

/**
 * Table component for displaying provider attesters with expandable details
 */
export const AttesterTable: React.FC<AttesterTableProps> = ({
  attesters,
  expandedRow,
  onToggleRow,
  stakingTokenDecimals,
  stakingTokenSymbol,
  epochLimit,
  sortField,
  sortDirection,
  onSort
}) => {
  const renderSortIcon = (field: SortField) => {
    if (!onSort || sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4" />
    ) : (
      <ChevronDownIcon className="h-4 w-4" />
    );
  };

  const SortableHeader: React.FC<{ field: SortField; children: React.ReactNode; className?: string }> = ({
    field,
    children,
    className = ''
  }) => {
    const isCenter = className.includes('text-center');

    if (!onSort) {
      return (
        <th className={`px-4 py-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider ${className}`}>
          {children}
        </th>
      );
    }

    return (
      <th className={`px-4 py-4 text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wider ${className}`}>
        <button
          onClick={() => onSort(field)}
          className={`flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors uppercase ${isCenter ? 'justify-center w-full' : ''}`}
        >
          {children}
          {renderSortIcon(field)}
        </button>
      </th>
    );
  };
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto custom-scrollbar">
        <table className="min-w-full">
          <thead className="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
            <tr>
              <th className="px-4 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16">
                View
              </th>
              <SortableHeader field="name" className="text-left">
                Sequencer
              </SortableHeader>
              <SortableHeader field="status" className="text-left">
                Status
              </SortableHeader>
              <SortableHeader field="balance" className="text-left">
                Balance
              </SortableHeader>
              <SortableHeader field="attestationRate" className="text-center">
                Attestation Rate
              </SortableHeader>
              <SortableHeader field="blockSuccessRate" className="text-center">
                Proposal Rate
              </SortableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
            {attesters.map((attester) => (
              <AttesterTableRow
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

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {attesters.map((attester) => (
          <AttesterMobileCard
            key={attester.address}
            attester={attester}
            isExpanded={expandedRow === attester.address}
            onToggleRow={onToggleRow}
            stakingTokenDecimals={stakingTokenDecimals}
            stakingTokenSymbol={stakingTokenSymbol}
            epochLimit={epochLimit}
          />
        ))}
      </div>
    </>
  );
};
