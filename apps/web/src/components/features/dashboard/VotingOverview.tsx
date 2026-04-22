'use client';

import { useVotingOverview } from '@/hooks/queries/useVotingOverview';
import { Skeleton } from '@/components/ui/Skeleton';
import { GovernanceVoting } from './GovernanceVoting';
import { SlashingVoting } from './SlashingVoting';

/**
 * VotingOverview component displays governance and slashing proposer voting information
 */
export const VotingOverview: React.FC<{ rollupParam?: string }> = ({ rollupParam }) => {
  const { data, isLoading, error } = useVotingOverview(rollupParam);

  if (isLoading) {
    return (
      <div className="relative mt-6 sm:mt-8 overflow-hidden rounded-xl sm:rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-2xl">
        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="space-y-4">
              <Skeleton heightClass="h-6" widthClass="w-1/3" />
              <Skeleton heightClass="h-32" widthClass="w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton heightClass="h-6" widthClass="w-1/3" />
              <Skeleton heightClass="h-32" widthClass="w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="relative mt-6 sm:mt-8 overflow-hidden rounded-xl sm:rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-2xl">
        <div className="relative z-10 p-4 sm:p-6 lg:p-8 text-center">
          <p className="text-red-500 dark:text-red-400">Failed to load voting overview data</p>
        </div>
      </div>
    );
  }

  const { governance, slashing } = data.data;

  return (
    <div className="mt-6 sm:mt-8 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Governance Voting */}
          <GovernanceVoting
            latestRound={governance.latestRound}
            roundData={governance.roundData}
            recentVotecasts={governance.recentVotecasts}
            recentPayloads={governance.recentPayloads}
          />

          {/* Slashing Voting */}
          <SlashingVoting
            latestRound={slashing.latestRound}
            latestExecutedRound={slashing.latestExecutedRound}
            recentVotecasts={slashing.recentVotecasts}
            recentSlashed={slashing.recentSlashed}
          />
        </div>
      </div>
    </div>
  );
};
