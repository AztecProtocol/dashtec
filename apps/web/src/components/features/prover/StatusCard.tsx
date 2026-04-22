'use client';

import { ClockIcon, ChartBarIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@/components/ui/Tooltip';

interface StatusCardProps {
  currentScore: number;
  lastActiveEpoch: number;
  currentEpoch: number;
  currentShares: number;
  maxScore: number;
}

/**
 * Status Card - Displays current activity score and key metrics
 */
export const StatusCard: React.FC<StatusCardProps> = ({
  currentScore,
  lastActiveEpoch,
  currentEpoch,
  currentShares,
  maxScore = 15_000_000,
}) => {
  const epochsSinceLastProof = currentEpoch - lastActiveEpoch;

  // Calculate share multiplier (1.0x to 10.0x based on shares)
  const shareMultiplier = (currentShares / 100_000).toFixed(1);

  // Calculate progress percentage to max score
  const progressPercentage = (currentScore / maxScore) * 100;

  // Use consistent brand color for score
  const getScoreColor = () => {
    return 'text-brand-violet dark:text-accent-purple-light';
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-6 lg:col-span-2">
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Activity Score Status
          </h2>
          <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50">
            <ChartBarIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
          </div>
        </div>

        <div className="space-y-6">
          {/* Current Score - Large Display */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Current Activity Score
              </span>
              <Tooltip content="Points accumulated by submitting proofs. Increases by 125,000 per proof and decays each epoch without activity. Maximum score is 15,000,000">
                <InformationCircleIcon className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </Tooltip>
            </div>
            <div className={`text-5xl font-bold ${getScoreColor()} mb-2`}>
              {currentScore.toLocaleString()}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              of {maxScore.toLocaleString()} maximum
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span>Progress to Max</span>
              <span>{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-violet dark:bg-accent-purple-light transition-all duration-500"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Last Active Epoch
                </span>
                <Tooltip content="The most recent epoch in which this prover submitted a proof">
                  <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                </Tooltip>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {lastActiveEpoch}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Epochs Since Last Proof
                </span>
                <Tooltip content="Number of epochs since the last proof submission. Score decays each inactive epoch">
                  <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                </Tooltip>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {epochsSinceLastProof}
                <ClockIcon className="h-5 w-5 text-slate-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Share Multiplier
                </span>
                <Tooltip content="Multiplier applied to base shares (1.0x to 10.0x). Higher activity scores yield a higher multiplier via a quadratic formula">
                  <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                </Tooltip>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {shareMultiplier}x
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
