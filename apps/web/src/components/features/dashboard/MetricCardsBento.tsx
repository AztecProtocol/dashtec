'use client';

import { useDashboard } from "@/context/DashboardContext";
import { useEpochCalculations } from "@/hooks/useEpochCalculations";
import { KeyMetricCard } from "./KeyMetricCard";
import { EpochProgressCard } from "./EpochProgressCard";
import { CheckBadgeIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { Skeleton } from "@/components/ui/Skeleton";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNetworkConfig } from "@/hooks/useNetworkConfig";

// Enhanced skeleton for KeyMetricCard
const KeyMetricCardSkeleton: React.FC = () => (
  <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-xl p-6 flex flex-col justify-between h-full min-h-[160px]">
    {/* Animated background gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/5 via-transparent to-amber-500/5"></div>

    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <Skeleton heightClass="h-4" widthClass="w-3/5" />
        <Skeleton heightClass="h-8" widthClass="w-8" />
      </div>
      <Skeleton heightClass="h-8" widthClass="w-2/5 mb-3" />
    </div>

    <div className="relative z-10 mt-auto space-y-3">
      <Skeleton heightClass="h-3" widthClass="w-full" />
    </div>
  </div>
);

// Enhanced skeleton for EpochProgressCard
const EpochProgressCardSkeleton: React.FC = () => (
  <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-xl p-6 flex flex-col justify-between h-full min-h-[160px]">
    {/* Animated background gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/5 via-transparent to-amber-500/5"></div>

    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <Skeleton heightClass="h-4" widthClass="w-1/2" />
        <Skeleton heightClass="h-8" widthClass="w-8" />
      </div>
      <Skeleton heightClass="h-8" widthClass="w-1/3 mb-6" />

      {/* Progress bar skeleton */}
      <div className="p-3 bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm rounded-xl border border-white/30 dark:border-slate-600/30">
        <Skeleton heightClass="h-6" widthClass="w-full mb-3" />
        <div className="flex justify-between">
          <Skeleton heightClass="h-3" widthClass="w-1/3" />
          <Skeleton heightClass="h-3" widthClass="w-1/4" />
        </div>
      </div>
    </div>
  </div>
);

export const MetricCardsBento = () => {
  const configState = useNetworkConfig();
  const {
    totalActiveValidators,
    totalExitingValidators,
    totalZombieValidators,
    totalQueuedValidators,
    totalProviders,
    isLoadingCurrentStats,
    networkStatusIcon,
    networkStatusString,
    networkStatusColor,
    healthScore,
    currentEpochMetrics,
  } = useDashboard();

  const {
    currentEpoch,
    nextEpochTime,
    currentSlotInEpoch,
    totalSlotsInEpoch,
    epochProgressPercentage,
    slotDuration,
    timeIntoCurrentSlot
  } = useEpochCalculations(configState);

  const [hasLoaded, setHasLoaded] = useState(false);
  const router = useRouter();

  const getNetworkStatusSubtext = () => {
    if (currentEpochMetrics && currentEpochMetrics.epochNumber >= 0) {
      const score = (healthScore).toFixed(1);
      return `Score: ${score}% (Epoch #${currentEpochMetrics.epochNumber})`;
    }
    if (currentEpoch === 0) {
      return `Genesis Epoch 0`;
    }
    return `Awaiting data...`;
  };

  useEffect(() => {
    if (!isLoadingCurrentStats) {
      setHasLoaded(true);
    }
  }, [isLoadingCurrentStats]);

  const totalSequencers = (totalActiveValidators ?? 0) + (totalExitingValidators ?? 0) + (totalZombieValidators ?? 0) + (totalQueuedValidators ?? 0);
  const activePercent = totalSequencers > 0 ? ((totalActiveValidators ?? 0) / totalSequencers) * 100 : 0;
  const exitingPercent = totalSequencers > 0 ? ((totalExitingValidators ?? 0) / totalSequencers) * 100 : 0;
  const zombiePercent = totalSequencers > 0 ? ((totalZombieValidators ?? 0) / totalSequencers) * 100 : 0;
  const queuedPercent = totalSequencers > 0 ? ((totalQueuedValidators ?? 0) / totalSequencers) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* 1. Epoch Progress */}
      <div className="h-full">
        {currentEpoch === undefined ? (
          <EpochProgressCardSkeleton />
        ) : (
          <div className="h-full">
            <EpochProgressCard
              currentEpoch={currentEpoch}
              nextEpochTime={nextEpochTime}
              currentSlotInEpoch={currentSlotInEpoch}
              totalSlotsInEpoch={totalSlotsInEpoch}
              epochProgressPercentage={epochProgressPercentage}
              slotDuration={slotDuration}
              timeIntoCurrentSlot={timeIntoCurrentSlot}
            />
          </div>
        )}
      </div>

      {/* 2. Registry (Active Validators) */}
      <div className="h-full">
        {isLoadingCurrentStats && !hasLoaded ? (
          <KeyMetricCardSkeleton />
        ) : (
          <KeyMetricCard
            title="Registry"
            Icon={CheckBadgeIcon}
            value={(totalActiveValidators ?? 0).toLocaleString()}
            subtext="Active Sequencers"
            valueColor="text-green-600 dark:text-green-400"
            subtextButton={{ onClick: () => router.push("/sequencers"), label: "View All" }}
          />
        )}
      </div>

      {/* 3. Queue */}
      <div className="h-full">
        {isLoadingCurrentStats && !hasLoaded ? (
          <KeyMetricCardSkeleton />
        ) : (
          <KeyMetricCard
            title="Queue"
            Icon={CheckBadgeIcon}
            value={(totalQueuedValidators ?? 0).toLocaleString()}
            subtext="Waiting entry"
            valueColor="text-blue-600 dark:text-blue-400"
            subtextButton={{ onClick: () => router.push("/queue"), label: "View Queue" }}
          />
        )}
      </div>

      {/* 4. Total Committee */}
      <div className="h-full">
        {isLoadingCurrentStats && !hasLoaded ? (
          <KeyMetricCardSkeleton />
        ) : (
          <KeyMetricCard
            title="Total Committee"
            Icon={CheckBadgeIcon} // Or UsersIcon if available
            value={String(currentEpochMetrics.validatorCommitteeSize ?? 0)}
            subtext="Current Selection"
            valueColor="text-brand-violet dark:text-accent-purple-light"
            subtextButton={{ onClick: () => router.push("/epoch-performance"), label: "Details" }}
          />
        )}
      </div>
    </div>
  );
};
