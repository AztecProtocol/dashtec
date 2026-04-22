'use client';

import { useNetworkProvingHealth } from '@/hooks/queries/prover/useNetworkProvingHealth';
import { useRollupFilter } from '@/hooks/useRollupFilter';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ShieldCheckIcon,
  UsersIcon,
  ChartBarIcon,
  CubeTransparentIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Tooltip } from '@/components/ui/Tooltip';

/** Skeleton placeholder for a single health KPI card */
const HealthCardSkeleton: React.FC = () => (
  <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-between h-full">
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <Skeleton heightClass="h-4" widthClass="w-3/5" />
        <Skeleton heightClass="h-8" widthClass="w-8" />
      </div>
      <Skeleton heightClass="h-8" widthClass="w-2/5 mb-3" />
    </div>
    <div className="relative z-10 mt-auto">
      <Skeleton heightClass="h-3" widthClass="w-full" />
    </div>
  </div>
);

/** Resolve color classes for decentralization index thresholds */
function getDecentralizationColor(index: number): string {
  if (index > 0.7) return 'text-green-600 dark:text-green-400';
  if (index >= 0.4) return 'text-yellow-500 dark:text-yellow-400';
  return 'text-red-500 dark:text-red-400';
}

/** Resolve description for decentralization index thresholds */
function getDecentralizationLabel(index: number): string {
  if (index > 0.7) return 'Highly decentralized';
  if (index >= 0.4) return 'Moderately decentralized';
  return 'Concentrated';
}

interface HealthKpiCardProps {
  title: string;
  value: string;
  description: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  valueColor?: string;
  tooltip?: React.ReactNode;
}

/** Single KPI card matching the dashboard KeyMetricCard style */
const HealthKpiCard: React.FC<HealthKpiCardProps> = ({
  title,
  value,
  description,
  Icon,
  valueColor = 'text-brand-violet dark:text-accent-purple-light',
  tooltip,
}) => (
  <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-4 sm:p-6 flex flex-col justify-between h-full">
    <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none" />

    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 min-w-0 mr-2">
          <h2 className="text-[10px] sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            {title}
          </h2>
          {tooltip && (
            <Tooltip content={tooltip}>
              <InformationCircleIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help flex-shrink-0" />
            </Tooltip>
          )}
        </div>
        <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50 group-hover:bg-brand-violet/5 dark:group-hover:bg-brand-violet/10 transition-colors duration-300">
          <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-brand-violet dark:group-hover:text-accent-purple-light transition-colors duration-300" />
        </div>
      </div>
      <p className={`text-2xl sm:text-3xl font-bold ${valueColor} mb-3 transition-transform duration-300`}>
        {value}
      </p>
    </div>

    <div className="relative z-10 mt-auto">
      <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  </div>
);

/** Network Proving Health KPI grid */
export const NetworkProvingHealth: React.FC = () => {
  const { rollupParam } = useRollupFilter();
  const { data, isLoading, error } = useNetworkProvingHealth(rollupParam);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <HealthCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <HealthKpiCard title="Total Proofs" value="0" description="No proving data available" Icon={ShieldCheckIcon} />
        <HealthKpiCard title="Unique Provers" value="0" description="No provers yet" Icon={UsersIcon} />
        <HealthKpiCard title="Avg Proofs / Epoch" value="0" description="No epochs with proofs" Icon={ChartBarIcon} />
        <HealthKpiCard title="Decentralization" value="N/A" description="Insufficient data" Icon={CubeTransparentIcon} />
      </div>
    );
  }

  const decentralizationPct = (data.decentralizationIndex * 100).toFixed(1);
  const decentralizationColor = getDecentralizationColor(data.decentralizationIndex);
  const decentralizationLabel = getDecentralizationLabel(data.decentralizationIndex);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <HealthKpiCard
        title="Total Proofs"
        value={data.totalProofs.toLocaleString()}
        description={`Across epochs ${data.firstEpoch.toLocaleString()} - ${data.lastEpoch.toLocaleString()}`}
        Icon={ShieldCheckIcon}
        tooltip="Total number of proof submissions across all provers and all epochs"
      />
      <HealthKpiCard
        title="Unique Provers"
        value={data.uniqueProvers.toLocaleString()}
        description={`Active in ${data.epochsWithProofs.toLocaleString()} epochs`}
        Icon={UsersIcon}
        tooltip="Count of distinct prover addresses that have submitted at least one proof"
      />
      <HealthKpiCard
        title="Avg Proofs / Epoch"
        value={data.avgProofsPerEpoch.toFixed(1)}
        description="Average proof submissions per epoch"
        Icon={ChartBarIcon}
        tooltip="Average number of proof submissions per epoch across the tracked period"
      />
      <HealthKpiCard
        title="Decentralization"
        value={`${decentralizationPct}%`}
        description={decentralizationLabel}
        Icon={CubeTransparentIcon}
        valueColor={decentralizationColor}
        tooltip={
          <>
            Calculated as 1 minus the Herfindahl-Hirschman Index (HHI) — the sum of each prover's squared proof share.
            <br /><br />
            Example with 5 provers: 35%, 25%, 20%, 12%, 8% shares → HHI = 0.35² + 0.25² + 0.20² + 0.12² + 0.08² = 0.2458, so decentralization = 75.4%. If one prover had 100% it would score 0%.
            <br /><br />
            {'>'}70% = highly decentralized, 40-70% = moderate, {'<'}40% = concentrated
          </>
        }
      />
    </div>
  );
};
