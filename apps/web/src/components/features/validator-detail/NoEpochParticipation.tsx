import React from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useApp } from '@/context/AppContext';
import { useDashboard } from '@/context/DashboardContext';

/**
 * Component shown when a sequencer has not participated in any epochs yet
 * Displays detailed information about epoch participation odds and expected wait times
 */
export const NoEpochParticipation: React.FC = () => {
  const { networkConfig } = useApp();
  const { currentEpochMetrics, totalActiveValidators } = useDashboard();

  // Calculate epoch duration
  const epochDurationSlots = networkConfig?.epochDurationSlots!
  const slotDuration = networkConfig?.slotDuration!
  const epochDurationSeconds = epochDurationSlots * slotDuration;
  const epochDurationMinutes = (epochDurationSeconds / 60).toFixed(1);

  // Network statistics
  const committeeSize = currentEpochMetrics?.validatorCommitteeSize!
  const activeValidatorCount = totalActiveValidators ?? 0

  // Calculate selection odds and wait time
  const chancePerEpoch = (committeeSize / activeValidatorCount) * 100;
  const epochsPerDay = 86400 / epochDurationSeconds;
  const expectedEpochsPerDay = (committeeSize / activeValidatorCount) * epochsPerDay;
  const expectedDaysPerSelection = 1 / expectedEpochsPerDay;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/5 via-transparent to-amber-500/5"></div>

      <div className="relative z-10 p-8 lg:p-12">
        <div className="max-w-3xl mx-auto text-center">
          {/* Icon */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-300/30 to-slate-400/20 rounded-2xl blur-2xl"></div>
            <div className="relative inline-flex p-5 bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl">
              <CalendarDaysIcon className="h-16 w-16 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
            </div>
          </div>

          {/* Main message */}
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            You haven't participated in an epoch yet
          </h3>

          {/* Explanation */}
          <div className="space-y-4 text-slate-600 dark:text-slate-400">
            <p className="text-base sm:text-lg leading-relaxed">
              Epoch participation is randomized. Each epoch (<span className="font-semibold text-slate-800 dark:text-slate-200">{epochDurationMinutes} minutes</span>) a new committee of{' '}
              <span className="font-semibold text-brand-violet dark:text-accent-purple-light">{committeeSize} sequencers</span> is chosen.
            </p>

            <p className="text-base sm:text-lg leading-relaxed">
              Currently that means the odds of getting selected are{' '}
              <span className="font-semibold text-brand-violet dark:text-accent-purple-light">{chancePerEpoch.toFixed(2)}%</span> per epoch,{' '}
              which means a typical wait time between participation of{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{expectedDaysPerSelection.toFixed(1)} days</span>.
            </p>
          </div>

          {/* Additional stats card */}
          <div className="mt-8 p-6 rounded-xl bg-white/60 dark:bg-slate-700/40 border border-white/30 dark:border-slate-600/30">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Committee Size
                </div>
                <div className="text-xl font-bold text-brand-violet dark:text-accent-purple-light">
                  {committeeSize}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Active Sequencers
                </div>
                <div className="text-xl font-bold text-brand-violet dark:text-accent-purple-light">
                  {activeValidatorCount.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Epochs per Day
                </div>
                <div className="text-xl font-bold text-brand-violet dark:text-accent-purple-light">
                  {epochsPerDay.toFixed(0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
