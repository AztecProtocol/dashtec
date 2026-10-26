'use client';

import Link from 'next/link';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useRollupOptional } from '@/context/RollupContext';

interface RollupVersionTagProps {
  /** The rollup the sequencer is on. */
  rollupAddress?: string | null;
  size?: 'sm' | 'md';
}

/**
 * Marks a sequencer that is on a rollup other than the active one ("V5"),
 * linking to that version's migration view. Renders nothing for sequencers on
 * the active rollup, or when that version is the one being viewed, so it can
 * sit next to any status pill.
 */
export const RollupVersionTag: React.FC<RollupVersionTagProps> = ({ rollupAddress, size = 'sm' }) => {
  const rollup = useRollupOptional();
  if (!rollup || !rollupAddress) return null;

  const address = rollupAddress.toLowerCase();
  if (!rollup.activeRollup || address === rollup.activeRollup) return null;
  // Already looking at that version: every row would carry the same tag.
  if (rollup.globalRollup === address) return null;

  const version = rollup.versions.find((v) => v.address === address);
  const label = rollup.labelFor(address);
  const current = rollup.labelFor(rollup.activeRollup);
  const title = version?.isLive === false
    ? `On ${label}, which has stopped producing blocks; it never moved to ${current}.`
    : `Still on ${label}; it hasn't moved to ${current}.`;

  return (
    <Link
      href={`/migration?from=${address}`}
      title={title}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 rounded-md font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700/50 dark:hover:bg-amber-900/30 transition-colors ${
        size === 'md' ? 'px-3 py-1.5 text-xs' : 'px-2 py-1 text-[11px]'
      }`}
    >
      <ArrowPathIcon className={size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
      {label}
    </Link>
  );
};
