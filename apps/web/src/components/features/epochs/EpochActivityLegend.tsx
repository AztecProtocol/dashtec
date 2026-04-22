import React from 'react';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@/components/ui/Tooltip';

interface EpochActivityLegendProps {
  showCurrentSlotIndicator?: boolean;
}

/** Renders the slot activity color legend for epoch pages */
export const EpochActivityLegend: React.FC<EpochActivityLegendProps> = ({ showCurrentSlotIndicator = false }) => (
  <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-6 p-5">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
        <ExclamationTriangleIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Activity Legend</h3>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
      <LegendItem color="bg-green-500/60 dark:bg-green-500/40" borderColor="border-green-600/30" label="Attestation Sent" />
      <LegendItem color="bg-red-500/90 dark:bg-red-400/80" borderColor="border-red-600/30" label="Attestation Missed" />
      <LegendItem color="bg-accent-blue" borderColor="border-blue-600/30" label="Checkpoint Proposed / Mined" />
      <LegendItem color="bg-amber-500/90 dark:bg-amber-400/80" borderColor="border-amber-600/30" label="Checkpoint Missed" tooltip="Blocks were proposed but checkpoint was not attested" />
      <LegendItem color="bg-orange-600/90 dark:bg-orange-500/80" borderColor="border-orange-600/30" label="Block Missed" tooltip="No block proposals were sent at all" />
      <LegendItem color="bg-slate-200 dark:bg-slate-700/50" borderColor="border-slate-400/30" label="No Data" />
    </div>

    {showCurrentSlotIndicator && (
      <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700/30">
        <div className="w-4 h-4 rounded-sm bg-white dark:bg-slate-600 ring-2 ring-yellow-400 ring-offset-1 ring-offset-yellow-50 dark:ring-offset-yellow-900/20"></div>
        <span className="text-xs font-medium text-yellow-800 dark:text-yellow-300">Current Global Slot Indicator</span>
      </div>
    )}
  </div>
);

/** Single legend item with color swatch */
const LegendItem: React.FC<{ color: string; borderColor: string; label: string; tooltip?: string }> = ({ color, borderColor, label, tooltip }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
    <div className={`w-4 h-4 rounded-sm ${color} border ${borderColor}`}></div>
    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
    {tooltip && (
      <Tooltip content={tooltip}>
        <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
      </Tooltip>
    )}
  </div>
);
