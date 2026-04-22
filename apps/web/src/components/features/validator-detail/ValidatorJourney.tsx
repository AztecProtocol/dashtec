import React, { useState, useMemo } from 'react';
import { ValidatorJourneyEvent } from '@/types';
import { Tooltip } from '@/components/ui/Tooltip';
import { CopyButton } from '@/components/ui/CopyButton';
import {
  ArrowPathIcon,
  QueueListIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { formatBalance, formatTimestamp } from '@/utils/formatters';
import { getTxUrl } from '@/utils/blockExplorer';
import { useApp } from '@/context/AppContext';

/** Journey event type config — restrained palette (slate + amber accent only) */
const EVENT_CONFIG: Record<ValidatorJourneyEvent['type'], {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  iconColor: string;
  iconBg: string;
  balanceEffect: 'add' | 'subtract' | 'none';
}> = {
  queued: {
    Icon: QueueListIcon,
    label: 'Queued',
    iconColor: 'text-slate-500 dark:text-slate-400',
    iconBg: 'bg-slate-100 dark:bg-slate-700/60',
    balanceEffect: 'none',
  },
  deposited: {
    Icon: ArrowDownTrayIcon,
    label: 'Deposited',
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
    balanceEffect: 'add',
  },
  gse_deposited: {
    Icon: ArrowDownTrayIcon,
    label: 'GSE Deposited',
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
    balanceEffect: 'add',
  },
  migrated: {
    Icon: ArrowPathIcon,
    label: 'Migrated',
    iconColor: 'text-slate-500 dark:text-slate-400',
    iconBg: 'bg-slate-100 dark:bg-slate-700/60',
    balanceEffect: 'none',
  },
  withdraw_initiated: {
    Icon: ArrowUpTrayIcon,
    label: 'Withdraw Initiated',
    iconColor: 'text-slate-500 dark:text-slate-400',
    iconBg: 'bg-slate-100 dark:bg-slate-700/60',
    balanceEffect: 'subtract',
  },
  withdraw_finalized: {
    Icon: CheckCircleIcon,
    label: 'Withdraw Finalized',
    iconColor: 'text-slate-500 dark:text-slate-400',
    iconBg: 'bg-slate-100 dark:bg-slate-700/60',
    balanceEffect: 'none',
  },
  slashed: {
    Icon: ExclamationTriangleIcon,
    label: 'Slashed',
    iconColor: 'text-red-500 dark:text-red-400',
    iconBg: 'bg-red-50 dark:bg-red-900/15',
    balanceEffect: 'subtract',
  },
};

/** Format relative time from unix timestamp */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/** Truncate address for display */
function truncateAddress(addr: string): string {
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
}

/** Group consecutive events of the same type */
interface EventGroup {
  type: ValidatorJourneyEvent['type'];
  events: ValidatorJourneyEvent[];
  totalAmount?: string;
}

/** Group consecutive same-type events together */
function groupConsecutiveEvents(events: ValidatorJourneyEvent[]): EventGroup[] {
  const groups: EventGroup[] = [];

  for (const event of events) {
    const last = groups[groups.length - 1];
    if (last && last.type === event.type) {
      last.events.push(event);
      if (event.amount && last.totalAmount) {
        last.totalAmount = (parseFloat(last.totalAmount) + parseFloat(event.amount)).toString();
      } else if (event.amount) {
        last.totalAmount = event.amount;
      }
    } else {
      groups.push({
        type: event.type,
        events: [event],
        totalAmount: event.amount,
      });
    }
  }

  return groups;
}

/** Calculate running balance from journey events */
function calculateRunningBalances(events: ValidatorJourneyEvent[], decimals: number): Map<number, number> {
  const balances = new Map<number, number>();
  let balance = 0;
  const divisor = Math.pow(10, decimals);

  events.forEach((event, index) => {
    const config = EVENT_CONFIG[event.type];
    const amount = event.amount ? parseFloat(event.amount) / divisor : 0;

    if (config.balanceEffect === 'add') {
      balance += amount;
    } else if (config.balanceEffect === 'subtract') {
      balance -= amount;
    }
    balances.set(index, balance);
  });

  return balances;
}

/** Single journey event row */
const JourneyEventRow: React.FC<{
  event: ValidatorJourneyEvent;
  isLast: boolean;
  runningBalance: number;
  stakingTokenDecimals: number;
  stakingTokenSymbol: string;
}> = ({ event, isLast, runningBalance, stakingTokenDecimals, stakingTokenSymbol }) => {
  const config = EVENT_CONFIG[event.type];
  const { Icon } = config;
  const balanceChange = config.balanceEffect !== 'none' && event.amount;
  const isPositive = config.balanceEffect === 'add';

  return (
    <div className="relative flex gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full ${config.iconBg} flex items-center justify-center flex-shrink-0 z-10`}>
          <Icon className={`h-3.5 w-3.5 ${config.iconColor}`} />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-slate-200/60 dark:bg-slate-700/60 min-h-[20px]" />
        )}
      </div>

      {/* Event content */}
      <div className="pb-5 flex-1 min-w-0 -mt-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {config.label}
            </span>
            {event.rollupLabel && (
              <Tooltip content={event.rollupAddress}>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 cursor-help">
                  {event.rollupLabel}
                </span>
              </Tooltip>
            )}
          </div>
          {event.timestamp && (
            <Tooltip content={formatTimestamp(event.timestamp)}>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 cursor-help whitespace-nowrap">
                {formatRelativeTime(event.timestamp)}
              </span>
            </Tooltip>
          )}
        </div>

        <div className="mt-1 space-y-0.5">
          {balanceChange && (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold tabular-nums ${isPositive ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                {isPositive ? '+' : '-'}{formatBalance(event.amount!, stakingTokenDecimals, stakingTokenSymbol)}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                bal: {Math.abs(runningBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} {stakingTokenSymbol}
              </span>
            </div>
          )}

          {event.timestamp && !balanceChange && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {formatTimestamp(event.timestamp)}
            </p>
          )}

          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            <span>{Number(event.blockNumber).toLocaleString()}</span>
            <span className="text-slate-400 dark:text-slate-500">·</span>
            <span>{truncateAddress(event.transactionHash)}</span>
            <CopyButton textToCopy={event.transactionHash} size="xs" />
            <a
              href={getTxUrl(event.transactionHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Collapsed group of same-type events */
const CollapsedEventGroup: React.FC<{
  group: EventGroup;
  isLast: boolean;
  startBalance: number;
  endBalance: number;
  eventIndices: number[];
  runningBalances: Map<number, number>;
  stakingTokenDecimals: number;
  stakingTokenSymbol: string;
}> = ({ group, isLast, startBalance, endBalance, stakingTokenDecimals, stakingTokenSymbol, runningBalances, eventIndices }) => {
  const [expanded, setExpanded] = useState(false);
  const config = EVENT_CONFIG[group.type];
  const { Icon } = config;
  const count = group.events.length;
  const isPositive = config.balanceEffect === 'add';
  const totalChange = group.totalAmount ? parseFloat(group.totalAmount) / Math.pow(10, stakingTokenDecimals) : 0;

  if (expanded) {
    return (
      <div>
        <button
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mb-2 ml-10 transition-colors"
        >
          <ChevronDownIcon className="h-3 w-3 rotate-180" />
          Collapse {count} events
        </button>
        {group.events.map((event, i) => (
          <JourneyEventRow
            key={`${event.transactionHash}-${event.type}`}
            event={event}
            isLast={isLast && i === count - 1}
            runningBalance={runningBalances.get(eventIndices[i]) ?? 0}
            stakingTokenDecimals={stakingTokenDecimals}
            stakingTokenSymbol={stakingTokenSymbol}
          />
        ))}
      </div>
    );
  }

  const firstTs = group.events[0].timestamp;
  const lastTs = group.events[count - 1].timestamp;

  return (
    <div className="relative flex gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full ${config.iconBg} flex items-center justify-center flex-shrink-0 z-10`}>
          <Icon className={`h-3.5 w-3.5 ${config.iconColor}`} />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-slate-200/60 dark:bg-slate-700/60 min-h-[20px]" />
        )}
      </div>

      {/* Collapsed content */}
      <div className="pb-5 flex-1 min-w-0 -mt-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {config.label}
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
              x{count}
            </span>
            {group.events[0].rollupLabel && (
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                {group.events[0].rollupLabel}
              </span>
            )}
          </div>
          {lastTs && (
            <Tooltip content={`${firstTs ? formatTimestamp(firstTs) : ''} — ${formatTimestamp(lastTs)}`}>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 cursor-help whitespace-nowrap">
                {formatRelativeTime(lastTs)}
              </span>
            </Tooltip>
          )}
        </div>

        <div className="mt-1 space-y-1">
          {totalChange > 0 && (
            <span className={`text-sm font-semibold tabular-nums ${isPositive ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
              {isPositive ? '+' : '-'}{totalChange.toLocaleString(undefined, { maximumFractionDigits: 2 })} {stakingTokenSymbol}
            </span>
          )}

          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <ChevronDownIcon className="h-3 w-3" />
            Show {count} events
          </button>
        </div>
      </div>
    </div>
  );
};

/** Rollup version section header */
const RollupSectionHeader: React.FC<{ label: string; address: string }> = ({ label, address }) => (
  <div className="flex items-center gap-2 py-2 mb-1">
    <div className="h-px flex-1 bg-slate-200/50 dark:bg-slate-600/30" />
    <Tooltip content={address}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 cursor-help px-2">
        {label}
      </span>
    </Tooltip>
    <div className="h-px flex-1 bg-slate-200/50 dark:bg-slate-600/30" />
  </div>
);

interface ValidatorJourneyProps {
  journey: ValidatorJourneyEvent[];
}

/** Vertical timeline of a validator's lifecycle across rollups */
export const ValidatorJourney: React.FC<ValidatorJourneyProps> = ({ journey }) => {
  const { networkConfig: config } = useApp();
  const stakingTokenDecimals = config?.stakingTokenDecimals ?? 18;
  const stakingTokenSymbol = config?.stakingTokenSymbol ?? 'STK';

  const runningBalances = useMemo(
    () => calculateRunningBalances(journey, stakingTokenDecimals),
    [journey, stakingTokenDecimals]
  );

  /** Group events by rollup, then collapse consecutive same-type within each rollup */
  const rollupSections = useMemo(() => {
    const sections: { rollupAddress: string; rollupLabel: string; groups: EventGroup[]; eventIndices: number[][] }[] = [];
    let globalIndex = 0;

    for (const event of journey) {
      const rollupKey = event.rollupAddress;
      let section = sections[sections.length - 1];

      if (!section || section.rollupAddress !== rollupKey) {
        section = {
          rollupAddress: rollupKey,
          rollupLabel: event.rollupLabel || truncateAddress(rollupKey),
          groups: [],
          eventIndices: [],
        };
        sections.push(section);
      }

      const lastGroup = section.groups[section.groups.length - 1];
      if (lastGroup && lastGroup.type === event.type) {
        lastGroup.events.push(event);
        section.eventIndices[section.eventIndices.length - 1].push(globalIndex);
        if (event.amount && lastGroup.totalAmount) {
          lastGroup.totalAmount = (parseFloat(lastGroup.totalAmount) + parseFloat(event.amount)).toString();
        } else if (event.amount) {
          lastGroup.totalAmount = event.amount;
        }
      } else {
        section.groups.push({ type: event.type, events: [event], totalAmount: event.amount });
        section.eventIndices.push([globalIndex]);
      }

      globalIndex++;
    }

    return sections;
  }, [journey]);

  if (!journey || journey.length === 0) return null;

  // Flatten for counting total groups across sections
  let globalGroupIndex = 0;
  const totalGroups = rollupSections.reduce((sum, s) => sum + s.groups.length, 0);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-2xl">
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-brand-violet/10 dark:bg-brand-violet/20 rounded-lg">
            <ArrowPathIcon className="h-5 w-5 text-brand-violet dark:text-accent-purple-light" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-brand-violet to-amber-600 dark:from-slate-100 dark:via-accent-purple-light dark:to-amber-400 bg-clip-text text-transparent">
            Journey
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {journey.length} event{journey.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="rounded-xl bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 p-4">
          {rollupSections.map((section, sectionIdx) => (
            <div key={section.rollupAddress + sectionIdx}>
              {/* Rollup section header — show when multiple rollups or always for clarity */}
              {rollupSections.length > 1 && (
                <RollupSectionHeader label={section.rollupLabel} address={section.rollupAddress} />
              )}

              {section.groups.map((group, groupIdx) => {
                const isLastGroup = ++globalGroupIndex === totalGroups;
                const indices = section.eventIndices[groupIdx];
                const startBal = runningBalances.get(indices[0]) ?? 0;
                const endBal = runningBalances.get(indices[indices.length - 1]) ?? 0;

                // Single event — render normally
                if (group.events.length === 1) {
                  return (
                    <JourneyEventRow
                      key={`${group.events[0].transactionHash}-${group.events[0].type}`}
                      event={group.events[0]}
                      isLast={isLastGroup}
                      runningBalance={runningBalances.get(indices[0]) ?? 0}
                      stakingTokenDecimals={stakingTokenDecimals}
                      stakingTokenSymbol={stakingTokenSymbol}
                    />
                  );
                }

                // Multiple consecutive same-type events — collapse
                return (
                  <CollapsedEventGroup
                    key={`group-${group.type}-${indices[0]}`}
                    group={group}
                    isLast={isLastGroup}
                    startBalance={startBal}
                    endBalance={endBal}
                    eventIndices={indices}
                    runningBalances={runningBalances}
                    stakingTokenDecimals={stakingTokenDecimals}
                    stakingTokenSymbol={stakingTokenSymbol}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
