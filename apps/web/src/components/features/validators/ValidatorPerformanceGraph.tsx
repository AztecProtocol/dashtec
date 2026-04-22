'use client';

import React from 'react';
import { ValidatorEpochPerformanceData } from '@/types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  type TooltipProps,
} from 'recharts';

interface ValidatorPerformanceGraphProps {
  performanceData: ValidatorEpochPerformanceData[];
  metricName?: string;
  isRate?: boolean;
  chartType: 'area' | 'bar';
}

// ─────────────────────────────────────────────────────────────────────────────
// Palette — desaturated, harmonized with brand violet. Centralized so the
// chart, tooltip, and legend stay in sync.
// ─────────────────────────────────────────────────────────────────────────────

const palette = {
  rate: '#8b5cf6',           // violet-500 — primary metric line
  rateGradientTop: '#a78bfa', // violet-400
  attSuccess: '#10b981',      // emerald-500
  attMissed: '#f43f5e',       // rose-500
  cpSuccess: '#0ea5e9',       // sky-500
  cpMissed: '#f59e0b',        // amber-500
  grid: 'rgba(148, 163, 184, 0.18)',  // slate-400 @ 18%
  cursor: 'rgba(139, 92, 246, 0.08)', // violet-500 @ 8%
} as const;

const MAX_DATA_POINTS = 150;
const CHART_MARGIN = { top: 16, right: 8, left: -16, bottom: 0 };
const AXIS_TICK_STYLE = { fontSize: 11, fill: 'currentColor' } as const;

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip
// ─────────────────────────────────────────────────────────────────────────────

interface TooltipPayloadDatum {
  attestationsSuccessful: number;
  attestationsMissed: number;
  checkpointsProposed: number;
  checkpointsMined: number;
  checkpointsMissed: number;
  blocksMissed: number;
}

const TooltipShell: React.FC<{ label: React.ReactNode; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-3 shadow-2xl ring-1 ring-slate-200/70 dark:ring-slate-700/60 min-w-[180px]">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
      {label}
    </div>
    {children}
  </div>
);

const TooltipRow: React.FC<{ swatch?: string; label: string; value: React.ReactNode; emphasize?: boolean }> = ({
  swatch,
  label,
  value,
  emphasize,
}) => (
  <div className="flex items-center justify-between gap-4 py-0.5">
    <div className="flex items-center gap-1.5 min-w-0">
      {swatch && (
        <span
          className="inline-block h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: swatch }}
        />
      )}
      <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{label}</span>
    </div>
    <span
      className={`text-xs tabular-nums ${
        emphasize
          ? 'font-semibold text-slate-900 dark:text-slate-50'
          : 'text-slate-700 dark:text-slate-200'
      }`}
    >
      {value}
    </span>
  </div>
);

const AreaChartTooltip: React.FC<TooltipProps<number, string> & { metricName?: string; isRate?: boolean }> = ({
  active,
  payload,
  label,
  metricName,
  isRate,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload as TooltipPayloadDatum & { value: number };
  const valueDisplay = isRate
    ? `${(payload[0].value as number).toFixed(1)}%`
    : (payload[0].value as number).toLocaleString();

  return (
    <TooltipShell label={`Epoch ${label}`}>
      <TooltipRow swatch={palette.rate} label={metricName || 'Value'} value={valueDisplay} emphasize />
      {isRate && (
        <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/60 space-y-0.5">
          <TooltipRow swatch={palette.attSuccess} label="Attestations succeeded" value={data.attestationsSuccessful.toLocaleString()} />
          <TooltipRow swatch={palette.attMissed} label="Attestations missed" value={data.attestationsMissed.toLocaleString()} />
          <TooltipRow swatch={palette.cpSuccess} label="Checkpoints proposed/mined" value={(data.checkpointsMined + data.checkpointsProposed).toLocaleString()} />
          <TooltipRow swatch={palette.cpMissed} label="Checkpoints missed" value={data.checkpointsMissed.toLocaleString()} />
          <TooltipRow label="Blocks missed" value={data.blocksMissed.toLocaleString()} />
        </div>
      )}
    </TooltipShell>
  );
};

const BarChartTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <TooltipShell label={`Epoch #${label}`}>
      <div className="space-y-0.5">
        {payload.map((p, idx) => (
          <TooltipRow
            key={idx}
            swatch={p.fill as string}
            label={p.name as string}
            value={(p.value as number).toLocaleString()}
            emphasize
          />
        ))}
      </div>
    </TooltipShell>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Custom legend — pill-style chips instead of Recharts default
// ─────────────────────────────────────────────────────────────────────────────

const CustomLegend: React.FC<{ payload?: ReadonlyArray<{ value: string; color?: string }> }> = ({ payload }) => {
  if (!payload || payload.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
      {payload.map((entry, idx) => (
        <div
          key={idx}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/80 dark:bg-slate-700/50 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300"
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.value}
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Data prep
// ─────────────────────────────────────────────────────────────────────────────

interface PreparedDatum extends TooltipPayloadDatum {
  epochNumber: number | string;
}

function prepareData(
  performanceData: ValidatorEpochPerformanceData[],
): { data: PreparedDatum[]; isAggregated: boolean } {
  const sorted = [...performanceData].sort((a, b) => a.epochNumber - b.epochNumber);
  if (sorted.length <= MAX_DATA_POINTS) {
    return { data: sorted as unknown as PreparedDatum[], isAggregated: false };
  }

  const bucketSize = Math.ceil(sorted.length / MAX_DATA_POINTS);
  const aggregated: PreparedDatum[] = [];
  for (let i = 0; i < sorted.length; i += bucketSize) {
    const bucket = sorted.slice(i, i + bucketSize);
    const endEpoch = bucket[bucket.length - 1].epochNumber;
    const totals = bucket.reduce<TooltipPayloadDatum>(
      (acc, curr) => ({
        attestationsSuccessful: acc.attestationsSuccessful + curr.attestationsSuccessful,
        attestationsMissed: acc.attestationsMissed + curr.attestationsMissed,
        checkpointsProposed: acc.checkpointsProposed + curr.checkpointsProposed,
        checkpointsMined: acc.checkpointsMined + curr.checkpointsMined,
        checkpointsMissed: acc.checkpointsMissed + curr.checkpointsMissed,
        blocksMissed: acc.blocksMissed + curr.blocksMissed,
      }),
      {
        attestationsSuccessful: 0,
        attestationsMissed: 0,
        checkpointsProposed: 0,
        checkpointsMined: 0,
        checkpointsMissed: 0,
        blocksMissed: 0,
      },
    );
    aggregated.push({
      epochNumber: `${bucket[0].epochNumber}–${endEpoch}`,
      ...totals,
    });
  }
  return { data: aggregated, isAggregated: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center">
    <p className="text-sm text-slate-500 dark:text-slate-400">
      No historical performance data available.
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const ValidatorPerformanceGraph: React.FC<ValidatorPerformanceGraphProps> = ({
  performanceData,
  metricName = 'Performance',
  isRate = false,
  chartType,
}) => {
  if (!performanceData || performanceData.length === 0) return <EmptyState />;

  const { data: displayData, isAggregated } = prepareData(performanceData);
  const formatXTick = (tick: number | string) =>
    isAggregated || typeof tick === 'string' ? String(tick) : `#${tick}`;

  if (chartType === 'area') {
    const areaData = displayData.map(d => {
      const total = d.attestationsSuccessful + d.attestationsMissed;
      const value = total > 0 ? (d.attestationsSuccessful / total) * 100 : 100;
      return { ...d, value };
    });

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={areaData} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="vpg-area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.rateGradientTop} stopOpacity={0.45} />
              <stop offset="60%" stopColor={palette.rate} stopOpacity={0.12} />
              <stop offset="100%" stopColor={palette.rate} stopOpacity={0} />
            </linearGradient>
            <filter id="vpg-area-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid stroke={palette.grid} strokeDasharray="2 6" vertical={false} />
          <XAxis
            dataKey="epochNumber"
            tickFormatter={formatXTick}
            tick={AXIS_TICK_STYLE}
            tickLine={false}
            axisLine={false}
            padding={{ left: 12, right: 12 }}
            className="text-slate-500 dark:text-slate-400"
            minTickGap={24}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(t) => `${t}%`}
            tick={AXIS_TICK_STYLE}
            tickLine={false}
            axisLine={false}
            width={44}
            className="text-slate-500 dark:text-slate-400"
          />
          <Tooltip
            content={<AreaChartTooltip metricName={metricName} isRate={isRate} />}
            cursor={{ stroke: palette.rate, strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.5 }}
            wrapperStyle={{ outline: 'none' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name={metricName}
            stroke={palette.rate}
            strokeWidth={2.25}
            fill="url(#vpg-area-gradient)"
            dot={false}
            activeDot={{
              r: 5,
              fill: palette.rate,
              stroke: 'rgba(139, 92, 246, 0.25)',
              strokeWidth: 6,
              filter: 'url(#vpg-area-glow)',
            }}
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // ── BAR CHART ──────────────────────────────────────────────────────────────
  const barData = displayData.map(d => ({
    ...d,
    checkpointSuccess: (d.checkpointsProposed || 0) + (d.checkpointsMined || 0),
    checkpointMissed: (d.checkpointsMissed || 0) + (d.blocksMissed || 0),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={barData} margin={CHART_MARGIN} barCategoryGap="22%">
        <CartesianGrid stroke={palette.grid} strokeDasharray="2 6" vertical={false} />
        <XAxis
          dataKey="epochNumber"
          tickFormatter={formatXTick}
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          padding={{ left: 12, right: 12 }}
          minTickGap={24}
          className="text-slate-500 dark:text-slate-400"
        />
        <YAxis
          yAxisId="attestations"
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          width={44}
          className="text-slate-500 dark:text-slate-400"
        />
        <YAxis
          yAxisId="checkpoints"
          orientation="right"
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          width={36}
          className="text-slate-500 dark:text-slate-400"
        />
        <Tooltip
          content={<BarChartTooltip />}
          cursor={{ fill: palette.cursor }}
          wrapperStyle={{ outline: 'none' }}
        />
        <Legend content={<CustomLegend />} />
        <Bar
          yAxisId="attestations"
          dataKey="attestationsSuccessful"
          stackId="attestations"
          fill={palette.attSuccess}
          name="Attestations succeeded"
          radius={[0, 0, 0, 0]}
          maxBarSize={28}
          isAnimationActive
          animationDuration={600}
        />
        <Bar
          yAxisId="attestations"
          dataKey="attestationsMissed"
          stackId="attestations"
          fill={palette.attMissed}
          name="Attestations missed"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          isAnimationActive
          animationDuration={600}
        />
        <Bar
          yAxisId="checkpoints"
          dataKey="checkpointSuccess"
          stackId="checkpoints"
          fill={palette.cpSuccess}
          name="Checkpoints succeeded"
          radius={[0, 0, 0, 0]}
          maxBarSize={28}
          isAnimationActive
          animationDuration={600}
        />
        <Bar
          yAxisId="checkpoints"
          dataKey="checkpointMissed"
          stackId="checkpoints"
          fill={palette.cpMissed}
          name="Checkpoints / blocks missed"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          isAnimationActive
          animationDuration={600}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
