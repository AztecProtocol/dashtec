'use client';

import Head from 'next/head';
import { NextPage } from 'next';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import { ValidatorSlotActivityBar } from '@/components/features/dashboard/ValidatorSlotActivityBar';
import { SlotDetailsModal } from '@/components/features/epochs/SlotDetailsModal';
import { EpochMetricsGrid } from '@/components/features/epochs/EpochMetricsGrid';
import { EpochActivityLegend } from '@/components/features/epochs/EpochActivityLegend';
import { Skeleton } from '@/components/ui/Skeleton';
import { MagnifyingGlassIcon, PresentationChartLineIcon, SignalIcon, ArrowLeftIcon, DocumentTextIcon, UserGroupIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

import { useEpochSlotActivityData } from '@/hooks/useEpochSlotActivityData';
import { useEpochHistoricalSlotActivity } from '@/hooks/queries/useEpochHistoricalSlotActivity';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import { useApp } from '@/context/AppContext';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';
import { useRollupFilter } from '@/hooks/useRollupFilter';

const ValidatorBarSkeleton: React.FC = () => (
  <div className="rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 p-4 mb-3">
    <div className="flex items-center justify-between mb-3">
      <Skeleton heightClass="h-4" widthClass="w-1/4" />
      <Skeleton heightClass="h-4" widthClass="w-16" />
    </div>
    <Skeleton heightClass="h-6" widthClass="w-full" />
  </div>
);

const HistoricalEpochPage: NextPage = () => {
  const params = useParams();
  const epochNumber = params.epochNumber as string;
  const { rollupParam } = useRollupFilter();
  const configState = useNetworkConfig(rollupParam);
  const config = configState.config;
  const { getTimeRangeForEpoch } = useApp();

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // Use React Query hook for data fetching
  const { data, isLoading, error: queryError } = useEpochHistoricalSlotActivity(Number(epochNumber), rollupParam);

  const allValidatorsSlotActivity = data?.activities || [];
  const error = queryError?.message || data?.error || null;

  const { performanceMetrics, searchTerm, setSearchTerm, filteredActivities: filteredValidatorsSlotActivity } = useEpochSlotActivityData(allValidatorsSlotActivity);

  return (
    <>
      <Head>
        <title>Epoch #{epochNumber} | Dashtec</title>
        <meta name="description" content={`Detailed sequencer slot activity for epoch #${epochNumber}.`} />
      </Head>

      <PageTransitionWrapper>
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 _tight  py-8">
          {/* Navigation */}
          <div className="mb-6">
            <Link
              href="/epochs"
              className="inline-flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg sm:rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Back to Epochs Heatmap</span>
            </Link>
          </div>

          {/* Header Section */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/50 pointer-events-none"></div>
            <div className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-gradient-to-br from-brand-violet/5 via-amber-500/5 to-transparent blur-3xl opacity-60 pointer-events-none"></div>

            <div className="relative z-10 p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 flex-shrink-0">
                      <DocumentTextIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-violet dark:text-accent-purple-light" />
                    </div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                      Historical Epoch #{epochNumber}
                    </h1>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap ml-11">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Duration:</span>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                      <span className="text-sm font-semibold">
                        {(() => {
                          const range = getTimeRangeForEpoch(Number(epochNumber));
                          const [start, end] = range.split(' - ');
                          return (
                            <>
                              <span className="text-slate-700 dark:text-slate-300">{start}</span>
                              <span className="mx-2 text-slate-400">&rarr;</span>
                              <span className="text-slate-700 dark:text-slate-300">{end}</span>
                            </>
                          );
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href="/epoch-performance"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-violet hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
                >
                  <SignalIcon className="h-4 w-4" />
                  <span>View Live Epoch</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <EpochMetricsGrid metrics={performanceMetrics} isLoading={isLoading} hasData={allValidatorsSlotActivity.length > 0} />

          {/* Activity Legend */}
          <EpochActivityLegend />

          {/* Validator Activity Section */}
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
                  Historical activity tracking for Epoch #{epochNumber}
                </p>
              </div>

              <div className="flex items-center gap-4 w-full lg:w-auto">
                {/* Prev/Next Navigation */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/epochs/${Number(epochNumber) - 1}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <ChevronLeftIcon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Prev</span>
                  </Link>
                  <Link
                    href={`/epochs/${Number(epochNumber) + 1}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Next</span>
                    <ChevronRightIcon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  </Link>
                </div>

                <div className="relative w-full lg:w-auto lg:max-w-xs xl:w-96">
                  <input
                    type="search"
                    placeholder="Search by name, address, handle, or provider..."
                    className="pl-12 pr-4 py-3 rounded-xl text-sm w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-violet focus:border-brand-violet focus:outline-none transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={isLoading && allValidatorsSlotActivity.length === 0}
                  />
                  <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 dark:text-slate-500 absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <>
                  <ValidatorBarSkeleton />
                  <ValidatorBarSkeleton />
                  <ValidatorBarSkeleton />
                </>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                      <PresentationChartLineIcon className="h-10 w-10 text-red-500" />
                    </div>
                    <p className="text-red-600 dark:text-red-400 font-medium text-lg">{error}</p>
                  </div>
                </div>
              ) : filteredValidatorsSlotActivity.length === 0 ? (
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
                    totalSlotsInEpoch={config?.epochDurationSlots ?? 0}
                    onSlotClick={(slotNumber) => setSelectedSlot(slotNumber)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Slot Details Modal */}
          <SlotDetailsModal
            isOpen={selectedSlot !== null}
            onClose={() => setSelectedSlot(null)}
            slotNumber={selectedSlot ?? 0}
            epochNumber={Number(epochNumber)}
            validators={allValidatorsSlotActivity}
            epochDurationSlots={config?.epochDurationSlots}
          />
        </main>
      </PageTransitionWrapper>
    </>
  );
};

export default HistoricalEpochPage;
