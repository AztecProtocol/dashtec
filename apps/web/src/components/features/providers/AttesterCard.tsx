import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ValidatorAvatar } from '@/components/ui/ValidatorAvatar';
import { formatBalanceWithUsd, getPerformanceColor } from '@/utils/formatters';
import { useTokenPrice } from '@/hooks/queries/useTokenPrice';
import { useStatusColor } from '@/hooks/useStatusColor';
import { useAttesterPerformanceChart } from '@/hooks/useAttesterPerformanceChart';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { ArrowTopRightOnSquareIcon, WalletIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip as UITooltip } from '@/components/ui/Tooltip';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { ProviderAttester } from '@/types';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useNotification } from '@/context/NotificationContext';
import { CopyButton } from '@/components/ui/CopyButton';
import { getValidatorLink } from '@/utils/validatorLinks';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

interface AttesterCardProps {
  attester: ProviderAttester;
  stakingTokenDecimals: number;
  stakingTokenSymbol: string;
  epochLimit: number;
}

/**
 * Attester card component for provider detail page
 */
export const AttesterCard: React.FC<AttesterCardProps> = ({
  attester,
  stakingTokenDecimals,
  stakingTokenSymbol,
  epochLimit
}) => {
  const statusClasses = useStatusColor(attester.status);
  const { data: priceData } = useTokenPrice(stakingTokenSymbol);
  const currentPrice = priceData?.currentPrice ?? null;
  const { isWatchlisted, toggleWatchlist } = useWatchlist();
  const { addNotification } = useNotification();
  const isOnWatchlist = isWatchlisted(attester.address);

  // Get chart data and options from hook
  const { labels, datasets, options, totalEpochs } = useAttesterPerformanceChart(
    attester.performanceHistory,
    epochLimit
  );

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist(attester.address);
    addNotification(
      isOnWatchlist ? 'Removed from watchlist' : 'Added to watchlist',
      isOnWatchlist ? 'warning' : 'success'
    );
  };

  const chartData = {
    labels,
    datasets,
  };


  return (
    <div className="group relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-violet/30 dark:hover:border-accent-purple-light/30 transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/5 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      <div className="relative z-10 p-5">
        <div className="flex flex-col gap-5">
          {/* Sequencer Info */}
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <ValidatorAvatar
                address={attester.address}
                xImageUrl={attester.xImageUrl}
                xHandle={attester.xHandle}
                discordAvatar={attester.discordAvatar}
                discordUsername={attester.discordUsername}
                name={attester.name}
                size="lg"
                variant="card"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-1.5 mb-1">
                  <Link
                    href={getValidatorLink(attester)}
                    className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-brand-violet dark:hover:text-accent-purple-light truncate transition-colors duration-200 block"
                  >
                    {attester.name || `Sequencer ${attester.address.slice(0, 6)}`}
                  </Link>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!attester.isInQueue && (
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
                    )}
                    <Link
                      href={getValidatorLink(attester)}
                      className="inline-flex items-center justify-center w-6 h-6 text-slate-400 hover:text-brand-violet dark:hover:text-accent-purple-light rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
                      title="View Details"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {attester.address.slice(0, 8)}...{attester.address.slice(-6)}
                  </span>
                  <CopyButton textToCopy={attester.address} size="xs" />
                </div>
              </div>
            </div>

            {/* Status & Balance */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md ${statusClasses.bg} ${statusClasses.text}`}>
                <span className={`w-2 h-2 rounded-full ${statusClasses.dot}`}></span>
                {attester.status || 'Unknown'}
              </span>
              {attester.balance && (() => {
                const { formatted, usd } = formatBalanceWithUsd(attester.balance, stakingTokenDecimals, stakingTokenSymbol, currentPrice, true);
                return (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600">
                    <WalletIcon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    <div className="text-right">
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">{formatted}</span>
                      {usd && <span className="text-xs text-slate-500 dark:text-slate-400 block">{usd}</span>}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-700/30 dark:to-slate-700/10 rounded-lg p-3 border border-slate-200/50 dark:border-slate-600/20">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Attestation</div>
                <div className={`text-lg font-bold ${getPerformanceColor(`${attester.attestationRate}%`)}`}>
                  {attester.attestationRate}%
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {attester.attestationsSuccessful}/{attester.attestationsSuccessful + attester.attestationsMissed}
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-700/30 dark:to-slate-700/10 rounded-lg p-3 border border-slate-200/50 dark:border-slate-600/20">
                <div className="flex items-center gap-1 mb-1">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Proposal Rate</div>
                  <UITooltip content={<>Checkpoint missed: blocks were proposed but checkpoint was not attested.<br />Block missed: no block proposals were sent at all.</>}>
                    <InformationCircleIcon className="h-3 w-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                  </UITooltip>
                </div>
                <div className={`text-lg font-bold ${getPerformanceColor(`${attester.blockSuccessRate}%`)}`}>
                  {attester.blockSuccessRate}%
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 space-y-0.5">
                  <span>{attester.checkpointsMined} mined • {attester.checkpointsProposed} proposed</span>
                  <br />
                  <span>{attester.checkpointsMissed || 0} checkpoint missed • {attester.blocksMissed} block missed</span>
                </div>
              </div>

              <div className="col-span-2 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-700/30 dark:to-slate-700/10 rounded-lg p-3 border border-slate-200/50 dark:border-slate-600/20">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Last {epochLimit} Epoch Participated</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {totalEpochs}/{epochLimit}
                </div>
              </div>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-700/20 dark:to-slate-800/20 rounded-lg p-4 border border-slate-200/50 dark:border-slate-600/20">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Performance by Epoch</div>
            <div style={{ height: '200px', position: 'relative' }}>
              <Bar data={chartData} options={options} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
