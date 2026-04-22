'use client';

import React, { useState } from 'react';
import { ProviderAttester } from '@/types';
import { ValidatorPerformanceGraph } from '@/components/features/validators/ValidatorPerformanceGraph';
import {
  ShieldCheckIcon,
  CubeIcon,
  ChartBarIcon,
  Bars4Icon,
  ChartBarSquareIcon
} from '@heroicons/react/24/outline';

interface AttesterDetailProps {
  attester: ProviderAttester;
  stakingTokenDecimals: number;
  stakingTokenSymbol: string;
  epochLimit: number;
}

/**
 * Component that displays detailed performance information for an attester
 */
export const AttesterDetail: React.FC<AttesterDetailProps> = ({
  attester,
  epochLimit
}) => {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const totalEpochs = attester.performanceHistory?.length || 0;

  return (
    <div className="p-4 sm:p-6 bg-white dark:bg-slate-800">
      {/* Performance History Chart */}
      {attester.performanceHistory && attester.performanceHistory.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-md font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Epoch Performance History
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Performance across the last {epochLimit} epochs participated
              </p>
            </div>

            {/* Chart Type Toggle */}
            <div className="inline-flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setChartType('area')}
                className={`p-2 rounded-md transition-all duration-200 ${chartType === 'area'
                    ? 'bg-brand-violet text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                title="Area Chart"
              >
                <Bars4Icon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`p-2 rounded-md transition-all duration-200 ${chartType === 'bar'
                    ? 'bg-brand-violet text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                title="Bar Chart"
              >
                <ChartBarSquareIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="h-64">
            <ValidatorPerformanceGraph
              performanceData={attester.performanceHistory.map(h => ({
                epochNumber: Number(h.epoch_number),
                attestationsSuccessful: Number(h.attestations_successful),
                attestationsMissed: Number(h.attestations_missed),
                checkpointsProposed: Number(h.checkpoints_proposed),
                checkpointsMined: Number(h.checkpoints_mined),
                checkpointsMissed: Number(h.checkpoints_missed),
                blocksMissed: Number(h.blocks_missed),
                performanceRate: Number(h.attestations_successful) + Number(h.attestations_missed) > 0
                  ? (Number(h.attestations_successful) / (Number(h.attestations_successful) + Number(h.attestations_missed))) * 100
                  : 0
              }))}
              metricName="Performance Rate"
              isRate={true}
              chartType={chartType}
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No performance history available
          </p>
        </div>
      )}
    </div>
  );
};
