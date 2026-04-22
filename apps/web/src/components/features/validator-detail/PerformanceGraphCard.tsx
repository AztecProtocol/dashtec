import React, { useState } from 'react';
import { ValidatorEpochPerformanceData } from '@/types';
import { ValidatorPerformanceGraph } from '../validators/ValidatorPerformanceGraph';
import { Modal } from '@/components/ui/Modal';
import { TimeframeFilterButton } from '@/components/ui/TimeframeFilterButton';
import { PerformanceFilterModal } from '../validators/PerformanceFilterModal';
import { PresentationChartLineIcon, Bars4Icon, ChartBarSquareIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

interface PerformanceGraphCardProps {
  performanceData: ValidatorEpochPerformanceData[] | undefined;
  validatorName: string;
  isFilterActive: boolean;
  startEpoch: string;
  endEpoch: string;
  setStartEpoch: (value: string) => void;
  setEndEpoch: (value: string) => void;
  handleFilterSubmit: () => void;
  clearFilter: () => void;
}

export const PerformanceGraphCard: React.FC<PerformanceGraphCardProps> = ({
  performanceData, validatorName, isFilterActive, startEpoch, endEpoch, setStartEpoch, setEndEpoch, handleFilterSubmit, clearFilter
}) => {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  if (!performanceData || performanceData.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/50 shadow-xl h-full">
        <div className="p-6 h-full flex flex-col items-center justify-center">
          <div className="relative mb-6">
            <div className="p-4 bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl">
              <PresentationChartLineIcon className="h-12 w-12 text-slate-400 dark:text-slate-500" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-center font-medium">No performance history to display for this timeframe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/50 shadow-2xl">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-brand-violet/10 dark:bg-brand-violet/20 rounded-lg">
                <PresentationChartLineIcon className="h-5 w-5 text-brand-violet dark:text-accent-purple-light" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-brand-violet to-amber-600 dark:from-slate-100 dark:via-accent-purple-light dark:to-amber-400 bg-clip-text text-transparent">
                Performance Over Time
              </h3>
            </div>
            {startEpoch && endEpoch && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing data for Epochs {startEpoch} - {endEpoch}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl bg-white/60 dark:bg-slate-700/40 border border-white/30 dark:border-slate-600/30 p-1">
              <button
                onClick={() => setChartType('area')}
                title="Area Chart"
                className={`group p-2.5 rounded-lg transition-all duration-300 ${chartType === 'area' ? 'bg-white dark:bg-slate-800 shadow-lg text-brand-violet transform scale-105' : 'text-slate-600 dark:text-slate-300 hover:text-brand-violet dark:hover:text-accent-purple-light hover:bg-white/50 dark:hover:bg-slate-600/50'}`}
              >
                <Bars4Icon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
              </button>
              <button
                onClick={() => setChartType('bar')}
                title="Bar Chart"
                className={`group p-2.5 rounded-lg transition-all duration-300 ${chartType === 'bar' ? 'bg-white dark:bg-slate-800 shadow-lg text-brand-violet transform scale-105' : 'text-slate-600 dark:text-slate-300 hover:text-brand-violet dark:hover:text-accent-purple-light hover:bg-white/50 dark:hover:bg-slate-600/50'}`}
              >
                <ChartBarSquareIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
              </button>
            </div>

            <button
              onClick={() => setIsGraphFullscreen(true)}
              title="Expand chart"
              className="group p-2.5 rounded-xl bg-white/60 dark:bg-slate-700/40 border border-white/30 dark:border-slate-600/30 text-slate-600 dark:text-slate-300 hover:text-brand-violet dark:hover:text-accent-purple-light hover:bg-white/80 dark:hover:bg-slate-600/60 transition-all duration-300 transform hover:scale-105"
            >
              <ArrowsPointingOutIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-slate-700/40 border border-white/30 dark:border-slate-600/30 p-4">
          <div className="w-full h-[400px]">
            <ValidatorPerformanceGraph performanceData={performanceData} metricName="Attestation Rate" isRate={true} chartType={chartType} />
          </div>
        </div>
      </div>

      <PerformanceFilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} startEpoch={startEpoch} endEpoch={endEpoch} setStartEpoch={setStartEpoch} setEndEpoch={setEndEpoch} handleFilterSubmit={handleFilterSubmit} clearFilter={clearFilter} />
      <Modal isOpen={isGraphFullscreen} onClose={() => setIsGraphFullscreen(false)} title={`Performance Graph: ${validatorName}`} fullscreen={true}>
        <div className="relative w-full h-full overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md">
          <div className="w-full h-full p-6">
            <ValidatorPerformanceGraph performanceData={performanceData || []} metricName="Attestation Rate" isRate={true} chartType={chartType} />
          </div>
        </div>
      </Modal>
    </div>
  );
};