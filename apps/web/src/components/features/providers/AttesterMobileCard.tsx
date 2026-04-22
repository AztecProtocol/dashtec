'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ProviderAttester } from '@/types';
import { CopyButton } from '@/components/ui/CopyButton';
import { ValidatorAvatar } from '@/components/ui/ValidatorAvatar';
import { formatBalanceWithUsd, getPerformanceColor } from '@/utils/formatters';
import { useTokenPrice } from '@/hooks/queries/useTokenPrice';
import { useStatusColors } from '@/hooks/useStatusColor';
import { AttesterDetail } from './AttesterDetail';
import { EyeIcon, EyeSlashIcon, WalletIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@/components/ui/Tooltip';
import { getValidatorLink } from '@/utils/validatorLinks';

interface AttesterMobileCardProps {
  attester: ProviderAttester;
  isExpanded: boolean;
  onToggleRow: (address: string) => void;
  stakingTokenDecimals: number;
  stakingTokenSymbol: string;
  epochLimit: number;
}

/**
 * Performance cell with visual bar indicator
 */
const PerformanceCell: React.FC<{ rate: string; volume: string }> = ({ rate, volume }) => {
  const rateValue = parseFloat(rate);
  const colorClass = getPerformanceColor(`${rate}%`);
  const bgClass = colorClass.split(' ').map(c => c.replace('text', 'bg')).join(' ');

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <div className={`font-bold ${colorClass} text-base`}>
          {rate}%
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">{volume}</div>
      </div>
      <div className="w-full bg-slate-200/80 dark:bg-slate-700/60 rounded-full h-2 overflow-hidden">
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

/**
 * Mobile card component for provider attesters with expandable detail
 */
export const AttesterMobileCard: React.FC<AttesterMobileCardProps> = ({
  attester,
  isExpanded,
  onToggleRow,
  stakingTokenDecimals,
  stakingTokenSymbol,
  epochLimit
}) => {
  const statusColors = useStatusColors([attester.status]);
  const statusClasses = statusColors.get(attester.status);
  const { data: priceData } = useTokenPrice(stakingTokenSymbol);
  const currentPrice = priceData?.currentPrice ?? null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm">
      {/* Card Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-600">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <ValidatorAvatar
              address={attester.address}
              xImageUrl={attester.xImageUrl}
              xHandle={attester.xHandle}
              discordAvatar={attester.discordAvatar}
              discordUsername={attester.discordUsername}
              name={attester.name}
              size="md"
              variant="card"
              providerLogoUrl={undefined}
              providerName={undefined}
            />
            <div className="min-w-0 flex-1">
              <Link
                href={getValidatorLink(attester)}
                className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-brand-violet dark:hover:text-accent-purple-light truncate transition-colors duration-200 block"
              >
                {attester.name || `Sequencer ${attester.address.slice(0, 6)}`}
              </Link>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {attester.address.slice(0, 8)}...{attester.address.slice(-6)}
                </span>
                <CopyButton textToCopy={attester.address} size="xs" />
              </div>
            </div>
          </div>

          <button
            onClick={() => onToggleRow(attester.address)}
            className="ml-4 inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
            title={isExpanded ? 'Hide details' : 'Show details'}
          >
            {isExpanded ? (
              <EyeSlashIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            ) : (
              <EyeIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            )}
          </button>
        </div>

        {/* Status & Balance */}
        <div className="flex flex-wrap items-center gap-2">
          {statusClasses && (
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md ${statusClasses.bg} ${statusClasses.text}`}>
              <span className={`w-2 h-2 rounded-full ${statusClasses.dot}`}></span>
              {attester.status || 'Unknown'}
            </span>
          )}
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
      </div>

      {/* Key Stats */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Attestation Rate
            </div>
            <PerformanceCell
              rate={attester.attestationRate}
              volume={`${attester.attestationsSuccessful}/${attester.attestationsSuccessful + attester.attestationsMissed}`}
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
            <div className="flex items-center gap-1 mb-2">
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Proposal Rate
              </div>
              <Tooltip content={<>Checkpoint missed: blocks were proposed but checkpoint was not attested.<br />Block missed: no block proposals were sent at all.</>}>
                <InformationCircleIcon className="h-3 w-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </Tooltip>
            </div>
            <PerformanceCell
              rate={attester.blockSuccessRate}
              volume={`${attester.checkpointsProposed + attester.checkpointsMined}/${attester.checkpointsProposed + attester.checkpointsMined + (attester.checkpointsMissed || 0) + attester.blocksMissed}`}
            />
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-600">
          <AttesterDetail
            attester={attester}
            stakingTokenDecimals={stakingTokenDecimals}
            stakingTokenSymbol={stakingTokenSymbol}
            epochLimit={epochLimit}
          />
        </div>
      )}
    </div>
  );
};
