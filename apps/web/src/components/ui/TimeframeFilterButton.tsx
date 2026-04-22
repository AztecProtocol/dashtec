'use client';

import { FunnelIcon, ChevronDownIcon, ClockIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { useEpochCalculations } from '@/hooks/useEpochCalculations';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';
import { useEarliestEpoch } from '@/hooks/useEarliestEpoch';

interface TimeframeFilterButtonProps {
  startEpoch: string | number;
  endEpoch: string | number;
  isFilterActive: boolean;
  onClick: () => void;
}

export const TimeframeFilterButton: React.FC<TimeframeFilterButtonProps> = ({
  startEpoch,
  endEpoch,
  isFilterActive,
  onClick,
}) => {
  const timeframeText = isFilterActive
    ? `Epochs: ${startEpoch || '?'} - ${endEpoch || '?'}`
    : 'All Time';

  const configState = useNetworkConfig();
  const { currentEpoch } = useEpochCalculations(configState);
  const { earliestEpoch } = useEarliestEpoch();
  
  return (
    <div className="relative group">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-violet/20 to-amber-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <button
        onClick={onClick}
        className={`
          relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl w-full sm:w-auto justify-center
          ${isFilterActive 
            ? 'bg-gradient-to-r from-brand-violet/20 to-amber-600/10 text-brand-violet border-brand-violet/30 backdrop-blur-sm' 
            : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-700 dark:text-slate-300 border-white/20 dark:border-slate-700/50 hover:border-brand-violet/30'
          }
          border
        `}
      >
        {/* Icon with conditional styling */}
        <div className={`flex-shrink-0 ${isFilterActive ? 'text-brand-violet' : 'text-slate-500 dark:text-slate-400'}`}>
          {isFilterActive ? (
            <ClockIcon className="h-4 w-4" />
          ) : (
            <FunnelIcon className="h-4 w-4" />
          )}
        </div>
        
        {/* Text */}
        <span className="whitespace-nowrap font-medium">
          {timeframeText}
        </span>
        
        {/* Active indicator dot */}
        {isFilterActive && (
          <div className="w-2 h-2 bg-brand-violet rounded-full"></div>
        )}
        
        {/* Chevron with rotation animation */}
        <ChevronDownIcon className={`h-4 w-4 transition-all duration-300 group-hover:rotate-180 ${isFilterActive ? 'text-brand-violet' : 'text-slate-500 dark:text-slate-400'}`} />
        
        {/* Subtle background gradient for active state */}
        {isFilterActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-brand-violet/5 to-amber-500/5 rounded-xl"></div>
        )}
      </button>
    </div>
  );
};