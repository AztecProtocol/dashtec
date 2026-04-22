'use client';

import Head from 'next/head';
import { NextPage } from 'next';
import { useState, useMemo } from 'react';
import Link from 'next/link';

import { EpochProgressCard } from '@/components/features/dashboard/EpochProgressCard';
import { ValidatorSlotActivityBar } from '@/components/features/dashboard/ValidatorSlotActivityBar';
import { SlotDetailsModal } from '@/components/features/epochs/SlotDetailsModal';
import { EpochMetricsGrid } from '@/components/features/epochs/EpochMetricsGrid';
import { EpochActivityLegend } from '@/components/features/epochs/EpochActivityLegend';
import { Skeleton } from '@/components/ui/Skeleton';
import { MagnifyingGlassIcon, ChartBarSquareIcon, ArrowLeftIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';

import { useEpochCalculations } from '@/hooks/useEpochCalculations';
import { useEpochSlotActivityData } from '@/hooks/useEpochSlotActivityData';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';
import { useEpochLiveSlotActivity } from '@/hooks/queries/useEpochLiveSlotActivity';
import { useRollupFilter } from '@/hooks/useRollupFilter';


const EpochPerformancePage: NextPage = () => {
  const { rollupParam } = useRollupFilter();
  const configState = useNetworkConfig(rollupParam);
  const {
    currentEpoch,
    nextEpochTime,
    currentSlotInEpoch,
    totalSlotsInEpoch,
    epochProgressPercentage,
    slotDuration,
    timeIntoCurrentSlot,
  } = useEpochCalculations(configState);

  const absoluteCurrentSlot = useMemo(() => {
    if (currentEpoch !== undefined && currentSlotInEpoch !== undefined && totalSlotsInEpoch > 0) {
      // Assuming currentEpoch is 0-indexed from the hook if genesis hasn't passed,
      // and 0-indexed for actual epochs.
      // totalSlotsInEpoch is effectively EPOCH_DURATION.
      return (currentEpoch * totalSlotsInEpoch) + currentSlotInEpoch;
    }
    return undefined;
  }, [currentEpoch, currentSlotInEpoch, totalSlotsInEpoch]);


  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // Use query hook for live slot activity data
  const { data, isLoading: isLoadingData } = useEpochLiveSlotActivity(currentEpoch, rollupParam, {
    enabled: currentEpoch !== undefined && totalSlotsInEpoch > 0,
    refetchInterval: 3000,
  });

  const allValidatorsSlotActivity = data?.activities || [];
  const { performanceMetrics, searchTerm, setSearchTerm, filteredActivities: filteredValidatorsSlotActivity } = useEpochSlotActivityData(allValidatorsSlotActivity);

  // Skeleton for epoch progress card
  const EpochProgressCardSkeleton: React.FC = () => (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <Skeleton heightClass="h-4" widthClass="w-1/2" />
        <Skeleton heightClass="h-8" widthClass="w-8" />
      </div>
      <Skeleton heightClass="h-8" widthClass="w-1/3 mb-6" />
      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <Skeleton heightClass="h-6" widthClass="w-full mb-3" />
        <div className="flex justify-between">
          <Skeleton heightClass="h-3" widthClass="w-1/3" />
          <Skeleton heightClass="h-3" widthClass="w-1/4" />
        </div>
      </div>
    </div>
  );

  const ValidatorBarSkeleton: React.FC = () => (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <Skeleton heightClass="h-4" widthClass="w-1/4" />
        <Skeleton heightClass="h-4" widthClass="w-16" />
      </div>
      <Skeleton heightClass="h-6" widthClass="w-full" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>Live Epoch Performance | Dashtec</title>
        <meta name="description" content="Live monitoring of the current epoch performance and sequencer slot activities." />
      </Head>

      <PageTransitionWrapper>
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 _tight  py-8">
          {/* Navigation */}
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg sm:rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Back to Dashboard</span>
            </Link>
          </div>

          {/* Enhanced Header Section */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
            {/* Subtle background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/50 pointer-events-none"></div>
            {/* Elegant Mesh Gradient - Top Right */}
            <div className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-gradient-to-br from-brand-violet/5 via-amber-500/5 to-transparent blur-3xl opacity-60 pointer-events-none"></div>

            <div className="relative z-10 p-4 sm:p-6">
              {/* Title Section */}
              <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Clean Icon Container */}
                  <div className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 flex-shrink-0">
                    <ChartBarSquareIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-violet dark:text-accent-purple-light" />
                  </div>

                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                      Live Epoch Performance
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-light mt-1">
                      Real-time slot-by-slot activity for Epoch #{currentEpoch ?? 'Loading...'}
                    </p>
                  </div>
                </div>

                {absoluteCurrentSlot !== undefined && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <ClockIcon className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Slot <span className="font-semibold text-brand-violet dark:text-accent-purple-light">#{absoluteCurrentSlot}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Epoch Progress Section */}
          <div className="mb-6 grid grid-cols-1">
            {currentEpoch === undefined || totalSlotsInEpoch === 0 ? (
              <EpochProgressCardSkeleton />
            ) : (
              <EpochProgressCard
                currentEpoch={currentEpoch}
                nextEpochTime={nextEpochTime}
                currentSlotInEpoch={currentSlotInEpoch!}
                totalSlotsInEpoch={totalSlotsInEpoch!}
                epochProgressPercentage={epochProgressPercentage}
                slotDuration={slotDuration}
                timeIntoCurrentSlot={timeIntoCurrentSlot}
                variant='epoch-performance'
              />
            )}
          </div>

          {/* Performance Metrics */}
          <EpochMetricsGrid metrics={performanceMetrics} isLoading={isLoadingData} hasData={allValidatorsSlotActivity.length > 0} />

          {/* Activity Legend */}
          <EpochActivityLegend showCurrentSlotIndicator />

          {/* Enhanced Validator Activity Section */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-brand-violet/10 dark:bg-brand-violet/20 rounded-lg">
                    <UserGroupIcon className="h-5 w-5 text-brand-violet dark:text-accent-purple-light" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Sequencer Slot Activity
                  </h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-light">
                  Real-time activity tracking for Epoch #{currentEpoch ?? '...'}
                </p>
              </div>

              <div className="relative w-full lg:w-auto lg:max-w-xs xl:w-96">
                <input
                  type="search"
                  placeholder="Search by name, address, handle, or provider..."
                  className="pl-12 pr-4 py-3 rounded-xl text-sm w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-violet focus:border-brand-violet focus:outline-none transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isLoadingData && allValidatorsSlotActivity.length === 0}
                />
                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 dark:text-slate-500 absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              {isLoadingData && filteredValidatorsSlotActivity.length === 0 && !searchTerm ? (
                <>
                  <ValidatorBarSkeleton />
                  <ValidatorBarSkeleton />
                  <ValidatorBarSkeleton />
                </>
              ) : !isLoadingData && filteredValidatorsSlotActivity.length === 0 && totalSlotsInEpoch > 0 ? (
                <>
                  <ValidatorBarSkeleton />
                  <ValidatorBarSkeleton />
                  <ValidatorBarSkeleton />
                </>
              ) : !isLoadingData && filteredValidatorsSlotActivity.length === 0 && searchTerm !== "" ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-slate-100/50 dark:bg-slate-700/30 rounded-2xl">
                      <MagnifyingGlassIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                      {searchTerm ? "No sequencers found matching your search." : "No sequencer activity data available for this epoch."}
                    </p>
                  </div>
                </div>
              ) : (
                filteredValidatorsSlotActivity.map((validatorActivity) => (
                  <ValidatorSlotActivityBar
                    key={validatorActivity.validatorAddress}
                    validatorName={validatorActivity.displayName}
                    validatorAddress={validatorActivity.validatorAddress}
                    x_handle={validatorActivity.x_handle}
                    name={validatorActivity.name}
                    provider={validatorActivity.provider}
                    slots={validatorActivity.slots}
                    totalSlotsInEpoch={totalSlotsInEpoch}
                    currentSlotInEpoch={currentSlotInEpoch}
                    onSlotClick={(slotNumber) => setSelectedSlot(slotNumber)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Slot Details Modal */}
          {currentEpoch !== undefined && (
            <SlotDetailsModal
              isOpen={selectedSlot !== null}
              onClose={() => setSelectedSlot(null)}
              slotNumber={selectedSlot ?? 0}
              epochNumber={currentEpoch}
              validators={allValidatorsSlotActivity}
              epochDurationSlots={totalSlotsInEpoch}
            />
          )}
        </main>
      </PageTransitionWrapper>
    </div >
  );
};

export default EpochPerformancePage;
