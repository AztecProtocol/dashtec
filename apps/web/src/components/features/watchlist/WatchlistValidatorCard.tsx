'use client';

import { ValidatorPerformance } from '@/types';
import { SequencerMiniChart } from './SequencerMiniChart';
import { VALIDATOR_STATUS } from '@/utils/constants';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon, ArrowTopRightOnSquareIcon, WalletIcon } from '@heroicons/react/24/outline';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useNotification } from '@/context/NotificationContext';
import { ValidatorAvatar } from '@/components/ui/ValidatorAvatar';
import { getPerformanceColor, formatBalanceWithUsd } from '@/utils/formatters';
import { getValidatorLink } from '@/utils/validatorLinks';
import { useApp } from '@/context/AppContext';
import { getStatusClasses } from '@/hooks/useStatusColor';
import Link from 'next/link';

interface WatchlistValidatorCardProps {
  validator: ValidatorPerformance;
}

/**
 * Enhanced validator card for watchlist page
 * Includes performance chart and quick stats
 */
export const WatchlistValidatorCard: React.FC<WatchlistValidatorCardProps> = ({ validator }) => {
  const { isWatchlisted, toggleWatchlist } = useWatchlist();
  const { addNotification } = useNotification();
  const { networkConfig: config } = useApp();
  const isOnWatchlist = isWatchlisted(validator.address);

  const { stakingTokenSymbol, stakingTokenDecimals } = config ?? {
    stakingTokenSymbol: 'STK',
    stakingTokenDecimals: 18
  };

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist(validator.address);
    addNotification(
      isOnWatchlist ? 'Removed from watchlist' : 'Added to watchlist',
      isOnWatchlist ? 'warning' : 'success'
    );
  };

  const statusStyles = getStatusClasses(validator.status);
  const displayName = validator.name || validator.x_handle || `${validator.index}`;

  // Calculate rates
  const totalAttestations = (validator.totalAttestationsSucceeded || 0) + (validator.totalAttestationsMissed || 0);
  const attestationRate = totalAttestations > 0
    ? ((validator.totalAttestationsSucceeded || 0) / totalAttestations * 100).toFixed(1)
    : '0.0';

  const totalBlocks = (validator.totalCheckpointsProposed || 0) + (validator.totalCheckpointsMined || 0) + (validator.totalCheckpointsMissed || 0) + (validator.totalBlocksMissed || 0);
  const blockRate = totalBlocks > 0
    ? (((validator.totalCheckpointsProposed || 0) + (validator.totalCheckpointsMined || 0)) / totalBlocks * 100).toFixed(1)
    : '0.0';

  return (
    <div className="group relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-yellow-500/30 dark:hover:border-yellow-400/30 transition-all duration-300 shadow-lg hover:shadow-xl">
      {/* Rank & Score in corner */}
      {(validator.rank || validator.performanceScore) && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/80 ring-1 ring-slate-200 dark:ring-slate-600">
          {validator.performanceScore && (
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Score</span>
              <span className="font-bold text-xs text-purple-700 dark:text-purple-300">{validator.performanceScore.toFixed(2)}</span>
            </div>
          )}
          {validator.rank && validator.performanceScore && (
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-600"></div>
          )}
          {validator.rank && (
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Rank</span>
              <span className="font-bold text-xs text-slate-700 dark:text-slate-300">#{validator.rank}</span>
            </div>
          )}
        </div>
      )}

      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className={`flex items-start gap-3 mb-4 ${(validator.rank || validator.performanceScore) ? 'pr-28' : ''}`}>
          <ValidatorAvatar
            address={validator.address}
            xImageUrl={validator.x_image_url}
            xHandle={validator.x_handle}
            discordAvatar={validator.discordAvatar}
            discordUsername={validator.discordUsername}
            name={validator.name}
            index={validator.index}
            size="lg"
            variant="card"
            providerLogoUrl={validator.provider?.logoUrl}
            providerName={validator.provider?.name}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5 mb-1">
              <Link href={getValidatorLink(validator)} className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">
                  {displayName}
                </h3>
              </Link>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={handleWatchlistToggle}
                  className="inline-flex items-center justify-center w-6 h-6 text-yellow-500 hover:text-yellow-600 dark:hover:text-yellow-400 rounded-md hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all duration-200"
                  title={isOnWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  {isOnWatchlist ? (
                    <StarSolidIcon className="h-4 w-4" />
                  ) : (
                    <StarOutlineIcon className="h-4 w-4" />
                  )}
                </button>
                <Link
                  href={getValidatorLink(validator)}
                  className="inline-flex items-center justify-center w-6 h-6 text-slate-400 hover:text-yellow-600 dark:hover:text-yellow-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
                  title="View Details"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
              {validator.address.slice(0, 10)}...{validator.address.slice(-8)}
            </p>
          </div>
        </div>

        {/* Status & Balance */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md ${statusStyles.bg} ${statusStyles.text}`}>
            <span className={`w-2 h-2 rounded-full ${statusStyles.dot}`}></span>
            {validator.status}
          </span>
          {validator.balance ? (() => {
            const { formatted } = formatBalanceWithUsd(validator.balance, stakingTokenDecimals, stakingTokenSymbol, true);
            return (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                <WalletIcon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <div className="text-right">
                  <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">{formatted}</span>
                </div>
              </div>
            );
          })() : ''}
        </div>

        {/* Performance Chart */}
        <SequencerMiniChart validator={validator} />
      </div>
    </div>
  );
};
