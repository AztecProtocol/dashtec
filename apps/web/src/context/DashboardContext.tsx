'use client';

import React, { createContext, useState, useMemo, useContext, ReactNode, useEffect } from 'react';
import { EpochAttestationMetrics } from '@/types';
import { useEpochCalculations } from '@/hooks/useEpochCalculations';
import { useCurrentEpochStats } from '@/hooks/queries/useCurrentEpochStats';
import { GlobeAltIcon, WifiIcon, SignalSlashIcon } from '@heroicons/react/24/outline';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';

interface DashboardContextType {
  currentEpochMetrics: EpochAttestationMetrics;
  totalActiveValidators: number | null;
  totalExitingValidators: number | null;
  totalZombieValidators: number | null;
  totalQueuedValidators: number | null;
  totalProviders: number | null;
  top3Concentration: number | null;
  topProviders: Array<{ name: string; validatorCount: number }> | null;
  networkStatusString: string;
  networkStatusColor: string;
  networkStatusIcon: React.ElementType;
  healthScore: number;
  isLoadingCurrentStats: boolean;
  rollupParam?: string;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children, rollupParam }: { children: ReactNode; rollupParam?: string }) => {
  const configState = useNetworkConfig(rollupParam);

  const { currentEpoch, currentSlotInEpoch } = useEpochCalculations(configState);
  const { data: statsData, isLoading: isLoadingCurrentStats } = useCurrentEpochStats(currentEpoch, currentSlotInEpoch, rollupParam);

  const [networkStatusString, setNetworkStatusString] = useState<string>("Calculating...");
  const [networkStatusColor, setNetworkStatusColor] = useState<string>("text-slate-500 dark:text-slate-400");
  const [networkStatusIcon, setNetworkStatusIcon] = useState<React.ElementType>(() => GlobeAltIcon);

  const [healthScore, setHealthScore] = useState(0);

  // Extract data from query result
  const currentEpochMetrics = statsData?.currentEpochMetrics || { epochNumber: 0, successCount: 0, missCount: 0, totalAttestations: 0 };
  const totalActiveValidators = statsData?.totalActiveValidators ?? null;
  const totalExitingValidators = statsData?.totalExitingValidators ?? null;
  const totalZombieValidators = statsData?.totalZombieValidators ?? null;
  const totalQueuedValidators = statsData?.totalQueuedValidators ?? null;
  const totalProviders = statsData?.totalProviders ?? null;
  const top3Concentration = statsData?.top3Concentration ?? null;
  const topProviders = statsData?.topProviders ?? null;

  // Updated network status algorithm
  useEffect(() => {
    if (currentEpoch === 0) {
      setNetworkStatusString("Loading");
      setNetworkStatusColor("text-slate-500 dark:text-slate-400");
      setNetworkStatusIcon(() => GlobeAltIcon);
      return;
    }

    if (currentEpochMetrics && !isLoadingCurrentStats) {
      const { attestationRate, blockProductionRate, totalAttestations, epochBlockMissedVolume, epochBlockProducedVolume } = currentEpochMetrics;

      const attRate = typeof attestationRate === 'number' ? attestationRate : 0;
      const blockRate = typeof blockProductionRate === 'number' ? blockProductionRate : 0;

      if (attRate === 0 && blockRate === 0 && totalAttestations === 0 && epochBlockMissedVolume === 0 && epochBlockProducedVolume === 0) {
        setNetworkStatusString("Awaiting Data");
        setNetworkStatusColor("text-slate-500 dark:text-slate-400");
        setNetworkStatusIcon(() => GlobeAltIcon);
        return;
      }

      const _healthScore = (attRate * 0.9) + (blockRate * 0.1);
      setHealthScore(_healthScore)

      if (_healthScore >= 80) {
        setNetworkStatusString("Healthy");
        setNetworkStatusColor("text-green-600 dark:text-green-400");
        setNetworkStatusIcon(() => WifiIcon);
      } else if (_healthScore >= 65) {
        setNetworkStatusString("Degraded");
        setNetworkStatusColor("text-amber-500 dark:text-amber-400");
        setNetworkStatusIcon(() => WifiIcon);
      } else if (_healthScore >= 0) {
        setNetworkStatusString("Critical");
        setNetworkStatusColor("text-red-600 dark:text-red-400");
        setNetworkStatusIcon(() => SignalSlashIcon);
      }
    } else {
      setNetworkStatusString("Awaiting Data");
      setNetworkStatusColor("text-slate-500 dark:text-slate-400");
      setNetworkStatusIcon(() => GlobeAltIcon);
    }
  }, [currentEpochMetrics, currentEpoch]);

  const value = useMemo(() => ({
    currentEpochMetrics,
    totalActiveValidators,
    totalExitingValidators,
    totalZombieValidators,
    totalQueuedValidators,
    totalProviders,
    top3Concentration,
    topProviders,
    networkStatusString,
    networkStatusColor,
    networkStatusIcon,
    healthScore,
    isLoadingCurrentStats,
    rollupParam,
  }), [currentEpochMetrics, totalActiveValidators, totalExitingValidators, totalZombieValidators, totalQueuedValidators, totalProviders, top3Concentration, topProviders, networkStatusString, networkStatusColor, networkStatusIcon, healthScore, isLoadingCurrentStats, rollupParam]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboard = (): DashboardContextType => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
