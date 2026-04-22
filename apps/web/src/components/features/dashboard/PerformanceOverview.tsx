'use client';

import { useState, useEffect } from 'react';
import { useEpochCalculations } from '@/hooks/useEpochCalculations';
import { useEarliestEpoch } from '@/hooks/useEarliestEpoch';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';
import { HistoricalTrendsCard } from './HistoricalTrendsCard';
import { TopSequencersCard } from './TopSequencersCard';

/**
 * PerformanceOverview component - Manages shared epoch state and renders
 * HistoricalTrendsCard and TopSequencersCard
 */
export const PerformanceOverview: React.FC<{ rollupParam?: string }> = ({ rollupParam }) => {
  const configState = useNetworkConfig(rollupParam);
  const { currentEpoch } = useEpochCalculations(configState);
  const { earliestEpoch, latestEpoch } = useEarliestEpoch(rollupParam);

  const [startEpoch, setStartEpoch] = useState('');
  const [endEpoch, setEndEpoch] = useState('');

  const defaultEpochLength = 100;

  useEffect(() => {
    setStartEpoch('');
    setEndEpoch('');
  }, [rollupParam]);

  useEffect(() => {
    if (earliestEpoch !== null && latestEpoch !== null && !startEpoch && !endEpoch) {
      const defaultEnd = currentEpoch > 0 ? Math.min(latestEpoch, currentEpoch) : latestEpoch;
      const defaultStart = Math.max(earliestEpoch, defaultEnd - defaultEpochLength);
      setStartEpoch(String(defaultStart));
      setEndEpoch(String(defaultEnd));
    }
  }, [earliestEpoch, latestEpoch, currentEpoch, startEpoch, endEpoch, defaultEpochLength]);

  const handleFilterChange = (newStartEpoch: string, newEndEpoch: string) => {
    setStartEpoch(newStartEpoch);
    setEndEpoch(newEndEpoch);
  };

  return (
    <div className="rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
          <div className="xl:col-span-2">
            <HistoricalTrendsCard
              startEpoch={startEpoch}
              endEpoch={endEpoch}
              onFilterChange={handleFilterChange}
              rollupParam={rollupParam}
            />
          </div>
          <div className="xl:col-span-1">
            <TopSequencersCard
              startEpoch={startEpoch}
              endEpoch={endEpoch}
              rollupParam={rollupParam}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
