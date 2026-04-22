import React from 'react';
import { SlashingRoundDetail } from '@/components/features/slashing-history/SlashingRoundDetail';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface SlashingRoundPageProps {
  params: Promise<{
    roundNumber: string;
  }>;
}

export default async function SlashingRoundPage({ params }: SlashingRoundPageProps) {
  const { roundNumber: roundNumberStr } = await params;
  const roundNumber = parseInt(roundNumberStr);

  if (isNaN(roundNumber)) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            href="/slashing-history"
            className="inline-flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/60 transition-all duration-300 hover:shadow-lg"
          >
            <ArrowLeftIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Back to Slashing History</span>
          </Link>
        </div>

        <div className="text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Round Number</h1>
          <p className="text-slate-600 dark:text-slate-400">
            The round number provided is not valid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation */}
      <div className="mb-6">
        <Link
          href="/slashing-history"
          className="inline-flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/60 transition-all duration-300 hover:shadow-lg"
        >
          <ArrowLeftIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Back to Slashing History</span>
        </Link>
      </div>

      {/* Page Content */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg">
        <SlashingRoundDetail roundNumber={roundNumber} />
      </div>
    </div>
  );
}