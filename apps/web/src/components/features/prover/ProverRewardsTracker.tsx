'use client';

import {
  CurrencyDollarIcon,
  ChartBarIcon,
  TrophyIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface ProverRewardsTrackerProps {
  proverAddress: string;
  onChangeAddress: () => void;
}

/**
 * Prover Rewards Tracker - Main component for tracking prover rewards
 */
export const ProverRewardsTracker: React.FC<ProverRewardsTrackerProps> = ({
  proverAddress,
  onChangeAddress,
}) => {
  // Sample data for development
  const sampleData = {
    currentEpoch: 3076,
    activityScore: {
      lastActiveEpoch: 3062,
      storedValue: 2_675_000,
      currentScore: 1_275_000,
      currentShares: 100_000
    },
    history: [
      { epoch: 2791, score: 125_000, gap: 0 },
      { epoch: 2800, score: 1_250_000, gap: 0 },
      { epoch: 2811, score: 275_000, gap: 11 }, // Large gap!
      { epoch: 2850, score: 5_150_000, gap: 0 },
      { epoch: 2900, score: 11_400_000, gap: 0 },
      { epoch: 2950, score: 15_000_000, gap: 0 },
      { epoch: 3000, score: 15_000_000, gap: 0 },
      { epoch: 3050, score: 15_000_000, gap: 0 },
      { epoch: 3062, score: 2_675_000, gap: 0 },
    ],
    financial: {
      totalGasSpent: 400,
      totalTokensEarned: 3315,
      tokenPrice: 0.035,
      netProfitUSD: -283.97
    }
  };

  // Derived calculations
  const totalRewards = sampleData.financial.totalTokensEarned;
  const totalRewardsUSD = totalRewards * sampleData.financial.tokenPrice;
  const claimedRewards = Math.floor(totalRewards * 0.85); // 85% claimed
  const pendingRewards = totalRewards - claimedRewards;
  const totalProofs = sampleData.history.length;
  const epochsSinceLastProof = sampleData.currentEpoch - sampleData.activityScore.lastActiveEpoch;

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
          <button
            onClick={onChangeAddress}
            className="px-4 py-2 text-sm bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg border border-slate-200 dark:border-slate-600 transition-colors"
          >
            Change Address
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Rewards Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-6">
          <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Rewards
              </h2>
              <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50 group-hover:bg-brand-violet/5 dark:group-hover:bg-brand-violet/10 transition-colors duration-300">
                <TrophyIcon className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-brand-violet dark:group-hover:text-accent-purple-light transition-colors duration-300" />
              </div>
            </div>
            <p className="text-3xl font-bold text-brand-violet dark:text-accent-purple-light mb-1">
              {totalRewards.toLocaleString()}
            </p>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              ${totalRewardsUSD.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Pending Rewards Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-6">
          <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pending
              </h2>
              <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50 group-hover:bg-brand-violet/5 dark:group-hover:bg-brand-violet/10 transition-colors duration-300">
                <ClockIcon className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-brand-violet dark:group-hover:text-accent-purple-light transition-colors duration-300" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {pendingRewards.toLocaleString()}
            </p>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              ${(pendingRewards * sampleData.financial.tokenPrice).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Claimed Rewards Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-6">
          <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Claimed
              </h2>
              <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50 group-hover:bg-brand-violet/5 dark:group-hover:bg-brand-violet/10 transition-colors duration-300">
                <CurrencyDollarIcon className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-brand-violet dark:group-hover:text-accent-purple-light transition-colors duration-300" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {claimedRewards.toLocaleString()}
            </p>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              ${(claimedRewards * sampleData.financial.tokenPrice).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Total Proofs Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-6">
          <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Proofs
              </h2>
              <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50 group-hover:bg-brand-violet/5 dark:group-hover:bg-brand-violet/10 transition-colors duration-300">
                <ChartBarIcon className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-brand-violet dark:group-hover:text-accent-purple-light transition-colors duration-300" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {totalProofs.toLocaleString()}
            </p>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Last: Epoch {sampleData.activityScore.lastActiveEpoch}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Summary Card */}
      <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-6">
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Recent Activity
            </h2>
            <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50">
              <ClockIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">Activity Score</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {sampleData.activityScore.currentScore.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">Current Shares</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {sampleData.activityScore.currentShares.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">Gas Spent</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                ${sampleData.financial.totalGasSpent.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Net Profit/Loss</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {sampleData.financial.netProfitUSD >= 0 ? '+' : ''}${sampleData.financial.netProfitUSD.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder for future components */}
      <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-6">
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Rewards History
            </h2>
            <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50">
              <ChartBarIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
            </div>
          </div>
          <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
            Rewards history chart coming soon...
          </div>
        </div>
      </div>
    </div>
  );
};
