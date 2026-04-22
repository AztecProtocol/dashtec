import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ValidatorPerformance } from '@/types';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { CopyButton } from '@/components/ui/CopyButton';
import { ValidatorAvatar } from '@/components/ui/ValidatorAvatar';
import { IdentityBadgeGroup } from '@/components/ui/IdentityBadgeGroup';
import { formatBalanceWithUsd, getPerformanceColor } from '@/utils/formatters';
import { useTokenPrice } from '@/hooks/queries/useTokenPrice';
import { getValidatorStatusDescription } from '@/utils/constants';
import { getValidatorLink } from '@/utils/validatorLinks';
import { Tooltip } from '@/components/ui/Tooltip';
import { useApp } from '@/context/AppContext';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useNotification } from '@/context/NotificationContext';
import { useStatusColor } from '@/hooks/useStatusColor';

interface ValidatorCardProps {
  validator: ValidatorPerformance;
  showScore?: boolean;
}

/** Rank badge — flat accent-colored number, no filled circle. */
const RankBadge: React.FC<{ rank?: number }> = ({ rank }) => {
  if (!rank) return null;
  const accent =
    rank === 1 ? 'text-amber-500 dark:text-amber-400' :
    rank === 2 ? 'text-slate-500 dark:text-slate-300' :
    rank === 3 ? 'text-orange-600 dark:text-orange-400' :
    'text-slate-400 dark:text-slate-500';
  return (
    <span className={`text-xs font-semibold tabular-nums ${accent}`}>
      #{rank}
    </span>
  );
};

/** A single flat metric row with an optional thin progress bar. */
const MetricRow: React.FC<{
  label: string;
  value: React.ReactNode;
  volume?: string;
  rate?: string | null;
  showBar?: boolean;
}> = ({ label, value, volume, rate, showBar = false }) => {
  const rateNum = rate ? parseFloat(rate) : 0;
  const colorText = rate ? getPerformanceColor(rate) : 'text-slate-900 dark:text-slate-100';
  const colorBg = colorText.split(' ').map((c) => c.replace('text-', 'bg-')).join(' ');
  const pct = Math.max(0, Math.min(100, rateNum));

  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-3 leading-tight">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className={`text-sm font-semibold ${colorText} tabular-nums`}>
          {value}
        </span>
      </div>
      {volume && (
        <div className="mt-0.5 text-right text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
          {volume}
        </div>
      )}
      {showBar && rate !== undefined && (
        <div className="mt-2 h-1 w-full rounded-full bg-slate-200/70 dark:bg-slate-700/60 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${pct}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-full rounded-full ${colorBg} opacity-80`}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Validator mobile card — flat, dense, matches the table row aesthetic.
 * Whole-card click navigates to the validator detail page.
 */
export const ValidatorCard: React.FC<ValidatorCardProps> = ({ validator, showScore = true }) => {
  const router = useRouter();
  const statusClasses = useStatusColor(validator.status);
  const { networkConfig: config } = useApp();
  const stakingTokenSymbol = config?.stakingTokenSymbol ?? 'STK';
  const stakingTokenDecimals = config?.stakingTokenDecimals ?? 18;
  const { data: priceData } = useTokenPrice(stakingTokenSymbol);
  const currentPrice = priceData?.currentPrice ?? null;
  const { isWatchlisted, toggleWatchlist } = useWatchlist();
  const { addNotification } = useNotification();
  const isOnWatchlist = isWatchlisted(validator.address);
  const isMigrated = validator.depositType === 'migration';
  const isNewDeposit = !isMigrated && !!validator.depositType;

  const balance = formatBalanceWithUsd(
    validator.balance,
    stakingTokenDecimals,
    stakingTokenSymbol,
    currentPrice,
    true,
  );

  const totalAtn = (validator.totalAttestationsSucceeded || 0) + (validator.totalAttestationsMissed || 0);
  const atnSucceeded = validator.totalAttestationsSucceeded || 0;
  const totalProp =
    (validator.totalCheckpointsMined || 0) +
    (validator.totalCheckpointsProposed || 0) +
    (validator.totalCheckpointsMissed || 0) +
    (validator.totalBlocksMissed || 0);
  const propSucceeded = (validator.totalCheckpointsMined || 0) + (validator.totalCheckpointsProposed || 0);

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist(validator.address);
    addNotification(
      isOnWatchlist ? 'Removed from watchlist' : 'Added to watchlist',
      isOnWatchlist ? 'warning' : 'success',
    );
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('a, button')) return;
    router.push(getValidatorLink(validator));
  };

  return (
    <div
      onClick={handleCardClick}
      className="group flex flex-col h-full rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all cursor-pointer"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
        <div className="flex items-start gap-3">
          <ValidatorAvatar
            address={validator.address}
            xImageUrl={validator.x_image_url}
            xHandle={validator.x_handle}
            discordAvatar={validator.discordAvatar}
            discordUsername={validator.discordUsername}
            name={validator.name}
            index={validator.index}
            size="md"
            variant="card"
            enableSwitching={true}
            showMotion={false}
            providerLogoUrl={validator.provider?.logoUrl}
            providerName={validator.provider?.name}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                href={getValidatorLink(validator)}
                onClick={(e) => e.stopPropagation()}
                className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors"
              >
                {validator.name || validator.index}
              </Link>
              <button
                onClick={handleWatchlistToggle}
                className="flex-shrink-0 inline-flex items-center justify-center w-4 h-4 text-slate-300 hover:text-amber-500 dark:text-slate-500 dark:hover:text-amber-400 transition-colors"
                title={isOnWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {isOnWatchlist ? (
                  <StarSolidIcon className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                ) : (
                  <StarOutlineIcon className="h-4 w-4" />
                )}
              </button>
              <div className="ml-auto">
                <RankBadge rank={validator.rank} />
              </div>
            </div>

            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <Tooltip content={getValidatorStatusDescription(validator.status || '')}>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium capitalize cursor-help text-slate-600 dark:text-slate-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusClasses.dot}`} />
                  {validator.status}
                </span>
              </Tooltip>
              {isMigrated && (
                <Tooltip content="Inherited from an older rollup version">
                  <span className="px-1.5 py-[1px] text-[10px] font-medium rounded bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300 cursor-help">
                    inherited
                  </span>
                </Tooltip>
              )}
              {isNewDeposit && (
                <Tooltip content="Deposited directly on the current rollup">
                  <span className="px-1.5 py-[1px] text-[10px] font-medium rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 cursor-help">
                    new
                  </span>
                </Tooltip>
              )}
            </div>

            <div className="mt-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {validator.provider || validator.x_handle || validator.discordUsername ? (
                <IdentityBadgeGroup
                  provider={validator.provider}
                  xHandle={validator.x_handle}
                  xImageUrl={validator.x_image_url}
                  discordUsername={validator.discordUsername}
                  discordAvatar={validator.discordAvatar}
                  size="xs"
                />
              ) : null}
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {validator.address.slice(0, 6)}…{validator.address.slice(-4)}
              </span>
              <CopyButton textToCopy={validator.address} size="xs" />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-4 pb-3 flex-grow">
        <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
          <MetricRow
            label="Attestation"
            value={validator.attestationSuccess ? `${validator.attestationSuccess}%` : 'N/A'}
            volume={`${atnSucceeded.toLocaleString()} / ${totalAtn.toLocaleString()}`}
            rate={validator.attestationSuccess}
            showBar
          />
          <MetricRow
            label="Proposals"
            value={validator.proposalSuccess ? `${validator.proposalSuccess}%` : 'N/A'}
            volume={`${propSucceeded.toLocaleString()} / ${totalProp.toLocaleString()}`}
            rate={validator.proposalSuccess}
            showBar
          />
          <MetricRow
            label="Balance"
            value={
              <span className="flex flex-col items-end leading-tight">
                <span>{balance.formatted}</span>
                {balance.usd && (
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    {balance.usd}
                  </span>
                )}
              </span>
            }
          />
          {showScore && (
            <MetricRow
              label="Score"
              value={validator.performanceScore ?? '—'}
            />
          )}
        </div>
      </div>
    </div>
  );
};
