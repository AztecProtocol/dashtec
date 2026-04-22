'use client';

import React, { useState, useCallback } from 'react';
import { EpochAttestationMetrics } from '@/types';
import { PerformanceFilterModal } from '@/components/features/dashboard/PerformanceFilterModal';
import { Modal } from '@/components/ui/Modal';
import { ArrowsPointingOutIcon, Bars4Icon, ChartBarSquareIcon } from '@heroicons/react/24/outline';
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
} from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { TimeframeFilterButton } from '@/components/ui/TimeframeFilterButton';
import { getPerformanceColor } from '@/utils/formatters';

const successColor = "#10B981";
const infoColor = "#3B82F6";

/**
 * Custom tooltip for combined rate chart
 */
const CustomCombinedRateTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="bg-slate-50 dark:bg-slate-700 bg-opacity-90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-sm">
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
            Checkpoint/Block:
            <span className="text-black dark:text-white font-medium ml-1">{dataPoint.epochBlockProducedVolume?.toLocaleString()}</span>
            <span className="text-slate-600 dark:text-slate-500"> success</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * Custom tooltip for bar chart
 */
const CustomCombinedRateBarTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="bg-slate-50 dark:bg-slate-700 bg-opacity-90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-sm">
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
            Checkpoint/Block:
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

/**
 * TrendGraph component for displaying historical performance data
 */
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
        <ChartBarSquareIcon className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
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
          <Area type="monotone" dataKey="blockProductionRate" name="Checkpoint Rate" stroke={infoColor} strokeWidth={2} fillOpacity={1} fill="url(#colorBlockProduction)" dot={false} {...animationProp} />
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
          <YAxis yAxisId="attestations" className="text-xs text-slate-500 dark:text-slate-400" axisLine={false} tickLine={false} />
          <YAxis yAxisId="checkpoints" orientation="right" className="text-xs text-slate-500 dark:text-slate-400" axisLine={false} tickLine={false} />
          <Tooltip content={<CustomCombinedRateBarTooltip />} cursor={{ fill: 'rgba(177, 186, 211, 0.1)' }} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar yAxisId="attestations" dataKey="successCount" name="Att. Success" stackId="attestations" fill="rgb(var(--color-success-rgb))" />
          <Bar yAxisId="attestations" dataKey="missCount" name="Att. Missed" stackId="attestations" fill="rgb(var(--color-danger-rgb))" />
          <Bar yAxisId="checkpoints" dataKey="epochBlockProducedVolume" name="Checkpoint Success" stackId="blocks" fill="rgb(var(--color-primary-rgb))" />
          <Bar yAxisId="checkpoints" dataKey="epochBlockMissedVolume" name="Checkpoint/Block Missed" stackId="blocks" fill="rgb(var(--color-warning-rgb))" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return null;
};

/**
 * AggregateStats component for displaying summary statistics
 */
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
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/30 border-l-2 border-l-green-500/60 dark:border-l-green-400/50 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">Avg. Attestation Rate</p>
        </div>
        <p className="text-xl sm:text-2xl font-bold mb-2" style={{ color: successColor }}>
          {(metrics.attestationRate ?? 0).toFixed(2)}%
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {metrics.successCount.toLocaleString()} Success / {metrics.missCount.toLocaleString()} Missed
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/30 border-l-2 border-l-blue-500/60 dark:border-l-blue-400/50 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">Avg. Checkpoint Rate</p>
        </div>
        <p className="text-xl sm:text-2xl font-bold mb-2" style={{ color: infoColor }}>
          {(metrics.blockProductionRate ?? 0).toFixed(2)}%
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {(metrics.epochBlockProducedVolume ?? 0).toLocaleString()} Success / {(metrics.epochBlockMissedVolume ?? 0).toLocaleString()} Missed
        </p>
      </div>
    </div>
  );
}

interface HistoricalTrendsCardProps {
  startEpoch: string;
  endEpoch: string;
  onFilterChange: (startEpoch: string, endEpoch: string) => void;
  rollupParam?: string;
}

/**
 * HistoricalTrendsCard component - Displays historical performance trends
 */
export const HistoricalTrendsCard: React.FC<HistoricalTrendsCardProps> = ({
  startEpoch,
  endEpoch,
  onFilterChange,
  rollupParam,
}) => {
  const [historicalData, setHistoricalData] = useState<EpochAttestationMetrics[]>([]);
  const [aggregateMetrics, setAggregateMetrics] = useState<EpochAttestationMetrics | null>(null);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);

  const [localStartEpoch, setLocalStartEpoch] = useState(startEpoch);
  const [localEndEpoch, setLocalEndEpoch] = useState(endEpoch);

  /**
   * Fetch historical graph data
   */
  const fetchHistoricalGraphData = useCallback(async (start: string, end: string) => {
    setIsLoadingHistorical(true);
    try {
      const params = new URLSearchParams();
      if (start) params.append('startEpoch', start);
      if (end) params.append('endEpoch', end);
      if (rollupParam) params.append('rollup', rollupParam);

      const response = await fetch(`/api/dashboard/historical-rates?${params.toString()}`);
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
  }, [rollupParam]);

  // Fetch data when epochs change
  React.useEffect(() => {
    if (startEpoch && endEpoch) {
      setLocalStartEpoch(startEpoch);
      setLocalEndEpoch(endEpoch);
      fetchHistoricalGraphData(startEpoch, endEpoch);
    } else {
      setIsLoadingHistorical(false);
    }
  }, [startEpoch, endEpoch, fetchHistoricalGraphData, rollupParam]);

  /**
   * Handle filter submission
   */
  const handleFilterSubmit = () => {
    if (localStartEpoch && localEndEpoch) {
      onFilterChange(localStartEpoch, localEndEpoch);
      fetchHistoricalGraphData(localStartEpoch, localEndEpoch);
    }
    setIsFilterModalOpen(false);
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6 h-full">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="p-1.5 sm:p-2 bg-blue-500/5 dark:bg-blue-500/10 rounded-lg border border-blue-500/20 dark:border-blue-400/20 flex-shrink-0">
              <ChartBarSquareIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                Historical Trends
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Epochs {startEpoch} to {endEpoch}
              </p>
            </div>
          </div>

          <div className="flex-shrink-0">
            <TimeframeFilterButton
              isFilterActive={!!startEpoch && !!endEpoch}
              startEpoch={startEpoch}
              endEpoch={endEpoch}
              onClick={() => setIsFilterModalOpen(true)}
            />
          </div>
        </div>

        {/* Aggregate Stats */}
        <AggregateStats metrics={aggregateMetrics} />

        {/* Enhanced Chart Controls */}
        <div className="flex justify-end items-center gap-2">
          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600/30 p-1">
            <button
              onClick={() => setChartType('area')}
              title="Area Chart View"
              className={`p-1.5 sm:p-2 rounded-md transition-all duration-200 ${chartType === 'area' ? 'bg-brand-violet text-white shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-600/50 text-slate-600 dark:text-slate-300'}`}
            >
              <Bars4Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              title="Bar Chart View"
              className={`p-1.5 sm:p-2 rounded-md transition-all duration-200 ${chartType === 'bar' ? 'bg-brand-violet text-white shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-600/50 text-slate-600 dark:text-slate-300'}`}
            >
              <ChartBarSquareIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>

          <button
            onClick={() => setIsGraphFullscreen(true)}
            title="Expand chart"
            className="p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600/30 hover:bg-slate-200 dark:hover:bg-slate-600/50 transition-colors duration-200"
          >
            <ArrowsPointingOutIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>

        {/* Enhanced Chart Container */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/30 p-3 sm:p-4 overflow-hidden">
          <div className="w-full h-[300px] sm:h-[400px]">
            {isLoadingHistorical ? (
              <div className="h-full flex items-center justify-center">
                <Skeleton heightClass="h-full" widthClass="w-full" />
              </div>
            ) : (
              <TrendGraph chartType={chartType} data={historicalData} />
            )}
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      <PerformanceFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Historical Trends"
        startEpoch={localStartEpoch}
        endEpoch={localEndEpoch}
        setStartEpoch={setLocalStartEpoch}
        setEndEpoch={setLocalEndEpoch}
        handleFilterSubmit={handleFilterSubmit}
      />

      {/* Fullscreen Modal */}
      <Modal
        isOpen={isGraphFullscreen}
        onClose={() => setIsGraphFullscreen(false)}
        title={`Epoch ${startEpoch} to ${endEpoch} - Historical Performance`}
        fullscreen={true}
      >
        <div className="w-[95vw] h-full">
          <TrendGraph chartType={chartType} data={historicalData} />
        </div>
      </Modal>
    </>
  );
};
