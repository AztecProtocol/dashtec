'use client';

import React, { useState } from 'react';
import { ChartBarIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip as UITooltip } from '@/components/ui/Tooltip';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { useProverActivityTimeline } from '@/hooks/queries/prover/useProverActivityTimeline';
import { useRollupFilter } from '@/hooks/useRollupFilter';
import { NetworkTimelineItem } from '@/types/prover';

type GroupBy = 'day' | 'week';

/**
 * Format date string for x-axis based on groupBy mode
 */
function formatDate(isoString: string, groupBy: GroupBy): string {
  const date = new Date(isoString);
  if (groupBy === 'week') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Custom tooltip for the activity timeline chart
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as NetworkTimelineItem;
  const date = new Date(data.period);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
        {date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
      <div className="space-y-1 text-xs">
        <p className="text-slate-600 dark:text-slate-400">
          Proofs:{' '}
          <span className="font-bold text-brand-violet dark:text-accent-purple-light">
            {data.proofCount.toLocaleString()}
          </span>
        </p>
        <p className="text-slate-600 dark:text-slate-400">
          Unique Provers:{' '}
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {data.uniqueProvers.toLocaleString()}
          </span>
        </p>
      </div>
    </div>
  );
};

/**
 * ProverActivityTimeline - Network-wide proof activity over time
 */
export const ProverActivityTimeline: React.FC = () => {
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const { rollupParam } = useRollupFilter();
  const { data, isLoading } = useProverActivityTimeline(groupBy, rollupParam);

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-4 sm:p-6">
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none" />
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Activity Timeline
              </h2>
              <UITooltip content="Tracks proof submission volume and unique prover count over time. Toggle between daily and weekly aggregation">
                <InformationCircleIcon className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </UITooltip>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Network proof submissions and active provers over time
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Day/Week toggle */}
            <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600/30 p-1">
              <button
                onClick={() => setGroupBy('day')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                  groupBy === 'day'
                    ? 'bg-brand-violet text-white shadow-sm'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-600/50 text-slate-600 dark:text-slate-300'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setGroupBy('week')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                  groupBy === 'week'
                    ? 'bg-brand-violet text-white shadow-sm'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-600/50 text-slate-600 dark:text-slate-300'
                }`}
              >
                Week
              </button>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50">
              <ChartBarIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Skeleton heightClass="h-full" widthClass="w-full" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data?.timeline ?? []}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="proofCountGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4A017" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#D4A017" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  strokeOpacity={0.15}
                  className="stroke-slate-300 dark:stroke-slate-600"
                />

                <XAxis
                  dataKey="period"
                  tickFormatter={(v) => formatDate(v, groupBy)}
                  stroke="#64748b"
                  style={{ fontSize: '11px' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={40}
                />

                {/* Left Y-axis: proof count */}
                <YAxis
                  yAxisId="left"
                  stroke="#D4A017"
                  style={{ fontSize: '11px' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  label={{
                    value: 'Proofs',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#D4A017',
                    fontSize: 11,
                    offset: 10,
                  }}
                />

                {/* Right Y-axis: unique provers */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#94a3b8"
                  style={{ fontSize: '11px' }}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: 'Provers',
                    angle: 90,
                    position: 'insideRight',
                    fill: '#94a3b8',
                    fontSize: 11,
                    offset: 10,
                  }}
                />

                <Tooltip content={<CustomTooltip />} />

                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="proofCount"
                  name="Proof Count"
                  stroke="#D4A017"
                  strokeWidth={2}
                  fill="url(#proofCountGradient)"
                  dot={false}
                />

                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="uniqueProvers"
                  name="Unique Provers"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 2"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-brand-violet/30 border border-brand-violet rounded-sm" />
              <span className="text-slate-600 dark:text-slate-400">Proof Count</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-slate-400 border-dashed border-t-2 border-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">Unique Provers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
