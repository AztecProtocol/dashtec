'use client';

import { FormEvent, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useEpochCalculations } from '@/hooks/useEpochCalculations';
import { useEarliestEpoch } from '@/hooks/useEarliestEpoch';
import { ClockIcon, CalendarDaysIcon, SparklesIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Z_INDEX } from '@/utils/constants';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';

interface PerformanceFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  startEpoch: string;
  endEpoch: string;
  setStartEpoch: (value: string) => void;
  setEndEpoch: (value: string) => void;
  handleFilterSubmit: () => void;
  clearFilter: () => void;
}

export const PerformanceFilterModal: React.FC<PerformanceFilterModalProps> = ({
  isOpen,
  onClose,
  startEpoch,
  endEpoch,
  setStartEpoch,
  setEndEpoch,
  handleFilterSubmit,
  clearFilter,
}) => {
  const configState = useNetworkConfig();
  const { currentEpoch } = useEpochCalculations(configState);
  const { earliestEpoch } = useEarliestEpoch();
  const [selectedQuick, setSelectedQuick] = useState<string | null>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleFilterSubmit();
    onClose();
  }

  const handleQuickSelect = (epochsAgo?: number, label?: string) => {
    setSelectedQuick(label || 'All Time');
    if (epochsAgo) {
      if (currentEpoch === undefined) return;
      const end = currentEpoch;
      const start = Math.max(earliestEpoch || 0, end - epochsAgo);
      setStartEpoch(String(start));
      setEndEpoch(String(end));
    } else {
      // "All Time"
      setStartEpoch('');
      setEndEpoch('');
    }
  };

  const handleClearFilter = () => {
    clearFilter();
    setSelectedQuick(null);
    onClose();
  };

  const quickOptions = [
    { label: 'Last 10 Epochs', epochs: 10, icon: ClockIcon, iconColor: 'text-emerald-500' },
    { label: 'Last 50 Epochs', epochs: 50, icon: CalendarDaysIcon, iconColor: 'text-blue-500' },
    { label: 'Last 100 Epochs', epochs: 100, icon: SparklesIcon, iconColor: 'text-amber-500' },
    { label: 'Last 500 Epochs', epochs: 500, icon: ClockIcon, iconColor: 'text-pink-500' },
    { label: 'All Time', epochs: undefined, icon: CalendarDaysIcon, iconColor: 'text-slate-500' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Filter Performance Data"
      zIndex={Z_INDEX.PERFORMANCE_FILTER_MODAL}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/5 via-transparent to-amber-500/5 rounded-xl pointer-events-none"></div>

      <form onSubmit={onSubmit} className="relative z-10">
        {/* Quick Select Section */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Quick Select</p>

          <div className="grid grid-cols-2 gap-2">
            {quickOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedQuick === option.label;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleQuickSelect(option.epochs, option.label)}
                  className={`
                    p-3 rounded-lg border text-sm font-medium transition-colors text-left
                    ${isSelected
                      ? 'border-brand-violet bg-brand-violet/10 dark:bg-accent-purple/10 text-brand-violet dark:text-accent-purple-light'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-brand-violet dark:text-accent-purple-light' : option.iconColor}`} />
                    <span>{option.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Range Section */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Custom Range</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="modalStartEpoch" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Start Epoch
              </label>
              <input
                type="number"
                id="modalStartEpoch"
                value={startEpoch}
                onChange={(e) => setStartEpoch(e.target.value)}
                min={earliestEpoch ?? 0}
                placeholder={`${earliestEpoch ?? '1'}`}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-violet focus:border-brand-violet transition-colors"
              />
            </div>

            <div>
              <label htmlFor="modalEndEpoch" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                End Epoch
              </label>
              <input
                type="number"
                id="modalEndEpoch"
                value={endEpoch}
                onChange={(e) => setEndEpoch(e.target.value)}
                min={startEpoch || earliestEpoch || 0}
                max={currentEpoch}
                placeholder={`${currentEpoch ?? '...'}`}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-violet focus:border-brand-violet transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleClearFilter}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Clear
          </button>

          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-brand-violet hover:bg-amber-600 dark:bg-accent-purple dark:hover:bg-accent-purple/80 rounded-lg transition-colors"
          >
            Apply Filter
          </button>
        </div>
      </form>
    </Modal>
  );
};
