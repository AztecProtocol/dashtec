import React from 'react';
import { UsersIcon, ClockIcon, CalendarDaysIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@/components/ui/Tooltip';

interface QueueStatCardsProps {
  totalQueued: number;
  nextEpochTime: string | null;
  currentEpoch: number | null;
  isLoading: boolean;
}

export const QueueStatCards: React.FC<QueueStatCardsProps> = ({
  totalQueued,
  nextEpochTime,
  currentEpoch,
  isLoading,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {/* Total Queued */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-violet/10 dark:bg-brand-violet/20 rounded-xl">
            <UsersIcon className="w-6 h-6 text-brand-violet dark:text-accent-purple-light" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 font-light">Total Queued</p>
              <Tooltip content="The total number of sequencers currently waiting in the activation queue. These sequencers have submitted their stake but haven't been activated yet.">
                <InformationCircleIcon className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </Tooltip>
            </div>
            {isLoading ? (
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalQueued.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Time Until Next Epoch */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100/50 dark:bg-blue-900/30 rounded-xl">
            <ClockIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 font-light">Next Epoch</p>
              <Tooltip content="Time remaining until the next epoch begins. Epochs are fixed time periods where network operations occur.">
                <InformationCircleIcon className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </Tooltip>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              {nextEpochTime || '--:--:--'}
            </p>
          </div>
        </div>
      </div>

      {/* Current Epoch */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-100/50 dark:bg-purple-900/30 rounded-xl">
            <CalendarDaysIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 font-light">Current Epoch</p>
              <Tooltip content="The current epoch number in the network. Epochs are time periods where network operations occur.">
                <InformationCircleIcon className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </Tooltip>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              #{currentEpoch}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
