'use client';

import React from 'react';

type IconType = React.ElementType;

interface MetricCardProps {
  label: string;
  icon: IconType;
  formatted: string;
  usd: string | null;
  theme?: 'slate' | 'emerald';
  action?: { label: string; onClick: () => void };
}

/** Compact metric card used on validator detail page */
export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  icon: Icon,
  formatted,
  usd,
  theme = 'slate',
  action,
}) => {
  const themeStyles = {
    slate: {
      iconBg: 'bg-slate-100 dark:bg-slate-800',
      iconText: 'text-slate-600 dark:text-slate-300',
      actionText: 'text-slate-500 dark:text-slate-400',
    },
    emerald: {
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/20',
      iconText: 'text-emerald-600 dark:text-emerald-400',
      actionText: 'text-emerald-600 dark:text-emerald-400',
    },
  };

  const styles = themeStyles[theme];

  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 ${styles.iconBg} rounded-lg shrink-0`}>
          <Icon className={`h-4 w-4 ${styles.iconText}`} />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
        {formatted}
      </div>
      {usd && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {usd}
        </div>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className={`mt-2 text-xs ${styles.actionText} font-medium hover:underline`}
        >
          {action.label} &rarr;
        </button>
      )}
    </div>
  );
};
