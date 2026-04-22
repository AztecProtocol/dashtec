'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { formatAddress, formatTimestamp } from '@/utils/formatters';
import { getTxUrl, getAddressUrl, getAztecBlockUrl } from '@/utils/blockExplorer';
import { CopyButton } from '@/components/ui/CopyButton';
import { useSequencerSignals } from '@/hooks/queries/useSequencerSignals';
import { useEpochCalculations } from '@/hooks/useEpochCalculations';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';
import { useRollupFilter } from '@/hooks/useRollupFilter';

interface SequencerSignalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roundNumber: number;
  sequencerAddress: string;
  sequencerName?: string;
  payloadAddress?: string;
}

/**
 * Modal displaying signals from a sequencer using dedicated API endpoint
 */
export const SequencerSignalsModal: React.FC<SequencerSignalsModalProps> = ({
  isOpen,
  onClose,
  sequencerAddress,
  sequencerName,
  payloadAddress,
  roundNumber,
}) => {
  const [mounted, setMounted] = useState(false);
  const { rollupParam } = useRollupFilter();
  const { data, isLoading, error } = useSequencerSignals(
    isOpen ? sequencerAddress : null,
    roundNumber,
    payloadAddress,
    rollupParam
  );

  const configState = useNetworkConfig(rollupParam);
  const { getEpochFromSlot } = useEpochCalculations(configState);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal — full screen on mobile, centered on desktop */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-800 sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-700 h-full sm:h-auto sm:max-h-[80vh] overflow-hidden flex flex-col z-10">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-4 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Sequencer Signals
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {sequencerName || formatAddress(sequencerAddress)}
                </span>
                <CopyButton textToCopy={sequencerAddress} size="xs" />
                <a
                  href={getAddressUrl(sequencerAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-violet hover:text-brand-violet/80 transition-colors"
                >
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                </a>
              </div>
              {payloadAddress && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Payload: {formatAddress(payloadAddress)}
                  </span>
                  <CopyButton textToCopy={payloadAddress} size="xs" />
                </div>
              )}
              {data && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-brand-violet/10 dark:bg-accent-purple-light/10 text-brand-violet dark:text-accent-purple-light">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-violet dark:bg-accent-purple-light"></span>
                    {data.totalSignals} signal{data.totalSignals !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-violet"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500 dark:text-red-400">
              Failed to load signals. Please try again.
            </div>
          ) : !data || data.signals.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              No signals found
            </div>
          ) : (
            <div className="text-sm">
              {/* Table Header — hidden on mobile */}
              <div className={`hidden sm:grid ${payloadAddress ? 'grid-cols-10' : 'grid-cols-12'} gap-3 items-center px-6 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider`}>
                <div className="col-span-1">#</div>
                {!payloadAddress && <div className="col-span-2">Payload</div>}
                <div className="col-span-3">Transaction</div>
                <div className="col-span-2">Epoch / Slot</div>
                <div className="col-span-2">L2 Block</div>
                <div className="col-span-2 text-right">Time</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {data.signals.map((signal, idx) => (
                  <div key={`${signal.payloadAddress}-${signal.transactionHash}`}>
                    {/* Desktop row */}
                    <div className={`hidden sm:grid ${payloadAddress ? 'grid-cols-10' : 'grid-cols-12'} gap-3 items-center px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors`}>
                      <div className="col-span-1 text-xs text-slate-400 dark:text-slate-500 font-mono">
                        {idx + 1}
                      </div>
                      {!payloadAddress && (
                        <div className="col-span-2">
                          <div className="flex items-center gap-1.5">
                            <a href={getAddressUrl(signal.payloadAddress)} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-brand-violet hover:text-brand-violet/80 transition-colors hover:underline truncate">
                              {formatAddress(signal.payloadAddress)}
                            </a>
                            <CopyButton textToCopy={signal.payloadAddress} size="xs" />
                          </div>
                        </div>
                      )}
                      <div className="col-span-3">
                        <div className="flex items-center gap-1.5">
                          <a href={getTxUrl(signal.transactionHash)} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-brand-violet hover:text-brand-violet/80 transition-colors hover:underline truncate">
                            {formatAddress(signal.transactionHash)}
                          </a>
                          <CopyButton textToCopy={signal.transactionHash} size="xs" />
                        </div>
                      </div>
                      <div className="col-span-2">
                        {signal.slotNumber !== null ? (
                          <span className="font-mono text-sm">
                            <Link href={`/epochs/${getEpochFromSlot(signal.slotNumber)}`} className="text-brand-violet hover:text-brand-violet/80 transition-colors hover:underline">
                              {getEpochFromSlot(signal.slotNumber)}
                            </Link>
                            <span className="text-slate-400 dark:text-slate-500"> / </span>
                            <span className="text-slate-700 dark:text-slate-300">{signal.slotNumber}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </div>
                      <div className="col-span-2">
                        {signal.l2BlockNumber ? (
                          <a href={getAztecBlockUrl(signal.l2BlockNumber)} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-brand-violet hover:text-brand-violet/80 transition-colors hover:underline inline-flex items-center gap-1">
                            {signal.l2BlockNumber}
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatTimestamp(Number(signal.timestamp))}
                        </span>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="sm:hidden px-4 py-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-mono">#{idx + 1}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatTimestamp(Number(signal.timestamp))}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">TX:</span>
                        <a href={getTxUrl(signal.transactionHash)} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-brand-violet truncate">
                          {formatAddress(signal.transactionHash)}
                        </a>
                        <CopyButton textToCopy={signal.transactionHash} size="xs" />
                      </div>
                      {!payloadAddress && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Payload:</span>
                          <a href={getAddressUrl(signal.payloadAddress)} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-brand-violet truncate">
                            {formatAddress(signal.payloadAddress)}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs">
                        {signal.slotNumber !== null && (
                          <span className="font-mono">
                            Epoch <Link href={`/epochs/${getEpochFromSlot(signal.slotNumber)}`} className="text-brand-violet">{getEpochFromSlot(signal.slotNumber)}</Link>
                            <span className="text-slate-400"> / Slot </span>
                            <span className="text-slate-700 dark:text-slate-300">{signal.slotNumber}</span>
                          </span>
                        )}
                        {signal.l2BlockNumber && (
                          <a href={getAztecBlockUrl(signal.l2BlockNumber)} target="_blank" rel="noopener noreferrer" className="font-mono text-brand-violet inline-flex items-center gap-0.5">
                            L2 #{signal.l2BlockNumber}
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};