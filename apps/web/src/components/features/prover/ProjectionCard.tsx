'use client';

import { RocketLaunchIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface ProjectionCardProps {
  currentScore: number;
  currentShares: number;
  maxScore: number;
  maxShares: number;
  avgGasCostPerProof: number;
  avgRewardsPerProof: number;
  tokenPrice: number;
  onCalculate?: () => void;
}

/**
 * Projection Card - Shows estimates for reaching maximum shares
 */
export const ProjectionCard: React.FC<ProjectionCardProps> = ({
  currentScore,
  currentShares,
  maxScore = 15_000_000,
  maxShares = 100_000,
  avgGasCostPerProof,
  avgRewardsPerProof,
  tokenPrice,
  onCalculate,
}) => {
  // Calculate epochs needed to reach max
  const scoreNeeded = maxScore - currentScore;
  const avgScorePerProof = 100_000; // Assuming average score gain per proof
  const epochsNeeded = scoreNeeded > 0 ? Math.ceil(scoreNeeded / avgScorePerProof) : 0;

  // Estimate costs
  const totalGasCost = epochsNeeded * avgGasCostPerProof;
  const totalRewards = epochsNeeded * avgRewardsPerProof;
  const totalRewardsUSD = totalRewards * tokenPrice;
  const netProfit = totalRewardsUSD - totalGasCost;

  // Break-even calculation
  const rewardsPerProofUSD = avgRewardsPerProof * tokenPrice;
  const profitPerProof = rewardsPerProofUSD - avgGasCostPerProof;
  const breakEvenEpochs = profitPerProof > 0 ? Math.ceil(totalGasCost / profitPerProof) : Infinity;

  const isAlreadyMaxed = currentScore >= maxScore;

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-6">
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Path to Maximum
          </h2>
          <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50">
            <RocketLaunchIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
          </div>
        </div>

        {isAlreadyMaxed ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-full mb-4">
              <RocketLaunchIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Maximum Reached!
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You've achieved the maximum activity score
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Epochs Needed */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Epochs to Maximum</span>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {epochsNeeded.toLocaleString()}
              </span>
            </div>

            {/* Estimated Gas Cost */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <CurrencyDollarIcon className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Estimated Gas Cost</span>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                ${totalGasCost.toFixed(2)}
              </span>
            </div>

            {/* Expected Rewards */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <CurrencyDollarIcon className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Expected Rewards</span>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                ${totalRewardsUSD.toFixed(2)}
              </span>
            </div>

            {/* Net Profit */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <CurrencyDollarIcon className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Net Profit</span>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}
              </span>
            </div>

            {/* Break-even Timeline */}
            {breakEvenEpochs !== Infinity && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Break-even Epochs</span>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {breakEvenEpochs.toLocaleString()}
                </span>
              </div>
            )}

            {/* Calculate Button */}
            {onCalculate && (
              <button
                onClick={onCalculate}
                className="w-full mt-4 px-4 py-3 bg-brand-violet hover:bg-brand-violet/90 text-white font-semibold rounded-lg transition-colors"
              >
                Calculate Detailed Path
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
