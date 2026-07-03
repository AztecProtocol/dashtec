'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ProviderAttester } from '@/types';
import { CopyButton } from '@/components/ui/CopyButton';
import { ValidatorAvatar } from '@/components/ui/ValidatorAvatar';
import { formatBalanceWithUsd, getPerformanceColor } from '@/utils/formatters';
import { useStatusColors } from '@/hooks/useStatusColor';
import { VALIDATOR_STATUS } from '@/utils/constants';
import { AttesterDetail } from './AttesterDetail';
import { EyeIcon, EyeSlashIcon, WalletIcon } from '@heroicons/react/24/outline';
import { getValidatorLink } from '@/utils/validatorLinks';

interface AttesterTableRowProps {
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
 * Table row component for provider attesters with expandable detail
 */
export const AttesterTableRow: React.FC<AttesterTableRowProps> = ({
  attester,
  isExpanded,
  onToggleRow,
  stakingTokenDecimals,
  stakingTokenSymbol,
  epochLimit
}) => {
  const statusColors = useStatusColors([attester.status]);
  const statusClasses = statusColors.get(attester.status);

  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
        {/* View Toggle */}
        <td className="px-4 py-4">
          <button
            onClick={() => onToggleRow(attester.address)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            title={isExpanded ? 'Hide details' : 'Show details'}
          >
            {isExpanded ? (
              <EyeSlashIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            ) : (
              <EyeIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            )}
          </button>
        </td>

        {/* Sequencer Info */}
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
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
            <div className="min-w-0">
              <Link
                href={getValidatorLink(attester)}
                className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-brand-violet dark:hover:text-accent-purple-light truncate transition-colors duration-200 block"
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
        </td>

        {/* Status */}
        <td className="px-4 py-4">
          {statusClasses && (
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md ${statusClasses.bg} ${statusClasses.text}`}>
              <span className={`w-2 h-2 rounded-full ${statusClasses.dot}`}></span>
              {attester.status || 'Unknown'}
            </span>
          )}
        </td>

        {/* Balance */}
        <td className="px-4 py-4">
          {attester.balance && (() => {
            const { formatted } = formatBalanceWithUsd(attester.balance, stakingTokenDecimals, stakingTokenSymbol, true);
            return (
              <div>
                <div className="flex items-center gap-1.5">
                  <WalletIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{formatted}</span>
                </div>
                {attester.isInQueue && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 ml-5.5">Locked balance pending</p>
                )}
              </div>
            );
          })()}
        </td>

        {/* Attestation Rate */}
        <td className="px-4 py-4">
          <PerformanceCell
            rate={attester.attestationRate}
            volume={`${attester.attestationsSuccessful}/${attester.attestationsSuccessful + attester.attestationsMissed}`}
          />
        </td>

        {/* Proposal Rate */}
        <td className="px-4 py-4">
          <PerformanceCell
            rate={attester.blockSuccessRate}
            volume={`${attester.checkpointsProposed + attester.checkpointsMined}/${attester.checkpointsProposed + attester.checkpointsMined + (attester.checkpointsMissed || 0) + attester.blocksMissed}`}
          />
        </td>
      </tr>

      {/* Expanded Details */}
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-0 py-0">
            <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-600">
              <AttesterDetail
                attester={attester}
                stakingTokenDecimals={stakingTokenDecimals}
                stakingTokenSymbol={stakingTokenSymbol}
                epochLimit={epochLimit}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
