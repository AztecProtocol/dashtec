'use client';

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { NetworkConfig } from '@/types';
import { formatTimestamp } from '@/utils/formatters';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';

interface AppContextType {
  networkConfig: NetworkConfig | null;
  getFormattedTimeForSlot: (slotNumber: number) => string;
  getFormattedTimeForEpoch: (epochNumber: number) => string;
  getTimeRangeForEpoch: (epochNumber: number) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/** Provides network config and formatting utilities — sits below RollupProvider */
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { config } = useNetworkConfig();

  const getFormattedTimeForSlot = useCallback((slotNumber: number): string => {
    if (!config) return 'Calculating...';
    const timestamp = config.genesisTime + (slotNumber * config.slotDuration);
    return formatTimestamp(timestamp);
  }, [config]);

  const getFormattedTimeForEpoch = useCallback((epochNumber: number): string => {
    if (!config) return 'Calculating...';
    const firstSlotOfEpoch = epochNumber * config.epochDurationSlots;
    return getFormattedTimeForSlot(firstSlotOfEpoch);
  }, [config, getFormattedTimeForSlot]);

  const getTimeRangeForEpoch = useCallback((epochNumber: number): string => {
    if (!config) return 'Calculating...';
    const firstSlotOfEpoch = epochNumber * config.epochDurationSlots;
    const lastSlotOfEpoch = firstSlotOfEpoch + config.epochDurationSlots - 1;
    const startTime = getFormattedTimeForSlot(firstSlotOfEpoch);
    const endTime = getFormattedTimeForSlot(lastSlotOfEpoch);
    return `${startTime} - ${endTime}`;
  }, [config, getFormattedTimeForSlot]);

  const value = useMemo(() => ({
    networkConfig: config,
    getFormattedTimeForSlot,
    getFormattedTimeForEpoch,
    getTimeRangeForEpoch,
  }), [config, getFormattedTimeForSlot, getFormattedTimeForEpoch, getTimeRangeForEpoch]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
