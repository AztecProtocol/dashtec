'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

/** Chart colors for rollup versions — usable in Recharts or any charting lib */
export const VERSION_CHART_COLORS = [
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#10b981', // emerald
  '#f43f5e', // rose
  '#f97316', // orange
  '#14b8a6', // teal
];

/** Tailwind background classes for chip colors (cycles for N > 8) */
const CHIP_BG_CLASSES = [
  'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
];

/** Active (selected) chip background classes */
const CHIP_ACTIVE_CLASSES = [
  'bg-cyan-500 text-white border-cyan-600',
  'bg-blue-500 text-white border-blue-600',
  'bg-violet-500 text-white border-violet-600',
  'bg-amber-500 text-white border-amber-600',
  'bg-emerald-500 text-white border-emerald-600',
  'bg-rose-500 text-white border-rose-600',
  'bg-orange-500 text-white border-orange-600',
  'bg-teal-500 text-white border-teal-600',
];

interface RollupVersionFilterProps {
  versions: { address: string; label: string; deprecated: boolean }[];
  effectiveRollups: string[];
  activeRollup: string;
  onToggle: (address: string) => void;
  onSelectAll: () => void;
  hasOverride: boolean;
  maxVisible?: number;
}

/** Chip-based multi-select filter for rollup versions */
export const RollupVersionFilter: React.FC<RollupVersionFilterProps> = ({
  versions,
  effectiveRollups,
  activeRollup,
  onToggle,
  onSelectAll,
  hasOverride,
  maxVisible = 5,
}) => {
  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const visibleVersions = versions.slice(0, maxVisible);
  const overflowVersions = versions.slice(maxVisible);
  const hasOverflow = overflowVersions.length > 0;

  /** Close overflow dropdown on outside click */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        overflowRef.current &&
        buttonRef.current &&
        !overflowRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowOverflow(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /** Check if a version address is currently selected */
  const isSelected = (address: string) => effectiveRollups.includes(address);

  /** Get the cycling chip class for a version by index */
  const getChipClass = (index: number, selected: boolean) => {
    const i = index % CHIP_BG_CLASSES.length;
    return selected ? CHIP_ACTIVE_CLASSES[i] : CHIP_BG_CLASSES[i];
  };

  /** Determine if "All" is effectively selected (no override) */
  const allSelected = !hasOverride;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* All chip */}
      <button
        onClick={onSelectAll}
        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition-all duration-200 cursor-pointer ${
          allSelected
            ? 'bg-slate-700 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-300'
            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        All
      </button>

      {/* Visible version chips */}
      {visibleVersions.map((version, index) => {
        const selected = isSelected(version.address);
        return (
          <button
            key={version.address}
            onClick={() => onToggle(version.address)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition-all duration-200 cursor-pointer ${getChipClass(index, selected)}`}
          >
            {/* Green dot for active rollup */}
            {version.address === activeRollup && (
              <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                selected ? 'bg-white/80' : 'bg-emerald-500'
              }`} />
            )}
            <span>{version.label}</span>
            {/* Deprecated indicator */}
            {version.deprecated && (
              <span className={`text-[10px] ${selected ? 'text-white/70' : 'opacity-60'}`}>old</span>
            )}
          </button>
        );
      })}

      {/* Overflow "+N more" button and dropdown */}
      {hasOverflow && (
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setShowOverflow(!showOverflow)}
            className="inline-flex items-center gap-0.5 px-2.5 py-1 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 cursor-pointer"
          >
            +{overflowVersions.length} more
            <ChevronDownIcon className={`h-3 w-3 transition-transform duration-200 ${showOverflow ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showOverflow && (
              <motion.div
                ref={overflowRef}
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-1.5 w-40 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 py-1"
              >
                {overflowVersions.map((version, i) => {
                  const globalIndex = maxVisible + i;
                  const selected = isSelected(version.address);
                  return (
                    <button
                      key={version.address}
                      onClick={() => onToggle(version.address)}
                      className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors ${
                        selected
                          ? 'bg-slate-100 dark:bg-slate-700/50 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      {/* Color dot matching chip color */}
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: VERSION_CHART_COLORS[globalIndex % VERSION_CHART_COLORS.length] }}
                      />
                      {/* Active indicator */}
                      {version.address === activeRollup && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      )}
                      <span className="text-slate-700 dark:text-slate-300">{version.label}</span>
                      {version.deprecated && (
                        <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">old</span>
                      )}
                      {selected && (
                        <svg className="ml-auto h-3 w-3 text-slate-600 dark:text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
