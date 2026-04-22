'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { formatTime, formatTimestamp } from '@/utils/formatters';
import { NetworkConfigState } from '@/hooks/useNetworkConfig';


/**
 * Custom hook for epoch-related calculations.
 * Fetches network constants from the server and memoizes the result.
 */
export const useEpochCalculations = (configState: NetworkConfigState) => {

  // State for calculated epoch data
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [nextEpochTime, setNextEpochTime] = useState<string>("00:00");
  const [currentSlotInEpoch, setCurrentSlotInEpoch] = useState<number>(0);
  const [epochProgressPercentage, setEpochProgressPercentage] = useState<number>(0);
  const [timeIntoCurrentSlot, setTimeIntoCurrentSlot] = useState<number>(0);
  const [absoluteCurrentSlot, setAbsoluteCurrentSlot] = useState<number>(0)

  useEffect(() => {
    const { config, isLoading } = configState;
    if (!config || isLoading) {
      return; 
    }

    const { genesisTime, slotDuration, epochDurationSlots } = config;

    const calculateEpochData = () => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      let calculatedEpoch = 0;
      let currentSlotVal = 0;
      let slotInEpoch = 0;
      let progress = 0;
      let timeInSlot = 0;

      if (currentTimestamp < genesisTime) {
        calculatedEpoch = 0;
        setNextEpochTime(formatTime(genesisTime - currentTimestamp));
        slotInEpoch = 0;
        progress = 0;
        timeInSlot = 0;
      } else {
        const timeSinceGenesis = currentTimestamp - genesisTime;
        currentSlotVal = Math.floor(timeSinceGenesis / slotDuration);
        calculatedEpoch = Math.floor(currentSlotVal / epochDurationSlots);

        slotInEpoch = currentSlotVal % epochDurationSlots;

        const secondsPerEpoch = epochDurationSlots * slotDuration;
        const timeIntoCurrentEpochSeconds = timeSinceGenesis % secondsPerEpoch;
        const timeRemainingInCurrentEpochSeconds = secondsPerEpoch - timeIntoCurrentEpochSeconds;

        setNextEpochTime(formatTime(timeRemainingInCurrentEpochSeconds));
        progress = (timeIntoCurrentEpochSeconds / secondsPerEpoch) * 100;
        timeInSlot = timeSinceGenesis % slotDuration;
      }
      setCurrentEpoch(calculatedEpoch);
      setCurrentSlotInEpoch(slotInEpoch);
      setEpochProgressPercentage(progress);
      setTimeIntoCurrentSlot(timeInSlot);
      setAbsoluteCurrentSlot((calculatedEpoch * epochDurationSlots) + slotInEpoch)
    };

    calculateEpochData();
    const timerId = setInterval(calculateEpochData, 1000);

    return () => clearInterval(timerId);
  }, [configState]);




  /**
   * Calculate epoch from absolute slot number
   */
  const getEpochFromSlot = useCallback((slotNumber: number): number => {
    const epochDurationSlots = configState.config?.epochDurationSlots ?? 32;
    return Math.floor(slotNumber / epochDurationSlots);
  }, [configState.config?.epochDurationSlots]);

  return useMemo(() => ({
    currentEpoch,
    nextEpochTime,
    currentSlotInEpoch,
    totalSlotsInEpoch: configState.config?.epochDurationSlots ?? 0,
    epochProgressPercentage,
    slotDuration: configState.config?.slotDuration ?? 0,
    timeIntoCurrentSlot,
    absoluteCurrentSlot,
    getEpochFromSlot,
  }), [
    currentEpoch,
    nextEpochTime,
    currentSlotInEpoch,
    epochProgressPercentage,
    timeIntoCurrentSlot,
    absoluteCurrentSlot,
    getEpochFromSlot,
  ]);
};
