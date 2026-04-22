'use client';

import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tooltip } from '@/components/ui/Tooltip';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { getIntegrityColor } from '@/utils/formatters';
import { MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, PresentationChartLineIcon, SignalIcon, ChartBarSquareIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useEpochCalculations } from '@/hooks/useEpochCalculations';
import { useLoading } from '@/context/LoadingContext';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';
import { EpochIntegrityItem, useEpochsIntegrity } from '@/hooks/queries/useEpochsIntegrity';
import { useRollupFilter } from '@/hooks/useRollupFilter';

// Pagination options for epochs per page
const EPOCHS_PER_PAGE_OPTIONS = [80, 120, 160, 200].map(value => ({
  value,
  label: String(value)
}));

const EpochSquare: React.FC<{ epoch: EpochIntegrityItem }> = ({ epoch }) => {
  const backgroundColor = getIntegrityColor(epoch.integrity);

  return (
    <Tooltip content={`Epoch #${epoch.epochNumber} | Integrity: ${epoch.integrity}%`}>
      <Link href={`/epochs/${epoch.epochNumber}`}
        className="relative w-full h-14 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md border border-slate-200/50 dark:border-slate-700/50 overflow-hidden"
        style={{ backgroundColor }}
      >
        <span className="absolute bottom-1.5 right-2 text-xs font-bold text-white drop-shadow-sm/50">
          {epoch.epochNumber}
        </span>
      </Link>
    </Tooltip>
  );
};

const CurrentEpochSquare: React.FC<{ epochNumber: number }> = ({ epochNumber }) => {
  return (
    <Tooltip content={`View Live Epoch #${epochNumber}`}>
      <Link href="/epoch-performance"
        className="group relative w-full h-14 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 bg-brand-violet hover:bg-amber-600 border border-amber-400/30 shadow-md hover:shadow-lg overflow-hidden"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <SignalIcon className="h-5 w-5 text-white group-hover:scale-110 transition-transform duration-300" />
        </div>
        <span className="absolute bottom-1.5 right-2 text-xs font-bold text-white group-hover:scale-110 transition-transform duration-300">
          {epochNumber}
        </span>
      </Link>
    </Tooltip>
  );
};


const PaginationControlsEpochs: React.FC<{
  currentPage: number;
  totalPages: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  isPending?: boolean;
}> = ({ currentPage, totalPages, setCurrentPage, isPending = false }) => {
  if (totalPages <= 1) return null;

  return (
    <nav className="relative z-0 inline-flex rounded-xl shadow-sm" aria-label="Pagination">
      <button
        onClick={() => setCurrentPage(1)}
        disabled={currentPage === 1 || isPending}
        className="group relative inline-flex items-center px-3 py-2 rounded-l-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-brand-violet dark:hover:text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
      >
        <ChevronDoubleLeftIcon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
        disabled={currentPage === 1 || isPending}
        className="group relative inline-flex items-center px-3 py-2 border-t border-b border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-brand-violet dark:hover:text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </button>
      <span className="relative hidden sm:inline-flex items-center px-4 py-2 border-t border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages || isPending}
        className="group relative inline-flex items-center px-3 py-2 border-t border-b border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-brand-violet dark:hover:text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setCurrentPage(totalPages)}
        disabled={currentPage === totalPages || isPending}
        className="group relative inline-flex items-center px-3 py-2 rounded-r-xl border border-t border-b border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-brand-violet dark:hover:text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
      >
        <ChevronDoubleRightIcon className="h-4 w-4" />
      </button>
    </nav>
  );
};

const EpochHeatmapPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [epochsPerPage, setEpochsPerPage] = useState(EPOCHS_PER_PAGE_OPTIONS[3].value);

  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Filter states (currently unused but kept for future filtering functionality)
  const [activeFilters] = useState({ start: '', end: '' });

  const [isPending, startTransition] = useTransition();
  const { rollupParam } = useRollupFilter();
  const configState = useNetworkConfig(rollupParam);
  const { currentEpoch } = useEpochCalculations(configState);
  const { setLoadingWindow } = useLoading();

  // Use React Query hook for data fetching
  const { data, isLoading, error: queryError } = useEpochsIntegrity({
    page: currentPage,
    limit: epochsPerPage,
    search: debouncedSearchTerm,
    startEpoch: activeFilters.start,
    endEpoch: activeFilters.end,
  }, rollupParam);

  const epochs = data?.epochs || [];
  const totalPages = data?.totalPages || 0;
  const totalEpochs = data?.totalEpochs || 0;
  const error = queryError?.message || null;

  // Update loading window based on query state
  useEffect(() => {
    setLoadingWindow(isLoading);
  }, [isLoading, setLoadingWindow]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => {
        setDebouncedSearchTerm(searchTerm);
        setCurrentPage(1);
      });
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  return (
    <>
      <Head>
        <title>Epoch Integrity | Dashtec</title>
        <meta name="description" content="A heatmap view of historical epoch integrity." />
      </Head>
      <PageTransitionWrapper>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Navigation */}
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all duration-300 hover:shadow-sm"
            >
              <ArrowLeftIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Back to Dashboard</span>
            </Link>
          </div>

          {/* Enhanced Header Section */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
            {/* Subtle background gradient - Optional */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/50 pointer-events-none"></div>
            {/* Elegant Mesh Gradient - Top Right */}
            <div className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-gradient-to-br from-brand-violet/5 via-amber-500/5 to-transparent blur-3xl opacity-60 pointer-events-none"></div>

            <div className="relative z-10 p-4 sm:p-6 lg:p-12">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
                <div className="text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                    {/* Clean Icon Container */}
                    <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 flex-shrink-0">
                      <ChartBarSquareIcon className="h-5 w-5 sm:h-6 sm:w-6 text-brand-violet dark:text-accent-purple-light" />
                    </div>

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                      Epoch Integrity Heatmap
                    </h1>
                  </div>

                  <p className="text-sm sm:text-base lg:text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                    A historical overview of network health. Click any epoch for a detailed breakdown.
                  </p>
                </div>

                <div className="relative group w-full lg:max-w-sm">
                  <div className="relative">
                    <input
                      type="search"
                      placeholder="Search by Epoch Number..."
                      className="pl-12 pr-4 py-3 rounded-xl text-sm w-full bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-brand-violet/50 focus:border-brand-violet/50 focus:outline-none transition-all duration-300 shadow-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 dark:text-slate-500 absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              {/* Subtle background gradient - Optional */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/50 pointer-events-none"></div>
              <div className="relative z-10">
                <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-3">
                  {Array.from({ length: epochsPerPage }).map((_, i) => (
                    <div key={i} className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 shadow-sm">
                      <Skeleton className="w-full h-14" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-12">
              <div className="relative z-10 text-center">
                <div className="relative mb-6">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30 mx-auto w-fit">
                    <PresentationChartLineIcon className="h-10 w-10 text-red-500" />
                  </div>
                </div>
                <p className="text-red-600 dark:text-red-400 font-medium text-lg">{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Controls */}
              <div className="block md:hidden mb-6">
                <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="relative z-10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Per page:</span>
                      <CustomSelect
                        value={epochsPerPage}
                        onChange={(value) => setEpochsPerPage(Number(value))}
                        options={EPOCHS_PER_PAGE_OPTIONS}
                        size="sm"
                        variant="compact"
                      />
                    </div>
                    {totalPages > 1 && (
                      <PaginationControlsEpochs currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} isPending={isPending} />
                    )}
                  </div>
                </div>
              </div>
              {/* Heatmap Container */}
              <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 mb-8">
                {/* Subtle background gradient - Optional */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/50 pointer-events-none"></div>

                <div className="relative z-10">
                  <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 xl:grid-cols-20 gap-3">
                    {currentPage === 1 && !debouncedSearchTerm && !activeFilters.start && !activeFilters.end && currentEpoch !== undefined && (
                      <CurrentEpochSquare epochNumber={currentEpoch} />
                    )}
                    {epochs.filter(epoch => epoch.epochNumber !== currentEpoch).map(epoch => (
                      <EpochSquare key={epoch.epochNumber} epoch={epoch} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Controls Container */}
              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Per page:</span>
                    <CustomSelect
                      value={epochsPerPage}
                      onChange={(value) => setEpochsPerPage(Number(value))}
                      options={EPOCHS_PER_PAGE_OPTIONS}
                      size="sm"
                      variant="compact"
                    />
                    <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <span>Showing {epochs.length} of {totalEpochs} epochs</span>
                    </div>
                  </div>
                  {totalPages > 1 && (
                    <PaginationControlsEpochs currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} isPending={isPending} />
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </PageTransitionWrapper>
    </>
  );
};

export default EpochHeatmapPage;