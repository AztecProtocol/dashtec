'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TrophyIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useTopValidators } from '@/hooks/queries/useTopValidators';
import { Skeleton } from '@/components/ui/Skeleton';
import { ValidatorAvatar } from '@/components/ui/ValidatorAvatar';
import { IdentityBadgeGroup } from '@/components/ui/IdentityBadgeGroup';
import { getPerformanceColor } from '@/utils/formatters';
import { getValidatorLink } from '@/utils/validatorLinks';

interface TopSequencersCardProps {
  startEpoch: string;
  endEpoch: string;
  rollupParam?: string;
}

const VALIDATORS_PER_PAGE = 5;
const TOTAL_VALIDATORS = 10;

/**
 * Compact skeleton for validator list
 */
const CompactSkeletonRow: React.FC = () => (
  <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-50 dark:bg-slate-700/20 rounded-xl border border-slate-200 dark:border-slate-600/20">
    <Skeleton heightClass="h-7 sm:h-9" widthClass="w-7 sm:w-9" />
    <div className="hidden sm:block">
      <Skeleton heightClass="h-10" widthClass="w-10" />
    </div>
    <div className="sm:hidden">
      <Skeleton heightClass="h-8" widthClass="w-8" />
    </div>
    <div className="flex-1 min-w-0">
      <Skeleton heightClass="h-3 sm:h-4" widthClass="w-2/3 mb-1" />
      <Skeleton heightClass="h-2 sm:h-3" widthClass="w-1/2" />
    </div>
    <Skeleton heightClass="h-5 sm:h-6" widthClass="w-10 sm:w-12" />
  </div>
);

/**
 * TopSequencersCard component displays the top 5 sequencers
 * based on performance score for a given epoch range
 */
export const TopSequencersCard: React.FC<TopSequencersCardProps> = ({
  startEpoch,
  endEpoch,
  rollupParam,
}) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch top 10 validators using the provided epoch range
  const { data: validatorsData, isLoading: isLoadingValidators } = useTopValidators(startEpoch, endEpoch, TOTAL_VALIDATORS, rollupParam);
  const allValidators = validatorsData?.validators || [];

  // Calculate pagination
  const totalPages = Math.ceil(allValidators.length / VALIDATORS_PER_PAGE);
  const startIndex = (currentPage - 1) * VALIDATORS_PER_PAGE;
  const endIndex = startIndex + VALIDATORS_PER_PAGE;
  const validators = allValidators.slice(startIndex, endIndex);

  // Calculate global ranking offset
  const rankingOffset = (currentPage - 1) * VALIDATORS_PER_PAGE;

  return (
    <div className="flex flex-col space-y-4 sm:space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="p-1.5 sm:p-2 bg-brand-violet/5 dark:bg-brand-violet/10 rounded-lg border border-brand-violet/20 dark:border-accent-purple-light/20">
          <TrophyIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-violet dark:text-accent-purple-light" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
            Top Sequencers
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            Top {TOTAL_VALIDATORS} performers • Page {currentPage}/{totalPages} • Epochs {startEpoch}-{endEpoch}
          </p>
        </div>
      </div>

      {/* Compact List - Flex grow to fill available space */}
      <div className="space-y-3 sm:space-y-4 flex-1 flex flex-col">
        {isLoadingValidators ? (
          Array.from({ length: 5 }).map((_, i) => (
            <CompactSkeletonRow key={`skel-row-${i}`} />
          ))
        ) : validators.length > 0 ? (
          validators.map((validator, index) => (
            <div
              key={validator.index}
              className="group relative flex items-center gap-2 sm:gap-3 p-3 pr-10 sm:p-4 sm:pr-14 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-600/40 hover:border-brand-violet/40 dark:hover:border-accent-purple-light/30 transition-colors duration-200"
            >
              {/* Score - Floating Top Right */}
              <div className="absolute top-0 right-0 -translate-x-1/8 -translate-y-1/4 z-10">
                <div className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600/40 shadow-sm">
                  <span className="font-bold text-xs sm:text-sm text-brand-violet dark:text-accent-purple-light">
                    {validator.performanceScore.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Ranking Badge */}
              <div className="relative flex-shrink-0 z-10">
                <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border ${rankingOffset + index === 0
                  ? 'bg-brand-violet/10 border-brand-violet/30 dark:bg-accent-purple-light/10 dark:border-accent-purple-light/30'
                  : 'bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600/50'
                  }`}>
                  <span className={`text-[10px] sm:text-xs font-bold ${rankingOffset + index === 0
                    ? 'text-brand-violet dark:text-accent-purple-light'
                    : 'text-slate-700 dark:text-slate-300'
                    }`}>
                    #{rankingOffset + index + 1}
                  </span>
                </div>
              </div>

              {/* Avatar */}
              <div className="relative flex-shrink-0 z-10">
                <div className="hidden sm:block">
                  <ValidatorAvatar
                    address={validator.address}
                    xImageUrl={validator.x_image_url}
                    xHandle={validator.x_handle}
                    discordAvatar={validator.discordAvatar}
                    discordUsername={validator.discordUsername}
                    name={validator.name}
                    index={validator.index}
                    size="lg"
                    variant="table"
                    enableSwitching={true}
                    showMotion={false}
                    providerLogoUrl={validator.provider?.logoUrl}
                    providerName={validator.provider?.name}
                  />
                </div>
                <div className="sm:hidden">
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
                    showMotion={false}
                    providerLogoUrl={validator.provider?.logoUrl}
                    providerName={validator.provider?.name}
                  />
                </div>
              </div>

              {/* Name + Identity Badges + Stats (all inline) */}
              <div className="relative flex items-center flex-wrap gap-x-1.5 sm:gap-x-2 gap-y-1 sm:gap-y-1.5 min-w-0 flex-1 z-10">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Link
                    href={getValidatorLink(validator)}
                    className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-50 hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors group-hover:text-brand-violet dark:group-hover:text-accent-purple-light truncate max-w-[100px] sm:max-w-none"
                  >
                    {validator.name || validator.index}
                  </Link>

                  <div className="hidden sm:block">
                    {validator.provider || validator.x_handle || validator.discordUsername ? (
                      <IdentityBadgeGroup
                        provider={validator.provider}
                        xHandle={validator.x_handle}
                        xImageUrl={validator.x_image_url}
                        discordUsername={validator.discordUsername}
                        discordAvatar={validator.discordAvatar}
                        size="xs"
                      />
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Attestations */}
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-100 dark:bg-slate-800/40 rounded-md border border-slate-200/50 dark:border-slate-600/30">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Att:</span>
                    <span className={`font-bold ${getPerformanceColor(validator.attestationSuccess, { high: 90, medium: 70 })}`}>
                      {validator.attestationSuccess}
                    </span>
                    <span className="hidden sm:inline text-slate-500 dark:text-slate-500 text-[10px]">
                      ({validator.totalAttestationsSucceeded || 0}/{(validator.totalAttestationsSucceeded || 0) + (validator.totalAttestationsMissed || 0)})
                    </span>
                  </div>

                  {/* Block Proposals */}
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-100 dark:bg-slate-800/40 rounded-md border border-slate-200/50 dark:border-slate-600/30">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Prop:</span>
                    <span className={`font-bold ${getPerformanceColor(validator.proposalSuccess, { high: 90, medium: 70 })}`}>
                      {validator.proposalSuccess || 'N/A'}
                    </span>
                    <span className="hidden sm:inline text-slate-500 dark:text-slate-500 text-[10px]">
                      ({(validator.totalCheckpointsMined || 0) + (validator.totalCheckpointsProposed || 0)}/{(validator.totalCheckpointsMined || 0) + (validator.totalCheckpointsProposed || 0) + (validator.totalCheckpointsMissed || 0) + (validator.totalBlocksMissed || 0)})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800/50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-dashed border-slate-300 dark:border-slate-700">
            <TrophyIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-slate-400 dark:text-slate-500 mb-3 sm:mb-4" />
            <h4 className="font-semibold text-sm sm:text-base text-slate-600 dark:text-slate-300">No Data Available</h4>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">No sequencer performance data available for the selected range.</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">

        {/* View All Link */}
        {allValidators.length > VALIDATORS_PER_PAGE ? (
          <Link
            href="/validators"
            className="group flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg border border-slate-200 dark:border-slate-600/40 hover:border-slate-300 dark:hover:border-slate-500/50 transition-colors duration-200"
          >
            <span className="text-xs sm:text-sm font-semibold text-brand-violet dark:text-accent-purple-light">
              View Full Sequencers
            </span>
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-violet dark:text-accent-purple-light group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        ) : null}

        {/* Pagination Controls */}
        {allValidators.length > VALIDATORS_PER_PAGE ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="py-2 px-4 text-sm flex gap-2 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600/30 hover:border-slate-300 dark:hover:border-slate-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              Prev
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="py-2 px-4 text-sm flex gap-2 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600/30 hover:border-slate-300 dark:hover:border-slate-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRightIcon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </button>
          </div>
        ) : null}

      </div>
    </div>
  );
};
