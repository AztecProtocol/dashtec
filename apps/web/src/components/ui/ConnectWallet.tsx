'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Modal } from './Modal';
import { getValidatorLink } from '@/utils/validatorLinks';
import { useConnectWallet } from '@/context/ConnectWalletContext';
import {
  XMarkIcon, ClipboardIcon, CheckIcon, ArrowLeftOnRectangleIcon, ExclamationTriangleIcon,
  WalletIcon, ShieldCheckIcon, UserCircleIcon, AtSymbolIcon
} from '@heroicons/react/24/outline';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
import { Z_INDEX } from '@/utils/constants';

// Generates a simple color hash from a string (e.g., wallet address)
const generateColorFromString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '00000'.substring(0, 6 - c.length) + c;
};

const WalletAvatar: React.FC<{ 
  address: string; 
  xImageUrl?: string | null;
  xHandle?: string | null;
  discordAvatar?: string | null; 
  discordUsername?: string | null;
}> = ({ address, xImageUrl, xHandle, discordAvatar, discordUsername }) => {
  const [currentAvatarType, setCurrentAvatarType] = React.useState<'x' | 'discord' | 'generated'>('x');
  const color = generateColorFromString(address);
  const displayChar = address.charAt(2).toUpperCase(); // Use 3rd character after 0x
  
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
          tooltip: `Generated avatar for ${address}`,
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
  
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={handleAvatarClick}
      className={`group relative w-10 h-10 rounded-full flex-shrink-0 border border-white/50 dark:border-slate-600/50 shadow-md overflow-hidden ${
        hasBothAvatars ? 'cursor-pointer hover:border-brand-violet/50' : ''
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
              target.parentElement!.innerHTML = `<span class="relative text-xs font-bold text-white z-10 flex items-center justify-center w-full h-full">${displayChar}</span>`;
            }}
          />
          {/* Platform indicator badge */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white dark:border-slate-800 flex items-center justify-center ${avatarInfo.badgeColor}`}>
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
          {/* Switch indicator for dual avatars */}
          {hasBothAvatars && (
            <div className="absolute -top-0.5 -left-0.5 w-3 h-3 bg-white dark:bg-slate-800 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-0.5 h-0.5 bg-brand-violet rounded-full"></div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Fallback identicon */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50"></div>
          <span className="relative text-xs font-bold text-white z-10 flex items-center justify-center w-full h-full">
            {displayChar}
          </span>
        </>
      )}
    </motion.div>
  );
};

export const ConnectWallet: React.FC = () => {
  const [hasMounted, setHasMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { isUserValidator, validatorSocials } = useConnectWallet();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setHasMounted(true); }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) setIsPopoverOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  const readyConnectors = hasMounted ? connectors.filter(c => c.id !== 'injected') : [];

  if (!hasMounted) {
    return <div className="w-36 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg " />;
  }

  if (isConnected) {
    return (
      <div className="relative" ref={popoverRef} style={{ zIndex: Z_INDEX.WALLET_MODAL }}>
        <button
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-slate-100/80 dark:bg-slate-700/80 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          <div className={`w-2.5 h-2.5 rounded-full bg-green-500`}></div>
          <span className="font-mono">{`${address?.substring(0, 6)}...${address?.substring(address.length - 4)}`}</span>
        </button>

        <AnimatePresence>
          {isPopoverOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-[90vw] max-w-xs sm:w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4"
              style={{ zIndex: Z_INDEX.WALLET_MODAL }}
            >
              <div className="flex justify-between items-center mb-4">
                {/* Replaced network name with a simple, static title */}
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Account</p>
                <button onClick={() => setIsPopoverOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <WalletAvatar 
                  address={address || ''}
                  xImageUrl={validatorSocials?.x_image_url}
                  xHandle={validatorSocials?.x_handle}
                  discordAvatar={validatorSocials?.discordAvatar}
                  discordUsername={validatorSocials?.discordUsername}
                />
                <div className="flex-1">
                  <p className="text-lg font-bold font-mono text-slate-800 dark:text-slate-50">{`${address?.substring(0, 6)}...${address?.substring(address.length - 4)}`}</p>
                </div>
              </div>

              <div className="space-y-2">
                {isUserValidator && (
                  <Link
                    href={getValidatorLink(address!)}
                    onClick={() => setIsPopoverOpen(false)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-white bg-brand-violet rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <ShieldCheckIcon className="h-5 w-5" />
                    My Sequencer Page
                  </Link>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleCopy} className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium bg-slate-100 dark:bg-slate-700/50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    {hasCopied ? <CheckIcon className="h-5 w-5 text-green-500" /> : <ClipboardIcon className="h-5 w-5" />}
                    {hasCopied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={() => { disconnect(); setIsPopoverOpen(false); }} className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium bg-slate-100 dark:bg-slate-700/50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                    Disconnect
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-violet rounded-lg hover:bg-amber-700 transition-colors"
      >
        <WalletIcon className="h-5 w-5" />
        <span className="lg:hidden xl:inline">Connect Wallet</span>
        <span className="hidden lg:inline xl:hidden">Connect</span>
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Connect Wallet" zIndex={Z_INDEX.WALLET_MODAL}>
        <div className="space-y-4">
          <p className="text-sm text-center text-slate-500 dark:text-slate-400 -mt-2 mb-4">Select a wallet from the options detected in your browser.</p>
          {readyConnectors.length > 0 ? (
            readyConnectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => {
                  connect({ connector });
                  setIsModalOpen(false);
                }}
                className="w-full flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-200">{connector.name}</span>
                <img src={connector.icon} alt={`${connector.name} icon`} className="w-8 h-8 rounded-full" />
              </button>
            ))
          ) : (
            <div className="text-center p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
              <p className="font-semibold text-slate-800 dark:text-slate-200">No Wallet Detected</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Please install a browser wallet like MetaMask to continue.
              </p>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Install MetaMask
              </a>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};