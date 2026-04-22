import Link from 'next/link';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import { ArrowLeftIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';

/**
 * Provider not found page
 */
export default function ProviderNotFound() {
  return (
    <PageTransitionWrapper>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/providers"
            className="group relative inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors duration-300"
          >
            <div className="p-1 rounded-lg bg-white/50 dark:bg-slate-700/30 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 group-hover:bg-brand-violet/10 transition-colors duration-300">
              <ArrowLeftIcon className="h-4 w-4" />
            </div>
            Back to Providers
          </Link>
        </div>

        {/* Not Found Content */}
        <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-2xl">
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-red-500/5"></div>
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-red-400/10 to-transparent rounded-full blur-3xl"></div>

          <div className="relative z-10 p-12 lg:p-16">
            <div className="text-center space-y-6 max-w-2xl mx-auto">
              {/* Icon */}
              <div className="relative mx-auto w-fit mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-red-300/30 to-red-400/20 rounded-2xl blur-lg"></div>
                <div className="relative p-4 bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl">
                  <BuildingOffice2Icon className="h-16 w-16 text-red-500 dark:text-red-400" />
                </div>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 via-red-600 to-red-700 dark:from-slate-100 dark:via-red-400 dark:to-red-500 bg-clip-text text-transparent mb-4">
                  Provider Not Found
                </h1>
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
                  The provider you're looking for doesn't exist. Please check the provider identifier and try again.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link
                  href="/providers"
                  className="group relative inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-brand-violet to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg w-full sm:w-auto"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  <span>View All Providers</span>
                  <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-3 px-6 py-3 bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium rounded-xl transition-all duration-300 border border-slate-200/50 dark:border-slate-600/50 hover:shadow-lg w-full sm:w-auto"
                >
                  <span>Go to Dashboard</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </PageTransitionWrapper>
  );
}
