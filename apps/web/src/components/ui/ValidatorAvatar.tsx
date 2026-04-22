'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';

interface ValidatorAvatarProps {
  address: string;
  xImageUrl?: string | null;
  xHandle?: string | null;
  discordAvatar?: string | null;
  discordUsername?: string | null;
  name?: string | null;
  index?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'card' | 'table';
  enableSwitching?: boolean;
  showMotion?: boolean;
  providerLogoUrl?: string | null;
  providerName?: string | null;
}

// Generates a simple color hash from a string (e.g., wallet address)
const generateColorFromString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '00000'.substring(0, 6 - c.length) + c;
};

const ValidatorAvatarComponent: React.FC<ValidatorAvatarProps> = ({
  address,
  xImageUrl,
  xHandle,
  discordAvatar,
  discordUsername,
  name,
  index,
  size = 'md',
  variant = 'table',
  enableSwitching = true,
  showMotion = false,
  providerLogoUrl,
  providerName
}) => {
  const [currentAvatarType, setCurrentAvatarType] = React.useState<'x' | 'discord' | 'provider' | 'generated'>('x');
  const [failedSources, setFailedSources] = React.useState<Set<string>>(new Set());
  const color = generateColorFromString(address);
  
  // Get display character for generated avatar
  const getDisplayChar = () => {
    if (name) return name.charAt(0).toUpperCase();
    if (index) return index.charAt(0).toUpperCase();
    return address.slice(2, 4).toUpperCase();
  };
  
  const displayChar = getDisplayChar();
  
  // Determine available avatar types considering failed sources
  const hasXAvatar = !!xImageUrl && !failedSources.has(xImageUrl);
  const hasDiscordAvatar = !!discordAvatar && !failedSources.has(discordAvatar);
  const hasProviderAvatar = !!providerLogoUrl && !failedSources.has(providerLogoUrl);
  const availableAvatarCount = [hasXAvatar, hasDiscordAvatar, hasProviderAvatar].filter(Boolean).length;
  const hasMultipleAvatars = availableAvatarCount > 1 && enableSwitching;

  // Set initial avatar type based on availability
  React.useEffect(() => {
    if (hasXAvatar) {
      setCurrentAvatarType('x');
    } else if (hasDiscordAvatar) {
      setCurrentAvatarType('discord');
    } else if (hasProviderAvatar) {
      setCurrentAvatarType('provider');
    } else {
      setCurrentAvatarType('generated');
    }
  }, [hasXAvatar, hasDiscordAvatar, hasProviderAvatar]);

  // Handle fallback when current avatar fails
  React.useEffect(() => {
    if (currentAvatarType === 'x' && !hasXAvatar) {
      if (hasDiscordAvatar) setCurrentAvatarType('discord');
      else if (hasProviderAvatar) setCurrentAvatarType('provider');
      else setCurrentAvatarType('generated');
    } else if (currentAvatarType === 'discord' && !hasDiscordAvatar) {
      if (hasXAvatar) setCurrentAvatarType('x');
      else if (hasProviderAvatar) setCurrentAvatarType('provider');
      else setCurrentAvatarType('generated');
    } else if (currentAvatarType === 'provider' && !hasProviderAvatar) {
      if (hasXAvatar) setCurrentAvatarType('x');
      else if (hasDiscordAvatar) setCurrentAvatarType('discord');
      else setCurrentAvatarType('generated');
    } else if (!hasXAvatar && !hasDiscordAvatar && !hasProviderAvatar) {
      setCurrentAvatarType('generated');
    }
  }, [currentAvatarType, hasXAvatar, hasDiscordAvatar, hasProviderAvatar]);
  
  // Get current avatar URL and type info
  const getCurrentAvatarInfo = () => {
    switch (currentAvatarType) {
      case 'x':
        return {
          url: xImageUrl,
          isAvailable: hasXAvatar,
          tooltip: `X (Twitter) avatar for @${xHandle || 'user'}${hasMultipleAvatars ? ' • Click to switch' : ''}`,
          alt: `@${xHandle || 'X'} avatar`,
          badgeColor: 'bg-sky-500'
        };
      case 'discord':
        return {
          url: discordAvatar,
          isAvailable: hasDiscordAvatar,
          tooltip: `Discord avatar for ${discordUsername || 'user'}${hasMultipleAvatars ? ' • Click to switch' : ''}`,
          alt: `${discordUsername || 'Discord'} avatar`,
          badgeColor: 'bg-indigo-500'
        };
      case 'provider':
        return {
          url: providerLogoUrl,
          isAvailable: hasProviderAvatar,
          tooltip: `Provider avatar for ${providerName || 'provider'}${hasMultipleAvatars ? ' • Click to switch' : ''}`,
          alt: `${providerName || 'Provider'} avatar`,
          badgeColor: 'bg-purple-500'
        };
      default:
        return {
          url: null,
          isAvailable: false,
          tooltip: `Generated avatar for ${name || index || address.substring(0, 10) + '...'}`,
          alt: 'Generated avatar',
          badgeColor: 'bg-slate-400'
        };
    }
  };
  
  const avatarInfo = getCurrentAvatarInfo();
  
  // Handle avatar switching
  const handleAvatarClick = () => {
    if (!hasMultipleAvatars) return;

    setCurrentAvatarType(prevType => {
      // Cycle through available avatars: X -> Discord -> Provider -> X
      if (prevType === 'x') {
        if (hasDiscordAvatar) return 'discord';
        if (hasProviderAvatar) return 'provider';
        return 'x';
      }
      if (prevType === 'discord') {
        if (hasProviderAvatar) return 'provider';
        if (hasXAvatar) return 'x';
        return 'discord';
      }
      if (prevType === 'provider') {
        if (hasXAvatar) return 'x';
        if (hasDiscordAvatar) return 'discord';
        return 'provider';
      }
      return prevType;
    });
  };
  
  // Size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'w-6 h-6',
          text: 'text-xs',
          badge: 'w-2 h-2',
          badgeDot: 'w-1 h-1',
          indicator: 'w-2 h-2'
        };
      case 'lg':
        return {
          container: 'w-12 h-12',
          text: 'text-base',
          badge: 'w-4 h-4',
          badgeDot: 'w-2 h-2',
          indicator: 'w-4 h-4'
        };
      default: // md
        return {
          container: 'w-10 h-10',
          text: 'text-sm',
          badge: 'w-3 h-3',
          badgeDot: 'w-1.5 h-1.5',
          indicator: 'w-3 h-3'
        };
    }
  };
  
  const sizeClasses = getSizeClasses();
  
  // Variant-specific classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'card':
        return {
          container: 'border border-white/30 dark:border-slate-600/30 shadow-lg',
          glow: 'bg-gradient-to-br from-brand-violet/20 to-amber-500/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          badge: '-top-1 -right-1',
          indicator: '-bottom-1 -left-1',
          fallbackGradient: 'bg-gradient-to-br from-brand-violet/30 to-amber-500/20'
        };
      default: // table
        return {
          container: 'border-2 border-white/50 dark:border-slate-600/50 shadow-lg',
          glow: '',
          badge: '-bottom-1 -right-1',
          indicator: '-top-1 -left-1',
          fallbackGradient: 'bg-gradient-to-br from-white/20 to-transparent opacity-50'
        };
    }
  };
  
  const variantClasses = getVariantClasses();
  
  const AvatarContent = () => (
    <div
      className={`group relative ${sizeClasses.container} rounded-xl flex items-center justify-center ${variantClasses.container} overflow-hidden ${
        hasMultipleAvatars ? 'cursor-pointer hover:border-brand-violet/50' : ''
      }`}
      style={{ backgroundColor: avatarInfo.url ? 'transparent' : `#${color}` }}
      title={avatarInfo.tooltip}
      onClick={handleAvatarClick}
    >
      {/* Glow effect for card variant */}
      {variant === 'card' && (
        <div className={`absolute inset-0 ${variantClasses.glow}`}></div>
      )}
      
      {avatarInfo.url && avatarInfo.isAvailable ? (
        <>
          {/* Social Avatar (X, Discord, or Provider) */}
          <img
            src={avatarInfo.url}
            alt={avatarInfo.alt}
            className="w-full h-full object-cover rounded-xl"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const failedUrl = target.src;

              // Add failed URL to the set
              setFailedSources(prev => new Set(prev).add(failedUrl));

              // Try fallback through available avatars
              const canFallback =
                (currentAvatarType === 'x' && (
                  (discordAvatar && !failedSources.has(discordAvatar)) ||
                  (providerLogoUrl && !failedSources.has(providerLogoUrl))
                )) ||
                (currentAvatarType === 'discord' && (
                  (xImageUrl && !failedSources.has(xImageUrl)) ||
                  (providerLogoUrl && !failedSources.has(providerLogoUrl))
                )) ||
                (currentAvatarType === 'provider' && (
                  (xImageUrl && !failedSources.has(xImageUrl)) ||
                  (discordAvatar && !failedSources.has(discordAvatar))
                ));

              if (!canFallback) {
                // No fallback available, show generated avatar
                target.style.display = 'none';
                const parent = target.parentElement!;
                parent.style.backgroundColor = `#${color}`;
                parent.innerHTML = `<span class="relative ${sizeClasses.text} font-bold text-white z-10">${displayChar}</span>`;
              }
            }}
          />
          {/* Platform indicator badge */}
          <div className={`absolute ${variantClasses.badge} ${sizeClasses.badge} rounded-full border border-white dark:border-slate-800 flex items-center justify-center ${avatarInfo.badgeColor}`}>
            <div className={`${sizeClasses.badgeDot} bg-white rounded-full`}></div>
          </div>
          {/* Switch indicator for multiple avatars */}
          {hasMultipleAvatars && (
            <div className={`absolute ${variantClasses.indicator} ${sizeClasses.indicator} bg-white dark:bg-slate-800 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
              <div className="w-1 h-1 bg-brand-violet rounded-full"></div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Fallback identicon with subtle effects */}
          {variant === 'table' && (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50"></div>
              <div className="absolute inset-0 bg-gradient-to-tl from-black/10 to-transparent opacity-30"></div>
            </>
          )}
          {variant === 'card' && (
            <div className={`absolute inset-0 ${variantClasses.fallbackGradient} rounded-xl`}></div>
          )}
          <span className={`relative ${sizeClasses.text} font-bold text-white z-10`}>
            {displayChar}
          </span>
        </>
      )}
    </div>
  );
  
  if (showMotion) {
    return (
      <motion.div
        whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        <AvatarContent />
      </motion.div>
    );
  }
  
  return variant === 'card' ? (
    <div className="relative">
      <AvatarContent />
    </div>
  ) : (
    <AvatarContent />
  );
};

export const ValidatorAvatar = memo(ValidatorAvatarComponent);
ValidatorAvatar.displayName = 'ValidatorAvatar';