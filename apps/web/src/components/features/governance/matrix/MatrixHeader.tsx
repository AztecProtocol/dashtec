'use client';

import { SignalIcon, ClockIcon } from '@heroicons/react/24/outline';
import type { SortBy, FilterStatus } from '@/types/signaling-matrix';
import type { EpochInfo } from '@/types/api/signaling-matrix';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';
import { useEpochCalculations } from '@/hooks/useEpochCalculations';
import Link from 'next/link';

interface MatrixStats {
  totalProviders: number;
  activeProviders: number;
  totalSequencers: number;
  payloadSupport: Map<string, number>;
}

interface MatrixHeaderProps {
  currentRound: number;
  epoch: EpochInfo;
  stats: MatrixStats;
  payloadsCount: number;
  quorumSize: number;
  isHistorical?: boolean;
}

/**
 * Header section with stats and controls for the signaling matrix
 */
export const MatrixHeader: React.FC<MatrixHeaderProps> = ({
  currentRound,
  epoch,
  stats,
  payloadsCount,
  quorumSize,
  isHistorical = false,
}) => {
  const configState = useNetworkConfig();
  const { currentEpoch, absoluteCurrentSlot } = useEpochCalculations(configState);

  // Calculate progress within the round's slot range
  const totalSlots = epoch.endSlot - epoch.startSlot + 1;
  const currentSlotInRange = absoluteCurrentSlot - epoch.startSlot;
  const progressPercentage = Math.min(Math.max((currentSlotInRange / totalSlots) * 100, 0), 100);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/50 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
              {isHistorical ? (
                <ClockIcon className="h-5 w-5 text-amber-500 dark:text-amber-400" />
              ) : (
                <SignalIcon className="h-5 w-5 text-brand-violet dark:text-accent-purple-light" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Provider Signaling Matrix
                </h2>
                {isHistorical && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <ClockIcon className="h-3 w-3" />
                    Historical Round
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-light">
                Round {currentRound} • Epoch {epoch.startEpoch}{epoch.startEpoch !== epoch.endEpoch ? `-${epoch.endEpoch}` : ''} (Slot {epoch.startSlot}-{epoch.endSlot}) • {stats.activeProviders}/{stats.totalProviders} providers active
              </p>
              {!isHistorical && (
                <div className="flex items-center gap-3 mt-2">
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Current: Slot {absoluteCurrentSlot}, Epoch {currentEpoch}
                  </p>
                  <div className="flex-1 max-w-md">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                      <div
                        className="bg-brand-violet h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isHistorical && (
            <Link
              href="/governance"
              className="flex-shrink-0 px-4 py-2 rounded-lg bg-brand-violet/10 dark:bg-accent-purple-light/10 text-brand-violet dark:text-accent-purple-light hover:bg-brand-violet/20 dark:hover:bg-accent-purple-light/20 transition-colors text-sm font-medium border border-brand-violet/20 dark:border-accent-purple-light/20"
            >
              View Current Round
            </Link>
          )}

        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.activeProviders}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-light">Active Signaling Providers</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.totalSequencers}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-light">Active Signaling Sequencers</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {payloadsCount}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-light">Active Payloads</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {quorumSize}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-light">Quorum Required</div>
          </div>
        </div>
      </div>
    </div>
  );
};