import React from 'react';
import { Validator } from '@/types';
import {
  ShieldCheckIcon, CubeIcon, CalendarDaysIcon, InformationCircleIcon
} from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/20/solid';
import { Tooltip } from '@/components/ui/Tooltip';
import { EpochParticipationTooltip } from '@/components/ui/EpochParticipationTooltip';
import { getPerformanceColor } from '@/utils/formatters';

interface StatsGridProps {
  validator: Validator;
  // Props to calculate epoch participation
  startEpoch: string;
  endEpoch: string;
  earliestEpoch: number | null;
  currentEpoch: number;
}

// Balanced StatCard matching existing glassmorphism design
const StatCard: React.FC<{
  title: string;
  titleTooltip?: React.ReactNode;
  value: string | React.ReactNode;
  subtitle?: string;
  stats: { label: string; value: string | number; highlight?: boolean }[];
  icon: React.ElementType;
  colorClass: string;
}> = ({ title, titleTooltip, value, subtitle, stats, icon: Icon, colorClass }) => (
  <div className="group relative p-5 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 hover:bg-white/90 dark:hover:bg-slate-800/90 transition-all duration-300 hover:shadow-xl shadow-lg overflow-hidden">
    <div className="relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`h-5 w-5 ${colorClass}`} strokeWidth={1.5} />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {title}
            </span>
            {titleTooltip && (
              <Tooltip content={titleTooltip}>
                <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </Tooltip>
            )}
          </div>
          <div className={`text-2xl sm:text-3xl font-bold ${colorClass}`}>
            {value}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Stats - simplified */}
      <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
        {stats.map((stat, index) => (
          <span key={index}>
            {index > 0 && ' • '}
            <span className={stat.highlight ? 'font-semibold' : ''}>{stat.value}</span> {stat.label.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  </div>
);

export const StatsGrid: React.FC<StatsGridProps> = ({ validator, startEpoch, endEpoch, earliestEpoch, currentEpoch }) => {
  const totalBlocksProduced = (validator.totalCheckpointsProposed || 0) + (validator.totalCheckpointsMined || 0);
  const totalBlockOpportunities = totalBlocksProduced + (validator.totalCheckpointsMissed || 0) + (validator.totalBlocksMissed || 0);
  const blockProductionRate = totalBlockOpportunities > 0 ? (totalBlocksProduced / totalBlockOpportunities) * 100 : 0;

  const totalParticipatingEpochs = validator.totalParticipatingEpochs || 0;
  const start = startEpoch ? parseInt(startEpoch) : earliestEpoch;
  const end = endEpoch ? parseInt(endEpoch) : currentEpoch;
  let totalEpochsInTimeframe = 0;
  if (start !== null && end !== null && end >= start) {
    totalEpochsInTimeframe = end - start;
  }

  // Calculate participation rate
  const participationRate = totalEpochsInTimeframe > 0 ? (totalParticipatingEpochs / totalEpochsInTimeframe) * 100 : 0;
  const totalAttestations = (validator.totalAttestationsSucceeded || 0) + (validator.totalAttestationsMissed || 0);

  // Check if there's no performance data
  const hasNoPerformanceData = totalParticipatingEpochs === 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-xl mb-6">
      <div>
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/20 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-brand-violet/10 dark:bg-brand-violet/20 rounded-lg">
                <SparklesIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-brand-violet to-amber-600 dark:from-slate-100 dark:via-accent-purple-light dark:to-amber-400 bg-clip-text text-transparent">
                Performance Metrics
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Epochs {start?.toLocaleString() ?? 0} - {end?.toLocaleString() ?? 0}
            </span>
          </div>
        </div>

        <div className="p-5">
          {hasNoPerformanceData ? (
            <div className="py-10 text-center">
              <div className="inline-flex p-3 bg-slate-100/60 dark:bg-slate-700/40 rounded-2xl mb-4">
                <CalendarDaysIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">
                No Performance Data Available
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                This sequencer has no recorded activity in the selected timeframe.
                Try adjusting the epoch range or check back later.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <StatCard
                title="Attestation"
                value={validator.attestationSuccess}
                subtitle={`${totalAttestations.toLocaleString()} total attestations`}
                stats={[
                  { label: 'succeeded', value: validator.totalAttestationsSucceeded?.toLocaleString() ?? '0', highlight: true },
                  { label: 'missed', value: validator.totalAttestationsMissed?.toLocaleString() ?? '0' },
                ]}
                icon={ShieldCheckIcon}
                colorClass="text-green-600 dark:text-green-400"
              />
              <StatCard
                title="Proposal Rate"
                titleTooltip={<>Checkpoint missed: blocks were proposed but checkpoint was not attested.<br />Block missed: no block proposals were sent at all.</>}
                value={`${blockProductionRate.toFixed(1)}%`}
                subtitle={`${totalBlockOpportunities.toLocaleString()} opportunities`}
                stats={[
                  { label: 'mined', value: (validator.totalCheckpointsMined || 0).toLocaleString(), highlight: true },
                  { label: 'proposed', value: (validator.totalCheckpointsProposed || 0).toLocaleString(), highlight: true },
                  { label: 'checkpoint missed', value: (validator.totalCheckpointsMissed || 0).toLocaleString() },
                  { label: 'block missed', value: (validator.totalBlocksMissed || 0).toLocaleString() },
                ]}
                icon={CubeIcon}
                colorClass="text-blue-600 dark:text-blue-400"
              />
              <StatCard
                title="Epoch Participation"
                value={
                  <EpochParticipationTooltip
                    totalParticipatingEpochs={totalParticipatingEpochs}
                    totalEpochsInTimeframe={totalEpochsInTimeframe}
                  />
                }
                subtitle="Click tooltip to view details"
                stats={[
                  { label: 'participation', value: totalParticipatingEpochs.toLocaleString(), highlight: true },
                  { label: 'total epochs', value: totalEpochsInTimeframe.toLocaleString() },
                ]}
                icon={CalendarDaysIcon}
                colorClass="text-amber-600 dark:text-amber-400"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};