'use client';

import { useState, useCallback, ReactNode, useEffect } from 'react';
import { EpochAttestationMetrics } from '@/types';
import { useDashboard } from '@/context/DashboardContext';
import { useEpochCalculations } from '@/hooks/useEpochCalculations';
import { useEarliestEpoch } from '@/hooks/useEarliestEpoch';
import { PerformanceFilterModal } from '@/components/features/dashboard/PerformanceFilterModal';
import { Modal } from '@/components/ui/Modal';
import { PresentationChartLineIcon, AdjustmentsHorizontalIcon, ArrowsPointingOutIcon, Bars4Icon, ChartBarSquareIcon, FunnelIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { TimeframeFilterButton } from '@/components/ui/TimeframeFilterButton';
import { getPerformanceColor } from '@/utils/formatters';
import { useTheme } from '@/context/ThemeContext';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';

const successColor = "#10B981";
const infoColor = "#3B82F6";

const AnimatedNumber = ({ value }: { value: number }) => {
  return <span>{value.toFixed(2)}</span>;
};

// Enhanced glassmorphism stat component
const StatDetail: React.FC<{ title: string; value: number; subtext: string; color: string }> = ({ title, value, subtext, color }) => (
  <div className="group relative p-5 rounded-2xl bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/60 transition-all duration-300 hover:shadow-lg overflow-hidden">
    {/* Subtle glow effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/5 via-transparent to-amber-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

    <div className="relative z-10">
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">{title}</p>
      <p className="text-3xl font-bold mb-1" style={{ color }}>
        <AnimatedNumber value={value ?? 0} />%
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{subtext}</p>
    </div>
  </div>
);

const AttestationMetricsSkeleton: React.FC = () => (
  <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-2xl mb-8">
    {/* Animated background elements */}
    <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/5 via-transparent to-amber-500/5"></div>
    <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-brand-violet/10 to-transparent rounded-full blur-3xl "></div>
    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-3xl  delay-1000"></div>

    <div className="relative z-10 p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <Skeleton heightClass="h-8" widthClass="w-1/2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm p-6 rounded-2xl border border-white/30 dark:border-slate-600/30">
          <Skeleton heightClass="h-6" widthClass="w-1/2 mb-3" />
          <Skeleton heightClass="h-2.5" widthClass="w-full mb-3" />
          <div className="flex justify-between">
            <Skeleton heightClass="h-5" widthClass="w-1/3" />
            <Skeleton heightClass="h-5" widthClass="w-1/3" />
          </div>
        </div>
        <div className="bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm p-6 rounded-2xl border border-white/30 dark:border-slate-600/30">
          <Skeleton heightClass="h-6" widthClass="w-1/2 mb-3" />
          <Skeleton heightClass="h-2.5" widthClass="w-full mb-3" />
          <div className="flex justify-between">
            <Skeleton heightClass="h-5" widthClass="w-1/3" />
            <Skeleton heightClass="h-5" widthClass="w-1/3" />
          </div>
        </div>
      </div>
      <div>
        <Skeleton heightClass="h-7" widthClass="w-1/3 mb-4" />
        <Skeleton heightClass="h-[350px]" widthClass="w-full" />
      </div>
    </div>
  </div>
);

const CustomCombinedRateTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="bg-slate-50 dark:bg-slate-700 test-1 bg-opacity-90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-sm">
        <p className="font-semibold text-black/80 dark:text-white mb-2">{`Epoch: ${label}`}</p>
        <div className="space-y-1">
          {payload.slice().reverse().map((p: any) => (
            <div key={p.dataKey} className="flex items-center">
              <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: p.stroke || p.fill }}></span>
              <span className="text-slate-600 dark:text-slate-300 mr-2">{p.name}:</span>
              <span className="font-semibold text-black/80 dark:text-white">{p.value.toFixed(2)}%</span>
            </div>
          ))}
        </div>
        <div className="pt-2 mt-2 border-t border-slate-700/10 dark:border-slate-700/50">
          <p className="text-slate-600 dark:text-slate-400 text-xs">
            Attestations:
            <span className="text-black dark:text-white font-medium ml-1">{dataPoint.successCount?.toLocaleString()}</span>
            <span className="text-slate-600 dark:text-slate-500"> success</span>
          </p>
          <p className="mt-1 text-slate-600 dark:text-slate-400 text-xs">
            Block Prod:
            <span className="text-black dark:text-white font-medium ml-1">{dataPoint.epochBlockProducedVolume?.toLocaleString()}</span>
            <span className="text-slate-600 dark:text-slate-500"> mined/proposed</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};


const CustomCombinedRateBarTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="bg-slate-50 dark:bg-slate-700 test-1 bg-opacity-90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-sm">
        <p className="font-semibold text-black/80 dark:text-white mb-2">{`Epoch: ${label}`}</p>
        <div className="space-y-1">
          {payload.slice().reverse().map((p: any) => (
            <div key={p.dataKey} className="flex items-center">
              <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: p.stroke || p.fill }}></span>
              <span className="text-slate-600 dark:text-slate-300 mr-2">{p.name}:</span>
              <span className="font-semibold text-black/80 dark:text-white">{p.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="pt-2 mt-2 border-t border-slate-700/10 dark:border-slate-700/50">
          <p className="text-slate-600 dark:text-slate-400 text-xs">
            Attestations:
            <span className={`ml-2 ${getPerformanceColor(((dataPoint.successCount / (dataPoint.successCount + dataPoint.missCount)) * 100).toFixed(2))}`}>
              ({((dataPoint.successCount / (dataPoint.successCount + dataPoint.missCount)) * 100).toFixed(2)}% rate)
            </span>
          </p>
          <p className="mt-1 text-slate-600 dark:text-slate-400 text-xs">
            Block Prod:
            <span className={`ml-2 ${getPerformanceColor(((dataPoint.epochBlockProducedVolume / (dataPoint.epochBlockProducedVolume + dataPoint.epochBlockMissedVolume)) * 100).toFixed(2))}`}>
              ({((dataPoint.epochBlockProducedVolume / (dataPoint.epochBlockProducedVolume + dataPoint.epochBlockMissedVolume)) * 100).toFixed(2)}% rate)
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const MAX_DATA_POINTS = 100;

const TrendGraph: React.FC<{ chartType: 'area' | 'bar', data: EpochAttestationMetrics[] }> = ({ chartType, data }) => {
  const isLaggy = data.length > MAX_DATA_POINTS;
  let displayData = data;

  if (isLaggy) {
    const bucketSize = Math.ceil(data.length / MAX_DATA_POINTS);
    const aggregatedData = [];
    for (let i = 0; i < data.length; i += bucketSize) {
      const bucket = data.slice(i, i + bucketSize);
      const endEpoch = bucket[bucket.length - 1].epochNumber;
      const newPoint = bucket.reduce((acc, curr) => {
        acc.successCount += curr.successCount;
        acc.missCount += curr.missCount;
        acc.epochBlockProducedVolume += curr.epochBlockProducedVolume || 0;
        acc.epochBlockMissedVolume += curr.epochBlockMissedVolume || 0;
        return acc;
      }, {
        epochNumber: `${bucket[0].epochNumber}-${endEpoch}`,
        successCount: 0, missCount: 0,
        epochBlockProducedVolume: 0, epochBlockMissedVolume: 0,
        attestationRate: 0, blockProductionRate: 0, totalAttestations: 0
      });

      const totalAtts = newPoint.successCount + newPoint.missCount;
      const totalBlocks = newPoint.epochBlockProducedVolume + newPoint.epochBlockMissedVolume;
      newPoint.attestationRate = totalAtts > 0 ? (newPoint.successCount / totalAtts) * 100 : 0;
      newPoint.blockProductionRate = totalBlocks > 0 ? (newPoint.epochBlockProducedVolume / totalBlocks) * 100 : 0;

      aggregatedData.push(newPoint);
    }
    displayData = aggregatedData as unknown as EpochAttestationMetrics[];
  }

  const animationProp = { isAnimationActive: true };

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 border border-dashed border-slate-300 dark:border-slate-700">
        <PresentationChartLineIcon className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
        <h4 className="font-semibold text-slate-600 dark:text-slate-300">No Data Available</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400">There is no historical data for the selected timeframe.</p>
      </div>
    );
  }

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={displayData} margin={{ top: 5, right: 20, bottom: 20, left: -10 }}>
          <defs>
            <linearGradient id="colorAttestation" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={successColor} stopOpacity={0.1} /><stop offset="95%" stopColor={successColor} stopOpacity={0} /></linearGradient>
            <linearGradient id="colorBlockProduction" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={infoColor} stopOpacity={0.1} /><stop offset="95%" stopColor={infoColor} stopOpacity={0} /></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} className="stroke-slate-300 dark:stroke-slate-700" />
          <XAxis dataKey="epochNumber" tickFormatter={(tick) => isLaggy ? tick : `#${tick}`} className="text-xs text-slate-500 dark:text-slate-400" axisLine={false} tickLine={false} />
          <YAxis unit="%" domain={[0, 100]} className="text-xs text-slate-500 dark:text-slate-400" axisLine={false} tickLine={false} />
          <Tooltip content={<CustomCombinedRateTooltip />} cursor={{ stroke: '#A8B2D3', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Area type="monotone" dataKey="blockProductionRate" name="Block Prod. Rate" stroke={infoColor} strokeWidth={2} fillOpacity={1} fill="url(#colorBlockProduction)" dot={false} {...animationProp} />
          <Area type="monotone" dataKey="attestationRate" name="Attestation Rate" stroke={successColor} strokeWidth={2} fillOpacity={1} fill="url(#colorAttestation)" dot={false} {...animationProp} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData} margin={{ top: 5, right: 20, bottom: 20, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} className="stroke-slate-300 dark:stroke-slate-700" />
          <XAxis dataKey="epochNumber" tickFormatter={(tick) => isLaggy ? tick : `#${tick}`} className="text-xs text-slate-500 dark:text-slate-400" axisLine={false} tickLine={false} />
          <YAxis className="text-xs text-slate-500 dark:text-slate-400" axisLine={false} tickLine={false} />
          <Tooltip content={<CustomCombinedRateBarTooltip />} cursor={{ fill: 'rgba(177, 186, 211, 0.1)' }} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />

          <Bar dataKey="successCount" name="Att. Success" stackId="attestations" fill="rgb(var(--color-success-rgb))" />
          <Bar dataKey="missCount" name="Att. Missed" stackId="attestations" fill="rgb(var(--color-danger-rgb))" />
          <Bar dataKey="epochBlockProducedVolume" name="Blocks Produced" stackId="blocks" fill="rgb(var(--color-primary-rgb))" />
          <Bar dataKey="epochBlockMissedVolume" name="Blocks Missed" stackId="blocks" fill="rgb(var(--color-warning-rgb))" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return null;
};

const AggregateStats: React.FC<{ metrics: EpochAttestationMetrics | null }> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 gap-4 mb-4 text-center">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"><Skeleton heightClass="h-16" widthClass="w-full" /></div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"><Skeleton heightClass="h-16" widthClass="w-full" /></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div className="group relative p-4 rounded-2xl bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/60 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] text-center overflow-hidden">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full "></div>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">Avg. Attestation Rate</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold mb-2" style={{ color: successColor }}>
            {(metrics.attestationRate ?? 0).toFixed(2)}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {metrics.successCount.toLocaleString()} Success / {metrics.missCount.toLocaleString()} Missed
          </p>
        </div>
      </div>

      <div className="group relative p-4 rounded-2xl bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/60 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] text-center overflow-hidden">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-sky-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full "></div>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">Avg. Block Prod. Rate</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold mb-2" style={{ color: infoColor }}>
            {(metrics.blockProductionRate ?? 0).toFixed(2)}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {(metrics.epochBlockProducedVolume ?? 0).toLocaleString()} Produced / {(metrics.epochBlockMissedVolume ?? 0).toLocaleString()} Missed
          </p>
        </div>
      </div>
    </div>
  );
}

export const AttestationMetrics: React.FC = () => {
  const configState = useNetworkConfig();
  const { currentEpoch } = useEpochCalculations(configState);
  const { currentEpochMetrics, isLoadingCurrentStats } = useDashboard();
  const { earliestEpoch } = useEarliestEpoch();

  const [historicalData, setHistoricalData] = useState<EpochAttestationMetrics[]>([]);
  const [aggregateMetrics, setAggregateMetrics] = useState<EpochAttestationMetrics | null>(null);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [startEpoch, setStartEpoch] = useState('');
  const [endEpoch, setEndEpoch] = useState('');
  const [activeFilterQuery, setActiveFilterQuery] = useState('');

  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);
  const defaultEpochLength = 10;

  const theme = useTheme();

  const attestationColors = theme.theme === 'dark'
    ? ['#10B981', '#475569'] // Dark Mode: Bright Green (green-400), Slate 600
    : ['#10B981', '#E2E8F0']; // Light Mode: Deep Green (green-600), Slate 200

  const blockColors = theme.theme === 'dark'
    ? ['#3B82F6', '#475569'] // Dark Mode: Bright Blue (blue-400), Slate 600
    : ['#3B82F6', '#E2E8F0']; // Light Mode: Strong Blue (blue-600), Slate 200

  const attestationData = [
    { name: 'Success', value: currentEpochMetrics.successCount ?? 0 },
    { name: 'Missed', value: currentEpochMetrics.missCount ?? 0 },
  ];

  const blockData = [
    { name: 'Proposed or Mined', value: currentEpochMetrics.epochBlockProducedVolume ?? 0 },
    { name: 'Missed', value: currentEpochMetrics.epochBlockMissedVolume ?? 0 },
  ];


  const fetchHistoricalGraphData = useCallback(async (filterQuery: string) => {
    setIsLoadingHistorical(true);
    try {
      const response = await fetch(`/api/dashboard/historical-rates?${filterQuery}`);
      if (!response.ok) throw new Error("Failed to fetch graph data");
      const data = await response.json();
      setHistoricalData(data.historicalGraphData || []);
      setAggregateMetrics(data.aggregateMetrics || null);
    } catch (error) {
      console.error(error);
      setHistoricalData([]);
    } finally {
      setIsLoadingHistorical(false);
    }
  }, []);

  useEffect(() => {
    if (earliestEpoch !== null && currentEpoch > 0 && !activeFilterQuery) {
      const defaultEnd = currentEpoch;
      const defaultStart = Math.max(earliestEpoch, defaultEnd - defaultEpochLength);
      const params = new URLSearchParams();
      params.append('startEpoch', String(defaultStart));
      params.append('endEpoch', String(defaultEnd));
      const query = params.toString();
      setStartEpoch(String(defaultStart));
      setEndEpoch(String(defaultEnd));
      setActiveFilterQuery(query);
      fetchHistoricalGraphData(query);
    }
  }, [earliestEpoch, currentEpoch, activeFilterQuery, fetchHistoricalGraphData, defaultEpochLength]);

  const handleFilterSubmit = () => {
    const params = new URLSearchParams();
    if (startEpoch) params.append('startEpoch', startEpoch);
    if (endEpoch) params.append('endEpoch', endEpoch);
    const query = params.toString();
    setActiveFilterQuery(query);
    fetchHistoricalGraphData(query);
  };

  if (isLoadingCurrentStats && historicalData.length === 0 && aggregateMetrics === null) {
    return <AttestationMetricsSkeleton />
  }


  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-2xl mb-8">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/5 via-transparent to-amber-500/5"></div>
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-brand-violet/10 to-transparent rounded-full blur-3xl "></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-3xl  delay-1000"></div>

      <div className="relative z-10 p-6 sm:p-8">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 to-brand-violet/20 rounded-xl blur-md "></div>
                  <div className="relative p-2 bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-700/80 dark:to-slate-800/60 backdrop-blur-sm rounded-xl border border-white/20 dark:border-slate-600/50 shadow-lg">
                    <ChartBarSquareIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-amber-600 to-brand-violet dark:from-slate-100 dark:via-amber-400 dark:to-accent-purple-light bg-clip-text text-transparent">
                  Historical Trends
                </h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Performance analytics spanning Epochs {startEpoch} to {endEpoch}
              </p>
            </div>

            <TimeframeFilterButton
              isFilterActive={activeFilterQuery !== ''}
              startEpoch={startEpoch}
              endEpoch={endEpoch}
              onClick={() => setIsFilterModalOpen(true)}
            />
          </div>

          <AggregateStats metrics={aggregateMetrics} />

          {/* Enhanced Chart Controls */}
          <div className="relative flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
            <div className="absolute -top-2 right-0 z-10 flex items-center gap-2">
              <div className="flex items-center rounded-xl bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 p-1 shadow-lg">
                <button
                  onClick={() => setChartType('area')}
                  title="Area Chart View"
                  className={`p-2 rounded-lg transition-all duration-300 ${chartType === 'area' ? 'bg-brand-violet text-white shadow-lg scale-105' : 'hover:bg-white/50 dark:hover:bg-slate-600/50 text-slate-600 dark:text-slate-300'}`}
                >
                  <Bars4Icon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  title="Bar Chart View"
                  className={`p-2 rounded-lg transition-all duration-300 ${chartType === 'bar' ? 'bg-brand-violet text-white shadow-lg scale-105' : 'hover:bg-white/50 dark:hover:bg-slate-600/50 text-slate-600 dark:text-slate-300'}`}
                >
                  <ChartBarSquareIcon className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => setIsGraphFullscreen(true)}
                title="Expand chart"
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/60 transition-all duration-300 hover:shadow-lg hover:scale-105 shadow-lg"
              >
                <ArrowsPointingOutIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Enhanced Chart Container */}
          <div className="relative rounded-2xl bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 p-4 shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/20 via-transparent to-amber-50/10 dark:from-slate-800/20 dark:to-amber-900/10"></div>
            <div className="relative z-10 w-full h-[400px]">
              <TrendGraph chartType={chartType} data={historicalData} />
            </div>
          </div>
        </div>
      </div>

      <PerformanceFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Rate Trend Graph"
        startEpoch={startEpoch}
        endEpoch={endEpoch}
        setStartEpoch={setStartEpoch}
        setEndEpoch={setEndEpoch}
        handleFilterSubmit={handleFilterSubmit}
      />

      <Modal
        isOpen={isGraphFullscreen}
        onClose={() => setIsGraphFullscreen(false)}
        title={`Epoch ${startEpoch} to ${endEpoch} - Combined Rate Trend`}
        fullscreen={true}
      >
        <div className="w-[95vw] h-full">
          <TrendGraph chartType={chartType} data={historicalData} />
        </div>
      </Modal>
    </div >
  );
};