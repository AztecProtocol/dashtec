import React from 'react';
import { CHECKPOINT_PROPOSED, CHECKPOINT_MINED, CHECKPOINT_MISSED, BLOCKS_MISSED } from '@dashtec/shared-types';
import { Validator } from '@/types';
import Link from 'next/link';
import { useScrollFade } from '@/hooks/useScrollFade';
import { ClockIcon, DocumentTextIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useApp } from '@/context/AppContext';
import { Tooltip } from '@/components/ui/Tooltip';
import { getAztecBlockUrl, getTxUrl } from '@/utils/blockExplorer';

const HistoricalAttestationList: React.FC<{ attestations: Validator['recentAttestations'] }> = ({ attestations = [] }) => {
  const scrollRef = useScrollFade<HTMLDivElement>();
  if (attestations.length === 0) return (
    <div className="text-center py-6">
      <div className="flex flex-col items-center gap-3">
        <div className="p-3 bg-slate-100/50 dark:bg-slate-700/30 rounded-xl">
          <ClockIcon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">No recent attestation history available.</p>
      </div>
    </div>
  );

  const { getFormattedTimeForSlot } = useApp();
  return (
    <div ref={scrollRef} className="max-h-72 overflow-y-auto custom-scrollbar pr-2 scroll-fade">
      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
        {attestations.map((att, idx) => (
          <li key={idx} className="group py-3 pr-2 flex justify-between items-center hover:bg-white/50 dark:hover:bg-slate-700/30 rounded-lg px-3 -mx-3 transition-all duration-200">
            <div>
              <Link href={`/epochs/${att.epoch}`} className="text-brand-violet dark:text-accent-purple-light hover:underline group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                <span className="text-sm text-slate-600 dark:text-slate-200 font-medium">Epoch {att.epoch}, Slot {att.slot}</span>
              </Link>
              <div className="flex items-center gap-1 mt-1">
                <ClockIcon className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{getFormattedTimeForSlot(att.slot)}</p>
              </div>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shadow-sm ${att.status === 'Success' ? 'bg-green-500/20 text-green-700 dark:bg-green-500/30 dark:text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-300 border-red-500/30'} sm:px-3 sm:py-1`}>
              {att.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const HistoricalProposalList: React.FC<{ proposals: Validator['proposalHistory'] }> = ({ proposals = [] }) => {
  const scrollRef = useScrollFade<HTMLDivElement>();
  if (proposals.length === 0) return (
    <div className="text-center py-6">
      <div className="flex flex-col items-center gap-3">
        <div className="p-3 bg-slate-100/50 dark:bg-slate-700/30 rounded-xl">
          <DocumentTextIcon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">No recent proposal history available.</p>
      </div>
    </div>
  );

  const { getFormattedTimeForSlot } = useApp();
  return (
    <div ref={scrollRef} className="max-h-72 overflow-y-auto custom-scrollbar pr-2 scroll-fade">
      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
        {proposals.map((prop, idx) => (
          <li key={idx} className="group py-3 pr-2 flex justify-between items-center hover:bg-white/50 dark:hover:bg-slate-700/30 rounded-lg px-3 -mx-3 transition-all duration-200">
            <div>
              <Link href={`/epochs/${prop.epoch}`} className="text-brand-violet dark:text-accent-purple-light hover:underline group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                <span className="text-sm text-slate-600 dark:text-slate-200 font-medium">Epoch {prop.epoch ?? '?'}, Slot {prop.slot}</span>
              </Link>
              <div className="flex items-center gap-1 mt-1">
                <ClockIcon className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{getFormattedTimeForSlot(prop.slot)}</p>
              </div>
              {prop.l2BlockNumber && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <a
                    href={getAztecBlockUrl(prop.l2BlockNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-mono hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    L2 Block #{prop.l2BlockNumber}
                  </a>
                  {prop.l1TransactionHash ? (
                    <Tooltip content="This block has been published to L1.">
                      <a
                        href={getTxUrl(prop.l1TransactionHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 transition-colors"
                      >
                        Published to L1
                        <InformationCircleIcon className="h-3 w-3" />
                      </a>
                    </Tooltip>
                  ) : (
                    <Tooltip content="Mined, but not published to L1. This can happen if the publisher ran out of gas or encountered an error.">
                      <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-100/50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 cursor-help">
                        Not published to L1
                        <InformationCircleIcon className="h-3 w-3" />
                      </span>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shadow-sm ${[CHECKPOINT_PROPOSED, CHECKPOINT_MINED].includes(prop.status) ? 'bg-green-500/20 text-green-700 dark:bg-green-500/30 dark:text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-300 border-red-500/30'} sm:px-3 sm:py-1`}>
              {({ [CHECKPOINT_PROPOSED]: 'Proposed', [CHECKPOINT_MINED]: 'Mined', [CHECKPOINT_MISSED]: 'Checkpoint Missed', [BLOCKS_MISSED]: 'Block Missed' } as Record<string, string>)[prop.status] ?? prop.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

interface HistoryCardProps {
  validator: Validator;
}

export const HistoryCard: React.FC<HistoryCardProps> = ({ validator }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/50 shadow-2xl">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-brand-violet/10 dark:bg-brand-violet/20 rounded-lg">
            <DocumentTextIcon className="h-5 w-5 text-brand-violet dark:text-accent-purple-light" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-brand-violet to-amber-600 dark:from-slate-100 dark:via-accent-purple-light dark:to-amber-400 bg-clip-text text-transparent">
            Sequencer History
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="rounded-xl bg-white/60 dark:bg-slate-700/40 border border-white/30 dark:border-slate-600/30 p-4">
            <h4 className="text-md font-bold text-slate-600 dark:text-slate-300 mb-3 uppercase tracking-wider">Attestations (Last 10)</h4>
            <HistoricalAttestationList attestations={validator.recentAttestations} />
          </div>

          <div className="rounded-xl bg-white/60 dark:bg-slate-700/40 border border-white/30 dark:border-slate-600/30 p-4">
            <h4 className="text-md font-bold text-slate-600 dark:text-slate-300 mb-3 uppercase tracking-wider">Checkpoints (Last 10)</h4>
            <HistoricalProposalList proposals={validator.proposalHistory} />
          </div>
        </div>
      </div>
    </div>
  );
};