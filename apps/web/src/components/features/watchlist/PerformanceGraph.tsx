'use client';

import { useMemo } from 'react';
import { ValidatorPerformance } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

interface PerformanceGraphProps {
  validators: ValidatorPerformance[];
}

/**
 * Performance graph showing aggregated metrics over time using bar chart
 * Visual representation of collective validator performance across sequencers
 */
export const PerformanceGraph: React.FC<PerformanceGraphProps> = ({ validators }) => {
  const graphData = useMemo(() => {
    if (validators.length === 0) return [];

    // Create data points for each validator
    const dataPoints = validators.map((v) => {
      const totalAttestations = (v.totalAttestationsSucceeded || 0) + (v.totalAttestationsMissed || 0);
      const attestationRate = totalAttestations > 0 ? ((v.totalAttestationsSucceeded || 0) / totalAttestations) * 100 : 0;

      const totalBlocks = (v.totalCheckpointsProposed || 0) + (v.totalCheckpointsMined || 0) + (v.totalCheckpointsMissed || 0) + (v.totalBlocksMissed || 0);
      const blockRate = totalBlocks > 0 ? (((v.totalCheckpointsProposed || 0) + (v.totalCheckpointsMined || 0)) / totalBlocks) * 100 : 0;

      return {
        name: v.name || v.x_handle || `V${v.index}`,
        attestationRate: parseFloat(attestationRate.toFixed(1)),
        blockRate: parseFloat(blockRate.toFixed(1)),
        performanceScore: parseFloat(((v.performanceScore || 0) * 100).toFixed(1)),
        rank: v.rank,
      };
    }).sort((a, b) => a.rank - b.rank);

    return dataPoints;
  }, [validators]);

  if (graphData.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 shadow-lg p-5 sm:p-6">
        <div className="text-center py-8">
          <p className="text-sm text-slate-600 dark:text-slate-400">No data available for graph</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 shadow-lg p-4 sm:p-5 hover:shadow-xl transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="mb-4">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            Performance Comparison
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Ranked by performance score
          </p>
        </div>

        {/* Graph */}
        <div className="relative bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-700/20 dark:to-slate-800/20 rounded-lg p-3 sm:p-4 border border-slate-200/50 dark:border-slate-600/20">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={graphData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-300 dark:text-slate-600" opacity={0.3} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-slate-600 dark:text-slate-400"
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-slate-600 dark:text-slate-400"
              domain={[0, 100]}
              label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgb(30 41 59)',
                border: '1px solid rgb(71 85 105)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'rgb(226 232 240)', fontWeight: 'bold' }}
              itemStyle={{ color: 'rgb(226 232 240)' }}
              formatter={(value: number) => `${value}%`}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              iconType="circle"
              iconSize={8}
            />
            <Bar dataKey="performanceScore" fill="#D4A017" name="Performance Score" />
            <Bar dataKey="attestationRate" fill="#10b981" name="Attestation Rate" />
            <Bar dataKey="blockRate" fill="#3b82f6" name="Block Rate" />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
