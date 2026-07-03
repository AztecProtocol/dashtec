'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNotification } from '@/context/NotificationContext';
import {
  DocumentTextIcon,
  CurrencyDollarIcon,
  ExclamationCircleIcon,
  UserGroupIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { formatBalance, formatBalanceWithUsd } from '@/utils/formatters';
import { useApp } from '@/context/AppContext';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { Tooltip } from '@/components/ui/Tooltip';
import { Skeleton } from '@/components/ui/Skeleton';

interface SlashingStats {
  totalRounds: number;
  totalExecuted: number;
  totalSlashedStaked: number;
  executedSlashedStaked: number;
  totalUniqueSlashed: number;
  totalSlashEvents: number;
  roundTrends: Array<{ month: string; executed: number }>;
  monthlySlashAmounts: Array<{ month: string; executedAmount: number }>;
}

interface MergedDataPoint {
  month: string;
  executed: number;
  slashAmount: number;
}

/** Custom tooltip matching prover network chart style */
const CustomChartTooltip = ({ active, payload, networkConfig }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as MergedDataPoint;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
        {data.month}
      </p>
      <div className="space-y-1 text-xs">
        <p className="text-slate-600 dark:text-slate-400">
          Rounds Executed:{' '}
          <span className="font-bold text-brand-violet dark:text-accent-purple-light">
            {data.executed}
          </span>
        </p>
        <p className="text-slate-600 dark:text-slate-400">
          Amount Slashed:{' '}
          {(() => {
            const { formatted } = formatBalanceWithUsd(
              data.slashAmount,
              networkConfig?.stakingTokenDecimals || 18,
              networkConfig?.stakingTokenSymbol || 'STK'
            );
            return (
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {formatted}
              </span>
            );
          })()}
        </p>
      </div>
    </div>
  );
};

interface SlashingStatsSectionProps {
  rollup?: string;
}

/** Slashing stats summary bar and unified activity chart */
export const SlashingStatsSection: React.FC<SlashingStatsSectionProps> = ({ rollup }) => {
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<SlashingStats | null>(null);
  const { addNotification } = useNotification();
  const { networkConfig } = useApp();
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const params = new URLSearchParams();
      if (rollup && rollup !== 'active') params.append('rollup', rollup);
      const qs = params.toString();
      const response = await fetch(`/api/slashing-history/stats${qs ? `?${qs}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      addNotification('Failed to fetch slashing history stats', 'error');
    } finally {
      setStatsLoading(false);
    }
  }, [addNotification, rollup]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  /** Merge round trends and slash amounts into a single dataset */
  const mergedChartData = useMemo(() => {
    if (!stats) return [];
    const amountMap = new Map(
      stats.monthlySlashAmounts.map((a) => [a.month, a.executedAmount])
    );
    return stats.roundTrends.map((trend) => ({
      month: trend.month,
      executed: trend.executed,
      slashAmount: amountMap.get(trend.month) ?? 0,
    }));
  }, [stats]);

  if (statsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} heightClass="h-8" widthClass="w-32" />
          ))}
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
          <Skeleton heightClass="h-80" widthClass="w-full" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-brand-violet/10 dark:bg-brand-violet/20 rounded-lg">
            <DocumentTextIcon className="w-4 h-4 text-brand-violet dark:text-accent-purple-light" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Rounds Executed</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {stats.totalExecuted.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-brand-violet/10 dark:bg-brand-violet/20 rounded-lg">
            <UserGroupIcon className="w-4 h-4 text-brand-violet dark:text-accent-purple-light" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Unique Sequencers Penalized</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {stats.totalUniqueSlashed.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-brand-violet/10 dark:bg-brand-violet/20 rounded-lg">
            <CurrencyDollarIcon className="w-4 h-4 text-brand-violet dark:text-accent-purple-light" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Stake Slashed</p>
            {(() => {
              const { formatted } = formatBalanceWithUsd(
                stats.totalSlashedStaked,
                networkConfig?.stakingTokenDecimals || 18,
                networkConfig?.stakingTokenSymbol || 'STK'
              );
              return (
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatted}</p>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Unified Chart — Prover network style */}
      <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-4 sm:p-6">
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Slashing Activity
                </h2>
                <Tooltip content="Monthly breakdown of slashing rounds executed and total tokens penalized across all sequencers">
                  <InformationCircleIcon className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                </Tooltip>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Penalty rounds and amounts over time
              </p>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50">
              <ExclamationCircleIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
            </div>
          </div>

          {/* Chart */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={mergedChartData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="slashRoundsGradient" x1="0" y1="0" x2="0" y2="1">
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
                  dataKey="month"
                  stroke="#64748b"
                  style={{ fontSize: '11px' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={40}
                />

                {/* Left Y-axis: rounds executed */}
                <YAxis
                  yAxisId="left"
                  stroke="#D4A017"
                  style={{ fontSize: '11px' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  label={{
                    value: 'Rounds',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#D4A017',
                    fontSize: 11,
                    offset: 10,
                  }}
                />

                {/* Right Y-axis: slash amounts */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#94a3b8"
                  style={{ fontSize: '11px' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => {
                    const { formatted } = formatBalanceWithUsd(
                      v,
                      networkConfig?.stakingTokenDecimals || 18,
                      ''
                    );
                    return formatted.split(' ')[0];
                  }}
                  label={{
                    value: 'Amount',
                    angle: 90,
                    position: 'insideRight',
                    fill: '#94a3b8',
                    fontSize: 11,
                    offset: 10,
                  }}
                />

                <RechartsTooltip
                  content={<CustomChartTooltip networkConfig={networkConfig} />}
                />

                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="executed"
                  name="Rounds Executed"
                  stroke="#D4A017"
                  strokeWidth={2}
                  fill="url(#slashRoundsGradient)"
                  dot={false}
                />

                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="slashAmount"
                  name="Amount Slashed"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 2"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-violet/30 border border-brand-violet rounded-sm" />
                <span className="text-slate-600 dark:text-slate-400">Rounds Executed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-slate-400 border-dashed border-t-2 border-slate-400" />
                <span className="text-slate-600 dark:text-slate-400">Amount Slashed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
