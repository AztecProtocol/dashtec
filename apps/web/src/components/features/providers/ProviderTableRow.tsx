import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ProviderListItem } from '@/types';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { CopyButton } from '@/components/ui/CopyButton';
import { ProviderAvatar } from '@/components/ui/ProviderAvatar';
import { formatBalanceWithUsd } from '@/utils/formatters';
import { useApp } from '@/context/AppContext';
import { ProviderRowDetail } from './ProviderRowDetail';

/** Active-staked cell: amount with individual share-of-network bar. */
const ActiveStakedCell: React.FC<{
  formatted: string;
  activeStaked: number;
  networkActiveStaked: number;
}> = ({ formatted, activeStaked, networkActiveStaked }) => {
  const sharePct = networkActiveStaked > 0
    ? Math.min(100, (activeStaked / networkActiveStaked) * 100)
    : 0;

  return (
    <div className="flex flex-col items-end gap-1 leading-tight">
      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatted}</span>
      {networkActiveStaked > 0 && (
        <div
          className="flex items-center gap-2 w-full mt-0.5"
          title={`${sharePct.toFixed(1)}% of network active staked`}
        >
          <div className="flex-1 h-1 rounded-full bg-slate-200/70 dark:bg-slate-700/60 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${sharePct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-full bg-brand-violet/70 dark:bg-accent-purple-light/70"
            />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums w-10 text-right">
            {sharePct.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Provider table row — denser layout with extra columns:
 * Provider · Sequencers · Active staked · Commission · ▸
 */
export const ProviderTableRow: React.FC<{
  provider: ProviderListItem;
  isExpanded: boolean;
  onToggleRow: (identifier: string) => void;
  /** Network-wide active staked total, used as denominator for the share bar. 0 hides the bar. */
  networkActiveStaked?: number;
}> = ({ provider, isExpanded, onToggleRow, networkActiveStaked = 0 }) => {
  const { networkConfig: config } = useApp();
  const { stakingTokenSymbol, stakingTokenDecimals } = config ?? {
    stakingTokenSymbol: 'STK',
    stakingTokenDecimals: 18,
  };
  const activeBalance = formatBalanceWithUsd(
    provider.activeStaked,
    stakingTokenDecimals,
    stakingTokenSymbol,
    true,
  );

  const handleToggle = () => onToggleRow(provider.identifier);

  return (
    <>
      <tr
        onClick={handleToggle}
        className={`border-b border-slate-100 dark:border-slate-700/50 cursor-pointer transition-colors ${
          isExpanded
            ? 'bg-slate-50 dark:bg-slate-700/40'
            : 'hover:bg-slate-50/60 dark:hover:bg-slate-700/30'
        }`}
      >
        {/* Provider — name on top, admin address below */}
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <ProviderAvatar
              logoUrl={provider.metadata.logoUrl}
              name={provider.metadata.name || provider.identifier}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/providers/${encodeURIComponent(provider.identifier)}`}
                onClick={(e) => e.stopPropagation()}
                className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors"
              >
                {provider.metadata.name || `Provider ${provider.identifier}`}
              </Link>
              <div className="flex items-center gap-1 leading-none" onClick={(e) => e.stopPropagation()}>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {provider.admin.slice(0, 6)}…{provider.admin.slice(-4)}
                </span>
                <CopyButton textToCopy={provider.admin} size="xs" />
              </div>
            </div>
          </div>
        </td>

        {/* Sequencers (active / total) */}
        <td className="px-3 py-2.5 text-right tabular-nums">
          <div className="text-sm leading-tight">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{provider.activeAttesters}</span>
            <span className="text-slate-400 dark:text-slate-500 mx-1">/</span>
            <span className="text-slate-600 dark:text-slate-400">{provider.totalAttesters}</span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">active / total</div>
        </td>

        {/* Active staked — with share-of-network bar */}
        <td className="px-3 py-2.5 tabular-nums">
          <ActiveStakedCell
            formatted={activeBalance.formatted}
            activeStaked={provider.activeStaked}
            networkActiveStaked={networkActiveStaked}
          />
        </td>

        {/* Commission */}
        <td className="px-3 py-2.5 text-right tabular-nums">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {(provider.takeRate / 100).toFixed(2)}%
          </span>
        </td>

        {/* Expand chevron */}
        <td className="pl-1 pr-3 py-2.5 text-slate-400">
          <ChevronRightIcon
            className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
          />
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={5} className="p-0">
            <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
              <ProviderRowDetail providerIdentifier={provider.identifier} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
