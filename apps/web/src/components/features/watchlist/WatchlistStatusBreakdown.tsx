'use client';

import { VALIDATOR_STATUS } from '@/utils/constants';
import {
  CheckCircleIcon,
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
  ChartPieIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Tooltip } from '@/components/ui/Tooltip';
import { getStatusClasses } from '@/hooks/useStatusColor';

interface WatchlistStatusBreakdownProps {
  statusCounts: Record<string, number>;
  totalCount: number;
}

/**
 * Status breakdown component with visual progress bars
 * Shows distribution of validator statuses in watchlist
 */
export const WatchlistStatusBreakdown: React.FC<WatchlistStatusBreakdownProps> = ({
  statusCounts,
  totalCount,
}) => {
  const statuses = [
    {
      key: VALIDATOR_STATUS.ACTIVE,
      label: 'Active',
      icon: CheckCircleIcon,
      tooltip: 'Sequencers actively participating in attestations and block proposals',
    },
    {
      key: VALIDATOR_STATUS.QUEUE,
      label: 'Queue',
      icon: ClockIcon,
      tooltip: 'Sequencers waiting in queue for activation',
    },
    {
      key: VALIDATOR_STATUS.EXITING,
      label: 'Exiting',
      icon: ArrowRightOnRectangleIcon,
      tooltip: 'Sequencers in the process of exiting the network',
    },
    {
      key: VALIDATOR_STATUS.ZOMBIE,
      label: 'Zombie',
      icon: ExclamationTriangleIcon,
      tooltip: 'Inactive sequencers that are no longer participating but not formally exited',
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 shadow-lg p-5 sm:p-6 hover:shadow-xl transition-all duration-300">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-500/10 dark:bg-yellow-400/10 rounded-lg">
            <ChartPieIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Status Breakdown
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Operational health across your watchlist
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {statuses.map((status) => {
            const count = statusCounts[status.key] || 0;
            if (count === 0) return null;
            const classes = getStatusClasses(status.key);

            return (
              <Tooltip key={status.key} content={status.tooltip}>
                <div
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md cursor-help ${classes.bg} ${classes.text}`}
                >
                  <span className={`w-2 h-2 rounded-full ${classes.dot}`}></span>
                  <span>{status.label}</span>
                  <span className="ml-0.5 font-bold">{count}</span>
                </div>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
};
