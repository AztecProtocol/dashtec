'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useSearchParams, useRouter } from 'next/navigation';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import { CpuChipIcon, MagnifyingGlassIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { ActivityTrackerDashboard } from '@/components/features/prover/ActivityTrackerDashboard';

type TabId = 'activity' | 'performance' | 'settings';

interface Tab {
  id: TabId;
  label: string;
  description: string;
}

const tabs: Tab[] = [
  { id: 'activity', label: 'Activity Tracker', description: 'Track activity score and rewards' },
];

/** Prover page content that requires useSearchParams */
export function ProverPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const addressParam = searchParams.get('address') ?? '';

  const [proverAddress, setProverAddress] = useState(addressParam);
  const [inputAddress, setInputAddress] = useState(addressParam);
  const [activeTab, setActiveTab] = useState<TabId>('activity');

  /** Sync state when address query param changes (e.g. navigating from leaderboard) */
  useEffect(() => {
    if (addressParam && addressParam !== proverAddress) {
      setProverAddress(addressParam);
      setInputAddress(addressParam);
    }
  }, [addressParam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputAddress.trim();
    if (trimmed) {
      setProverAddress(trimmed);
      router.replace(`/prover?address=${trimmed}`);
    }
  };

  return (
    <div className="min-h-screen">
      <Head>
        <title>Prover Rewards Tracker</title>
        <meta name="description" content="Track prover rewards and activity" />
      </Head>

      <PageTransitionWrapper>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/50"></div>
            <div className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-gradient-to-br from-brand-violet/5 via-amber-500/5 to-transparent blur-3xl opacity-60"></div>

            <div className="relative z-10 p-4 sm:p-6 lg:p-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 flex-shrink-0">
                    <CpuChipIcon className="h-5 w-5 sm:h-6 sm:w-6 text-brand-violet dark:text-accent-purple-light" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                      Prover Rewards Tracker
                    </h1>
                    <p className="text-sm sm:text-base lg:text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                      Monitor prover activity, rewards, and performance metrics
                    </p>
                  </div>
                </div>
                <Link
                  href="/prover/network"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:border-brand-violet/30 dark:hover:border-accent-purple-light/20 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300 flex-shrink-0"
                >
                  <ChartBarIcon className="h-4 w-4" />
                  Network Overview
                </Link>
              </div>
            </div>
          </div>

          {/* Address Input or Dashboard */}
          {!proverAddress ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 mb-6">
                <CpuChipIcon className="h-16 w-16 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Enter Prover Address
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-md">
                Enter a prover address to track rewards and activity
              </p>
              <form onSubmit={handleSubmit} className="w-full max-w-lg">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={inputAddress}
                    onChange={(e) => setInputAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full pl-12 pr-4 py-4 text-lg border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-violet/20 dark:focus:ring-accent-purple-light/20 focus:border-brand-violet dark:focus:border-accent-purple-light transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!inputAddress.trim()}
                  className="w-full mt-4 px-6 py-4 bg-brand-violet hover:bg-brand-violet/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
                >
                  Track Prover Activity
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
                <nav className="flex gap-8" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                          ? 'border-brand-violet text-brand-violet dark:border-accent-purple-light dark:text-accent-purple-light'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === 'activity' && (
                <ActivityTrackerDashboard
                  proverAddress={proverAddress}
                  onChangeAddress={() => {
                    setProverAddress('');
                    setInputAddress('');
                    router.replace('/prover');
                  }}
                />
              )}

              {activeTab === 'performance' && (
                <div className="flex flex-col items-center justify-center py-24">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Performance Analytics
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      Coming soon...
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="flex flex-col items-center justify-center py-24">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Prover Settings
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      Coming soon...
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </PageTransitionWrapper>
    </div>
  );
}
