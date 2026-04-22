'use client';

import { useState, useMemo } from 'react';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  FunnelIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Tooltip } from '@/components/ui/Tooltip';

interface ProofHistoryEntry {
  epoch: number;
  gap: number;
  score: number;
  txHash?: string;
  scoreBefore: number;
  scoreAfter: number;
  shares?: number;
  accumulatedProvingEpochs?: number;
  accumulatedMissedEpochs?: number;
}

interface ProofHistoryTableProps {
  history: ProofHistoryEntry[];
  currentEpoch?: number;
}

type SortField = 'epoch' | 'gap' | 'score' | 'shares' | 'accumulatedProving' | 'accumulatedMissed';
type SortDirection = 'asc' | 'desc';

/**
 * Proof History Table - Sortable and filterable table of proof submissions
 */
export const ProofHistoryTable: React.FC<ProofHistoryTableProps> = ({ history, currentEpoch }) => {
  const [sortField, setSortField] = useState<SortField>('epoch');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterGaps, setFilterGaps] = useState(false);
  const [minGap, setMinGap] = useState(5);
  const [isExpanded, setIsExpanded] = useState(false);

  // Use data directly from API (already has scores and shares calculated)
  const enrichedHistory = useMemo(() => {
    return history.map((entry) => ({
      ...entry,
      shares: entry.shares ?? 0,
      accumulatedProvingEpochs: entry.accumulatedProvingEpochs ?? 0,
      accumulatedMissedEpochs: entry.accumulatedMissedEpochs ?? 0,
    }));
  }, [history]);

  // Apply filters and sorting
  const processedData = useMemo(() => {
    let filtered = [...enrichedHistory];

    // Apply gap filter
    if (filterGaps) {
      filtered = filtered.filter(entry => entry.gap >= minGap);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: number, bVal: number;

      switch (sortField) {
        case 'epoch':
          aVal = a.epoch;
          bVal = b.epoch;
          break;
        case 'gap':
          aVal = a.gap;
          bVal = b.gap;
          break;
        case 'score':
          aVal = a.scoreAfter;
          bVal = b.scoreAfter;
          break;
        case 'shares':
          aVal = a.shares;
          bVal = b.shares;
          break;
        case 'accumulatedProving':
          aVal = a.accumulatedProvingEpochs;
          bVal = b.accumulatedProvingEpochs;
          break;
        case 'accumulatedMissed':
          aVal = a.accumulatedMissedEpochs;
          bVal = b.accumulatedMissedEpochs;
          break;
        default:
          return 0;
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [enrichedHistory, sortField, sortDirection, filterGaps, minGap]);

  // Pagination
  const itemsPerPage = isExpanded ? processedData.length : 10;
  const displayedData = processedData.slice(0, itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ArrowUpIcon className="h-3 w-3" />
    ) : (
      <ArrowDownIcon className="h-3 w-3" />
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-6">
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Proof History
            </h2>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {processedData.length} {filterGaps ? 'filtered' : 'total'} entries
              </p>
              {currentEpoch !== undefined && (
                <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                  Current Epoch: <span className="text-brand-violet dark:text-accent-purple-light">{currentEpoch}</span>
                </p>
              )}
            </div>
          </div>
          <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50">
            <DocumentDuplicateIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-slate-400" />
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={filterGaps}
                onChange={(e) => setFilterGaps(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600"
              />
              Show only gaps ≥
            </label>
            <input
              type="number"
              value={minGap}
              onChange={(e) => setMinGap(Number(e.target.value))}
              min="1"
              disabled={!filterGaps}
              className="w-16 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-2">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th
                  onClick={() => handleSort('epoch')}
                  className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Epoch
                    <SortIcon field="epoch" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('gap')}
                  className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Gap
                    <Tooltip content="Number of epochs between this proof and the previous one. Larger gaps result in more score decay">
                      <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                    </Tooltip>
                    <SortIcon field="gap" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('accumulatedProving')}
                  className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Acc. Proofs
                    <Tooltip content="Cumulative total of proofs submitted up to this epoch">
                      <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                    </Tooltip>
                    <SortIcon field="accumulatedProving" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('accumulatedMissed')}
                  className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Acc. Missed
                    <Tooltip content="Cumulative total of epochs missed (without proof) up to this epoch">
                      <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                    </Tooltip>
                    <SortIcon field="accumulatedMissed" />
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    Score Before
                    <Tooltip content="Activity score before this proof was applied, after decay from any gap">
                      <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                    </Tooltip>
                  </div>
                </th>
                <th
                  onClick={() => handleSort('score')}
                  className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Score After
                    <Tooltip content="Activity score after this proof's increment (+125,000) was applied">
                      <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                    </Tooltip>
                    <SortIcon field="score" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('shares')}
                  className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Shares
                    <Tooltip content="Reward shares calculated from the score using a quadratic formula. Minimum 100,000, maximum 1,000,000">
                      <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                    </Tooltip>
                    <SortIcon field="shares" />
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  TX Hash
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {displayedData.map((entry, index) => (
                <tr
                  key={index}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                    entry.gap > 5 ? 'bg-slate-50 dark:bg-slate-700/30' : ''
                  }`}
                >
                  <td className="px-3 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {entry.epoch}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    {entry.gap > 0 ? (
                      <span className={`font-semibold ${
                        entry.gap > 5 ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {entry.gap}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {entry.accumulatedProvingEpochs}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {entry.accumulatedMissedEpochs}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {entry.scoreBefore.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {entry.scoreAfter.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {entry.shares.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    {entry.txHash ? (
                      <button
                        onClick={() => copyToClipboard(entry.txHash!)}
                        className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                        title="Click to copy"
                      >
                        <span className="font-mono text-xs">
                          {entry.txHash.slice(0, 6)}...{entry.txHash.slice(-4)}
                        </span>
                        <DocumentDuplicateIcon className="h-3 w-3" />
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Expand/Collapse */}
        {processedData.length > 10 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-4 py-2 text-sm text-brand-violet dark:text-accent-purple-light hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors font-medium"
            >
              {isExpanded ? 'Show Less' : `Show All ${processedData.length} Entries`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
