'use client';

import { NextPage } from 'next';
import Head from 'next/head';
import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import { PerformanceFilterModal } from '@/components/features/validators/PerformanceFilterModal';
import { ValidatorCard } from '@/components/features/validators/ValidatorCard';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline';
import { useSearchModal } from '@/context/SearchModalContext';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useSearch } from '@/hooks/queries/useSearch';

const CardSkeleton = () => (
  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5 border border-slate-200 dark:border-slate-700 space-y-3">
    <div className="flex justify-between items-start"><Skeleton heightClass="h-6" widthClass="w-1/3" /><Skeleton heightClass="h-5" widthClass="w-1/4" /></div>
    <Skeleton heightClass="h-4" widthClass="w-full" />
    <div className="grid grid-cols-2 gap-4 pt-2"><Skeleton heightClass="h-10" widthClass="w-full" /><Skeleton heightClass="h-10" widthClass="w-full" /></div>
    <Skeleton heightClass="h-16" widthClass="w-full" />
    <Skeleton heightClass="h-9" widthClass="w-full" />
  </div>
);

// Add custom styles for animations
const fadeInAnimation = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }
`;

const SearchResultsPageContent: React.FC = () => {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const { setIsSearchOpen } = useSearchModal();
  const router = useRouter();

  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [startEpoch, setStartEpoch] = useState('');
  const [endEpoch, setEndEpoch] = useState('');

  const itemsPerPageOptions = [
    { value: 12, label: '12' },
    { value: 24, label: '24' },
    { value: 48, label: '48' }
  ];

  const { data, isLoading } = useSearch(initialQuery, startEpoch, endEpoch);
  const searchResults = data?.validators || [];
  const queuedValidators = data?.queuedValidators || [];

  const allResults = useMemo(() => [...searchResults, ...queuedValidators], [searchResults, queuedValidators]);

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      validators: searchResults.slice(startIndex, Math.min(endIndex, searchResults.length)),
      queueStart: Math.max(0, startIndex - searchResults.length),
      queueEnd: Math.max(0, endIndex - searchResults.length),
    };
  }, [searchResults, queuedValidators, currentPage, itemsPerPage]);

  const paginatedQueue = useMemo(() => {
    if (paginatedResults.queueEnd <= 0) return [];
    return queuedValidators.slice(paginatedResults.queueStart, paginatedResults.queueEnd);
  }, [queuedValidators, paginatedResults.queueStart, paginatedResults.queueEnd]);

  const totalPages = useMemo(() => Math.ceil(allResults.length / itemsPerPage), [allResults.length, itemsPerPage]);

  return (
    <>
      <style jsx global>{fadeInAnimation}</style>
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 _tight  py-8">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-50">Search Results</h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            Found {searchResults.length + queuedValidators.length} result(s) for query: <span className='font-semibold text-brand-violet'>{initialQuery}</span>
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (paginatedResults.validators.length > 0 || paginatedQueue.length > 0) ? (
        <>
          {/* Active Sequencers */}
          {paginatedResults.validators.length > 0 && (
            <>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-4">Sequencers Found</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
                {paginatedResults.validators.map((validator) => (
                  <ValidatorCard key={validator.index} validator={validator} showScore={false} />
                ))}
              </div>
            </>
          )}

          {/* Queued Sequencers */}
          {paginatedQueue.length > 0 && (
            <>
              <div className="mb-6 relative">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Queued Sequencers</h2>
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Pending Activation</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {paginatedQueue.map((validator, index) => (
                  <div
                    key={validator.id}
                    onClick={() => router.push(`/queue?search=${encodeURIComponent(validator.attester_address)}`)}
                    className="group relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 hover:border-brand-violet/30 dark:hover:border-accent-purple-light/30 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:-translate-y-1 animate-fade-in-up opacity-0"
                    style={{ 
                      animationDelay: `${index * 50}ms`,
                      animationFillMode: 'forwards'
                    }}
                  >
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/5 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    {/* Animated background pattern */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                    
                    <div className="relative z-10 p-6">
                      {/* Queue Position Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-lg group-hover:from-amber-500/20 group-hover:to-orange-500/20 transition-colors duration-300">
                            <QueueListIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Position</span>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                          <span className="relative text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                            #{validator.position}
                          </span>
                        </div>
                      </div>
                      
                      {/* Address Information */}
                      <div className="space-y-3">
                        <div className="group/item">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full group-hover/item:bg-brand-violet dark:group-hover/item:bg-accent-purple-light transition-colors duration-300"></div>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Attester</span>
                          </div>
                          <p className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate group-hover/item:text-brand-violet dark:group-hover/item:text-accent-purple-light transition-colors duration-300">
                            {validator.attester_address}
                          </p>
                        </div>
                        
                        <div className="group/item">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full group-hover/item:bg-blue-500 dark:group-hover/item:bg-blue-400 transition-colors duration-300"></div>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Withdrawer</span>
                          </div>
                          <p className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors duration-300">
                            {validator.withdrawer_address}
                          </p>
                        </div>
                      </div>
                      
                      {/* Footer with date and transaction */}
                      <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {new Date(validator.queued_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors duration-300">
                          <span>Tx</span>
                          <span className="font-mono">{validator.transaction_hash.slice(0, 6)}...</span>
                        </div>
                      </div>
                      
                      {/* Hover indicator */}
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-700 dark:text-slate-300">Per page:</span>
                <CustomSelect
                  value={itemsPerPage}
                  onChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}
                  options={itemsPerPageOptions}
                  size="sm"
                  variant="compact"
                />
              </div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50">
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <span className="relative hidden sm:inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50">
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </nav>
            </div>
          )}
        </>
      ) : (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-amber-900/20 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
          <div className="relative z-10 text-center py-20 px-8">
            <div className="max-w-2xl mx-auto">
              {/* Icon */}
              <div className="relative mb-8">
                <div className="relative mx-auto w-24 h-24 mb-4">
                  <div className="absolute inset-2 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-full"></div>
                  <MagnifyingGlassIcon className="absolute inset-0 w-12 h-12 text-blue-500 dark:text-blue-400 m-auto" />
                </div>
              </div>

              {/* Dynamic Content */}
              <div className="space-y-6">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-brand-violet dark:from-amber-400 dark:to-accent-purple-light bg-clip-text text-transparent">
                  No Results Found
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  We searched high and low, but couldn't find any sequencers matching
                  <span className="font-semibold text-blue-600 dark:text-blue-400"> "{initialQuery}"</span>
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  The sequencer might be hiding in the queue, or perhaps it's using a different address format.
                </p>
              </div>

              {/* Call-to-action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
                <button
                  onClick={() => router.push("/queue")}
                  className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-brand-violet to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg"
                >
                  <QueueListIcon className="w-5 h-5" />
                  Check Sequencer Queue
                  <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>

                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="group inline-flex items-center gap-3 px-8 py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-700 dark:text-slate-200 font-semibold rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                >
                  <MagnifyingGlassIcon className="w-5 h-5" />
                  Try Different Search
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <PerformanceFilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} startEpoch={startEpoch} endEpoch={endEpoch} setStartEpoch={setStartEpoch} setEndEpoch={setEndEpoch} handleFilterSubmit={() => setIsFilterModalOpen(false)} clearFilter={() => { setStartEpoch(''); setEndEpoch(''); }} />
    </main>
    </>
  );
}

const SearchPage: NextPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Head><title>Search Results | Dashtec</title></Head>
      <PageTransitionWrapper>
        <Suspense fallback={<div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8"><h1 className="text-3xl font-bold">Loading Search Results...</h1></div>}>
          <SearchResultsPageContent />
        </Suspense>
      </PageTransitionWrapper>
    </div>
  );
};

export default SearchPage;