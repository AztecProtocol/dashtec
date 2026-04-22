import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { UserGroupIcon, CheckBadgeIcon, ChartBarSquareIcon } from '@heroicons/react/24/outline';
import { EpochPerformanceMetrics } from '@/hooks/useEpochSlotActivityData';

interface EpochMetricsGridProps {
  metrics: EpochPerformanceMetrics;
  isLoading: boolean;
  hasData: boolean;
}

/** Skeleton placeholder for a single metric card */
const MetricCardSkeleton: React.FC = () => (
  <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 shadow-sm p-4">
    <div className="flex items-center justify-between mb-3">
      <Skeleton heightClass="h-4" widthClass="w-2/3" />
      <Skeleton heightClass="h-8" widthClass="w-8" />
    </div>
    <Skeleton heightClass="h-8" widthClass="w-1/2 mb-2" />
    <Skeleton heightClass="h-3" widthClass="w-full" />
  </div>
);

/** Renders 4 epoch performance metric cards with skeleton loading states */
export const EpochMetricsGrid: React.FC<EpochMetricsGridProps> = ({ metrics, isLoading, hasData }) => {
  const showSkeleton = isLoading && !hasData;

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {showSkeleton ? <MetricCardSkeleton /> : (
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 font-light uppercase tracking-wider">Total Sequencers</h3>
              <div className="p-1.5 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg">
                <UserGroupIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">{metrics.totalValidators}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sequencers in epoch</p>
          </div>
        )}

        {showSkeleton ? <MetricCardSkeleton /> : (
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 font-light uppercase tracking-wider">Active Sequencers</h3>
              <div className="p-1.5 bg-green-100/50 dark:bg-green-900/30 rounded-lg">
                <CheckBadgeIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">{metrics.activeValidators}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">With recorded activity</p>
          </div>
        )}

        {showSkeleton ? <MetricCardSkeleton /> : (
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 font-light uppercase tracking-wider">Attestation Rate</h3>
              <div className="p-1.5 bg-brand-violet/10 dark:bg-brand-violet/20 rounded-lg">
                <CheckBadgeIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
              </div>
            </div>
            <p className="text-2xl font-bold text-brand-violet dark:text-accent-purple-light mb-1">{metrics.avgAttestationRate.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{metrics.successfulAttestations}/{metrics.totalAttestations} successful</p>
          </div>
        )}

        {showSkeleton ? <MetricCardSkeleton /> : (
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 font-light uppercase tracking-wider">Checkpoint Rate</h3>
              <div className="p-1.5 bg-amber-100/50 dark:bg-amber-900/30 rounded-lg">
                <ChartBarSquareIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-1">{metrics.avgBlockProductionRate.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{metrics.successfulBlockOps}/{metrics.totalBlockOps} successful</p>
          </div>
        )}
      </div>
    </div>
  );
};
