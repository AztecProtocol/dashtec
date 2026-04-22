'use client';

import Head from 'next/head';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';

import { Validator } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { TimeframeFilterButton } from '@/components/ui/TimeframeFilterButton';
import { PerformanceFilterModal } from '../validators/PerformanceFilterModal';
import { SocialVerificationModal } from '../validators/SocialVerificationModal';

import { ValidatorHeader } from './ValidatorHeader';
import { StatsGrid } from './StatsGrid';
import { DetailsSidebar } from './DetailsSidebar';
import { PerformanceGraphCard } from './PerformanceGraphCard';
import { HistoryCard } from './HistoryCard';
import { SlashingDetailsCard, SlashingData } from './SlashingDetailsCard';
import { NoEpochParticipation } from './NoEpochParticipation';
import { ValidatorJourney } from './ValidatorJourney';

import { useEpochCalculations } from '@/hooks/useEpochCalculations';
import { useEarliestEpoch } from '@/hooks/useEarliestEpoch';
import { useNotification } from '@/context/NotificationContext';
import VotingHistoryCard from './VotingHistoryCard';
import { useLoading } from '@/context/LoadingContext';
import { QueueListIcon, MagnifyingGlassIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';
import { useRollupFilter } from '@/hooks/useRollupFilter';

/** Flat card container used across the detail page */
const CARD = 'rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 shadow-sm';

const ValidatorDetailSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className={`${CARD} p-6`}>
      <div className="flex justify-between items-start gap-4">
        <div className="w-1/2 space-y-3">
          <Skeleton heightClass="h-8" widthClass="w-2/3" />
          <Skeleton heightClass="h-5" widthClass="w-full" />
        </div>
        <Skeleton heightClass="h-9" widthClass="w-24" />
      </div>
    </div>

    {/* Mobile sidebar */}
    <div className={`${CARD} p-6 space-y-4 block xl:hidden`}>
      <Skeleton heightClass="h-6" widthClass="w-1/3" />
      <Skeleton heightClass="h-20" widthClass="w-full" />
      <Skeleton heightClass="h-6" widthClass="w-1/3" />
      <Skeleton heightClass="h-20" widthClass="w-full" />
    </div>

    {/* Main grid */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
      <div className="xl:col-span-2 space-y-6">
        <div className={`${CARD} p-4`}>
          <div className="flex justify-between items-center">
            <Skeleton heightClass="h-6" widthClass="w-1/3" />
            <Skeleton heightClass="h-9" widthClass="w-36" />
          </div>
        </div>
        <div className={`${CARD} p-6 space-y-6`}>
          <Skeleton heightClass="h-7" widthClass="w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton heightClass="h-24" widthClass="w-full" />
            <Skeleton heightClass="h-24" widthClass="w-full" />
            <Skeleton heightClass="h-24" widthClass="w-full" />
          </div>
        </div>
        <div className={`${CARD} p-6 space-y-4`}>
          <Skeleton heightClass="h-7" widthClass="w-1/3" />
          <Skeleton heightClass="h-96" widthClass="w-full" />
        </div>
        <div className={`${CARD} p-6 space-y-4`}>
          <Skeleton heightClass="h-7" widthClass="w-1/3" />
          <Skeleton heightClass="h-32" widthClass="w-full" />
        </div>
      </div>
      {/* Desktop sidebar */}
      <div className={`${CARD} p-6 space-y-4 hidden xl:block`}>
        <Skeleton heightClass="h-6" widthClass="w-1/3" />
        <Skeleton heightClass="h-20" widthClass="w-full" />
        <Skeleton heightClass="h-6" widthClass="w-1/3" />
        <Skeleton heightClass="h-32" widthClass="w-full" />
      </div>
    </div>
  </div>
);

/** Flat back-to-list link */
const BackLink: React.FC = () => (
  <Link
    href="/validators"
    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors"
  >
    <ArrowLeftIcon className="h-4 w-4" />
    Back to all sequencers
  </Link>
);

interface ValidatorDetailPageContentProps {
  slashingData: SlashingData;
}

export const ValidatorDetailPageContent: React.FC<ValidatorDetailPageContentProps> = ({ slashingData }) => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addNotification } = useNotification();
  const { setLoadingWindow } = useLoading();

  const [validator, setValidator] = useState<Validator | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { address: connectedAddress, isConnected } = useAccount();
  const [startEpoch, setStartEpoch] = useState('');
  const [endEpoch, setEndEpoch] = useState('');
  const [activeFilterQuery, setActiveFilterQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const { rollupParam } = useRollupFilter();
  const configState = useNetworkConfig(rollupParam);
  const { currentEpoch } = useEpochCalculations(configState);
  const { earliestEpoch } = useEarliestEpoch(rollupParam);
  const validatorHexIndexFromParams = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const isOwner = isConnected && !!validator && connectedAddress?.toLowerCase() === validator.address.toLowerCase();
  const shouldShowInfoToggle = !isOwner && !validator?.x_handle;

  const handleUnlinkSuccess = () => {
    setValidator(prevValidator => {
      if (!prevValidator) return null;
      return { ...prevValidator, x_handle: undefined, x_user_id: undefined };
    });
  };

  const handleDiscordUnlinkSuccess = () => {
    setValidator(prev => prev ? { ...prev, discordId: undefined, discordUsername: undefined, discordAvatar: undefined } : null);
  };

  const handleNameUpdate = (newName: string) => {
    setValidator(prev => prev ? { ...prev, name: newName } : null);
  };

  const fetchValidatorDetail = useCallback(async (hexIndex: string, filterQuery = '', rollup?: string) => {
    setIsLoading(true);
    setLoadingWindow(true);
    try {
      const params = new URLSearchParams(filterQuery);
      if (rollup && rollup !== 'active') params.set('rollup', rollup);
      const queryString = params.toString();
      const response = await fetch(`/api/validators/${hexIndex}${queryString ? `?${queryString}` : ''}`);
      if (!response.ok) throw new Error((await response.json()).error || `API request failed`);
      setValidator(await response.json());
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
      setLoadingWindow(false);
    }
  }, [setLoadingWindow]);

  useEffect(() => {
    if (validatorHexIndexFromParams) {
      fetchValidatorDetail(validatorHexIndexFromParams as string, activeFilterQuery, rollupParam);
    }
  }, [validatorHexIndexFromParams, activeFilterQuery, rollupParam, fetchValidatorDetail]);

  useEffect(() => {
    const errorMessage = searchParams.get('error_message');
    const verified = searchParams.get('verified');
    const pathname = `/validators/${validatorHexIndexFromParams}`;

    if (errorMessage) {
      addNotification(errorMessage, 'error', 10000);
      router.replace(pathname, { scroll: false });
    } else if (verified) {
      addNotification("Success! Your X account has been linked.", 'success');
      router.replace(pathname, { scroll: false });
    }

    const discordLinked = searchParams.get('discord_linked');

    if (discordLinked) {
      addNotification("Success! Your Discord account has been linked.", 'success');
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, router, validatorHexIndexFromParams, addNotification]);

  const handleFilterSubmit = () => {
    const params = new URLSearchParams();
    if (startEpoch) params.append('startEpoch', startEpoch);
    if (endEpoch) params.append('endEpoch', endEpoch);
    setActiveFilterQuery(params.toString());
    setIsFilterModalOpen(false);
  };

  const clearFilter = () => {
    setStartEpoch(''); setEndEpoch(''); setActiveFilterQuery(''); setIsFilterModalOpen(false);
  };

  if (isLoading) {
    return (
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6"><Skeleton heightClass="h-5" widthClass="w-48" /></div>
        <ValidatorDetailSkeleton />
      </main>
    );
  }

  if (error || !validator) {
    return (
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <BackLink />
        </div>

        <div className={`${CARD} p-10 sm:p-14 text-center`}>
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700/60">
            <MagnifyingGlassIcon className="h-7 w-7 text-slate-500 dark:text-slate-400" />
          </div>

          {error ? (
            <>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Something went wrong
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                We couldn't load this sequencer's data.
              </p>
              <p className="inline-block text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5">
                {error}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Sequencer not found
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                It might still be waiting in the activation queue, or the address you're looking for doesn't exist.
              </p>
            </>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push('/queue')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-violet text-white text-sm font-medium hover:bg-brand-violet/90 transition-colors"
            >
              <QueueListIcon className="h-4 w-4" />
              Check sequencer queue
            </button>
            <Link
              href="/validators"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              Explore all sequencers
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <Head><title>Sequencer {validator.index} | Dashtec</title></Head>
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <BackLink />
        </div>

        <div className="space-y-6">
          <ValidatorHeader
            validator={validator}
            isOwner={isOwner}
            showInfoToggle={shouldShowInfoToggle}
            onInfoClick={() => setIsInfoModalOpen(true)}
            onNameUpdate={handleNameUpdate}
          />

          {/* Mobile / tablet sidebar content */}
          <div className="xl:hidden block space-y-6">
            <DetailsSidebar
              validator={validator}
              isOwner={isOwner}
              onUnlinkSuccess={handleUnlinkSuccess}
              onDiscordUnlinkSuccess={handleDiscordUnlinkSuccess}
              rollupParam={rollupParam}
            />
            {validator.journey && validator.journey.length > 0 && (
              <ValidatorJourney journey={validator.journey} />
            )}
            <VotingHistoryCard
              votingHistory={validator.votingHistory ?? []}
              tallyVotingHistory={validator.tallyVotingHistory ?? []}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            <div className="xl:col-span-2 space-y-6">
              {(validator.totalParticipatingEpochs || 0) === 0 ? (
                <NoEpochParticipation />
              ) : (
                <>
                  {/* Flat filter bar */}
                  <div className={`${CARD} p-4`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Showing performance for{' '}
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {activeFilterQuery ? `Epochs ${startEpoch}–${endEpoch}` : 'All time'}
                        </span>
                      </div>
                      <TimeframeFilterButton
                        isFilterActive={activeFilterQuery !== ''}
                        startEpoch={startEpoch}
                        endEpoch={endEpoch}
                        onClick={() => setIsFilterModalOpen(true)}
                      />
                    </div>
                  </div>

                  <StatsGrid
                    validator={validator}
                    startEpoch={startEpoch}
                    endEpoch={endEpoch}
                    earliestEpoch={earliestEpoch}
                    currentEpoch={currentEpoch}
                  />
                  <PerformanceGraphCard
                    performanceData={validator.epochPerformanceHistory}
                    validatorName={validator.name || `Validator ${validator.index}`}
                    isFilterActive={activeFilterQuery !== ''}
                    startEpoch={startEpoch}
                    endEpoch={endEpoch}
                    setStartEpoch={setStartEpoch}
                    setEndEpoch={setEndEpoch}
                    handleFilterSubmit={handleFilterSubmit}
                    clearFilter={clearFilter}
                  />
                </>
              )}
              <SlashingDetailsCard slashingData={slashingData} />
              <HistoryCard validator={validator} />
            </div>

            {/* Desktop sidebar */}
            <div className="xl:col-span-1 xl:block hidden space-y-6">
              <DetailsSidebar
                validator={validator}
                isOwner={isOwner}
                onUnlinkSuccess={handleUnlinkSuccess}
                onDiscordUnlinkSuccess={handleDiscordUnlinkSuccess}
                rollupParam={rollupParam}
              />
              {validator.journey && validator.journey.length > 0 && (
                <ValidatorJourney journey={validator.journey} />
              )}
              <VotingHistoryCard
                votingHistory={validator.votingHistory ?? []}
                tallyVotingHistory={validator.tallyVotingHistory ?? []}
              />
            </div>
          </div>
        </div>
      </main>

      <SocialVerificationModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />

      <PerformanceFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        startEpoch={startEpoch}
        endEpoch={endEpoch}
        setStartEpoch={setStartEpoch}
        setEndEpoch={setEndEpoch}
        handleFilterSubmit={handleFilterSubmit}
        clearFilter={clearFilter}
      />
    </>
  );
};
