import { GovernanceSignal } from '@/db/queries/historical-governance';
import { getTxUrl, getBlockUrl } from '@/utils/blockExplorer';
import { formatAddress } from '@/utils/formatters';
import { UserIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { ValidatorAvatar } from '@/components/ui/ValidatorAvatar';
import { IdentityBadgeGroup } from '@/components/ui/IdentityBadgeGroup';

interface HistoricalSignalRowProps {
  signal: GovernanceSignal;
}

/**
 * Format timestamp to a more readable format
 * Handles both ISO strings and Unix timestamps (seconds)
 */
function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return '-';

  // Parse timestamp - could be ISO string or Unix timestamp (seconds)
  let date: Date;
  const timestampNum = Number(timestamp);

  if (!isNaN(timestampNum) && timestampNum > 1000000000 && timestampNum < 10000000000) {
    // Unix timestamp in seconds (between Sep 2001 and Nov 2286)
    date = new Date(timestampNum * 1000);
  } else {
    // ISO string or milliseconds timestamp
    date = new Date(timestamp);
  }

  // Check if date is valid
  if (isNaN(date.getTime())) return '-';

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  // If less than 24 hours ago, show relative time
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
    }
    return `${hours}h ago`;
  }

  // If less than 7 days, show days ago
  if (days < 7) {
    return `${days}d ago`;
  }

  // Otherwise show date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

export const HistoricalSignalRow: React.FC<HistoricalSignalRowProps> = ({ signal }) => {
  // Helper to get formatted full timestamp for tooltip
  const getFullTimestamp = (timestamp: string | null): string | undefined => {
    if (!timestamp) return undefined;

    const timestampNum = Number(timestamp);
    let date: Date;

    if (!isNaN(timestampNum) && timestampNum > 1000000000 && timestampNum < 10000000000) {
      date = new Date(timestampNum * 1000);
    } else {
      date = new Date(timestamp);
    }

    return isNaN(date.getTime()) ? undefined : date.toLocaleString();
  };

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <ValidatorAvatar
            address={signal.signalerAddress}
            xImageUrl={signal.xImageUrl}
            xHandle={signal.xHandle}
            discordAvatar={signal.discordAvatar}
            discordUsername={signal.discordUsername}
            name={signal.validatorName}
            index={signal.validatorIndex !== null ? signal.validatorIndex.toString() : undefined}
            size="sm"
            variant="table"
            enableSwitching={true}
            showMotion={false}
            providerLogoUrl={signal.providerLogoUrl}
            providerName={signal.providerName}
          />
          <Link
            href={`/validators/${signal.signalerAddress}`}
            className="font-mono text-slate-700 dark:text-slate-300 hover:text-brand-violet dark:hover:text-accent-purple-light hover:underline"
          >
            {signal.validatorName || formatAddress(signal.signalerAddress)}
          </Link>
        </div>
      </td>
      <td className="px-3 py-2">
        <IdentityBadgeGroup
          provider={signal.providerIdentifier ? {
            name: signal.providerName,
            logoUrl: signal.providerLogoUrl,
            providerIdentifier: signal.providerIdentifier,
          } : null}
          xHandle={signal.xHandle}
          xImageUrl={signal.xImageUrl}
          discordUsername={signal.discordUsername}
          discordAvatar={signal.discordAvatar}
          size="xs"
        />
      </td>
      <td className="px-3 py-2 text-right">
        <a
          href={getBlockUrl(signal.blockNumber)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-slate-700 dark:text-slate-300 hover:text-brand-violet dark:hover:text-accent-purple-light hover:underline"
        >
          {signal.blockNumber.toLocaleString()}
        </a>
      </td>
      <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400" title={getFullTimestamp(signal.timestamp)}>
        {formatTimestamp(signal.timestamp)}
      </td>
      <td className="px-3 py-2 text-right">
        <a
          href={getTxUrl(signal.transactionHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-violet dark:text-accent-purple-light hover:underline inline-flex items-center gap-1"
        >
          View
          <ArrowTopRightOnSquareIcon className="h-3 w-3" />
        </a>
      </td>
    </tr>
  );
};
