'use client';

import Head from 'next/head';
import { NextPage } from 'next';
import { PerformanceOverview } from '@/components/features/dashboard/PerformanceOverview';
import { VotingOverview } from '@/components/features/dashboard/VotingOverview';
import { MetricCardsGrid } from '@/components/features/dashboard/MetricCardsGrid';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import React from 'react';
import { ShieldCheckIcon, PresentationChartLineIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { CallToActionCard } from '@/components/features/dashboard/CallToActionCard';
import { DashboardProvider } from '@/context/DashboardContext';
import { useRollupFilter } from '@/hooks/useRollupFilter';

const DashboardContent: React.FC<{ rollupParam?: string }> = ({ rollupParam }) => {
  return (
    <PageTransitionWrapper>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Hero Section */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
          <div className="p-4 sm:p-6 lg:p-10">
            <div className="grid grid-cols-1 gap-6 sm:gap-8 items-start">
              {/* Title, Description, Quick Actions */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 flex-shrink-0">
                    <ShieldCheckIcon className="h-6 w-6 sm:h-8 sm:w-8 text-brand-violet dark:text-accent-purple-light" />
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Aztec Sequencer Dashboard
                  </h1>
                </div>

                <p className="text-sm sm:text-base lg:text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                  Comprehensive analytics for sequencer operations, attestation success, and network stability within Aztec's privacy-first ecosystem
                </p>

                {/* Quick Actions */}
                <div className="flex flex-col gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Quick Actions
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link
                      href="/sequencers"
                      className="group flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-violet/50 dark:hover:border-accent-purple/50 hover:shadow-md transition-all duration-300"
                    >
                      <div className="p-2 bg-brand-violet/5 dark:bg-brand-violet/10 rounded-lg group-hover:bg-brand-violet/10 dark:group-hover:bg-brand-violet/20 transition-colors">
                        <ShieldCheckIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-violet dark:text-accent-purple-light" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-violet dark:group-hover:text-accent-purple-light transition-colors text-sm sm:text-base">
                          Sequencer Registry
                        </span>
                        <span className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Explore and analyze sequencers
                        </span>
                      </div>
                    </Link>

                    <Link
                      href="/epoch-performance"
                      className="group flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-violet/50 dark:hover:border-accent-purple/50 hover:shadow-md transition-all duration-300"
                    >
                      <div className="p-2 bg-brand-violet/5 dark:bg-brand-violet/10 rounded-lg group-hover:bg-brand-violet/10 dark:group-hover:bg-brand-violet/20 transition-colors">
                        <PresentationChartLineIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-violet dark:text-accent-purple-light" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-violet dark:group-hover:text-accent-purple-light transition-colors text-sm sm:text-base">
                          Live Epoch View
                        </span>
                        <span className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Real-time performance metrics
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <MetricCardsGrid />

        {/* Performance Overview - Historical Trends and Top Sequencers */}
        <PerformanceOverview rollupParam={rollupParam} />

        {/* Voting Overview - Governance and Slashing voting activity */}
        <VotingOverview rollupParam={rollupParam} />

        <CallToActionCard />
      </main>
    </PageTransitionWrapper>
  );
};

const HomePage: NextPage = () => {
  const { rollupParam } = useRollupFilter();

  return (
    <div className="min-h-screen">
      <Head>
        <title>Sequencer Dashboard</title>
        <meta name="description" content="Sequencer Performance Overview" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <DashboardProvider rollupParam={rollupParam}>
        <DashboardContent rollupParam={rollupParam} />
      </DashboardProvider>
    </div>
  );
};

export default HomePage;
