'use client';

import { TrophyIcon, CheckCircleIcon, MinusCircleIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { formatAddress } from '@/utils/formatters';
import { getAddressUrl } from '@/utils/blockExplorer';
import { CopyButton } from '@/components/ui/CopyButton';
import { Tooltip } from '@/components/ui/Tooltip';
import { CustomSelect } from '@/components/ui/CustomSelect';
import type { Payload, EpochInfo } from '@/types/signaling-matrix';
import type { SortBy, FilterStatus } from '@/types/signaling-matrix';

interface PayloadDetailsSectionProps {
  payloads: Payload[];
  quorumSize: number;
  allPayloads: Payload[];
  selectedPayloads: Set<string>;
  onTogglePayload: (payloadAddress: string) => void;
  sortBy: SortBy;
  filterStatus: FilterStatus;
  onSortChange: (sort: SortBy) => void;
  onFilterChange: (filter: FilterStatus) => void;
  epoch: EpochInfo;
}

/**
 * Displays detailed payload information cards for the current round
 * Cards are clickable to filter the matrix view
 */
export const PayloadDetailsSection: React.FC<PayloadDetailsSectionProps> = ({
  payloads,
  quorumSize,
  allPayloads,
  selectedPayloads,
  onTogglePayload,
  sortBy,
  filterStatus,
  onSortChange,
  onFilterChange,
  epoch,
}) => {
  if (allPayloads.length === 0) return null;

  return (
    <>
      {/* Payload Cards */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Active Payloads
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Click on a payload to filter the matrix view
          </p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {allPayloads.map((payload, idx) => {
              const isSelected = selectedPayloads.has(payload.address);
              const isActive = selectedPayloads.size === 0 || isSelected;

              return (
                <div
                  key={payload.address}
                  onClick={() => onTogglePayload(payload.address)}
                  className={`flex-shrink-0 bg-white dark:bg-slate-800 rounded-lg border p-4 min-w-[280px] transition-all cursor-pointer ${
                    isActive
                      ? 'border-brand-violet shadow-lg ring-2 ring-brand-violet/20'
                      : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                >
                {/* Payload Header with Status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Payload {idx + 1}
                    </span>
                    {payload.isLeading && (
                      <Tooltip content="Leading payload">
                        <TrophyIcon className="h-4 w-4 text-yellow-500" />
                      </Tooltip>
                    )}
                    {payload.hasQuorum && (
                      <Tooltip content="Has reached quorum">
                        <CheckCircleSolidIcon className="h-4 w-4 text-green-500" />
                      </Tooltip>
                    )}
                  </div>
                  {/* Status Badge */}
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      payload.status === 'Active'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                        : payload.status === 'Submittable'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                        : payload.status === 'Submitted'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400'
                    }`}
                  >
                    {payload.status}
                  </span>
                </div>

                {/* Payload Address */}
                <div className="mb-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Address:</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                      {formatAddress(payload.address)}
                    </span>
                    <span onClick={(e) => e.stopPropagation()}>
                      <CopyButton textToCopy={payload.address} size="xs" />
                    </span>
                    <a
                      href={getAddressUrl(payload.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-brand-violet hover:text-brand-violet/80 transition-colors"
                    >
                      <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                {/* Signal Progress */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 dark:text-slate-400">Signals</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {payload.signalCount}/{quorumSize}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        payload.hasQuorum ? 'bg-green-500' : 'bg-brand-violet'
                      }`}
                      style={{
                        width: `${Math.min((payload.signalCount / quorumSize) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>

      {/* Legend and Controls */}
      <div className="py-4 px-6 border-b border-slate-200 dark:border-slate-700">
        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs md:text-sm text-slate-600 dark:text-slate-400 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span>Signaled</span>
          </div>
          <div className="flex items-center gap-2">
            <MinusCircleIcon className="h-5 w-5 text-slate-300 dark:text-slate-600" />
            <span>No Signal</span>
          </div>
          <div className="flex items-center gap-2">
            <TrophyIcon className="h-4 w-4 text-yellow-500" />
            <span>Leading Payload</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircleSolidIcon className="h-4 w-4 text-green-500" />
            <span>Has Quorum</span>
          </div>
        </div>

        {/* Informational Message */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-lg">
          <svg className="h-5 w-5 text-blue-500 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <div className="text-xs text-slate-700 dark:text-slate-300">
            <span className="font-medium">Signaling Mechanics:</span> Only sequencers selected as proposers for a given slot can cast signals. Proposer selection is randomized, giving each sequencer varying opportunities to signal throughout the round (slots {epoch.startSlot}-{epoch.endSlot}).
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Sort */}
          <CustomSelect
            value={sortBy}
            onChange={(value) => onSortChange(value as SortBy)}
            options={[
              { value: 'support', label: 'Sort by Participation' },
              { value: 'opportunities', label: 'Sort by Opportunities' },
              { value: 'name', label: 'Sort by Name' },
            ]}
            size="sm"
            variant="compact"
          />

          {/* Filter */}
          <CustomSelect
            value={filterStatus}
            onChange={(value) => onFilterChange(value as FilterStatus)}
            options={[
              { value: 'all', label: 'All Providers' },
              { value: 'signaled', label: 'Active Only' },
              { value: 'no_signal', label: 'Inactive Only' },
            ]}
            size="sm"
            variant="compact"
          />
        </div>
      </div>
    </>
  );
};