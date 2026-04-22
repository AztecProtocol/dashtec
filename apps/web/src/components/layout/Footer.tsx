import React from 'react';
import { motion } from 'framer-motion';
import { Links } from '../features/dashboard/Links';

export const Footer: React.FC = () => {
  return (
    <footer className="relative mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-brand-violet/5 via-amber-500/5 to-transparent blur-3xl opacity-50 dark:opacity-30" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-10">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 md:gap-12">

          {/* Brand Section */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
              Aztec Sequencer Dashboard
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Monitoring the heart of privacy-preserving blockchain infrastructure.
              Built for the <span className="font-medium text-slate-700 dark:text-slate-200">Aztec Network</span> community.
            </p>
          </div>

          {/* Links Section */}
          <div className="flex flex-col items-center md:items-end gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Connect
            </span>
            <Links />
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 md:my-10 h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} DashLabs. All rights reserved.
          </p>

          <div className="flex items-center gap-1">
            Powered by
            <a
              href='https://dashnode.org'
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-700 dark:text-slate-300 hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors"
            >
              DashLabs
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};