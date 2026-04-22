import { KeyMetricCardProps } from '@/types';
import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import React from 'react';

export const KeyMetricCard: React.FC<KeyMetricCardProps> = ({
  title,
  value,
  subtext,
  valueColor = 'text-brand-violet dark:text-accent-purple-light',
  Icon,
  subtextButton,
}) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-6 flex flex-col justify-between h-full">
      {/* Subtle hover border effect */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</h2>
          {Icon && (
            <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50 group-hover:bg-brand-violet/5 dark:group-hover:bg-brand-violet/10 transition-colors duration-300">
              <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-brand-violet dark:group-hover:text-accent-purple-light transition-colors duration-300" />
            </div>
          )}
        </div>
        <p className={`text-3xl font-bold ${valueColor} mb-3 transition-transform duration-300`}>{value}</p>
      </div>

      <div className="relative z-10 mt-auto space-y-3">
        {typeof subtext === 'string' ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtext}</p>
        ) : (
          <div className="text-xs">{subtext}</div>
        )}

        {subtextButton && (
          <button
            onClick={subtextButton.onClick}
            className={`group/button relative inline-flex items-center gap-1 text-xs font-semibold ${valueColor} transition-all duration-300 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/50 hover:bg-white dark:hover:bg-slate-700 hover:border-brand-violet/30 dark:hover:border-accent-purple-light/30 hover:shadow-sm overflow-hidden`}
          >
            <span className="relative z-10">{subtextButton.label}</span>
            <ArrowRightIcon className="relative z-10 h-3 w-3 transition-transform duration-300 group-hover/button:translate-x-0.5" />
          </button>
        )}
      </div>
    </div>
  );
};