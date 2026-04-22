'use client';

import React from 'react';
import {
  CurrencyDollarIcon,
  TrophyIcon,
  BanknotesIcon,
  ScaleIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatBalance } from '@/utils/formatters';
import { Tooltip } from '@/components/ui/Tooltip';
import { useStakingData } from '@/hooks/queries/useStakingData';

const StakingCard: React.FC<{
  title: string;
  value: string | React.ReactNode;
  subtitle?: string;
  icon: React.ElementType;
  gradient: string;
  trend?: number;
  tooltip?: string;
}> = ({ title, value, subtitle, icon: Icon, gradient, trend, tooltip }) => {
  return (
    <div className="relative group overflow-hidden rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/30 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Background gradient */}
      <div className={`absolute inset-0 ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
      
      {/* Content */}
      <div className="relative z-10 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 ${gradient} rounded-lg bg-opacity-10`}>
              <Icon className="h-6 w-6 text-current" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {title}
              </h3>
              {tooltip && (
                <Tooltip content={tooltip}>
                  <InformationCircleIcon className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                </Tooltip>
              )}
            </div>
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend > 0 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                : trend < 0 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              <ArrowTrendingUpIcon className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {value}
          </div>
          {subtitle && (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StakingSkeleton: React.FC = () => {
  const skeletonGradients = [
    'bg-gradient-to-br from-green-500 to-emerald-600',
    'bg-gradient-to-br from-yellow-500 to-orange-600', 
    'bg-gradient-to-br from-amber-500 to-indigo-600',
    'bg-gradient-to-br from-purple-500 to-pink-600'
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="relative group overflow-hidden rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/30 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
          {/* Background gradient */}
          <div className={`absolute inset-0 ${skeletonGradients[i]} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
          
          {/* Content */}
          <div className="relative z-10 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 ${skeletonGradients[i]} rounded-lg bg-opacity-10`}>
                  <Skeleton heightClass="h-6" widthClass="w-6" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton heightClass="h-4" widthClass="w-24" />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Skeleton heightClass="h-8" widthClass="w-20" />
              <Skeleton heightClass="h-4" widthClass="w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const StakingInformation: React.FC = () => {
  const { data: stakingData, isLoading } = useStakingData();

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-600/10 rounded-xl blur-md"></div>
            <div className="relative p-2 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 shadow-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-green-600 to-emerald-600 dark:from-slate-100 dark:via-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
              Staking Overview
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Network staking metrics and rewards
            </p>
          </div>
        </div>
        <StakingSkeleton />
      </div>
    );
  }

  if (!stakingData) {
    return (
      <div className="mb-8 p-8 text-center bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
        <CurrencyDollarIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Unable to load staking information</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Header Section */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-600/10 rounded-xl blur-md"></div>
          <div className="relative p-2 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 shadow-lg">
            <CurrencyDollarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-green-600 to-emerald-600 dark:from-slate-100 dark:via-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
            Staking Overview
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Network staking metrics and rewards
          </p>
        </div>
      </div>

      {/* Staking Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StakingCard
          title="Total Staked"
          value={stakingData.totalStakedFormatted}
          subtitle="Across all sequencers"
          icon={CurrencyDollarIcon}
          gradient="bg-gradient-to-br from-green-500 to-emerald-600"
          tooltip="Total amount of tokens currently staked in the network"
        />

        <StakingCard
          title="Unclaimed Rewards"
          value={stakingData.unclaimedRewardsFormatted}
          subtitle="Available to claim"
          icon={TrophyIcon}
          gradient="bg-gradient-to-br from-yellow-500 to-orange-600"
          tooltip="Unclaimed rewards earned by sequencers that can be withdrawn"
        />

        <StakingCard
          title="Minimum Deposit"
          value={stakingData.minimumDepositFormatted}
          subtitle="Minimum to register sequencer"
          icon={BanknotesIcon}
          gradient="bg-gradient-to-br from-amber-500 to-indigo-600"
          tooltip="Minimum amount required to register as a sequencer"
        />

        <StakingCard
          title="Minimum Stake"
          value={stakingData.minimumStakeFormatted}
          subtitle="Minimum staking amount"
          icon={ScaleIcon}
          gradient="bg-gradient-to-br from-purple-500 to-pink-600"
          tooltip="Minimum amount to remain in the sequencer set"
        />
      </div>
    </div>
  );
};