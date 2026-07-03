'use client';

import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, WalletIcon, ChevronDownIcon, ArrowTopRightOnSquareIcon, GiftIcon } from '@heroicons/react/24/outline';
import { formatBalanceWithUsd } from '@/utils/formatters';
import { getAddressUrl } from '@/utils/blockExplorer';
import { useApp } from '@/context/AppContext';
import { useSequencerRewards } from '@/hooks/rollup/useSequencerRewards';
import { CopyButton } from '@/components/ui/CopyButton';
import { BalanceWithUsd } from '@/components/ui/BalanceWithUsd';
import { Modal } from '@/components/ui/Modal';
import { RewardSource, RollupRewardsGroup } from '@/types';

interface CoinbaseCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  rewardSources: RewardSource[];
  rewardsByRollup?: RollupRewardsGroup[];
  rollupParam?: string;
}

/** Single reward source row */
const RewardSourceRow: React.FC<{ source: RewardSource; decimals: number; symbol: string }> = ({ source, decimals, symbol }) => {
  const { formatted } = formatBalanceWithUsd(source.rewards, decimals, symbol, true);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
      <div className="p-1.5 bg-brand-violet/10 dark:bg-brand-violet/20 rounded-md shrink-0">
        <WalletIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">{source.source.replace('-', ' ')}</div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-500 font-mono truncate">{source.address}</span>
          <CopyButton textToCopy={source.address} size="xs" />
        </div>
      </div>
      <div className="text-right shrink-0 space-y-1">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatted}</div>
      </div>
    </div>
  );
};

/** Collapsible section for a rollup's reward sources */
const CollapsibleRollupSection: React.FC<{
  group: RollupRewardsGroup;
  decimals: number;
  symbol: string;
  defaultOpen?: boolean;
  showZeroBalances: boolean;
}> = ({ group, decimals, symbol, defaultOpen = false, showZeroBalances }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const filtered = showZeroBalances ? group.sources : group.sources.filter(s => BigInt(s.rewards) > 0n);

  if (filtered.length === 0 && !showZeroBalances) return null;

  const { formatted } = formatBalanceWithUsd(group.totalRewards, decimals, symbol, true);

  return (
    <div className="rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{group.rollupLabel}</span>
              {group.isSelected && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Active
                </span>
              )}
            </div>
            <a
              href={getAddressUrl(group.rollupAddress)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-slate-500 hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors inline-flex items-center gap-1"
            >
              {group.rollupAddress.slice(0, 8)}...{group.rollupAddress.slice(-6)}
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </a>
          </div>
        </div>
        <div className="text-right space-y-1">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatted}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} sources</div>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 space-y-2">
          {filtered.map((source, index) => (
            <RewardSourceRow key={`${source.address}-${index}`} source={source} decimals={decimals} symbol={symbol} />
          ))}
        </div>
      )}
    </div>
  );
};

/** Rewards breakdown modal — uses shared Modal component */
export const CoinbaseCheckModal: React.FC<CoinbaseCheckModalProps> = ({
  isOpen,
  onClose,
  rewardSources,
  rewardsByRollup,
  rollupParam
}) => {
  const { networkConfig: config } = useApp();
  const [manualAddress, setManualAddress] = useState('');
  const [checkingAddress, setCheckingAddress] = useState<string | undefined>(undefined);
  const { rewards, isLoading } = useSequencerRewards(checkingAddress, rollupParam);
  const [manualReward, setManualReward] = useState<{ address: string; rewards: string } | null>(null);
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  const decimals = config?.stakingTokenDecimals ?? 18;
  const symbol = config?.stakingTokenSymbol ?? 'STK';

  useEffect(() => {
    if (rewards !== undefined && checkingAddress) {
      setManualReward({ address: checkingAddress, rewards: rewards });
      setCheckingAddress(undefined);
    }
  }, [rewards, checkingAddress]);

  const handleCheckManual = () => {
    if (!manualAddress || !/^0x[a-fA-F0-9]{40}$/.test(manualAddress)) return;
    setCheckingAddress(manualAddress);
  };

  const handleClose = () => {
    setManualAddress('');
    setManualReward(null);
    setCheckingAddress(undefined);
    onClose();
  };

  const hasZeroBalances = rewardSources.some(source => BigInt(source.rewards) === 0n);
  const shouldShowManualReward = manualReward && (showZeroBalances || BigInt(manualReward.rewards) > 0n);
  const totalRewards = rewardSources.reduce((sum, s) => sum + BigInt(s.rewards), 0n);

  const selectedGroup = rewardsByRollup?.find(g => g.isSelected);
  const otherGroups = rewardsByRollup?.filter(g => !g.isSelected && BigInt(g.totalRewards) > 0n) ?? [];

  const { formatted: totalFormatted } = formatBalanceWithUsd(totalRewards.toString(), decimals, symbol, true);
  const { formatted: manualFormatted } = manualReward
    ? formatBalanceWithUsd(manualReward.rewards, decimals, symbol, true)
    : { formatted: '' };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Rewards Breakdown">
      <div className="space-y-4">
        {/* Total Banner */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <GiftIcon className="h-5 w-5 text-brand-violet dark:text-accent-purple-light" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Unclaimed</span>
          </div>
          <BalanceWithUsd
            formatted={totalFormatted}
            className="text-lg font-bold text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Zero balance toggle */}
        {hasZeroBalances && (
          <div className="flex items-center justify-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showZeroBalances}
                onChange={(e) => setShowZeroBalances(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-brand-violet focus:ring-brand-violet"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">Show zero balances</span>
            </label>
          </div>
        )}

        {/* Rewards by Rollup */}
        {rewardsByRollup && rewardsByRollup.length > 0 ? (
          <div className="space-y-2">
            {selectedGroup && (
              <CollapsibleRollupSection group={selectedGroup} decimals={decimals} symbol={symbol} defaultOpen showZeroBalances={showZeroBalances} />
            )}
            {otherGroups.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center gap-2 px-1 mb-2">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Other Rollups</span>
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="space-y-2">
                  {otherGroups.map(group => (
                    <CollapsibleRollupSection key={group.rollupAddress} group={group} decimals={decimals} symbol={symbol} showZeroBalances={showZeroBalances} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {(showZeroBalances ? rewardSources : rewardSources.filter(s => BigInt(s.rewards) > 0n)).map((source, index) => (
              <RewardSourceRow key={index} source={source} decimals={decimals} symbol={symbol} />
            ))}
          </div>
        )}

        {/* Manual Check */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Check Another Address</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1 px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet dark:focus:ring-accent-purple-light focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && manualAddress) handleCheckManual();
              }}
            />
            <button
              onClick={handleCheckManual}
              disabled={isLoading || !manualAddress}
              className="px-4 py-2.5 bg-brand-violet hover:bg-brand-violet/90 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-lg font-medium text-sm transition-colors disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Check'
              )}
            </button>
          </div>
        </div>

        {/* Manual Result */}
        {shouldShowManualReward && manualReward && (
          <div className="p-3 rounded-lg bg-brand-violet/5 dark:bg-brand-violet/10 border border-brand-violet/20 dark:border-brand-violet/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-brand-violet dark:text-accent-purple-light mb-0.5">Result</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-mono">{manualReward.address.slice(0, 10)}...{manualReward.address.slice(-8)}</span>
                  <CopyButton textToCopy={manualReward.address} size="xs" />
                </div>
              </div>
              <BalanceWithUsd
                formatted={manualFormatted}
                className="text-base font-bold text-brand-violet dark:text-accent-purple-light"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
