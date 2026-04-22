import React from 'react';
import Link from 'next/link';
import { ClockIcon, LinkIcon } from '@heroicons/react/24/outline';
import { CopyButton } from '@/components/ui/CopyButton';
import { ProviderAvatar } from '@/components/ui/ProviderAvatar';
import { getTxUrl } from '@/utils/blockExplorer';
import type { QueuedValidator } from '@/types/api/queue';
import { formatDuration } from './QueueFlushStatus';

interface QueueTableRowProps {
  validator: QueuedValidator;
  flushableValidatorsCount: number | null;
  totalSlotsInEpoch: number;
  slotDuration: number;
}

/**
 * Calculates estimated activation time
 */
const calculateActivationTime = (
  position: number,
  flushRate: number | null,
  epochDurationSlots: number,
  slotDuration: number
): string => {
  if (!flushRate || !epochDurationSlots || !slotDuration) {
    return 'N/A';
  }

  const epochsToFlush = Math.ceil(position / flushRate);
  const epochDurationSeconds = epochDurationSlots * slotDuration;
  const totalSecondsUntilActivation = epochsToFlush * epochDurationSeconds;

  return formatDuration(totalSecondsUntilActivation);
};

export const QueueTableRow: React.FC<QueueTableRowProps> = ({
  validator,
  flushableValidatorsCount,
  totalSlotsInEpoch,
  slotDuration,
}) => {
  const isInNextBatch =
    flushableValidatorsCount && validator.position <= flushableValidatorsCount;

  const activationTime = calculateActivationTime(
    validator.position,
    flushableValidatorsCount,
    totalSlotsInEpoch,
    slotDuration
  );

  return (
    <tr className="group hover:bg-white/50 dark:hover:bg-slate-700/30 transition-all duration-200">
      {/* Position */}
      <td className="pl-6 py-4 whitespace-nowrap text-center">
        <div className="flex items-center justify-center gap-2">
          <span
            className={`inline-flex items-center justify-center w-10 h-10 font-bold text-sm rounded-full border-2 transition-all duration-200 ${isInNextBatch
              ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-700 dark:text-green-400 border-green-500/40 shadow-green-500/20 shadow-lg'
              : 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40'
              }`}
          >
            {validator.position}
          </span>
        </div>
      </td>

      {/* Sequencer Address */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-800 dark:text-slate-200 font-mono bg-slate-100/50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg">
            {validator.address.substring(0, 10)}...
            {validator.address.substring(validator.address.length - 8)}
          </span>
          <CopyButton
            textToCopy={validator.address}
            size="sm"
            className="bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-600/50 transition-all duration-200 shadow-sm hover:shadow-md rounded-lg p-2"
          />
        </div>
      </td>

      {/* Provider */}
      <td className="px-6 py-4 whitespace-nowrap">
        {validator.providerIdentifier ? (
          <Link
            href={`/providers/${encodeURIComponent(validator.providerIdentifier)}`}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <ProviderAvatar
              logoUrl={validator.providerLogoUrl}
              name={validator.providerName || validator.providerIdentifier}
              size="md"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {validator.providerName || `Provider ${validator.providerIdentifier}`}
            </span>
          </Link>
        ) : (
          <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
        )}
      </td>

      {/* Withdrawer Address */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-800 dark:text-slate-200 font-mono bg-slate-100/50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg">
            {validator.withdrawerAddress.substring(0, 10)}...
            {validator.withdrawerAddress.substring(
              validator.withdrawerAddress.length - 8
            )}
          </span>
          <CopyButton
            textToCopy={validator.withdrawerAddress}
            size="sm"
            className="bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-600/50 transition-all duration-200 shadow-sm hover:shadow-md rounded-lg p-2"
          />
        </div>
      </td>

      {/* Queued Date & Time */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          <div className="flex flex-col">
            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
              {new Date(validator.queuedAt).toLocaleDateString()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {new Date(validator.queuedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </td>

      {/* Est. Activation */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
            {activationTime}
          </span>
        </div>
      </td>

      {/* Transaction Hash */}
      <td className="px-6 py-4 whitespace-nowrap">
        <a
          href={getTxUrl(validator.transactionHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-brand-violet dark:text-accent-purple-light hover:text-amber-700 dark:hover:text-amber-300 bg-brand-violet/10 hover:bg-brand-violet/20 rounded-lg border border-brand-violet/20 hover:border-brand-violet/30 transition-all duration-200 transform hover:scale-105"
        >
          <span className="font-mono">
            {validator.transactionHash.substring(0, 10)}...
            {validator.transactionHash.substring(
              validator.transactionHash.length - 8
            )}
          </span>
          <LinkIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
        </a>
      </td>
    </tr>
  );
};
