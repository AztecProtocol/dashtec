import { GovernancePayloadInfo } from '@/db/queries/historical-governance';
import { GovernanceStatusBadge } from './GovernanceStatusBadge';
import { HistoricalSignalRow } from './HistoricalSignalRow';
import { usePayloadSignals } from '@/hooks/queries/usePayloadSignals';
import { SkeletonTableRow } from '@/components/ui/Skeleton';
import { CopyButton } from '@/components/ui/CopyButton';
import { formatAddress } from '@/utils/formatters';
import { getAddressUrl } from '@/utils/blockExplorer';
import {
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { useState } from 'react';
import { useRollupFilter } from '@/hooks/useRollupFilter';

interface HistoricalPayloadRowProps {
  payload: GovernancePayloadInfo;
  quorumSize: number;
}

export const HistoricalPayloadRow: React.FC<HistoricalPayloadRowProps> = ({ payload, quorumSize }) => {
  const { rollupParam } = useRollupFilter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [signalsPage, setSignalsPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const signalsLimit = 10;

  // Lazy-load signals only when expanded
  const { data: signalsData, isLoading: signalsLoading, isFetching: signalsFetching } = usePayloadSignals({
    payloadAddress: payload.payloadAddress,
    roundNumber: payload.roundNumber,
    page: signalsPage,
    limit: signalsLimit,
    enabled: isExpanded,
  }, rollupParam);

  const allSignals = signalsData?.data || [];
  const signalsMeta = signalsData?.meta;

  // Client-side filtering based on search query
  const signals = searchQuery
    ? allSignals.filter(signal => {
        const query = searchQuery.toLowerCase();
        return (
          signal.signalerAddress.toLowerCase().includes(query) ||
          signal.validatorName?.toLowerCase().includes(query) ||
          signal.providerName?.toLowerCase().includes(query) ||
          signal.xHandle?.toLowerCase().includes(query) ||
          signal.discordUsername?.toLowerCase().includes(query)
        );
      })
    : allSignals;

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
    // Reset pagination when toggling
    if (!isExpanded) {
      setSignalsPage(1);
    }
  };

  return (
    <>
      <tr
        className="hover:bg-slate-50 dark:hover:bg-slate-700/20 cursor-pointer"
        onClick={toggleExpanded}
      >
        <td className="px-4 py-3 text-center">
          {isExpanded ? (
            <ChevronDownIcon className="h-3 w-3 text-slate-400" />
          ) : (
            <ChevronRightIcon className="h-3 w-3 text-slate-400" />
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <a
              href={getAddressUrl(payload.payloadAddress)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-brand-violet dark:text-accent-purple-light hover:underline flex items-center gap-1"
            >
              {formatAddress(payload.payloadAddress)}
              <ArrowTopRightOnSquareIcon className="h-3 w-3 opacity-50" />
            </a>
            <CopyButton textToCopy={payload.payloadAddress} size="xs" />
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <GovernanceStatusBadge
            status={payload.status}
            submittedTx={payload.submittedTransactionHash}
            submittableTx={payload.submittableTransactionHash}
          />
        </td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center gap-1 font-mono">
            <span className="font-bold text-slate-900 dark:text-slate-100">{payload.signalCount}</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-400">{quorumSize}</span>
          </span>
        </td>
      </tr>

      {/* Expanded Signals Row (Level 3) */}
      {isExpanded && (
        <tr>
          <td colSpan={4} className="bg-slate-50/80 dark:bg-slate-800/80 p-0 border-t border-slate-100 dark:border-slate-700/50 shadow-inner">
            <div className="py-3 px-4 sm:px-12">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Signals ({signalsFetching ? '...' : signals.length})
                </p>
                <div className="relative w-full sm:w-auto">
                  <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by address, name, provider..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="pl-7 pr-7 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-violet/20 dark:focus:ring-accent-purple-light/20 w-full sm:w-64"
                  />
                  {searchQuery && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery('');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700/50 overflow-x-auto">
                {signalsLoading ? (
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-100 dark:border-slate-700/50">
                      <tr>
                        <th className="px-3 py-2 text-left">Signaler</th>
                        <th className="px-3 py-2 text-left">Provider</th>
                        <th className="px-3 py-2 text-right">Block</th>
                        <th className="px-3 py-2 text-right">Time</th>
                        <th className="px-3 py-2 text-right">TX</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-28"></div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-20"></div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16 ml-auto"></div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-14 ml-auto"></div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-12 ml-auto"></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : signals.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">No signals recorded</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-100 dark:border-slate-700/50">
                      <tr>
                        <th className="px-3 py-2 text-left">Signaler</th>
                        <th className="px-3 py-2 text-left">Provider</th>
                        <th className="px-3 py-2 text-right">Block</th>
                        <th className="px-3 py-2 text-right">Time</th>
                        <th className="px-3 py-2 text-right">TX</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {signals.map((signal, idx) => (
                        <HistoricalSignalRow key={idx} signal={signal} />
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination Controls */}
              {signalsMeta && (
                <div onClick={(e) => e.stopPropagation()}>
                  <PaginationControls
                    currentPage={signalsPage}
                    totalPages={signalsMeta.totalPages}
                    onPageChange={setSignalsPage}
                    showingText={`Page ${signalsPage} of ${signalsMeta.totalPages} (${signalsMeta.totalCount} total)`}
                  />
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
