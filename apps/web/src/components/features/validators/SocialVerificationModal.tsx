'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { CheckBadgeIcon } from '@heroicons/react/24/outline';
import { AtSymbolIcon } from '@heroicons/react/24/outline';
import { XIcon, DiscordIcon } from '../dashboard/Links';

interface SocialVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SocialVerificationModal: React.FC<SocialVerificationModalProps> = ({ isOpen, onClose }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<'x' | 'discord'>('x');

  const platformData = {
    x: {
      icon: XIcon,
      name: 'X',
      color: 'from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-100',
      iconColor: 'text-slate-700 dark:text-slate-300',
    },
    discord: {
      icon: DiscordIcon,
      name: 'Discord',
      color: 'from-indigo-600 to-indigo-800 dark:from-indigo-400 dark:to-indigo-200',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    }
  };

  const currentPlatform = platformData[selectedPlatform];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center">
          <div className="relative mx-auto flex h-12 w-12 items-center justify-center">
            <div className={`absolute inset-0 bg-gradient-to-br ${currentPlatform.color} opacity-20 rounded-xl blur-lg`}></div>
            <div className={`relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 border border-white/20 dark:border-slate-700/50 shadow-xl`}>
              <currentPlatform.icon className={`h-6 w-6 ${currentPlatform.iconColor}`} />
            </div>
          </div>
          <h3 className="mt-3 text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Link {currentPlatform.name} Account
          </h3>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Verify sequencer ownership and build community trust
          </p>
        </div>

        {/* Platform Selection */}
        <div className="flex gap-2 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
          <button
            onClick={() => setSelectedPlatform('x')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
              selectedPlatform === 'x'
                ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-md scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <AtSymbolIcon className="h-4 w-4" />
            <span>X</span>
          </button>
          <button
            onClick={() => setSelectedPlatform('discord')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
              selectedPlatform === 'discord'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <DiscordIcon className="h-4 w-4" />
            <span>Discord</span>
          </button>
        </div>

        {/* Steps - Simplified */}
        <div className="bg-gradient-to-br from-slate-50/80 to-white dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl p-3.5 border border-slate-200/50 dark:border-slate-700/50">
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-violet/10 dark:bg-accent-purple-light/10 flex items-center justify-center">
                <span className="text-xs font-bold text-brand-violet dark:text-accent-purple-light">1</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Connect your wallet</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Make sure you own the sequencer</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-violet/10 dark:bg-accent-purple-light/10 flex items-center justify-center">
                <span className="text-xs font-bold text-brand-violet dark:text-accent-purple-light">2</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Visit your sequencer page</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Find the verification card</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-violet/10 dark:bg-accent-purple-light/10 flex items-center justify-center">
                <span className="text-xs font-bold text-brand-violet dark:text-accent-purple-light">3</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Sign & authorize</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">No gas fees required</p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits - Compact */}
        <div className="flex items-start gap-2.5 p-3 bg-brand-violet/5 dark:bg-accent-purple-light/5 rounded-xl border border-brand-violet/20 dark:border-accent-purple-light/20">
          <CheckBadgeIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Why verify?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Build trust, stand out in rankings, and connect with the community
            </p>
          </div>
        </div>

        {/* Provider Information */}
        <div className="p-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-xl border border-purple-200/50 dark:border-purple-800/30">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">About Provider Information</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Provider badges show staking infrastructure services operating sequencers. Providers must be recognized by the Aztec Foundation through{' '}
            <a
              href="https://stake.aztec.network"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
            >
              stake.aztec.network
            </a>
            {' '}to appear in the registry.
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-brand-violet to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          Got it
        </button>
      </div>
    </Modal>
  );
};

// Export both for backward compatibility
export const XVerificationModal = SocialVerificationModal;