import React from 'react';
import Link from 'next/link';
import { RocketLaunchIcon, BoltIcon, CubeTransparentIcon, ArrowRightIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export const CallToActionCard: React.FC = () => {
  return (
    <div className="mt-6 sm:mt-8 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Icon & Title */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-violet/10 dark:bg-brand-violet/20 rounded-xl shadow-sm">
                <RocketLaunchIcon className="h-6 w-6 text-brand-violet dark:text-accent-purple-light" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                Become a Sequencer
              </h2>
            </div>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-light">
              Join Aztec's decentralized privacy layer. Order transactions, produce blocks, and earn <span className="font-semibold text-brand-violet dark:text-accent-purple-light">L1 block rewards + transaction fees</span>.
            </p>

            {/* Key Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-start gap-2">
                <BoltIcon className="h-5 w-5 text-brand-violet dark:text-accent-purple-light flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Earn Rewards</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Block rewards + fees</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-brand-violet dark:text-accent-purple-light flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Privacy First</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Confidential contracts</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CubeTransparentIcon className="h-5 w-5 text-brand-violet dark:text-accent-purple-light flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Infrastructure</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Critical network role</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: CTA Button */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <Link
              href="https://docs.aztec.network/network/setup/sequencer_management"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:px-8 sm:py-4 bg-brand-violet hover:bg-amber-600 dark:bg-brand-violet dark:hover:bg-amber-600 text-white font-semibold text-sm sm:text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              <span className="relative">Get Started</span>
              <ArrowRightIcon className="relative w-4 h-4 sm:w-5 sm:h-5 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};