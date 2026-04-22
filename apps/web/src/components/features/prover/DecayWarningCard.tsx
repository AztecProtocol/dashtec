'use client';

import { ExclamationTriangleIcon, CheckCircleIcon, ClockIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@/components/ui/Tooltip';

interface DecayWarningCardProps {
  currentScore: number;
  epochsSinceLastProof: number;
  decayRate: number; // Score lost per epoch of inactivity
}

/**
 * Decay Warning Card - Shows time-sensitive alerts about score decay
 */
export const DecayWarningCard: React.FC<DecayWarningCardProps> = ({
  currentScore,
  epochsSinceLastProof,
  decayRate,
}) => {
  // Calculate epochs until score hits zero
  const epochsUntilZero = currentScore > 0 ? Math.ceil(currentScore / decayRate) : 0;

  // Determine status and styling
  const getStatus = () => {
    if (epochsSinceLastProof === 0) {
      return {
        level: 'active',
        Icon: CheckCircleIcon,
        title: 'Active',
        message: 'Your score is not decaying. Submit proofs to increase it further.',
      };
    }

    if (epochsUntilZero < 1) {
      return {
        level: 'critical',
        Icon: ExclamationTriangleIcon,
        title: 'Critical',
        message: 'Your score will hit zero very soon! Submit a proof immediately.',
      };
    }

    if (epochsUntilZero < 5) {
      return {
        level: 'warning',
        Icon: ExclamationTriangleIcon,
        title: 'Warning',
        message: 'Your score is decaying. Submit a proof soon to maintain it.',
      };
    }

    return {
      level: 'caution',
      Icon: ClockIcon,
      title: 'Decaying',
      message: 'Your score is gradually decreasing due to inactivity.',
    };
  };

  const status = getStatus();
  const { Icon } = status;

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-6">
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50">
              <Icon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {status.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm">
                {status.message}
              </p>
            </div>
          </div>
        </div>

        {epochsSinceLastProof > 0 && (
          <div className="space-y-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-600 dark:text-slate-400">Epochs Until Score Zero</span>
                <Tooltip content="Estimated number of inactive epochs before the activity score reaches zero, based on the current decay rate">
                  <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                </Tooltip>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {epochsUntilZero}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-600 dark:text-slate-400">Score Loss Per Epoch</span>
                <Tooltip content="Points lost from the activity score for each epoch without a proof submission">
                  <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                </Tooltip>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                -{decayRate.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-600 dark:text-slate-400">Epochs Since Last Proof</span>
                <Tooltip content="Number of epochs since the last proof submission">
                  <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                </Tooltip>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {epochsSinceLastProof}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
