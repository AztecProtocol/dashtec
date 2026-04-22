'use client';

import React, { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';
import { Validator } from '@/types';
import { DiscordIcon, XIcon } from '../dashboard/Links';
import { CircleStackIcon, CheckBadgeIcon, LinkIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { generateXUnverificationMessage } from '@/services/auth/signatureService';

interface VerificationRowProps {
  platformName: 'X' | 'Discord';
  Icon: React.ElementType;
  isLinked: boolean;
  username?: string | null;
  avatarUrl?: string | null;
  isLoading: boolean;
  onLink: () => void;
  onUnlink: () => void;
}

const VerificationRow: React.FC<VerificationRowProps> = ({
  platformName,
  Icon,
  isLinked,
  username,
  avatarUrl,
  isLoading,
  onLink,
  onUnlink,
}) => {
  // --- Platform-specific styles ---
  const iconColor = platformName === 'Discord' ? 'text-[#5865F2]' : 'text-slate-700 dark:text-slate-300';
  const buttonBgColor = platformName === 'Discord' ? 'bg-[#5865F2] hover:bg-[#4f5bda]' : 'bg-black dark:bg-white dark:text-black dark:hover:bg-slate-200';

  return (
    <div className="flex items-center justify-between p-4 bg-slate-100/50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/50">
      <div className="flex items-center gap-4">
        <Icon className={`h-8 w-8 ${iconColor}`} />
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">{platformName}</p>
          {isLinked && username ? (
            <div className="flex items-center gap-2 mt-0.5">
              {avatarUrl && <img src={avatarUrl} alt={`${username}'s avatar`} className="w-5 h-5 rounded-full" />}
              <span className="text-sm text-slate-500 dark:text-slate-400">{username}</span>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">Not Linked</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isLinked ? (
          <button
            onClick={onUnlink}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-200 dark:bg-slate-700 dark:text-slate-300 rounded-md hover:bg-red-100 dark:hover:bg-red-800/50 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-70 transition-colors group"
          >
            {isLoading ? (
              <CircleStackIcon className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span className="group-hover:hidden">Unlink</span>
                <span className="hidden group-hover:block"><XMarkIcon className="h-4 w-4" /></span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={onLink}
            disabled={isLoading}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg ${buttonBgColor} disabled:opacity-70 transition-colors`}
          >
            {isLoading ? <CircleStackIcon className="h-5 w-5 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
            {isLoading ? 'Waiting...' : 'Link'}
          </button>
        )}
      </div>
    </div>
  );
};

interface VerificationCardProps {
  validator: Validator;
  onUnlinkXSuccess: () => void;
  onUnlinkDiscordSuccess: () => void;
}


export const VerificationCard: React.FC<VerificationCardProps> = ({ validator, onUnlinkXSuccess, onUnlinkDiscordSuccess }) => {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isLoading, setIsLoading] = useState({ x: false, discord: false });
  const router = useRouter();
  const { addNotification } = useNotification();

  const handleLinkX = async () => {
    setIsLoading(prev => ({ ...prev, x: true }));
    try {
      const response = await fetch('/api/auth/x/challenge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address }),
      });
      if (!response.ok) throw new Error('Failed to get challenge from server.');
      const { message } = await response.json();
      const signature = await signMessageAsync({ message });
      const redirectUrl = `/api/auth/x/connect?signature=${signature}&message=${encodeURIComponent(message)}&address=${address}`;
      router.push(redirectUrl);
    } catch (err: any) {
      addNotification(err.message || 'An error occurred during signing.', 'error');
    } finally {
      setIsLoading(prev => ({ ...prev, x: false }));
    }
  };

  const handleUnlinkX = async () => {
    setIsLoading(prev => ({ ...prev, x: true }));
    try {
      const message = generateXUnverificationMessage(address || '', validator.x_handle || '');
      const signature = await signMessageAsync({ message });
      const response = await fetch('/api/auth/x/unverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, x_handle: validator.x_handle, signature }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to unlink account.');
      addNotification('X account unlinked successfully!', 'success');
      onUnlinkXSuccess();
    } catch (err: any) {
      addNotification(err.message || 'An error occurred during unlinking.', 'error');
    } finally {
      setIsLoading(prev => ({ ...prev, x: false }));
    }
  };

  const handleLinkDiscord = async () => {
    setIsLoading(prev => ({ ...prev, discord: true }));
    try {
      const challengeResponse = await fetch('/api/auth/x/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      if (!challengeResponse.ok) throw new Error('Failed to get challenge from server.');

      const { message } = await challengeResponse.json();
      const signature = await signMessageAsync({ message });

      const state = Math.random().toString(36).substring(7);

      const initResponse = await fetch('/api/auth/discord/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, message, state }),
      });

      const { redirectUrl } = await initResponse.json();
      if (!redirectUrl) throw new Error('Could not get redirect URL from server.');

      window.location.href = redirectUrl;
    } catch (err: any) {
      addNotification(err.message || 'An error occurred during signing.', 'error');
      setIsLoading(prev => ({ ...prev, discord: false }));
    }
  };

  const handleUnlinkDiscord = async () => {
    if (!address) return;
    setIsLoading(prev => ({ ...prev, discord: true }));
    try {
      const message = `I am unlinking the Discord account from my sequencer: ${address}`;
      const signature = await signMessageAsync({ message });

      const response = await fetch('/api/auth/discord/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, message }),
      });

      if (!response.ok) throw new Error((await response.json()).error || 'Failed to unlink account.');

      addNotification('Discord account unlinked successfully!', 'success');
      onUnlinkDiscordSuccess();
    } catch (err: any) {
      addNotification(err.message, 'error');
    } finally {
      setIsLoading(prev => ({ ...prev, discord: false }));
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-2xl">
      {/* Theme-aware Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/5 via-transparent to-amber-500/5"></div>
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-brand-violet/10 to-transparent rounded-full blur-2xl "></div>

      <div className="relative z-10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckBadgeIcon className="h-6 w-6 text-brand-violet" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Social Verifications</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Prove you own this sequencer by linking your social accounts. This is a secure, one-time process that does not require gas.
        </p>
        <div className="space-y-3">
          <VerificationRow
            platformName="X"
            Icon={XIcon}
            isLinked={!!validator.x_handle}
            username={validator.x_handle ? `@${validator.x_handle}` : null}
            avatarUrl={validator.x_image_url}
            isLoading={isLoading.x}
            onLink={handleLinkX}
            onUnlink={handleUnlinkX}
          />
          <VerificationRow
            platformName="Discord"
            Icon={DiscordIcon}
            isLinked={!!validator.discordUsername}
            username={validator.discordUsername}
            avatarUrl={validator.discordAvatar}
            isLoading={isLoading.discord}
            onLink={handleLinkDiscord}
            onUnlink={handleUnlinkDiscord}
          />
        </div>
      </div>
    </div>
  );
};