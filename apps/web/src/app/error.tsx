'use client';

import { useEffect, useMemo } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  // Check if error is related to chunk loading or module import failures
  const isChunkError = useMemo(() =>
    error.message?.includes('Loading chunk') ||
    error.message?.includes('Failed to fetch dynamically imported module') ||
    error.message?.includes('Importing a module script failed') ||
    error.name === 'ChunkLoadError',
    [error]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="max-w-2xl w-full">
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-red-50/30 dark:from-slate-800 dark:via-slate-800 dark:to-red-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-orange-500/10 to-transparent rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 p-8 sm:p-12">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/10 rounded-full blur-2xl"></div>
                <div className="relative p-4 bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm rounded-2xl border border-white/30 dark:border-slate-600/30 shadow-xl">
                  <ExclamationTriangleIcon className="h-12 w-12 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent mb-3">
                {isChunkError ? 'New Version Available' : 'Something went wrong'}
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-lg mb-4">
                {isChunkError
                  ? 'A new version of the application has been deployed. Please refresh the page to get the latest version.'
                  : 'We encountered an unexpected error while processing your request.'}
              </p>
              {error.digest && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800/50 px-3 py-2 rounded inline-block">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <ArrowPathIcon className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
                {isChunkError ? 'Refresh Page' : 'Try Again'}
                <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>

              {!isChunkError && (
                <button
                  onClick={() => window.location.href = '/'}
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-700 dark:text-slate-200 font-semibold rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                >
                  Go Home
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Additional help text */}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}
