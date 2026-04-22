'use client';

import React, { useState, useMemo } from 'react';
import { useTokenPrice } from '@/hooks/queries/useTokenPrice';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

const TIMEFRAMES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

/** Custom tooltip for the price chart */
const PriceTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { date: string } }> }) => {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-slate-500 dark:text-slate-400">{payload[0].payload.date}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
        ${payload[0].value.toFixed(4)}
      </p>
    </div>
  );
};

/** AZTEC token price chart card for the dashboard */
export function TokenPriceCard() {
  const [timeframe, setTimeframe] = useState(30);
  const { data, isLoading } = useTokenPrice('AZTEC', timeframe);

  const chartData = useMemo(() => {
    if (!data?.history?.length) return [];
    return data.history.map(p => ({
      timestamp: p.timestamp,
      price: p.price,
      date: new Date(p.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [data?.history]);

  const { minPrice, maxPrice } = useMemo(() => {
    if (!chartData.length) return { minPrice: 0, maxPrice: 0 };
    const prices = chartData.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const interval = max - min;
    return { minPrice: min - interval * 0.2, maxPrice: max + interval * 0.05 };
  }, [chartData]);

  /**
   * Price change over the selected interval: (last - first) / first * 100.
   * Uses the endpoints of the chart series so it always matches the selected timeframe.
   */
  const priceChange = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].price;
    const last = chartData[chartData.length - 1].price;
    if (first === 0) return null;
    return ((last - first) / first) * 100;
  }, [chartData]);

  const isPositive = (priceChange ?? 0) >= 0;
  const changeColor = isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400';
  const changeBg = isPositive ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20';

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 mb-8 animate-pulse">
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-3"></div>
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="h-44 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 mb-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">AZTEC Price</h3>
          <div className="flex items-baseline gap-3">
            {data?.currentPrice != null ? (
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                ${data.currentPrice.toFixed(4)}
              </span>
            ) : (
              <span className="text-2xl font-bold text-slate-400">--</span>
            )}
            {priceChange !== null && priceChange !== undefined && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${changeColor} ${changeBg}`}
                title={`Change over the last ${timeframe} days`}
              >
                {isPositive ? (
                  <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                ) : (
                  <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
                )}
                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                <span className="text-[10px] opacity-70">· {timeframe}d</span>
              </span>
            )}
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg p-0.5">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.days}
              onClick={() => setTimeframe(tf.days)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                timeframe === tf.days
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d4a017" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#d4a017" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.08} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(1, Math.floor(chartData.length / 5))}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `$${v.toFixed(3)}`}
              domain={[minPrice, maxPrice]}
              width={65}
            />
            <Tooltip content={<PriceTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#d4a017"
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-44 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
          No price data available
        </div>
      )}
    </div>
  );
}
