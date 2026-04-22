import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { TallyVotingHistoryEntry, VotingHistoryEntry } from '@/types';
import { useEpochCalculations } from '@/hooks/useEpochCalculations';
import { getAddressUrl, getTxUrl } from '@/utils/blockExplorer';
import {
  HandThumbUpIcon,
  HandThumbDownIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ClockIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { CopyButton } from '@/components/ui/CopyButton';
import { formatTimestamp } from '@/utils/formatters';
import { ProposerVoteType } from '@dashtec/shared-types';

interface VoteEventProps {
  vote: VotingHistoryEntry | TallyVotingHistoryEntry;
}

const GovernanceProposerVoting: React.FC<{ vote: VotingHistoryEntry }> = ({ vote }) => {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <KeyIcon className="h-4 w-4" />
        <strong>Proposal:</strong>
        <Link
          href={getAddressUrl(vote.proposal_address)}
          target='_blank'
          className="font-mono text-brand-violet dark:text-accent-purple-light hover:text-amber-700 dark:hover:text-amber-300 hover:underline transition-colors"
        >
          {vote.proposal_address.substring(0, 5)}...{vote.proposal_address.substring(vote.proposal_address.length - 4)}
        </Link>
        <CopyButton textToCopy={vote.proposal_address} size="xs" />
      </div>
      <div className="pt-1">
        <a
          href={getTxUrl(vote.transaction_hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sky-500 hover:text-sky-600 dark:hover:text-sky-400 font-semibold"
        >
          View Transaction <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
        </a>
      </div>
    </>
  )
}

const TallySlashingProposerVoting: React.FC<{ vote: TallyVotingHistoryEntry }> = ({ vote }) => {
  return (
    <>
      {vote.payload ? (
        <>
          <div className="flex items-center gap-1.5">
            <KeyIcon className="h-4 w-4" />
            <strong>Payload:</strong>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              <Link
                href={`/slashing-history/${vote.round_number}`}
                className="font-mono text-brand-violet dark:text-accent-purple-light hover:text-amber-700 dark:hover:text-amber-300 hover:underline transition-colors"
              >
                {vote.payload?.address!.substring(0, 5)}...{vote.payload?.address!.substring(vote.payload.address!.length - 4)}
              </Link>
            </span>
            <CopyButton textToCopy={vote.payload?.address!} size="xs" />
          </div>
          <div className="pt-1">
            <a
              href={getTxUrl(vote.transaction_hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sky-500 hover:text-sky-600 dark:hover:text-sky-400 font-semibold"
            >
              View Transaction <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            </a>
          </div>
        </>
      ) : null}
    </>
  )
}

export const VoteEvent: React.FC<VoteEventProps> = ({ vote }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isFor = true
  const Icon = isFor ? HandThumbUpIcon : HandThumbDownIcon;

  // Different colors for Governance vs Slashing proposers
  const isSlashing = vote.vote_type === ProposerVoteType.SLASHING_PROPOSER
  const iconColor = isSlashing
    ? 'text-red-500 dark:text-red-400'
    : 'text-blue-500 dark:text-blue-400';
  const bgColor = isSlashing
    ? 'bg-red-500/10 dark:bg-red-500/20'
    : 'bg-blue-500/10 dark:bg-blue-500/20';

  return (
    <div className="relative">
      <div className="absolute -left-4 top-1.5">
        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${bgColor}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>

      <div className="ml-6">
        <div
          className="flex gap-2 justify-between items-start cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Voted <span className={`${iconColor}`}>{
                vote.vote_type
                  .split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(' ')
              }</span> on Round {vote.round_number}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
              <ClockIcon className="h-3 w-3" />
              {formatTimestamp(new Date(vote.timestamp).getTime() / 1000)}
            </p>
          </div>
          <ChevronDownIcon
            className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                {vote.vote_type === ProposerVoteType.GOVERNANCE_PROPOSER && (
                  <GovernanceProposerVoting vote={vote as VotingHistoryEntry} />
                )}
                {vote.vote_type === ProposerVoteType.SLASHING_PROPOSER && (
                  <TallySlashingProposerVoting vote={vote as TallyVotingHistoryEntry} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};