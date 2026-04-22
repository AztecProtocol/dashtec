'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircleIcon, MinusCircleIcon } from '@heroicons/react/24/outline';
import { formatAddress } from '@/utils/formatters';
import { CopyButton } from '@/components/ui/CopyButton';
import { ValidatorAvatar } from '@/components/ui/ValidatorAvatar';
import { IdentityBadgeGroup } from '@/components/ui/IdentityBadgeGroup';
import { SequencerSignalsModal } from './SequencerSignalsModal';
import { SequencerAttestationsModal } from './SequencerAttestationsModal';
import type { Payload } from '@/types/signaling-matrix';
import type { SequencerInfo } from '@/app/api/governance/provider-sequencers/route';

interface SequencerTableRowProps {
  sequencer: SequencerInfo;
  payloads: Payload[];
  roundNumber: number
}

/**
 * Table row showing a sequencer with signal status per payload
 */
export const SequencerTableRow: React.FC<SequencerTableRowProps> = ({
  sequencer,
  payloads,
  roundNumber
}) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    payloadAddress?: string;
    showProposerStatus?: boolean;
  }>({
    isOpen: false,
  });

  const handleOpenModal = (payloadAddress?: string, showProposerStatus?: boolean) => {
    setModalState({
      isOpen: true,
      payloadAddress,
      showProposerStatus,
    });
  };

  return (
    <>
      {/* Desktop row */}
      <div className="hidden lg:grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
        {/* Sequencer Info */}
        <div className="col-span-3">
          <div className="flex items-center gap-2">
            <ValidatorAvatar
              address={sequencer.address}
              xImageUrl={sequencer.xImageUrl}
              xHandle={sequencer.xHandle}
              discordAvatar={sequencer.discordAvatar}
              discordUsername={sequencer.discordUsername}
              name={sequencer.name}
              size="sm"
              variant="table"
              enableSwitching={true}
              showMotion={false}
            />
            <div className="flex flex-col overflow-hidden flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/sequencers/${sequencer.address}`}
                  className="text-brand-violet dark:text-accent-purple-light hover:text-amber-700 dark:hover:text-amber-300 font-bold text-sm transition-colors duration-200 truncate"
                >
                  {sequencer.name || formatAddress(sequencer.address)}
                </Link>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 min-h-[20px]">
                {sequencer.xHandle || sequencer.discordUsername ? (
                  <>
                    <IdentityBadgeGroup
                      xHandle={sequencer.xHandle}
                      xImageUrl={sequencer.xImageUrl}
                      discordUsername={sequencer.discordUsername}
                      discordAvatar={sequencer.discordAvatar}
                      size="xs"
                    />
                    <CopyButton textToCopy={sequencer.address} size="xs" />
                  </>
                ) : (
                  <>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                      {formatAddress(sequencer.address)}
                    </span>
                    <CopyButton textToCopy={sequencer.address} size="xs" />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Signal Status per Payload */}
        <div className="col-span-7">
          <div className="flex items-center gap-4 overflow-x-auto">
            {payloads.map(payload => {
              const signalCount = sequencer.payloadSignals[payload.address] || 0;
              const hasSignaled = signalCount > 0;

              return (
                <div key={payload.address} className="flex-shrink-0 min-w-[150px] flex items-center justify-center">
                  {hasSignaled ? (
                    <button
                      onClick={() => handleOpenModal(payload.address)}
                      className="flex items-center gap-1 hover:bg-green-50 dark:hover:bg-green-900/10 rounded px-2 py-1 transition-colors group"
                      title="Click to view signal transactions"
                    >
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      {signalCount > 1 && (
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">
                          {signalCount}
                        </span>
                      )}
                    </button>
                  ) : (
                    <MinusCircleIcon className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Proposing Opportunity */}
        <div className="col-span-2 flex justify-end">
          {sequencer.totalProposerSlots > 0 ? (
            <button
              onClick={() => handleOpenModal(undefined, true)}
              className="flex items-center gap-1.5 font-mono text-xs hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded px-2 py-1 transition-colors"
              title="Click to view block attestations"
            >
              <span className="text-emerald-600 dark:text-emerald-400">{sequencer.checkpointsMined}</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-amber-600 dark:text-amber-400">{sequencer.checkpointsProposed}</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-red-600 dark:text-red-400">{sequencer.blocksMissed}</span>
            </button>
          ) : (
            <span className="font-mono text-sm text-slate-400">-</span>
          )}
        </div>
      </div>

      {/* Mobile card */}
      <div className="lg:hidden px-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
        {/* Header: avatar + name */}
        <div className="flex items-center gap-2 mb-2">
          <ValidatorAvatar
            address={sequencer.address}
            xImageUrl={sequencer.xImageUrl}
            xHandle={sequencer.xHandle}
            discordAvatar={sequencer.discordAvatar}
            discordUsername={sequencer.discordUsername}
            name={sequencer.name}
            size="sm"
            variant="table"
            enableSwitching={true}
            showMotion={false}
          />
          <div className="flex-1 min-w-0">
            <Link
              href={`/sequencers/${sequencer.address}`}
              className="text-brand-violet dark:text-accent-purple-light font-bold text-sm truncate block"
            >
              {sequencer.name || formatAddress(sequencer.address)}
            </Link>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                {formatAddress(sequencer.address)}
              </span>
              <CopyButton textToCopy={sequencer.address} size="xs" />
            </div>
          </div>
        </div>

        {/* Signals per payload — vertical stack */}
        <div className="space-y-1.5 mb-2">
          {payloads.map(payload => {
            const signalCount = sequencer.payloadSignals[payload.address] || 0;
            const hasSignaled = signalCount > 0;

            return (
              <div key={payload.address} className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate mr-2">
                  {formatAddress(payload.address)}
                </span>
                {hasSignaled ? (
                  <button
                    onClick={() => handleOpenModal(payload.address)}
                    className="flex items-center gap-1 hover:bg-green-50 dark:hover:bg-green-900/10 rounded px-2 py-0.5 transition-colors"
                  >
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    {signalCount > 1 && (
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">{signalCount}</span>
                    )}
                  </button>
                ) : (
                  <MinusCircleIcon className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                )}
              </div>
            );
          })}
        </div>

        {/* Proposer status */}
        {sequencer.totalProposerSlots > 0 && (
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-700/50">
            <span className="text-xs text-slate-500 dark:text-slate-400">Proposer</span>
            <button
              onClick={() => handleOpenModal(undefined, true)}
              className="flex items-center gap-1.5 font-mono text-xs hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded px-2 py-0.5 transition-colors"
            >
              <span className="text-emerald-600 dark:text-emerald-400">{sequencer.checkpointsMined}</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-amber-600 dark:text-amber-400">{sequencer.checkpointsProposed}</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-red-600 dark:text-red-400">{sequencer.blocksMissed}</span>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {modalState.showProposerStatus ? (
        <SequencerAttestationsModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false })}
          sequencerAddress={sequencer.address}
          sequencerName={sequencer.name || undefined}
          roundNumber={roundNumber}
        />
      ) : (
        <SequencerSignalsModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false })}
          sequencerAddress={sequencer.address}
          sequencerName={sequencer.name || undefined}
          payloadAddress={modalState.payloadAddress}
          roundNumber={roundNumber}
        />
      )}
    </>
  );
};
