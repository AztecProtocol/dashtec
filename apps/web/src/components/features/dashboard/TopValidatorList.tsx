'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Validator, ValidatorPerformance } from '@/types';
import { SkeletonTableRow } from '@/components/ui/Skeleton';
import { PerformanceFilterModal } from './PerformanceFilterModal';
import { useEpochCalculations } from '@/hooks/useEpochCalculations';
import { useEarliestEpoch } from '@/hooks/useEarliestEpoch';
import { InformationCircleIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { CopyButton } from '@/components/ui/CopyButton';
import { Tooltip } from '@/components/ui/Tooltip';
import { ScoreExplanation } from '../validators/ScoreExplanation';
import { TimeframeFilterButton } from '@/components/ui/TimeframeFilterButton';
import { SocialVerificationModal } from '../validators/SocialVerificationModal';
import { formatBalanceWithUsd, getPerformanceColor } from '@/utils/formatters';
import { getValidatorLink } from '@/utils/validatorLinks';
import { VALIDATOR_STATUS, getValidatorStatusDescription } from '@/utils/constants';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';
import { ValidatorAvatar } from '@/components/ui/ValidatorAvatar';
import { IdentityBadgeGroup } from '@/components/ui/IdentityBadgeGroup';

// Generates a simple color hash from a string (e.g., wallet address)
const generateColorFromString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '00000'.substring(0, 6 - c.length) + c;
};

const LeaderboardAvatar: React.FC<{
  address: string;
  xImageUrl?: string | null;
  xHandle?: string | null;
  discordAvatar?: string | null;
  discordUsername?: string | null;
  name?: string | null;
  index: string;
  size?: 'sm' | 'md';
}> = ({ address, xImageUrl, xHandle, discordAvatar, discordUsername, name, index, size = 'sm' }) => {
  const [currentAvatarType, setCurrentAvatarType] = React.useState<'x' | 'discord' | 'generated'>('x');
  const color = generateColorFromString(address);
  const displayChar = (name || index).charAt(0).toUpperCase();

  // Determine available avatar types
  const hasXAvatar = !!xImageUrl;
  const hasDiscordAvatar = !!discordAvatar;
  const hasBothAvatars = hasXAvatar && hasDiscordAvatar;

  // Set initial avatar type based on availability
  React.useEffect(() => {
    if (hasXAvatar) {
      setCurrentAvatarType('x');
    } else if (hasDiscordAvatar) {
      setCurrentAvatarType('discord');
    } else {
      setCurrentAvatarType('generated');
    }
  }, [hasXAvatar, hasDiscordAvatar]);

  // Get current avatar URL and type info
  const getCurrentAvatarInfo = () => {
    switch (currentAvatarType) {
      case 'x':
        return {
          url: xImageUrl,
          isAvailable: hasXAvatar,
          tooltip: `X (Twitter) avatar for @${xHandle || 'user'}${hasBothAvatars ? ' • Click to switch to Discord' : ''}`,
          alt: `@${xHandle || 'X'} avatar`,
          badgeColor: 'bg-sky-500'
        };
      case 'discord':
        return {
          url: discordAvatar,
          isAvailable: hasDiscordAvatar,
          tooltip: `Discord avatar for ${discordUsername || 'user'}${hasBothAvatars ? ' • Click to switch to X' : ''}`,
          alt: `${discordUsername || 'Discord'} avatar`,
          badgeColor: 'bg-indigo-500'
        };
      default:
        return {
          url: null,
          isAvailable: false,
          tooltip: `Generated avatar for ${(name || index)}`,
          alt: 'Generated avatar',
          badgeColor: 'bg-slate-400'
        };
    }
  };

  const avatarInfo = getCurrentAvatarInfo();

  // Handle avatar switching
  const handleAvatarClick = () => {
    if (!hasBothAvatars) return;

    setCurrentAvatarType(prevType => {
      if (prevType === 'x' && hasDiscordAvatar) return 'discord';
      if (prevType === 'discord' && hasXAvatar) return 'x';
      return prevType;
    });
  };

  const sizeClass = size === 'md' ? 'w-8 h-8' : 'w-6 h-6';
  const badgeSize = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2';
  const textSize = size === 'md' ? 'text-xs' : 'text-[10px]';

  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={handleAvatarClick}
      className={`group relative ${sizeClass} rounded-lg flex-shrink-0 border border-white/50 dark:border-slate-600/50 shadow-md overflow-hidden ${hasBothAvatars ? 'cursor-pointer hover:border-brand-violet/50' : ''
        }`}
      style={{ backgroundColor: avatarInfo.url ? 'transparent' : `#${color}` }}
      title={avatarInfo.tooltip}
    >
      {avatarInfo.url && avatarInfo.isAvailable ? (
        <>
          {/* Social Avatar (X or Discord) */}
          <img
            src={avatarInfo.url}
            alt={avatarInfo.alt}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to identicon if social avatar fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.style.backgroundColor = `#${color}`;
              target.parentElement!.innerHTML = `<span class="relative ${textSize} font-bold text-white z-10 flex items-center justify-center w-full h-full">${displayChar}</span>`;
            }}
          />
          {/* Platform indicator badge */}
          <div className={`absolute -bottom-0.5 -right-0.5 ${badgeSize} rounded-full border border-white dark:border-slate-800 flex items-center justify-center ${avatarInfo.badgeColor}`}>
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
          {/* Switch indicator for dual avatars */}
          {hasBothAvatars && (
            <div className={`absolute -top-0.5 -left-0.5 ${badgeSize} bg-white dark:bg-slate-800 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
              <div className="w-0.5 h-0.5 bg-brand-violet rounded-full"></div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Fallback identicon */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50"></div>
          <span className={`relative ${textSize} font-bold text-white z-10 flex items-center justify-center w-full h-full`}>
            {displayChar}
          </span>
        </>
      )}
    </motion.div>
  );
};

interface ValidatorListProps {
}

export const ValidatorList: React.FC = () => {
  const [validators, setValidators] = useState<ValidatorPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  const [startEpoch, setStartEpoch] = useState('');
  const [endEpoch, setEndEpoch] = useState('');
  const [activeFilterQuery, setActiveFilterQuery] = useState('');

  const configState = useNetworkConfig();
  const { config } = configState;
  const { currentEpoch } = useEpochCalculations(configState);
  const { earliestEpoch } = useEarliestEpoch();

  const fetchValidatorPerformance = useCallback(async (filterQuery: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/dashboard/top-validators?${filterQuery}`);
      if (!response.ok) throw new Error("Failed to fetch sequencer performance");
      const data = await response.json();
      setValidators(data.validators || []);
    } catch (error) {
      console.error(error);
      setValidators([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (earliestEpoch !== null && currentEpoch > 0 && !activeFilterQuery) {
      const defaultEnd = currentEpoch;
      const defaultStart = Math.max(earliestEpoch, defaultEnd - 100);
      const params = new URLSearchParams();
      params.append('startEpoch', String(defaultStart));
      params.append('endEpoch', String(defaultEnd));
      const query = params.toString();
      setStartEpoch(String(defaultStart));
      setEndEpoch(String(defaultEnd));
      setActiveFilterQuery(query);
      fetchValidatorPerformance(query);
    }
  }, [earliestEpoch, currentEpoch, activeFilterQuery, fetchValidatorPerformance]);

  const handleFilterSubmit = () => {
    const params = new URLSearchParams();
    if (startEpoch) params.append('startEpoch', startEpoch);
    if (endEpoch) params.append('endEpoch', endEpoch);
    const query = params.toString();
    setActiveFilterQuery(query);
    fetchValidatorPerformance(query);
  };

  const getStatusClass = (status: Validator['status']) => {
    switch (status) {
      case VALIDATOR_STATUS.ACTIVE: return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300';
      case VALIDATOR_STATUS.EXITING: return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300';
      case VALIDATOR_STATUS.ZOMBIE: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-50';
    }
  };

  const tableHeaders = ['Sequencer', 'Address', 'Balance', 'Attestations', 'Proposals', 'Score'];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mt-8 p-8">

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          {/* Animated Trophy Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/20 to-amber-500/10 rounded-xl blur-md "></div>
            <div className="relative p-2 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 shadow-lg">
              <TrophyIcon className="h-6 w-6 text-brand-violet" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-brand-violet to-amber-600 dark:from-slate-100 dark:via-accent-purple-light dark:to-amber-400 bg-clip-text text-transparent">
              Sequencer Leaderboard
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Top performing sequencers securing the network based on the selected epoch range.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TimeframeFilterButton
            isFilterActive={activeFilterQuery !== ''}
            startEpoch={startEpoch}
            endEpoch={endEpoch}
            onClick={() => setIsFilterModalOpen(true)}
          />
        </div>
      </div>

      {/* Modern Table Container */}
      <div className="overflow-x-auto custom-scrollbar rounded-xl bg-slate-50 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-700 shadow-inner">
        <table className="min-w-full">
          <thead className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900">
            <tr>
              <th scope="col" className="px-4 py-2 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span className="text-xs">#</span>
                  Sequencer
                </div>
              </th>
              {tableHeaders.slice(1).map(header => (
                <th key={header} scope="col" className="px-4 py-2 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <SkeletonTableRow key={`skel-row-${i}`} columns={tableHeaders.length} />
              ))
            ) : validators.length > 0 ? (
              validators.map((validator, index) => (
                <tr key={validator.index} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {/* Ranking Badge */}
                      <div className="flex-shrink-0">
                        {index === 0 ? (
                          <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center border border-yellow-300 dark:border-yellow-700">
                            <TrophyIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                          </div>
                        ) : index === 1 ? (
                          <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded-lg flex items-center justify-center border border-slate-400 dark:border-slate-500">
                            <TrophyIcon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                          </div>
                        ) : index === 2 ? (
                          <div className="w-8 h-8 bg-amber-200 dark:bg-amber-800/40 rounded-lg flex items-center justify-center border border-amber-400 dark:border-amber-600">
                            <TrophyIcon className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-600">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">#{index + 1}</span>
                          </div>
                        )}
                      </div>

                      {/* Avatar */}
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

                      {/* Validator Info with Identity Badges */}
                      <div className="flex flex-col overflow-hidden flex-1 min-w-0 ml-2">
                        <Link
                          href={getValidatorLink(validator)}
                          className="font-medium text-slate-900 dark:text-slate-50 hover:text-brand-violet transition-colors truncate"
                        >
                          {validator.name || validator.index}
                        </Link>
                        <div className="mt-1">
                          {validator.provider || validator.x_handle || validator.discordUsername ? (
                            <IdentityBadgeGroup
                              provider={validator.provider}
                              xHandle={validator.x_handle}
                              xImageUrl={validator.x_image_url}
                              discordUsername={validator.discordUsername}
                              discordAvatar={validator.discordAvatar}
                              size="xs"
                            />
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-400">Rank #{index + 1}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span title={validator.address} className="text-sm font-mono text-slate-700 dark:text-slate-300 font-medium">
                          {validator.address.substring(0, 6)}...{validator.address.substring(validator.address.length - 4)}
                        </span>
                      </div>
                      {validator.address && <CopyButton textToCopy={validator.address} size="xs" />}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-slate-100/90 to-slate-50/90 dark:from-slate-700/50 dark:to-slate-700/30 rounded-lg border border-slate-200/50 dark:border-slate-600/30 shadow-sm">
                      {(() => {
                        const { formatted } = formatBalanceWithUsd(validator.balance, config?.stakingTokenDecimals ?? 18, config?.stakingTokenSymbol ?? 'STK', true);
                        return (
                          <div className="text-right">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block">{formatted}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${getPerformanceColor(validator.attestationSuccess, { high: 90, medium: 70 })}`}>
                        {validator.attestationSuccess}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        ({validator.totalAttestationsSucceeded || 0}/{(validator.totalAttestationsMissed || 0) + (validator.totalAttestationsSucceeded || 0)})
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${getPerformanceColor(validator.proposalSuccess, { high: 90, medium: 70 })}`}>
                        {validator.proposalSuccess || 'N/A'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        ({(validator.totalCheckpointsMined || 0) + (validator.totalCheckpointsProposed || 0)}/{(validator.totalCheckpointsMined || 0) + (validator.totalCheckpointsProposed || 0) + (validator.totalCheckpointsMissed || 0) + (validator.totalBlocksMissed || 0)})
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-bold text-brand-violet dark:text-accent-purple-light">
                        {validator.performanceScore}
                      </span>
                      <Tooltip content={<ScoreExplanation />}>
                        <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                          <InformationCircleIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={tableHeaders.length} className="text-center text-slate-500 dark:text-slate-400 py-16">
                  <div className="flex flex-col items-center gap-4">
                    <TrophyIcon className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                    <p>No sequencer performance data available for the selected range.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PerformanceFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Top Sequencer Performance"
        startEpoch={startEpoch}
        endEpoch={endEpoch}
        setStartEpoch={setStartEpoch}
        setEndEpoch={setEndEpoch}
        handleFilterSubmit={handleFilterSubmit}
      />
      <SocialVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
      />
    </div>
  );
};
