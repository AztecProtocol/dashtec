'use client';

import { useMemo } from 'react';
import { ValidatorPerformance } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Tooltip } from '@/components/ui/Tooltip';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface SequencerMiniChartProps {
  validator: ValidatorPerformance;
}

/**
 * Mini performance chart for individual sequencer
 * Shows stacked bar chart of attestations and blocks (success vs missed) over last 10 epochs
 */
export const SequencerMiniChart: React.FC<SequencerMiniChartProps> = ({ validator }) => {
  const chartData = useMemo(() => {
    const history = validator.epochPerformanceHistory || [];

    if (history.length === 0) {
      return { data: [], hasData: false };
    }

    // Prepare data for stacked bar chart
    const data = history.map(epoch => ({
      epoch: epoch.epochNumber,
      attestationsSuccess: epoch.attestationsSuccessful,
      attestationsMissed: epoch.attestationsMissed,
      checkpointSuccess: epoch.checkpointsProposed + epoch.checkpointsMined,
      blocksMissed: epoch.blocksMissed,
    })).reverse(); // Reverse to show oldest to newest

    return { data, hasData: true };
  }, [validator.epochPerformanceHistory]);

  const metrics = useMemo(() => {
    const successfulAttestations = validator.totalAttestationsSucceeded || 0;
    const totalAttestations = (validator.totalAttestationsSucceeded || 0) + (validator.totalAttestationsMissed || 0);
    const successfulBlocks = (validator.totalCheckpointsProposed || 0) + (validator.totalCheckpointsMined || 0);
    const totalBlocks = (validator.totalCheckpointsProposed || 0) + (validator.totalCheckpointsMined || 0) + (validator.totalCheckpointsMissed || 0) + (validator.totalBlocksMissed || 0);

    const attestationSuccessRate = totalAttestations > 0
      ? (successfulAttestations / totalAttestations) * 100
      : 0;

    const blockProductionRate = totalBlocks > 0
      ? (successfulBlocks / totalBlocks) * 100
      : 0;

    return {
      attestationSuccessRate,
      successfulAttestations,
      totalAttestations,
      blockProductionRate,
      successfulBlocks,
      totalBlocks,
      performanceScore: (validator.performanceScore || 0),
    };
  }, [validator]);


  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-700/30 dark:to-slate-700/10 border border-slate-200/50 dark:border-slate-600/20 p-4">
      <div className="space-y-3">
        {chartData.hasData ? (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-700/20 dark:to-slate-800/20 rounded-lg p-3 border border-slate-200/50 dark:border-slate-600/20">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData.data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-300 dark:text-slate-600" opacity={0.3} />
                <XAxis
                  dataKey="epoch"
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  className="text-slate-600 dark:text-slate-400"
                  tickLine={false}
                  axisLine={false}
                  name="Epoch"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  className="text-slate-600 dark:text-slate-400"
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  contentStyle={{
                    backgroundColor: 'rgb(30 41 59)',
                    border: '1px solid rgb(71 85 105)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'rgb(226 232 240)' }}
                  itemStyle={{ color: 'rgb(226 232 240)' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '10px' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="attestationsSuccess" stackId="attestations" fill="#10b981" name="Att. Success" />
                <Bar dataKey="attestationsMissed" stackId="attestations" fill="#ef4444" name="Att. Missed" />
                <Bar dataKey="checkpointSuccess" stackId="blocks" fill="#3b82f6" name="Checkpoint Success" />
                <Bar dataKey="blocksMissed" stackId="blocks" fill="#f97316" name="Checkpoint/Block Missed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-700/20 dark:to-slate-800/20 rounded-lg p-6 text-center border border-slate-200/50 dark:border-slate-600/20">
            <p className="text-xs text-slate-500 dark:text-slate-400">No historical data</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-3">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-700/20 dark:to-slate-800/20 rounded-lg p-2 border border-slate-200/50 dark:border-slate-600/20">
            <div className="flex items-center gap-1 mb-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">Attestation Rate</div>
              <Tooltip content="Percentage of successful attestations out of total attestations in the last 10 participated epochs">
                <InformationCircleIcon className="h-3 w-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </Tooltip>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {metrics.attestationSuccessRate.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {metrics.successfulAttestations.toLocaleString()} / {metrics.totalAttestations.toLocaleString()}
            </p>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-700/20 dark:to-slate-800/20 rounded-lg p-2 border border-slate-200/50 dark:border-slate-600/20">
            <div className="flex items-center gap-1 mb-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">Proposal Rate</div>
              <Tooltip content={<>Percentage of successful proposals out of total assigned slots in the last 10 participated epochs.<br />Checkpoint missed: blocks were proposed but checkpoint was not attested.<br />Block missed: no block proposals were sent at all.</>}>
                <InformationCircleIcon className="h-3 w-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </Tooltip>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {metrics.blockProductionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {metrics.successfulBlocks.toLocaleString()} / {metrics.totalBlocks.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
