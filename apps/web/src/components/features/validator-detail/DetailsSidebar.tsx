import React, { useState, useMemo } from 'react';
import { Validator } from '@/types';
import { ProviderAvatar } from '@/components/ui/ProviderAvatar';
import { ResponsiveDetailItem } from '@/components/ui/ResponsiveDetailItem';
import { Tooltip } from '@/components/ui/Tooltip';
import { MetricCard } from '@/components/ui/MetricCard';
import { WalletIcon, GiftIcon, KeyIcon, CheckCircleIcon, ArrowUpOnSquareIcon, AtSymbolIcon, TagIcon, InformationCircleIcon, CalendarIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import VotingHistoryCard from './VotingHistoryCard';
import { formatTimestamp, formatBalanceWithUsd } from '@/utils/formatters';
import { useTokenPrice } from '@/hooks/queries/useTokenPrice';
import { DiscordIcon } from '@/components/features/dashboard/Links';
import { VerificationCard } from '@/components/features/validator-detail/VerificationCard';
import { getValidatorStatusDescription } from '@/utils/constants';
import { useApp } from '@/context/AppContext';
import { CoinbaseCheckModal } from './CoinbaseCheckModal';
import { useStatusColor } from '@/hooks/useStatusColor';

interface DetailsSidebarProps {
  validator: Validator;
  isOwner: boolean;
  onUnlinkSuccess: () => void;
  onDiscordUnlinkSuccess: () => void;
  rollupParam?: string;
}

export const DetailsSidebar: React.FC<DetailsSidebarProps> = ({ validator, isOwner, onUnlinkSuccess, onDiscordUnlinkSuccess, rollupParam }) => {
  const { getFormattedTimeForSlot, networkConfig: config } = useApp();
  const stakingTokenSymbol = config?.stakingTokenSymbol ?? 'STK';
  const { data: priceData } = useTokenPrice(stakingTokenSymbol);
  const currentPrice = priceData?.currentPrice ?? null;
  const lastAttestationSlot = validator?.recentAttestations?.[0]?.slot;
  const lastProposalSlot = validator?.proposalHistory?.[0]?.slot;
  const statusClasses = useStatusColor(validator.status);
  const [isCoinbaseModalOpen, setIsCoinbaseModalOpen] = useState(false);

  const { formatted: balanceFormatted, usd: balanceUsd } = useMemo(() =>
    formatBalanceWithUsd(validator.balance, config?.stakingTokenDecimals ?? 18, config?.stakingTokenSymbol ?? 'STK', currentPrice),
    [validator.balance, config?.stakingTokenDecimals, config?.stakingTokenSymbol, currentPrice]
  );

  const { formatted: rewardsFormatted, usd: rewardsUsd } = useMemo(() =>
    validator.unclaimedRewards
      ? formatBalanceWithUsd(validator.unclaimedRewards, config?.stakingTokenDecimals ?? 18, config?.stakingTokenSymbol ?? 'STK', currentPrice, true)
      : { formatted: null, usd: null },
    [validator.unclaimedRewards, config?.stakingTokenDecimals, config?.stakingTokenSymbol, currentPrice]
  );

  return (
    <div className="space-y-6">
      {isOwner && (
        <VerificationCard
          validator={validator}
          onUnlinkXSuccess={onUnlinkSuccess}
          onUnlinkDiscordSuccess={onDiscordUnlinkSuccess}
        />
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Balance"
          icon={WalletIcon}
          formatted={balanceFormatted}
          usd={balanceUsd}
          theme="slate"
        />
        <MetricCard
          label="Rewards"
          icon={GiftIcon}
          formatted={rewardsFormatted ?? 'N/A'}
          usd={rewardsUsd}
          theme="emerald"
          action={{ label: 'Details', onClick: () => setIsCoinbaseModalOpen(true) }}
        />
      </div>

      {/* Key Information */}
      <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-2xl">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-brand-violet/10 dark:bg-brand-violet/20 rounded-lg">
              <InformationCircleIcon className="h-5 w-5 text-brand-violet dark:text-accent-purple-light" />
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-brand-violet to-amber-600 dark:from-slate-100 dark:via-accent-purple-light dark:to-amber-400 bg-clip-text text-transparent">
              Key Information
            </h3>
          </div>

          <div className="rounded-xl bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 p-3 sm:p-4">
            <dl className="divide-y divide-white/20 dark:divide-slate-600/30 space-y-1">
              <ResponsiveDetailItem
                label="Status"
                Icon={TagIcon}
                value={
                  <Tooltip content={getValidatorStatusDescription(validator.status)}>
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md cursor-help ${statusClasses.bg} ${statusClasses.text}`}>
                      <span className={`w-2 h-2 rounded-full ${statusClasses.dot}`}></span>
                      {validator.status.replace('_', ' ').replace('-', ' ')}
                    </span>
                  </Tooltip>
                }
              />
              {validator.x_handle && (
                <ResponsiveDetailItem
                  label="X Handle"
                  value={
                    <a
                      href={`https://x.com/${validator.x_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                    >
                      {validator.x_image_url && (
                        <div className="relative">
                          <img src={validator.x_image_url} alt="X avatar" className="w-6 h-6 rounded-full border border-white/20 shadow-sm group-hover:scale-110 transition-transform duration-200" />
                        </div>
                      )}
                      <span className="font-semibold group-hover:underline">@{validator.x_handle}</span>
                    </a>
                  }
                  Icon={AtSymbolIcon}
                />
              )}
              {validator.discordUsername && (
                <ResponsiveDetailItem
                  label="Discord"
                  value={
                    <div className="flex items-center gap-2">
                      {validator.discordAvatar && (
                        <div className="relative">
                          <img src={validator.discordAvatar} alt="Discord Avatar" className="w-6 h-6 rounded-full border border-white/20 shadow-sm" />
                        </div>
                      )}
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{validator.discordUsername}</span>
                    </div>
                  }
                  Icon={DiscordIcon}
                />
              )}
              {validator.provider && (
                <ResponsiveDetailItem
                  label="Provider"
                  value={
                    <a
                      href={`/providers/${validator.provider.providerIdentifier}`}
                      className="group flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                      title={validator.provider.description || undefined}
                    >
                      <ProviderAvatar
                        logoUrl={validator.provider.logoUrl}
                        name={validator.provider.name || validator.provider.providerIdentifier}
                        size="sm"
                        shape="square"
                        className="border border-white/20 shadow-sm group-hover:scale-110 transition-transform duration-200"
                      />
                      <span className="font-semibold group-hover:underline">{validator.provider.name || validator.provider.providerIdentifier}</span>
                    </a>
                  }
                  Icon={BuildingOfficeIcon}
                  tooltip={`${validator.provider.name || validator.provider.providerIdentifier}${validator.provider.description ? ` - ${validator.provider.description}` : ''}${validator.provider.website ? ` | Website: ${validator.provider.website}` : ''} | Click to view provider details`}
                />
              )}
              <ResponsiveDetailItem label="Withdrawal" value={validator.withdrawalCredentials ? `${validator.withdrawalCredentials.substring(0, 10)}...${validator.withdrawalCredentials.substring(validator.withdrawalCredentials.length - 8)}` : 'N/A'} isMono Icon={KeyIcon} textToCopy={validator.withdrawalCredentials} tooltip="The withdrawal credentials for this sequencer, determining where funds can be withdrawn to" />
              <ResponsiveDetailItem label="Activation" value={validator.activationDate ? formatTimestamp(new Date(validator.activationDate).getTime() / 1000) : 'N/A'} Icon={CalendarIcon} tooltip="The date and time when this sequencer was activated on the network" />
              <ResponsiveDetailItem label="Last Att." value={lastAttestationSlot ? getFormattedTimeForSlot(lastAttestationSlot) : 'N/A'} Icon={CheckCircleIcon} tooltip="The last time when this sequencer successfully submitted an attestation" />
              <ResponsiveDetailItem label="Last Prop." value={lastProposalSlot ? getFormattedTimeForSlot(lastProposalSlot) : 'N/A'} Icon={ArrowUpOnSquareIcon} tooltip="The last time when this sequencer proposed a block" />
            </dl>
          </div>
        </div>
      </div>

      <CoinbaseCheckModal
        isOpen={isCoinbaseModalOpen}
        onClose={() => setIsCoinbaseModalOpen(false)}
        rewardSources={validator.rewardSources || []}
        rewardsByRollup={validator.rewardsByRollup}
        rollupParam={rollupParam}
      />
    </div>
  );
};
