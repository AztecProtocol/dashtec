'use client';

import { CurrencyDollarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

interface FinancialMetricsCardProps {
  totalGasSpent: number;
  totalTokensEarned: number;
  tokenPrice: number;
  totalProofs: number;
}

/**
 * Financial Metrics Card - Displays financial performance metrics
 */
export const FinancialMetricsCard: React.FC<FinancialMetricsCardProps> = ({
  totalGasSpent,
  totalTokensEarned,
  tokenPrice,
  totalProofs,
}) => {
  const totalRewardsUSD = totalTokensEarned * tokenPrice;
  const netProfitLoss = totalRewardsUSD - totalGasSpent;
  const roi = totalGasSpent > 0 ? ((netProfitLoss / totalGasSpent) * 100) : 0;
  const avgCostPerEpoch = totalProofs > 0 ? totalGasSpent / totalProofs : 0;
  const avgRewardsPerEpoch = totalProofs > 0 ? totalRewardsUSD / totalProofs : 0;

  const isProfitable = netProfitLoss >= 0;

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-6">
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Financial Metrics
          </h2>
          <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50">
            <CurrencyDollarIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
          </div>
        </div>

        <div className="space-y-4">
          {/* Total Gas Spent */}
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Gas Spent</span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              ${totalGasSpent.toFixed(2)}
            </span>
          </div>

          {/* Total Rewards Earned */}
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Rewards</div>
              <div className="text-xs text-slate-500 dark:text-slate-500">
                {totalTokensEarned.toLocaleString()} tokens
              </div>
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              ${totalRewardsUSD.toFixed(2)}
            </span>
          </div>

          {/* Net Profit/Loss - Prominent Display */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {isProfitable ? (
                  <ArrowTrendingUpIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                ) : (
                  <ArrowTrendingDownIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                )}
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Net {isProfitable ? 'Profit' : 'Loss'}
                </span>
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {isProfitable ? '+' : ''}${netProfitLoss.toFixed(2)}
              </span>
            </div>
          </div>

          {/* ROI Percentage */}
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
            <span className="text-sm text-slate-600 dark:text-slate-400">ROI</span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
            </span>
          </div>

          {/* Average Cost Per Epoch */}
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
            <span className="text-sm text-slate-600 dark:text-slate-400">Avg Cost / Epoch</span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              ${avgCostPerEpoch.toFixed(2)}
            </span>
          </div>

          {/* Average Rewards Per Epoch */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Avg Rewards / Epoch</span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              ${avgRewardsPerEpoch.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
