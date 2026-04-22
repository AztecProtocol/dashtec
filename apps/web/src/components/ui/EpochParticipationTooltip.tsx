import React from 'react';
import { Tooltip } from '@/components/ui/Tooltip';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useApp } from '@/context/AppContext';
import { useDashboard } from '@/context/DashboardContext';

interface EpochParticipationTooltipProps {
  totalParticipatingEpochs: number;
  totalEpochsInTimeframe: number;
  children?: React.ReactNode;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days === 1) return `1 day${hours > 0 ? ` ${hours}h` : ''}`;
  return `${days} days${hours > 0 ? ` ${hours}h` : ''}`;
};

export const EpochParticipationTooltip: React.FC<EpochParticipationTooltipProps> = ({
  totalParticipatingEpochs,
  totalEpochsInTimeframe,
  children
}) => {
  const { networkConfig: config } = useApp();
  const { currentEpochMetrics, totalActiveValidators } = useDashboard();
  
  const { epochDurationSlots, slotDuration } = config ?? { 
    epochDurationSlots: 32,
    slotDuration: 12
  };

  const epochDurationSeconds = epochDurationSlots * slotDuration;
  const estimatedValidatorTime = totalParticipatingEpochs * epochDurationSeconds;
  
  const committeeSize = currentEpochMetrics?.validatorCommitteeSize || 48;
  const activeValidatorCount = totalActiveValidators || 17000;
  const epochsPerDay = Math.floor(86400 / epochDurationSeconds);
  const chancePerEpoch = (committeeSize / activeValidatorCount) * 100;
  const expectedEpochsPerDay = (committeeSize / activeValidatorCount) * epochsPerDay;
  const expectedDaysPerEpoch = 1 / expectedEpochsPerDay;

  const tooltipContent = (
    <div className="space-y-3 text-xs">
      <div className="font-semibold text-sm">Epoch Participation Analysis</div>
      
      {/* Actual Participation */}
      <div className="space-y-1 pb-2 border-b border-slate-600">
        <div className="font-medium text-green-400 mb-1">Actual Performance</div>
        <div>
          <span className="text-slate-400">Active Time:</span>
          <span className="ml-2 font-medium">{formatDuration(estimatedValidatorTime)}</span>
        </div>
        <div>
          <span className="text-slate-400">Epochs Participated:</span>
          <span className="ml-2 font-medium">{totalParticipatingEpochs.toLocaleString()} / {totalEpochsInTimeframe.toLocaleString()}</span>
        </div>
      </div>
      
      {/* Expected Participation */}
      <div className="space-y-1 pb-2 border-b border-slate-600">
        <div className="font-medium text-blue-400 mb-1">Network Statistics</div>
        <div>
          <span className="text-slate-400">Committee Size:</span>
          <span className="ml-2 font-medium">{committeeSize} sequencers/epoch</span>
        </div>
        <div>
          <span className="text-slate-400">Active Sequencers:</span>
          <span className="ml-2 font-medium">{activeValidatorCount.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-slate-400">Epochs per Day:</span>
          <span className="ml-2 font-medium">{epochsPerDay}</span>
        </div>
      </div>
      
      {/* Probability Calculations */}
      <div className="space-y-1">
        <div className="font-medium text-amber-400 mb-1">Selection Odds</div>
        <div>
          <span className="text-slate-400">Selected per Epoch:</span>
          <span className="ml-2 font-medium">{chancePerEpoch.toFixed(2)}% chance</span>
        </div>
        <div>
          <span className="text-slate-400">Expected per Day:</span>
          <span className="ml-2 font-medium">~{expectedEpochsPerDay.toFixed(1)} selections</span>
        </div>
        <div>
          <span className="text-slate-400">Typical Wait:</span>
          <span className="ml-2 font-medium">{expectedDaysPerEpoch.toFixed(1)} days between selections</span>
        </div>
      </div>
      
      <div className="text-[10px] text-slate-500 pt-1">
        Based on {formatDuration(epochDurationSeconds)} epochs with random selection
      </div>
    </div>
  );

  const defaultChildren = (
    <div className="font-medium text-slate-700 dark:text-slate-200 cursor-help inline-flex items-center">
      <span className="font-bold">{totalParticipatingEpochs.toLocaleString()}</span>
      <span className="text-slate-500 dark:text-slate-400 ml-1">/ {totalEpochsInTimeframe.toLocaleString()}</span>
      <InformationCircleIcon className="h-3.5 w-3.5 ml-1 text-slate-400 dark:text-slate-500" />
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      {children || defaultChildren}
    </Tooltip>
  );
};