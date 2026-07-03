import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ValidatorPerformance } from '@/types';
import {
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { CopyButton } from '@/components/ui/CopyButton';
import { ValidatorAvatar } from '@/components/ui/ValidatorAvatar';
import { IdentityBadgeGroup } from '@/components/ui/IdentityBadgeGroup';
import { formatBalanceWithUsd, getPerformanceColor } from '@/utils/formatters';
import { getValidatorLink } from '@/utils/validatorLinks';
import { Tooltip } from '@/components/ui/Tooltip';
import { EpochParticipationTooltip } from '@/components/ui/EpochParticipationTooltip';
import { ScoreExplanation } from './ScoreExplanation';
import { getValidatorStatusDescription } from '@/utils/constants';
import { useApp } from '@/context/AppContext';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useNotification } from '@/context/NotificationContext';
import { useStatusColor } from '@/hooks/useStatusColor';

const PerformanceCell: React.FC<{ rate: string | undefined; volume: string; }> = ({ rate, volume }) => {
  const rateValue = rate ? parseFloat(rate) : 0;
  const colorClass = getPerformanceColor(rate);
  const bgClass = colorClass.split(' ').map(c => c.replace('text', 'bg')).join(' ');

  return (
    <div className="space-y-1">
      <div
        className={`font-bold ${colorClass} text-sm`}
      >
        {rate || 'N/A'}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{volume}</div>
      <div className="w-full bg-slate-200/80 dark:bg-slate-700/60 rounded-full h-1.5 mt-1 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${rateValue}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className={`h-full rounded-full ${bgClass} relative overflow-hidden`}
          style={{ opacity: 0.9 }}
        >
          {/* Subtle shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        </motion.div>
      </div>
    </div>
  );
};


export const ValidatorTableRow: React.FC<{
  validator: ValidatorPerformance;
  onInfoClick: () => void;
  totalEpochsInTimeframe: number;
  totalValidators?: number;
}> = ({ validator, onInfoClick, totalEpochsInTimeframe, totalValidators = 17000 }) => {
  const router = useRouter();
  const { networkConfig: config } = useApp();
  const { stakingTokenSymbol, stakingTokenDecimals } = config ?? {
    stakingTokenSymbol: 'STK',
    stakingTokenDecimals: 18
  };
  const { isWatchlisted, toggleWatchlist } = useWatchlist();
  const { addNotification } = useNotification();
  const isOnWatchlist = isWatchlisted(validator.address);
  const isMigrated = validator.depositType === 'migration';
  const isNewDeposit = !isMigrated && !!validator.depositType;
  const displayStatus = validator.migrationStatus && validator.migrationStatus !== 'active'
    ? validator.migrationStatus
    : validator.status;
  const statusClasses = useStatusColor(displayStatus);
  const dotClass = statusClasses.dot;
  const textClass = `${statusClasses.bg} ${statusClasses.text}`;

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist(validator.address);
    addNotification(
      isOnWatchlist ? 'Removed from watchlist' : 'Added to watchlist',
      isOnWatchlist ? 'warning' : 'success'
    );
  };

  /** Navigate to validator detail page — skips clicks on interactive elements */
  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('a, button')) return;
    router.push(getValidatorLink(validator));
  };

  return (
    <tr
      onClick={handleRowClick}
      className="group border-b border-slate-200/50 dark:border-slate-700/30 hover:shadow-lg transition-all duration-300 bg-white/50 dark:bg-slate-800/30 hover:bg-amber-50/20 dark:hover:bg-amber-900/10 cursor-pointer"
    >
      {/* Rank */}
      <td className="px-0 py-4 whitespace-nowrap text-center">
        {validator.rank && (
          <div className="flex items-center justify-center">
            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${validator.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg' :
              validator.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-lg' :
                validator.rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-lg' :
                  'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
              {validator.rank}
            </span>
          </div>
        )}
      </td>

      {/* Sequencer — hover-only action icons */}
      <td className="pl-0 pr-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3 w-full max-w-[280px]">
          <ValidatorAvatar
            address={validator.address}
            xImageUrl={validator.x_image_url}
            xHandle={validator.x_handle}
            discordAvatar={validator.discordAvatar}
            discordUsername={validator.discordUsername}
            name={validator.name}
            index={validator.index}
            size="md"
            variant="table"
            enableSwitching={true}
            showMotion={true}
            providerLogoUrl={validator.provider?.logoUrl}
            providerName={validator.provider?.name}
          />
          <div className="flex flex-col overflow-hidden flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                href={getValidatorLink(validator)}
                className="text-brand-violet dark:text-accent-purple-light hover:text-amber-700 dark:hover:text-amber-300 font-bold text-sm transition-colors duration-200 truncate"
              >
                {validator.name || validator.index}
              </Link>
              <button
                onClick={handleWatchlistToggle}
                className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 text-yellow-500 hover:text-yellow-600 dark:hover:text-yellow-400 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all duration-200"
                title={isOnWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {isOnWatchlist ? (
                  <StarSolidIcon className="h-3.5 w-3.5" />
                ) : (
                  <StarOutlineIcon className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-1.5 mt-0.5 min-h-[20px]">
              {validator.provider || validator.x_handle || validator.discordUsername ? (
                <>
                  <IdentityBadgeGroup
                    provider={validator.provider}
                    xHandle={validator.x_handle}
                    xImageUrl={validator.x_image_url}
                    discordUsername={validator.discordUsername}
                    discordAvatar={validator.discordAvatar}
                    size="xs"
                  />
                  <CopyButton textToCopy={validator.address} size="xs" />
                  <button
                    onClick={onInfoClick}
                    className="text-slate-400 hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors"
                  >
                    <InformationCircleIcon className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {`${validator.address.substring(0, 6)}...${validator.address.substring(validator.address.length - 4)}`}
                  </span>
                  <CopyButton textToCopy={validator.address} size="xs" />
                  <button
                    onClick={onInfoClick}
                    className="text-slate-400 hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors"
                  >
                    <InformationCircleIcon className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              {isMigrated && (
                <Tooltip content="Inherited from an older rollup version">
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 cursor-help">
                    Inherited
                  </span>
                </Tooltip>
              )}
              {isNewDeposit && (
                <Tooltip content="Deposited directly on the current rollup">
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-help">
                    New
                  </span>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <Tooltip content={getValidatorStatusDescription(validator.status || '')}>
          <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md cursor-help capitalize ${textClass}`}>
            <span className={`w-2 h-2 rounded-full ${dotClass}`}></span>
            {displayStatus}
          </span>
        </Tooltip>
      </td>

      {/* Balance */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <span className="block font-bold text-slate-900 dark:text-slate-100 text-sm">
          {formatBalanceWithUsd(validator.balance, stakingTokenDecimals, stakingTokenSymbol, true).formatted}
        </span>
      </td>

      {/* Epoch Participation */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <EpochParticipationTooltip
          totalParticipatingEpochs={validator.totalParticipatingEpochs || 0}
          totalEpochsInTimeframe={totalEpochsInTimeframe}
        />
      </td>

      {/* Attestation Performance */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <PerformanceCell
          rate={validator.attestationSuccess}
          volume={`${(validator.totalAttestationsSucceeded || 0)}/${(validator.totalAttestationsSucceeded || 0) + (validator.totalAttestationsMissed || 0)}`}
        />
      </td>

      {/* Proposal Performance */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <PerformanceCell
          rate={validator.proposalSuccess}
          volume={`${(validator.totalCheckpointsMined || 0) + (validator.totalCheckpointsProposed || 0)}/${(validator.totalCheckpointsMined || 0) + (validator.totalCheckpointsProposed || 0) + (validator.totalCheckpointsMissed || 0) + (validator.totalBlocksMissed || 0)}`}
        />
      </td>

      {/* Score */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
        <div className="flex items-center justify-center gap-2 relative">
          <span className="font-bold text-lg bg-gradient-to-r from-brand-violet to-amber-600 bg-clip-text text-transparent">
            {validator.performanceScore}
          </span>
          <Tooltip content={<ScoreExplanation />}>
            <div className="cursor-pointer">
              <InformationCircleIcon className="h-4 w-4 text-slate-400 hover:text-brand-violet dark:text-slate-500 dark:hover:text-accent-purple-light transition-colors duration-200" />
            </div>
          </Tooltip>
        </div>
      </td>

      {/* Fill column */}
      <td className="w-full"></td>
    </tr>
  );
};