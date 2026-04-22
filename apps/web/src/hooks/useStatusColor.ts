import { useMemo } from 'react';
import { VALIDATOR_STATUS } from '@/utils/constants';

export interface StatusClasses {
  dot: string;
  text: string;
  bg: string;
  border: string;
}

/**
 * Pure function to get status color classes for a specific status
 */
export function getStatusClasses(status?: string): StatusClasses {
  if (!status) {
    return {
      dot: 'bg-slate-400',
      text: 'text-slate-700 dark:text-slate-50',
      bg: 'bg-slate-100 dark:bg-slate-600',
      border: 'border-slate-400'
    };
  }

  switch (status) {
    case VALIDATOR_STATUS.ACTIVE:
      return {
        dot: 'bg-green-500',
        text: 'text-green-700 dark:text-green-300',
        bg: 'bg-green-100 dark:bg-green-500/20',
        border: 'border-green-500'
      };
    case VALIDATOR_STATUS.QUEUE:
      return {
        dot: 'bg-orange-500',
        text: 'text-orange-700 dark:text-orange-300',
        bg: 'bg-orange-100 dark:bg-orange-500/20',
        border: 'border-orange-500'
      };
    case VALIDATOR_STATUS.EXITING:
      return {
        dot: 'bg-cyan-500',
        text: 'text-cyan-700 dark:text-cyan-300',
        bg: 'bg-cyan-100 dark:bg-cyan-500/20',
        border: 'border-cyan-500'
      };
    case VALIDATOR_STATUS.ZOMBIE:
      return {
        dot: 'bg-yellow-500',
        text: 'text-yellow-700 dark:text-yellow-300',
        bg: 'bg-yellow-100 dark:bg-yellow-500/20',
        border: 'border-yellow-500'
      };
    case 'migrated':
      return {
        dot: 'bg-blue-500',
        text: 'text-blue-700 dark:text-blue-300',
        bg: 'bg-blue-100 dark:bg-blue-500/20',
        border: 'border-blue-500'
      };
    case 'exiting':
      return {
        dot: 'bg-cyan-500',
        text: 'text-cyan-700 dark:text-cyan-300',
        bg: 'bg-cyan-100 dark:bg-cyan-500/20',
        border: 'border-cyan-500'
      };
    case 'exited':
      return {
        dot: 'bg-slate-500',
        text: 'text-slate-700 dark:text-slate-300',
        bg: 'bg-slate-100 dark:bg-slate-500/20',
        border: 'border-slate-500'
      };
    default:
      return {
        dot: 'bg-slate-400',
        text: 'text-slate-700 dark:text-slate-50',
        bg: 'bg-slate-100 dark:bg-slate-600',
        border: 'border-slate-400'
      };
  }
}

/**
 * Hook to get status color classes for a single status
 */
export function useStatusColor(status?: string): StatusClasses {
  return useMemo(() => getStatusClasses(status), [status]);
}

/**
 * Hook to get status colors for multiple statuses at once
 */
export function useStatusColors(statuses: string[]): Map<string, StatusClasses> {
  return useMemo(() => {
    const colorMap = new Map<string, StatusClasses>();
    statuses.forEach(status => {
      colorMap.set(status, getStatusClasses(status));
    });
    return colorMap;
  }, [statuses]);
}
