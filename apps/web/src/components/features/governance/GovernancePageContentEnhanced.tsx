'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ScaleIcon,
  TableCellsIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { ProviderSignalingMatrix } from './matrix/ProviderSignalingMatrix';
import { HistoricalPayloadsTable } from './history/HistoricalPayloadsTable';

type ViewMode = 'matrix' | 'history';

export const GovernancePageContentEnhanced: React.FC = () => {
  const searchParams = useSearchParams();
  const roundParam = searchParams.get('round');
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');

  // Auto-switch to matrix view when round parameter is present
  useEffect(() => {
    if (roundParam) {
      setViewMode('matrix');
    }
  }, [roundParam]);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/50 pointer-events-none"></div>
        {/* Elegant Mesh Gradient - Top Right */}
        <div className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-gradient-to-br from-brand-violet/5 via-amber-500/5 to-transparent blur-3xl opacity-60 pointer-events-none"></div>

        <div className="relative z-10 p-4 sm:p-6 lg:p-12">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Clean Icon Container */}
            <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 flex-shrink-0">
              <ScaleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-brand-violet dark:text-accent-purple-light" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Governance Signal
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                Track sequencer signaling for proposed governance payloads
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex items-center justify-center md:justify-start">
        <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode('matrix')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'matrix'
              ? 'bg-brand-violet text-white shadow-lg'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
          >
            <UsersIcon className="h-4 w-4" />
            Provider Matrix
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'history'
              ? 'bg-brand-violet text-white shadow-lg'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
          >
            <TableCellsIcon className="h-4 w-4" />
            History
          </button>
        </div>
      </div>

      {/* View-specific Content */}
      {viewMode === 'matrix' && (
        <ProviderSignalingMatrix round={roundParam ? parseInt(roundParam, 10) : undefined} />
      )}

      {viewMode === 'history' && (
        <HistoricalPayloadsTable />
      )}
    </div>
  );
};