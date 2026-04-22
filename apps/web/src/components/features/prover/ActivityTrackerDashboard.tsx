'use client';

import { useState } from 'react';
import { StatusCard } from './StatusCard';
import { DecayWarningCard } from './DecayWarningCard';
import { ProjectionCard } from './ProjectionCard';
import { FinancialMetricsCard } from './FinancialMetricsCard';
import { ScoreProgressionChart } from './ScoreProgressionChart';
import { ProofHistoryTable } from './ProofHistoryTable';
import { SharesCalculator } from './SharesCalculator';
import { useProverData } from '@/hooks/queries/prover/useProverData';
import { useRollupFilter } from '@/hooks/useRollupFilter';

interface ActivityTrackerDashboardProps {
  proverAddress: string;
  onChangeAddress: () => void;
}

/**
 * Activity Tracker Dashboard - Comprehensive dashboard for tracking prover activity score
 */
export const ActivityTrackerDashboard: React.FC<ActivityTrackerDashboardProps> = ({
  proverAddress,
  onChangeAddress,
}) => {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const { rollupParam } = useRollupFilter();

  // Fetch all prover data in one call
  const { data, isLoading } = useProverData(proverAddress, rollupParam);


  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Address Bar Skeleton */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-96"></div>
        </div>

        {/* Top Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-6"></div>
            <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded w-64 mb-4"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-6"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-6"></div>
            <div className="space-y-4">
              <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>

        {/* Chart Skeleton */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-6"></div>
          <div className="h-80 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>

        {/* Table Skeleton */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-6"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Failed to load prover data or no proofs found for this address
          </p>
          <button
            onClick={onChangeAddress}
            className="px-4 py-2 text-sm bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg border border-slate-200 dark:border-slate-600 transition-colors"
          >
            Try Another Address
          </button>
        </div>
      </div>
    );
  }

  const { config, summary, history, financial } = data;

  // Calculate epochs since last proof
  const epochsSinceLastProof = summary.currentEpoch - summary.activityScore.lastActiveEpoch;

  // Transform history data for chart and table
  const transformedHistory = history.data.map((item) => ({
    epoch: item.epoch,
    score: item.score,
    gap: item.gapFromPrevious,
    txHash: item.txHash,
    scoreBefore: item.scoreBefore,
    scoreAfter: item.scoreAfter,
    shares: item.shares,
    accumulatedProvingEpochs: item.accumulatedProvingEpochs,
    accumulatedMissedEpochs: item.accumulatedMissedEpochs,
  }));

  // Calculate averages for projections
  const totalProofs = summary.stats.totalProofsSubmitted;
  const avgGasCostPerProof = totalProofs > 0
    ? financial?.costs.totalGasCostUsd || 0 / totalProofs
    : 0;
  const avgRewardsPerProof = totalProofs > 0
    ? financial?.rewards.totalTokensEarned || 0 / totalProofs
    : 0;

  return (
    <div className="space-y-6">
      {/* Address Bar */}
      <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Tracking Prover
            </div>
            <div className="font-mono text-sm text-slate-900 dark:text-slate-100 truncate">
              {proverAddress}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="px-4 py-2 text-sm bg-brand-violet hover:bg-brand-violet/90 text-white font-medium rounded-lg transition-colors"
            >
              Shares Calculator
            </button>
            <button
              onClick={onChangeAddress}
              className="px-4 py-2 text-sm bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg border border-slate-200 dark:border-slate-600 transition-colors"
            >
              Change Address
            </button>
          </div>
        </div>
      </div>

      {/* Top Row: Status Card (large) + Decay Warning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatusCard
          currentScore={summary.activityScore.currentScore}
          lastActiveEpoch={summary.activityScore.lastActiveEpoch}
          currentEpoch={summary.currentEpoch}
          currentShares={summary.activityScore.currentShares}
          maxScore={config.maxScore}
        />
        <DecayWarningCard
          currentScore={summary.activityScore.currentScore}
          epochsSinceLastProof={epochsSinceLastProof}
          decayRate={config.decayPerEpoch}
        />
      </div>

      {/* Middle Row: Projection + Financial Metrics */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectionCard
          currentScore={gapInfo.estimatedCurrentScore}
          currentShares={summary.activityScore.currentShares}
          maxScore={config.maxScore}
          maxShares={config.maxShares}
          avgGasCostPerProof={avgGasCostPerProof}
          avgRewardsPerProof={avgRewardsPerProof}
          tokenPrice={financial.rewards.tokenPrice}
          onCalculate={() => setIsCalculatorOpen(true)}
        />
        <FinancialMetricsCard
          totalGasSpent={financial.costs.totalGasCostUsd}
          totalTokensEarned={financial.rewards.totalTokensEarned}
          tokenPrice={financial.rewards.tokenPrice}
          totalProofs={totalProofs}
        />
      </div> */}

      {/* Score Progression Chart */}
      <ScoreProgressionChart
        history={transformedHistory}
        maxScore={config.maxScore}
      />

      {/* Proof History Table */}
      <ProofHistoryTable
        history={transformedHistory}
        currentEpoch={history.currentEpoch}
      />

      {/* Shares Calculator Modal */}
      <SharesCalculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        maxScore={config.maxScore}
        maxShares={config.maxShares}
      />
    </div>
  );
};
