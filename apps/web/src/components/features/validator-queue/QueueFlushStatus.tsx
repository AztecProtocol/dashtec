import React from 'react';
import { SparklesIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@/components/ui/Tooltip';

interface QueueFlushStatusProps {
  nextFlushableEpoch: number | null;
  flushableValidatorsCount: number | null;
  currentEpoch: number | null;
  totalQueued: number;
  totalSlotsInEpoch: number;
  slotDuration: number;
  isLoading: boolean;
  contractError: string | null;
}

/**
 * Formats duration in seconds to human-readable format
 */
export const formatDuration = (totalSeconds: number): string => {
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays === 0) {
    if (totalHours === 0) {
      return `~${totalMinutes}m`;
    }
    return `~${totalHours}h`;
  }

  // If less than a year (approx 365 days), show as days
  if (totalDays < 365) {
    return `~${totalDays} day${totalDays > 1 ? 's' : ''}`;
  }

  // Otherwise show as weeks
  const weeks = Math.ceil(totalDays / 7);
  return `~${weeks} week${weeks > 1 ? 's' : ''}`;
};



export const QueueFlushStatus: React.FC<QueueFlushStatusProps> = ({
  nextFlushableEpoch,
  flushableValidatorsCount,
  currentEpoch,
  totalQueued,
  totalSlotsInEpoch,
  slotDuration,
  isLoading,
  contractError,
}) => {
  if (isLoading) {
    return (
      <div className="relative rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/30 dark:border-slate-700/30 mb-8 animate-pulse">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg w-8 h-8"></div>
            <div className="flex-1">
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-3"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (
    (nextFlushableEpoch === null && flushableValidatorsCount === null) ||
    contractError
  ) {
    return null;
  }

  const epochDurationSeconds = totalSlotsInEpoch * slotDuration;
  const epochsNeeded = totalQueued > 0 && flushableValidatorsCount
    ? Math.ceil(totalQueued / flushableValidatorsCount)
    : 0;
  const totalSecondsNeeded = epochsNeeded * epochDurationSeconds;

  return (
    <div className="relative rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/30 dark:border-slate-700/30 mb-8">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
            <SparklesIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Queue Flush Status</h3>
              <Tooltip content="Sequencers join the queue when they deposit stake. Every epoch, a batch of sequencers gets flushed from the queue and activated to start validating. The queue processes sequencers in first-in-first-out order.">
                <InformationCircleIcon className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </Tooltip>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <span className="font-medium">Flush Rate: </span>
                <span>{flushableValidatorsCount} sequencers</span>
                <Tooltip content="The number of sequencers that get processed when the queue is flushed.">
                  <InformationCircleIcon className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                </Tooltip>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Current Status: </span>
                {nextFlushableEpoch !== null && currentEpoch !== null ? (
                  nextFlushableEpoch > currentEpoch ? (
                    <span className="text-green-600 dark:text-green-400">Flushed</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">Not Flushed</span>
                  )
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">Unknown</span>
                )}
                <Tooltip content="Shows the flush status of the current epoch. 'Flushed' means the current epoch's batch of sequencers has been processed and activated, 'Not Flushed' means the current epoch's flush hasn't happened yet.">
                  <InformationCircleIcon className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                </Tooltip>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Next Flushable Epoch: </span>
                <span>#{nextFlushableEpoch || 'N/A'}</span>
                <Tooltip content="The epoch number when the next flush will occur to activate waiting sequencers.">
                  <InformationCircleIcon className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                </Tooltip>
              </div>
              {totalQueued > 0 && flushableValidatorsCount ? (
                <div className="flex items-center gap-1">
                  <span className="font-medium">New sequencers est activation: </span>
                  <span>{formatDuration(totalSecondsNeeded)}</span>
                  <Tooltip content="Estimated time for new sequencers in the queue to be activated based on epoch duration and flush rate. Calculated as: (total queued ÷ flush rate) × epoch duration.">
                    <InformationCircleIcon className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                  </Tooltip>
                </div>
              ) : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
