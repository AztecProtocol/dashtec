'use client';

import {
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { ProviderSequencersTable } from './ProviderSequencersTable';
import { Tooltip } from '@/components/ui/Tooltip';
import { ProviderAvatar } from '@/components/ui/ProviderAvatar';
import type { Payload, Provider } from '@/types/signaling-matrix';
import { INDEPENDENT_PROVIDER_IDENTIFIER } from '@/utils/constants';

interface ProviderRowProps {
  provider: Provider;
  payloads: Payload[];
  roundNumber: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  networkTotalSignals?: number;
}

/**
 * Provider row with summary and expandable sequencer details
 * Shows provider name, sequencer count, signal counts per payload, and participation rate
 */
export const ProviderRow: React.FC<ProviderRowProps> = ({
  provider,
  payloads,
  roundNumber,
  isExpanded,
  onToggleExpand,
  networkTotalSignals,
}) => {
  const isIndependent = provider.identifier === INDEPENDENT_PROVIDER_IDENTIFIER;

  return (
    <div className={isIndependent ? 'border-b-2 border-brand-violet/30' : ''}>
      {/* Provider Summary Row */}
      <div
        className={`flex flex-col md:grid md:grid-cols-12 gap-4 px-4 md:px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50/50 dark:bg-slate-900/30' : ''
          } ${isIndependent ? 'bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/20 dark:to-transparent' : ''}`}
        onClick={onToggleExpand}
      >
        {/* Provider Info */}
        <div className="md:col-span-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-slate-400" />
              )}
            </div>

            <ProviderAvatar
              logoUrl={provider.logoUrl}
              name={provider.name}
              size="lg"
            />

            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 dark:text-slate-100">
                {provider.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {provider.totalSequencers} sequencer{provider.totalSequencers !== 1 ? 's' : ''}
                {' '}
                <span className="text-slate-400">
                  ({provider.totalProposerSlots} proposing opportunit{provider.totalProposerSlots !== 1 ? 'ies' : 'y'})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Signaling Status per Payload */}
        <div className="md:col-span-7 w-full">
          <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
            {payloads.map((payload) => {
              const counts = provider.payloadSignals[payload.address];

              return (
                <div key={payload.address} className="flex-shrink-0 min-w-[130px] md:min-w-[150px]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden relative flex flex-col items-center justify-center">
                        {counts && provider.totalProposerSlots > 0 && (
                          <div
                            className="bg-green-500 absolute inset-0"
                            style={{ width: `${(counts.supportCount / provider.totalProposerSlots) * 100}%` }}
                          />
                        )}
                        <div className="relative z-10 text-[10px] font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {counts?.supportCount || 0}/{provider.totalProposerSlots} possible signals
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px] text-slate-400 text-center">
                      <div className="font-mono text-slate-500 dark:text-slate-400">
                        {counts?.totalSignals || 0} signals
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Participation Metrics */}
        <div className="md:col-span-2 flex justify-between md:justify-end">
          <div className="space-y-1 text-right">
            {/* Total unique signals */}
            <Tooltip
              content={
                <div className="space-y-1">
                  <div className="font-semibold">Provider Signals</div>
                  <div>Total signals from this provider's sequencers</div>
                  <div className="pt-1 border-t border-slate-600">
                    {provider.totalSignals} total signals
                  </div>
                  <div className="text-slate-300">
                    ({provider.totalProposerSlots} proposing opportunities × {Object.keys(provider.payloadSignals).length} payloads)
                  </div>
                </div>
              }
            >
              <div className="flex items-center gap-1.5 justify-end cursor-help">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {provider.totalSignals}
                </div>
                <div className="text-xs text-slate-400">signals</div>
                {provider.totalSignals === 0 && (
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                )}
              </div>
            </Tooltip>
            {/* Network participation */}
            <Tooltip
              content={
                <div className="space-y-1">
                  <div className="font-semibold">Network Participation</div>
                  <div>This provider's percentage of network signals</div>
                  <div className="pt-1 border-t border-slate-600">
                    {provider.totalSignals} signals out of {networkTotalSignals || 'total'} network signals
                  </div>
                  <div className="text-slate-300">
                    {provider.networkParticipationRate.toFixed(1)}% participation
                  </div>
                </div>
              }
            >
              <div className="text-xs text-slate-500 dark:text-slate-400 cursor-help text-right font-mono">
                {provider.totalSignals}/{networkTotalSignals || '?'}
              </div>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Expanded Sequencer Details */}
      {isExpanded && (
        <ProviderSequencersTable
          providerIdentifier={provider.identifier}
          roundNumber={roundNumber}
          payloads={payloads}
        />
      )}
    </div>
  );
};
