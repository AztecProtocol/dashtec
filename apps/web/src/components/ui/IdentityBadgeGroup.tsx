'use client';

import React, { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ProviderBadge } from './ProviderBadge';
import { TwitterBadge } from './TwitterBadge';
import { DiscordBadge } from './DiscordBadge';
import { ProviderMetadata } from '@/types';

interface IdentityBadgeGroupProps {
  provider?: ProviderMetadata | null;
  xHandle?: string | null;
  xImageUrl?: string | null;
  discordUsername?: string | null;
  discordAvatar?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/**
 * Component that displays identity badges with priority-based display
 * Shows primary badge by default, with hover popup for additional identities
 * Priority order: Provider → Twitter → Discord
 */
const IdentityBadgeGroupComponent: React.FC<IdentityBadgeGroupProps> = ({
  provider,
  xHandle,
  xImageUrl,
  discordUsername,
  discordAvatar,
  size = 'xs',
}) => {
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    // Calculate position when opening the popup
    if (triggerRef.current && !showPopup) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }

    setShowPopup(prev => !prev);
  }, [showPopup])

  // Close popup when clicking outside
  useEffect(() => {
    if (!showPopup) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setShowPopup(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showPopup]);

  // Count available identities (memoized)
  const identityCount = useMemo(
    () => [provider, xHandle, discordUsername].filter(Boolean).length,
    [provider, xHandle, discordUsername]
  );

  // Determine which badge is primary (memoized)
  const primaryType = useMemo(() => {
    if (provider) return 'provider';
    if (xHandle) return 'twitter';
    if (discordUsername) return 'discord';
    return null;
  }, [provider, xHandle, discordUsername]);

  // Render primary badge based on priority (memoized)
  const primaryBadge = useMemo(() => {
    if (provider) {
      return <ProviderBadge provider={provider} size={size} />;
    }
    if (xHandle) {
      return <TwitterBadge handle={xHandle} imageUrl={xImageUrl!} size={size} />;
    }
    if (discordUsername) {
      return <DiscordBadge username={discordUsername} avatarUrl={discordAvatar!} size={size} />;
    }
    return null;
  }, [provider, xHandle, xImageUrl, discordUsername, discordAvatar, size]);

  // No identities available
  if (identityCount === 0) {
    return null;
  }

  // Single identity - just show the badge
  if (identityCount === 1) {
    return <>{primaryBadge}</>;
  }

  // Multiple identities - show primary badge + popup indicator
  return (
    <div className="flex items-center gap-1.5">
      {/* Primary badge */}
      {primaryBadge}

      {/* Additional identities indicator with hover/click popup */}
      <div
        ref={triggerRef}
        onClick={handleClick}
      >
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded border border-slate-300 dark:border-slate-600 hover:border-brand-violet dark:hover:border-accent-purple-light cursor-pointer transition-colors active:scale-95">
          +{identityCount - 1}
        </span>

        {/* Lightweight popup - rendered via portal */}
        {showPopup && typeof window !== 'undefined' && createPortal(
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[9999]"
            style={{
              top: `${popupPosition.top}px`,
              left: `${popupPosition.left}px`,
            }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-2 flex flex-col gap-1.5 min-w-max">
              {provider && primaryType !== 'provider' && <ProviderBadge provider={provider} size={size} />}
              {xHandle && primaryType !== 'twitter' && <TwitterBadge handle={xHandle} imageUrl={xImageUrl!} size={size} />}
              {discordUsername && primaryType !== 'discord' && <DiscordBadge username={discordUsername} avatarUrl={discordAvatar!} size={size} />}
            </div>
          </motion.div>,
          document.body
        )}
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const IdentityBadgeGroup = memo(IdentityBadgeGroupComponent);
