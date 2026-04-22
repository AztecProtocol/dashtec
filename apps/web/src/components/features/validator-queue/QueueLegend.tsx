import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@/components/ui/Tooltip';

interface QueueLegendProps {
  flushableValidatorsCount: number | null;
  isLoading: boolean;
  contractError: string | null;
}

export const QueueLegend: React.FC<QueueLegendProps> = ({
  flushableValidatorsCount,
  isLoading,
  contractError,
}) => {
  if (isLoading) {
    return (
      <div className="relative z-10 px-6 py-4 border-b border-white/20 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 animate-pulse">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!flushableValidatorsCount || contractError) {
    return null;
  }

  return (
    <div className="relative z-10 px-6 py-4 border-b border-white/20 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/40 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            Next Batch (Positions 1-{flushableValidatorsCount})
          </span>
          <Tooltip content="These sequencers are in the priority positions and will be activated in the next flush operation.">
            <InformationCircleIcon className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/40 rounded-full"></div>
          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Waiting (Position {flushableValidatorsCount + 1}+)
          </span>
          <Tooltip content="These sequencers are waiting in the queue and will be processed in future flush operations, depending on their position.">
            <InformationCircleIcon className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
