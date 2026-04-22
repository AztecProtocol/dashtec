// src/components/features/dashboard/EpochProgressCard.tsx
import React from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion'; // Import motion

interface EpochProgressCardProps {
  currentEpoch: number;
  nextEpochTime: string;
  currentSlotInEpoch: number; // 0-indexed
  totalSlotsInEpoch: number;
  epochProgressPercentage: number;
  valueColor?: string;
  slotDuration?: number;
  timeIntoCurrentSlot?: number;
  variant?: 'dashboard' | 'epoch-performance';
}

export const EpochProgressCard: React.FC<EpochProgressCardProps> = ({
  currentEpoch,
  nextEpochTime,
  currentSlotInEpoch,
  totalSlotsInEpoch,
  epochProgressPercentage,
  valueColor = 'text-brand-violet dark:text-accent-purple-light',
  slotDuration,
  timeIntoCurrentSlot,
  variant = 'dashboard',
}) => {
  const slots = Array.from({ length: totalSlotsInEpoch }, (_, i) => i);

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-6 flex flex-col justify-between h-full">
      {/* Subtle hover border effect */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Next Epoch In</h2>
          <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50 group-hover:bg-brand-violet/5 dark:group-hover:bg-brand-violet/10 transition-colors duration-300">
            <ClockIcon className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-brand-violet dark:group-hover:text-accent-purple-light transition-colors duration-300" />
          </div>
        </div>
        <p className={`text-3xl font-bold ${valueColor} mb-6 transition-transform duration-300`}>{nextEpochTime}</p>

        {/* Enhanced Progress Bar - Different layouts based on variant */}
        <div className="relative">
          <div className="relative p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-600/50">
            {variant === 'dashboard' ? (
              /* Slot-by-slot Progress Bar for Dashboard with Firm Outlines */
              <div className="space-y-3">
                {/* Segmented progress bar with strong borders */}
                <div className="grid w-full h-8 lg:h-5 gap-0.5 rounded-lg overflow-hidden p-0.5 bg-slate-200 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600" style={{ gridTemplateColumns: `repeat(${totalSlotsInEpoch}, minmax(0, 1fr))` }}>
                  {slots.map((slotIndex) => {
                    const isCurrentSlot = slotIndex === currentSlotInEpoch;
                    const hasPassed = slotIndex < currentSlotInEpoch;

                    let slotBgColor = 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700';
                    if (isCurrentSlot) {
                      slotBgColor = 'bg-brand-violet/10 dark:bg-accent-purple-light/10 border border-brand-violet/40 dark:border-accent-purple-light/40';
                    } else if (hasPassed) {
                      slotBgColor = 'bg-brand-violet dark:bg-accent-purple-light border border-brand-violet/60 dark:border-accent-purple-light/60';
                    }

                    return (
                      <div
                        key={slotIndex}
                        className={`h-full w-full rounded-sm relative transition-all duration-300 ease-in-out shadow-sm ${slotBgColor}`}
                        title={`Slot ${slotIndex + 1}`}
                      >
                        {isCurrentSlot && slotDuration && timeIntoCurrentSlot !== undefined && (
                          <motion.div
                            className="h-full bg-brand-violet dark:bg-accent-purple-light rounded-sm shadow-sm"
                            initial={{ width: "0%" }}
                            animate={{ width: `${(timeIntoCurrentSlot / slotDuration) * 100}%` }}
                            transition={{ duration: 0.5, ease: "linear" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Progress info */}
                <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-brand-violet rounded-full"></div>
                    Slot {currentSlotInEpoch + 1} / {totalSlotsInEpoch}
                  </span>
                  <span className="text-brand-violet dark:text-accent-purple-light font-bold">
                    {epochProgressPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ) : (
              /* Detailed Segmented Progress Bar for Epoch Performance */
              <>
                <div className="grid w-full h-6 gap-1 rounded-lg overflow-hidden" style={{ gridTemplateColumns: `repeat(${totalSlotsInEpoch}, minmax(0, 1fr))` }}>
                  {slots.map((slotIndex) => {
                    const isCurrentSlot = slotIndex === currentSlotInEpoch;
                    const hasPassed = slotIndex < currentSlotInEpoch;


                    let slotBgColor = 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700';
                    if (isCurrentSlot) {
                      slotBgColor = 'bg-brand-violet/10 dark:bg-accent-purple-light/10 border border-brand-violet/40 dark:border-accent-purple-light/40';
                    } else if (hasPassed) {
                      slotBgColor = 'bg-brand-violet dark:bg-accent-purple-light border border-brand-violet/60 dark:border-accent-purple-light/60';
                    }

                    return (
                      <div
                        key={slotIndex}
                        className={`h-full w-full rounded-sm relative transition-all duration-300 ease-in-out ${slotBgColor}`}
                        title={`Slot ${slotIndex + 1}`}
                      >
                        {isCurrentSlot && slotDuration && timeIntoCurrentSlot !== undefined && (
                          <motion.div
                            className="h-full bg-brand-violet dark:bg-accent-purple-light rounded-sm shadow-sm"
                            initial={{ width: "0%" }}
                            animate={{ width: `${(timeIntoCurrentSlot / slotDuration) * 100}%` }}
                            transition={{ duration: 0.5, ease: "linear" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3">
                  <span className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-brand-violet rounded-full"></div>
                    Slot {currentSlotInEpoch + 1} / {totalSlotsInEpoch}
                  </span>
                  <span className="text-brand-violet dark:text-accent-purple-light font-bold">
                    {epochProgressPercentage.toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="font-medium">Current Epoch: <span className="text-brand-violet dark:text-accent-purple-light font-bold">#{currentEpoch}</span></span>
        </div>
      </div>
    </div>
  );
};