'use client';

import { useMemo } from 'react';
import { ValidatorPerformance } from '@/types';
import {
  CheckCircleIcon,
  CubeIcon,
  ChartBarIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Tooltip } from '@/components/ui/Tooltip';

interface WatchlistAggregatedMetricsProps {
  validators: ValidatorPerformance[];
}

/**
 * Aggregated metrics component for watchlist
 * Shows combined performance metrics across all watchlisted validators
 */
export const WatchlistAggregatedMetrics: React.FC<WatchlistAggregatedMetricsProps> = ({ validators }) => {
  const metrics = useMemo(() => {
    const totalAttestations = validators.reduce(
      (sum, v) => sum + (v.totalAttestationsSucceeded || 0) + (v.totalAttestationsMissed || 0),
      0
    );
    const successfulAttestations = validators.reduce(
      (sum, v) => sum + (v.totalAttestationsSucceeded || 0),
      0
    );
    const successfulBlocks = validators.reduce(
      (sum, v) => sum + (v.totalCheckpointsProposed || 0) + (v.totalCheckpointsMined || 0),
      0
    );
    const totalBlocks = validators.reduce(
      (sum, v) => sum + (v.totalCheckpointsProposed || 0) + (v.totalCheckpointsMined || 0) + (v.totalCheckpointsMissed || 0) + (v.totalBlocksMissed || 0),
      0
    );
    const attestationRate = totalAttestations > 0 ? (successfulAttestations / totalAttestations) * 100 : 0;
    const blockProductionRate = totalBlocks > 0 ? (successfulBlocks / totalBlocks) * 100 : 0;

    return {
      totalAttestations,
      successfulAttestations,
      attestationRate,
      successfulBlocks,
      totalBlocks,
      blockProductionRate,
    };
  }, [validators]);

  return (
    <div className="relative overflow-hidden bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 shadow-lg rounded-xl p-5 sm:p-6 hover:shadow-xl transition-all duration-300">
      <div>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-500/10 dark:bg-yellow-400/10 rounded-lg">
            <ChartBarIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Performance Overview
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Aggregate metrics from all watchlisted sequencers
            </p>
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-4">
          {/* Attestation Success */}
          <div className="group relative overflow-hidden bg-white/80 dark:bg-slate-800/80 rounded-lg p-4 border border-slate-200/30 dark:border-slate-700/30 shadow-sm hover:shadow-md transition-all duration-300">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-green-500/10 dark:bg-green-400/10">
                  <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Attestation Rate</h3>
                <Tooltip content="Combined attestation success rate across all watchlisted sequencers from their last 10 participated epochs. Shows total successful attestations vs total attestations.">
                  <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                </Tooltip>
              </div>
              <div className="space-y-0.5">
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{metrics.attestationRate.toFixed(1)}%</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{metrics.successfulAttestations.toLocaleString()} / {metrics.totalAttestations.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Checkpoint Proposals */}
          <div className="group relative overflow-hidden bg-white/80 dark:bg-slate-800/80 rounded-lg p-4 border border-slate-200/30 dark:border-slate-700/30 shadow-sm hover:shadow-md transition-all duration-300">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-blue-500/10 dark:bg-blue-400/10">
                  <CubeIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Proposal Rate</h3>
                <Tooltip content={<>Combined proposal rate across all watchlisted sequencers from their last 10 participated epochs.<br />Checkpoint missed: blocks were proposed but checkpoint was not attested.<br />Block missed: no block proposals were sent at all.</>}>
                  <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                </Tooltip>
              </div>
              <div className="space-y-0.5">
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{metrics.blockProductionRate.toFixed(1)}%</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{metrics.successfulBlocks.toLocaleString()} / {metrics.totalBlocks.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
