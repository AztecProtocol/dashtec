'use client';

import Link from 'next/link';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import { CpuChipIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { NetworkProvingHealth } from '@/components/features/prover/NetworkProvingHealth';
import { ProverMarketShare } from '@/components/features/prover/ProverMarketShare';
import { ProverActivityTimeline } from '@/components/features/prover/ProverActivityTimeline';
import { ProverLeaderboardTable } from '@/components/features/prover/ProverLeaderboardTable';

/** Network-wide prover analytics page */
export default function ProverNetworkPage() {
  return (
    <div className="min-h-screen">
      <PageTransitionWrapper>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
            <div className="relative z-10 p-4 sm:p-6 lg:p-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 flex-shrink-0">
                    <CpuChipIcon className="h-5 w-5 sm:h-6 sm:w-6 text-brand-violet dark:text-accent-purple-light" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                      Network Proving Overview
                    </h1>
                    <p className="text-sm sm:text-base lg:text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                      Aggregate prover analytics across the Aztec network
                    </p>
                  </div>
                </div>
                <Link
                  href="/prover"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:border-brand-violet/30 dark:hover:border-accent-purple-light/20 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300 flex-shrink-0"
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  Lookup Prover
                </Link>
              </div>
            </div>
          </div>

          {/* Health KPIs */}
          <section className="mb-8">
            <NetworkProvingHealth />
          </section>

          {/* Charts row: Market Share + Activity Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ProverMarketShare />
            <ProverActivityTimeline />
          </div>

          {/* Leaderboard */}
          <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-6">
            <ProverLeaderboardTable />
          </section>
        </main>
      </PageTransitionWrapper>
    </div>
  );
}
