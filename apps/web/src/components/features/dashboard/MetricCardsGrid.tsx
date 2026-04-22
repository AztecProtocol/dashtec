'use client';

import { useDashboard } from "@/context/DashboardContext";
import { useEpochCalculations } from "@/hooks/useEpochCalculations";
import { KeyMetricCard } from "./KeyMetricCard";
import { EpochProgressCard } from "./EpochProgressCard";
import { UsersIcon, CheckBadgeIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { Skeleton } from "@/components/ui/Skeleton";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNetworkConfig } from "@/hooks/useNetworkConfig";

// Enhanced skeleton for KeyMetricCard
const KeyMetricCardSkeleton: React.FC = () => (
  <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-between h-full">
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <Skeleton heightClass="h-4" widthClass="w-3/5" />
        <Skeleton heightClass="h-8" widthClass="w-8" />
      </div>
      <Skeleton heightClass="h-8" widthClass="w-2/5 mb-3" />
    </div>

    <div className="relative z-10 mt-auto space-y-3">
      <Skeleton heightClass="h-3" widthClass="w-full" />
      <Skeleton heightClass="h-6" widthClass="w-1/2" />
    </div>
  </div>
);

// Enhanced skeleton for EpochProgressCard
const EpochProgressCardSkeleton: React.FC = () => (
  <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-between h-full">
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <Skeleton heightClass="h-4" widthClass="w-1/2" />
        <Skeleton heightClass="h-8" widthClass="w-8" />
      </div>
      <Skeleton heightClass="h-8" widthClass="w-1/3 mb-6" />

      {/* Progress bar skeleton */}
      <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-600/50">
        <Skeleton heightClass="h-6" widthClass="w-full mb-3" />
        <div className="flex justify-between">
          <Skeleton heightClass="h-3" widthClass="w-1/3" />
          <Skeleton heightClass="h-3" widthClass="w-1/4" />
        </div>
      </div>
    </div>

    <div className="relative z-10 mt-4">
      <Skeleton heightClass="h-3" widthClass="w-2/3" />
    </div>
  </div>
);

export const MetricCardsGrid = () => {
  const configState = useNetworkConfig();
  const {
    totalActiveValidators,
    totalExitingValidators,
    totalZombieValidators,
    totalQueuedValidators,
    totalProviders,
    top3Concentration,
    topProviders,
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
    // This function now exclusively uses live `currentEpochMetrics` data.
    if (currentEpochMetrics && currentEpochMetrics.epochNumber >= 0) {
      const attRate = (currentEpochMetrics.attestationRate ?? 0).toFixed(1);
      const blockRate = (currentEpochMetrics.blockProductionRate ?? 0).toFixed(1);
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
      {currentEpoch === undefined ? (
        <EpochProgressCardSkeleton />
      ) : (
        <EpochProgressCard
          currentEpoch={currentEpoch}
          nextEpochTime={nextEpochTime}
          currentSlotInEpoch={currentSlotInEpoch}
          totalSlotsInEpoch={totalSlotsInEpoch}
          epochProgressPercentage={epochProgressPercentage}
          slotDuration={slotDuration}
          timeIntoCurrentSlot={timeIntoCurrentSlot}
        />
      )}
      {isLoadingCurrentStats && !hasLoaded ? (
        <KeyMetricCardSkeleton />
      ) : (
        <KeyMetricCard
          title="Committee Size"
          Icon={UsersIcon}
          value={String(currentEpochMetrics.validatorCommitteeSize ?? 0)}
          subtext={
            <div className="space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                For current epoch #{currentEpoch ?? '...'}
              </p>
              {(totalActiveValidators ?? 0) > 0 && (currentEpochMetrics.validatorCommitteeSize ?? 0) > 0 && (
                <div className="p-2 rounded-lg bg-brand-violet/5 dark:bg-accent-purple-light/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase">Selection Odds per Epoch</span>
                    <span className="text-xs font-bold text-brand-violet dark:text-accent-purple-light tabular-nums">
                      {(((currentEpochMetrics.validatorCommitteeSize ?? 0) / (totalActiveValidators ?? 0)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {(currentEpochMetrics.validatorCommitteeSize ?? 0)} selected from {(totalActiveValidators ?? 0).toLocaleString()} active sequencers
                  </p>
                </div>
              )}
            </div>
          }
          valueColor="text-brand-violet dark:text-accent-purple-light"
          subtextButton={{ onClick: () => router.push("/epoch-performance"), label: "Epoch Committee" }}
        />
      )}
      {isLoadingCurrentStats && !hasLoaded ? (
        <KeyMetricCardSkeleton />
      ) : (
        <KeyMetricCard
          title="Active Sequencers"
          Icon={CheckBadgeIcon}
          value={(totalActiveValidators ?? 0).toLocaleString()}
          subtext={
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Other sequencer statuses</p>
              <div className="flex flex-wrap gap-1.5">
                {(totalExitingValidators ?? 0) > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-50 dark:bg-slate-700/30 border border-cyan-500/20 dark:border-cyan-400/15 text-slate-600 dark:text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/70"></span>
                    Exiting {(totalExitingValidators ?? 0).toLocaleString()}
                  </div>
                )}
                {(totalZombieValidators ?? 0) > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-50 dark:bg-slate-700/30 border border-yellow-500/20 dark:border-yellow-400/15 text-slate-600 dark:text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/70"></span>
                    Zombie {(totalZombieValidators ?? 0).toLocaleString()}
                  </div>
                )}
                {(totalQueuedValidators ?? 0) > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-50 dark:bg-slate-700/30 border border-orange-500/20 dark:border-orange-400/15 text-slate-600 dark:text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500/70"></span>
                    Queued {(totalQueuedValidators ?? 0).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          }
          valueColor="text-brand-violet dark:text-accent-purple-light"
          subtextButton={{ onClick: () => router.push("/queue"), label: "View Queue" }}
        />
      )}
      {isLoadingCurrentStats && !hasLoaded ? (
        <KeyMetricCardSkeleton />
      ) : (
        <KeyMetricCard
          title="Total Providers"
          Icon={BuildingOffice2Icon}
          value={(totalProviders ?? 0).toLocaleString()}
          subtext={
            <div className="space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Top 3 control <span className="font-bold text-brand-violet dark:text-accent-purple-light">{(top3Concentration ?? 0).toFixed(1)}%</span> of sequencers
              </p>
              {topProviders && topProviders.length > 0 && (
                <div className="space-y-1">
                  {topProviders.map((provider, idx) => {
                    const totalValidators = (totalActiveValidators ?? 0) + (totalExitingValidators ?? 0) + (totalZombieValidators ?? 0);
                    const percentage = totalValidators > 0 ? (provider.validatorCount / totalValidators) * 100 : 0;
                    return (
                      <div key={provider.name} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 min-w-[12px]">#{idx + 1}</span>
                        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate flex-1">{provider.name}</span>
                        <span className="text-[10px] font-bold text-brand-violet dark:text-accent-purple-light tabular-nums">{percentage.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Queued sequencers excluded</p>
            </div>
          }
          valueColor="text-brand-violet dark:text-accent-purple-light"
          subtextButton={{ onClick: () => router.push("/providers"), label: "View Providers" }}
        />
      )}
      {isLoadingCurrentStats && !hasLoaded ? (
        <KeyMetricCardSkeleton />
      ) : (
        <KeyMetricCard
          title="Network Status"
          Icon={networkStatusIcon}
          value={networkStatusString}
          subtext={
            <div className="space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {getNetworkStatusSubtext()}
              </p>

              {/* Attestation Rate */}
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/30 border-l-2 border-l-green-500/50 dark:border-l-green-400/40">
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase min-w-[70px]">Attestations</span>
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">{currentEpochMetrics.successCount ?? 0}</span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400">/</span>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">{currentEpochMetrics.missCount ?? 0}</span>
                </div>
                <span className="text-[10px] font-bold text-green-600 dark:text-green-400 tabular-nums min-w-[38px] text-right">
                  {(currentEpochMetrics.attestationRate ?? 0).toFixed(1)}%
                </span>
              </div>

              {/* Block Proposal Rate */}
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/30 border-l-2 border-l-blue-500/50 dark:border-l-blue-400/40">
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase min-w-[70px]">Blocks</span>
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">{(currentEpochMetrics.epochBlockProducedVolume ?? 0)}</span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400">/</span>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">{(currentEpochMetrics.epochBlockMissedVolume ?? 0)}</span>
                </div>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tabular-nums min-w-[38px] text-right">
                  {(currentEpochMetrics.blockProductionRate ?? 0).toFixed(1)}%
                </span>
              </div>
            </div>
          }
          valueColor={networkStatusColor}
          subtextButton={{ onClick: () => router.push("/epoch-performance"), label: "Epoch Performance" }}
        />
      )}
    </div>
  );
};
