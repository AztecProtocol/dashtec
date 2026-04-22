import { GovernanceRoundSummary } from '@/db/queries/historical-governance';
import { HistoricalPayloadRow } from './HistoricalPayloadRow';
import { useRoundPayloads } from '@/hooks/queries/useRoundPayloads';
import { SkeletonTableRow } from '@/components/ui/Skeleton';
import {
  CheckCircleIcon,
  ClockIcon,
  SignalIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import Link from 'next/link';
import { useRollupFilter } from '@/hooks/useRollupFilter';

interface HistoricalRoundRowProps {
  round: GovernanceRoundSummary;
  quorumSize: number;
}

export const HistoricalRoundRow: React.FC<HistoricalRoundRowProps> = ({ round, quorumSize }) => {
  const { rollupParam } = useRollupFilter();
  const [isExpanded, setIsExpanded] = useState(false);

  // Lazy-load payloads only when expanded
  const { data: payloadsData, isLoading: payloadsLoading } = useRoundPayloads({
    roundNumber: round.roundNumber,
    enabled: isExpanded,
  }, rollupParam);

  const payloads = payloadsData?.data || [];

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Desktop row */}
      <tr
        className={`hidden sm:table-row group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50 dark:bg-slate-700/30' : ''}`}
        onClick={toggleExpanded}
      >
        <td className="px-6 py-4 text-center w-10">
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
          )}
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              #{round.roundNumber}
            </span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center flex-wrap gap-2 text-xs">
            {round.statusCounts.submitted > 0 && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-900/20">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                {round.statusCounts.submitted} Submitted
              </span>
            )}
            {round.statusCounts.submittable > 0 && (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/20">
                <ClockIcon className="h-3.5 w-3.5" />
                {round.statusCounts.submittable} Submittable
              </span>
            )}
            {round.statusCounts.active > 0 && (
              <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10 px-2 py-0.5 rounded-full border border-yellow-100 dark:border-yellow-900/20">
                <SignalIcon className="h-3.5 w-3.5" />
                {round.statusCounts.active} Active
              </span>
            )}
            {round.statusCounts.expired > 0 && (
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                <ExclamationCircleIcon className="h-3.5 w-3.5" />
                {round.statusCounts.expired} Expired
              </span>
            )}
          </div>
        </td>
        <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-400">
          {round.payloadCount}
        </td>
        <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-400">
          {round.totalSignals}
        </td>
        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/governance?round=${round.roundNumber}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-violet/10 dark:bg-accent-purple-light/10 text-brand-violet dark:text-accent-purple-light hover:bg-brand-violet/20 dark:hover:bg-accent-purple-light/20 transition-colors text-xs font-medium"
          >
            <TableCellsIcon className="h-3.5 w-3.5" />
            View Matrix
          </Link>
        </td>
      </tr>

      {/* Mobile card */}
      <tr
        className={`sm:hidden cursor-pointer ${isExpanded ? 'bg-slate-50 dark:bg-slate-700/30' : ''}`}
        onClick={toggleExpanded}
      >
        <td colSpan={6} className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-slate-400" />
              )}
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Round #{round.roundNumber}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-slate-400">
              <span>{round.payloadCount} payloads</span>
              <span>{round.totalSignals} signals</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2 text-xs">
            {round.statusCounts.submitted > 0 && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-900/20">
                <CheckCircleIcon className="h-3 w-3" />
                {round.statusCounts.submitted} Submitted
              </span>
            )}
            {round.statusCounts.submittable > 0 && (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/20">
                <ClockIcon className="h-3 w-3" />
                {round.statusCounts.submittable} Submittable
              </span>
            )}
            {round.statusCounts.active > 0 && (
              <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10 px-2 py-0.5 rounded-full border border-yellow-100 dark:border-yellow-900/20">
                <SignalIcon className="h-3 w-3" />
                {round.statusCounts.active} Active
              </span>
            )}
            {round.statusCounts.expired > 0 && (
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                <ExclamationCircleIcon className="h-3 w-3" />
                {round.statusCounts.expired} Expired
              </span>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Link
              href={`/governance?round=${round.roundNumber}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-violet/10 dark:bg-accent-purple-light/10 text-brand-violet dark:text-accent-purple-light hover:bg-brand-violet/20 dark:hover:bg-accent-purple-light/20 transition-colors text-xs font-medium"
            >
              <TableCellsIcon className="h-3.5 w-3.5" />
              View Matrix
            </Link>
          </div>
        </td>
      </tr>

      {/* Expanded Payloads Row */}
      {isExpanded && (
        <tr>
          <td colSpan={6} className="p-0 bg-slate-50/50 dark:bg-slate-800/20 shadow-inner">
            <div className="py-2 px-4 sm:px-12">
              <table className="w-full text-sm my-2 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-2 w-8"></th>
                    <th className="px-4 py-2 text-left">Payload Address</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-center">Signals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {payloadsLoading ? (
                    <>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-4 py-3">
                            <div className="h-3 w-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-20 mx-auto"></div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12 mx-auto"></div>
                          </td>
                        </tr>
                      ))}
                    </>
                  ) : payloads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-slate-400 italic">
                        No payloads in this round
                      </td>
                    </tr>
                  ) : (
                    payloads.map(payload => {
                      const payloadKey = `${payload.payloadAddress}-${payload.roundNumber}`;
                      return (
                        <HistoricalPayloadRow
                          key={payloadKey}
                          payload={payload}
                          quorumSize={quorumSize}
                        />
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
