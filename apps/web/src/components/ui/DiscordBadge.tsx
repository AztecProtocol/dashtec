import React, { useState } from 'react';
import { Tooltip } from './Tooltip';

interface DiscordBadgeProps {
  username: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'minimal' | 'detailed' | 'full';
  className?: string;
}

/**
 * Discord icon SVG component
 */
const DiscordIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

/**
 * Reusable component to display Discord username with avatar
 * Supports different sizes and display variants
 * Non-clickable display only (Discord doesn't have public profile links)
 */
export const DiscordBadge: React.FC<DiscordBadgeProps> = ({
  username,
  avatarUrl,
  size = 'sm',
  variant = 'minimal',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const sizeClasses = {
    xs: 'text-xs px-2 py-1',
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2.5',
  };

  const iconSizes = {
    xs: 'h-3 w-3',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const tooltipContent = (
    <div className="space-y-1">
      <p className="font-semibold">{username}</p>
      <p className="text-xs text-slate-300 mt-2">Discord user</p>
    </div>
  );

  return (
    <Tooltip content={tooltipContent} zIndex={9999}>
      <div
        className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-50/60 to-indigo-50/60 dark:from-indigo-950/30 dark:to-indigo-950/30 text-indigo-600/80 dark:text-indigo-400/80 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60 cursor-default transition-all ${sizeClasses[size]} ${className}`}
      >
        {avatarUrl && !imageError ? (
          <img
            src={avatarUrl}
            alt={username}
            className={`${iconSizes[size]} rounded-full object-cover`}
            onError={() => setImageError(true)}
          />
        ) : (
          <DiscordIcon className={iconSizes[size]} />
        )}
        <span className="font-semibold truncate max-w-[120px]">
          {variant === 'minimal' && size === 'xs'
            ? username.substring(0, 10) + (username.length > 10 ? '...' : '')
            : username
          }
        </span>
      </div>
    </Tooltip>
  );
};
