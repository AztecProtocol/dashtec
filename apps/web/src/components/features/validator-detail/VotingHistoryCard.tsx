import React, { useMemo } from 'react';
import { VotingHistoryEntry, Validator, TallyVotingHistoryEntry } from '@/types';
import { VoteEvent } from '@/components/features/validator-detail/VoteEvent';
import { PresentationChartLineIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline';
import { useScrollFade } from '@/hooks/useScrollFade';

interface VotingHistoryCardProps {
  votingHistory: VotingHistoryEntry[];
  tallyVotingHistory?: Validator['tallyVotingHistory'];
}

const VotingHistoryCard: React.FC<VotingHistoryCardProps> = ({ votingHistory = [], tallyVotingHistory = [] }) => {
  const scrollRef = useScrollFade<HTMLDivElement>();

  // Combine and sort all voting history
  const combinedVotingHistory = useMemo(() => {
    const allVotes: (VotingHistoryEntry | TallyVotingHistoryEntry)[] = [
      ...votingHistory,
      ...tallyVotingHistory
    ];

    // Sort by timestamp (newest first)
    return allVotes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [votingHistory, tallyVotingHistory]);

  if (combinedVotingHistory.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/50 shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-brand-violet/10 dark:bg-brand-violet/20 rounded-lg">
              <DocumentChartBarIcon className="h-5 w-5 text-brand-violet dark:text-accent-purple-light" />
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-brand-violet to-amber-600 dark:from-slate-100 dark:via-accent-purple-light dark:to-amber-400 bg-clip-text text-transparent">
              Voting History
            </h3>
          </div>
          <div className="text-center py-12">
            <div className="relative mb-6">
              <div className="p-4 bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl mx-auto w-fit">
                <PresentationChartLineIcon className="h-12 w-12 text-slate-400 dark:text-slate-500" />
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">No voting history available.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/50 shadow-2xl">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-brand-violet/10 dark:bg-brand-violet/20 rounded-lg">
            <DocumentChartBarIcon className="h-5 w-5 text-brand-violet dark:text-accent-purple-light" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-brand-violet to-amber-600 dark:from-slate-100 dark:via-accent-purple-light dark:to-amber-400 bg-clip-text text-transparent">
            Voting History
          </h3>
        </div>

        <div className="rounded-xl bg-white/60 dark:bg-slate-700/40 border border-white/30 dark:border-slate-600/30 p-4">
          <div ref={scrollRef} className="max-h-96 overflow-y-auto custom-scrollbar pr-2 scroll-fade">
            <div className="relative pl-4">
              <div className="space-y-6">
                {combinedVotingHistory.map((vote, idx) => (
                  <VoteEvent key={`${vote.transaction_hash}-${idx}`} vote={vote} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VotingHistoryCard;