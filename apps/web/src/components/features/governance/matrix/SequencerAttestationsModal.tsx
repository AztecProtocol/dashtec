'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { formatAddress } from '@/utils/formatters';
import { CopyButton } from '@/components/ui/CopyButton';
import { useSequencerAttestations } from '@/hooks/queries/useSequencerAttestations';
import { useRollupFilter } from '@/hooks/useRollupFilter';
import { CHECKPOINT_MINED, CHECKPOINT_PROPOSED, CHECKPOINT_MISSED, BLOCKS_MISSED } from '@dashtec/shared-types';

interface SequencerAttestationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roundNumber: number;
  sequencerAddress: string;
  sequencerName?: string;
}

/**
 * Modal displaying block attestations (proposing opportunities) for a sequencer
 */
export const SequencerAttestationsModal: React.FC<SequencerAttestationsModalProps> = ({
  isOpen,
  onClose,
  sequencerAddress,
  sequencerName,
  roundNumber,
}) => {
  const [mounted, setMounted] = useState(false);
  const { rollupParam } = useRollupFilter();
  const { data, isLoading, error } = useSequencerAttestations(
    isOpen ? sequencerAddress : null,
    roundNumber,
    rollupParam
  );

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
                Proposing Opportunities
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {sequencerName || formatAddress(sequencerAddress)}
                </span>
                <CopyButton textToCopy={sequencerAddress} size="xs" />
                <Link
                  href={`/sequencers/${sequencerAddress}`}
                  className="text-brand-violet hover:text-brand-violet/80 transition-colors"
                >
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                </Link>
              </div>
              {data && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Mined {data.checkpointsMined}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Proposed {data.checkpointsProposed}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    Checkpoint Missed {data.checkpointsMissed}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    Blocks Missed {data.blocksMissed}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                    Total {data.totalAttestations}
                  </span>
                </div>
              )}
              <div className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <p><span className="font-medium text-emerald-600 dark:text-emerald-400">Mined</span> — Block was proposed, attested, and included on L1 via a checkpoint</p>
                <p><span className="font-medium text-amber-600 dark:text-amber-400">Proposed</span> — Block was proposed and attested by committee members, but not included on L1</p>
                <p><span className="font-medium text-red-600 dark:text-red-400">Missed</span> — No valid block was produced for the assigned slot, or the proposal received no attestations</p>
              </div>
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
              Failed to load attestations. Please try again.
            </div>
          ) : !data || data.attestations.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              No proposing opportunities in this round
            </div>
          ) : (
            <div className="text-sm">
              {/* Table Header — hidden on mobile */}
              <div className="hidden sm:grid grid-cols-12 gap-4 items-center px-6 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Epoch</div>
                <div className="col-span-4">Slot</div>
                <div className="col-span-4 text-right">Status</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {data.attestations.map((attestation, idx) => {
                  const isMined = attestation.status === CHECKPOINT_MINED;
                  const isProposed = attestation.status === CHECKPOINT_PROPOSED;
                  const isCheckpointMissed = attestation.status === CHECKPOINT_MISSED;
                  const isBlocksMissed = attestation.status === BLOCKS_MISSED;
                  const statusLabel = isMined ? 'Mined' : isProposed ? 'Proposed' : isCheckpointMissed ? 'Checkpoint Missed' : isBlocksMissed ? 'Blocks Missed' : attestation.status;
                  const statusClass = isMined
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : isProposed
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : isCheckpointMissed
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                        : isBlocksMissed
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';

                  return (
                    <div key={`${attestation.slotNumber}-${attestation.epochNumber}`}>
                      {/* Desktop row */}
                      <div className="hidden sm:grid grid-cols-12 gap-4 items-center px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="col-span-1 text-xs text-slate-400 dark:text-slate-500 font-mono">
                          {idx + 1}
                        </div>
                        <div className="col-span-3">
                          <Link href={`/epochs/${attestation.epochNumber}`} className="font-mono text-sm text-brand-violet hover:text-brand-violet/80 transition-colors hover:underline inline-flex items-center gap-1">
                            {attestation.epochNumber}
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                          </Link>
                        </div>
                        <div className="col-span-4">
                          <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                            {attestation.slotNumber}
                          </span>
                        </div>
                        <div className="col-span-4 flex justify-end">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>

                      {/* Mobile card */}
                      <div className="sm:hidden px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 font-mono w-6">#{idx + 1}</span>
                          <div className="text-xs font-mono">
                            <Link href={`/epochs/${attestation.epochNumber}`} className="text-brand-violet">
                              Epoch {attestation.epochNumber}
                            </Link>
                            <span className="text-slate-400"> / Slot </span>
                            <span className="text-slate-700 dark:text-slate-300">{attestation.slotNumber}</span>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
