'use client';

import { ChartPieIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip as UITooltip } from '@/components/ui/Tooltip';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { useProverMarketShare } from '@/hooks/queries/prover/useProverMarketShare';
import { useRollupFilter } from '@/hooks/useRollupFilter';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatAddress } from '@/utils/formatters';
import { ProverMarketShareItem } from '@/types/prover';

const TOP_PROVERS_COUNT = 7;

/** Slate-based palette with brand-violet accent for the top prover */
const CHART_COLORS = [
  '#D4A017', // brand-violet — top prover
  '#475569', // slate-600
  '#64748b', // slate-500
  '#78716c', // stone-500
  '#94a3b8', // slate-400
  '#a1a1aa', // zinc-400
  '#cbd5e1', // slate-300
  '#d4d4d8', // zinc-300 — "Others"
];

interface ChartEntry {
  name: string;
  value: number;
  percentage: number;
  fullAddress?: string;
}

/**
 * Build chart-ready data: top N provers individually, remainder grouped as "Others"
 */
function buildChartData(provers: ProverMarketShareItem[]): ChartEntry[] {
  const top = provers.slice(0, TOP_PROVERS_COUNT);
  const rest = provers.slice(TOP_PROVERS_COUNT);

  const entries: ChartEntry[] = top.map((p) => ({
    name: formatAddress(p.proverId),
    value: p.totalProofs,
    percentage: p.percentage,
    fullAddress: p.proverId,
  }));

  if (rest.length > 0) {
    const othersTotal = rest.reduce((sum, p) => sum + p.totalProofs, 0);
    const othersPct = rest.reduce((sum, p) => sum + p.percentage, 0);
    entries.push({
      name: 'Others',
      value: othersTotal,
      percentage: Number(othersPct.toFixed(2)),
    });
  }

  return entries;
}

/**
 * Custom tooltip for the pie chart
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value, percentage, fullAddress } = payload[0].payload;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
        {fullAddress ?? name}
      </p>
      <div className="space-y-0.5 text-xs">
        <p className="text-slate-600 dark:text-slate-400">
          Proofs: <span className="font-bold text-slate-900 dark:text-slate-100">{value.toLocaleString()}</span>
        </p>
        <p className="text-slate-600 dark:text-slate-400">
          Share: <span className="font-bold text-brand-violet dark:text-accent-purple-light">{percentage}%</span>
        </p>
      </div>
    </div>
  );
};

/**
 * Custom legend renderer to keep labels compact
 */
const renderLegend = (props: any) => {
  const { payload } = props;
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
      {payload?.map((entry: any, index: number) => (
        <div key={`legend-${index}`} className="flex items-center gap-1.5 text-xs">
          <div
            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-600 dark:text-slate-400">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Loading skeleton for the market share card
 */
const MarketShareSkeleton = () => (
  <div className="space-y-6">
    <div className="flex justify-center">
      <Skeleton heightClass="h-64" widthClass="w-64" className="rounded-full" />
    </div>
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <Skeleton heightClass="h-4" widthClass="w-32" />
          <Skeleton heightClass="h-4" widthClass="w-16" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * ProverMarketShare — Pie/donut chart showing proof distribution across provers
 */
export const ProverMarketShare: React.FC = () => {
  const { rollupParam } = useRollupFilter();
  const { data, isLoading, isError } = useProverMarketShare(rollupParam);

  const chartData = data ? buildChartData(data.provers) : [];

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-4 sm:p-6">
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none" />
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Market Share
              </h2>
              <UITooltip content="Distribution of proof submissions across individual provers. Top 7 provers are shown individually, remaining provers are grouped as 'Others'">
                <InformationCircleIcon className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </UITooltip>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Proof distribution across provers
            </p>
          </div>
          <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50">
            <ChartPieIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
          </div>
        </div>

        {/* Body */}
        {isLoading ? (
          <MarketShareSkeleton />
        ) : isError || !data ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ChartPieIcon className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" />
            <h4 className="font-semibold text-sm text-slate-600 dark:text-slate-300">No Data Available</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Unable to load market share data.
            </p>
          </div>
        ) : (
          <>
            {/* Donut chart */}
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="45%"
                    outerRadius="75%"
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {chartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Breakdown table */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="space-y-2">
                {chartData.map((entry, index) => (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                        {entry.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {entry.value.toLocaleString()} proofs
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 w-14 text-right">
                        {entry.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 px-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total</span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {data.totalProofs.toLocaleString()} proofs
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
