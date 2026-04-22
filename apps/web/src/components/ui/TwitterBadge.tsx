import React, { useState } from 'react';
import { AtSymbolIcon } from '@heroicons/react/24/outline';
import { Tooltip } from './Tooltip';

interface TwitterBadgeProps {
  handle: string;
  imageUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'minimal' | 'detailed' | 'full';
  className?: string;
}

/**
 * Reusable component to display Twitter/X handle with avatar
 * Supports different sizes and display variants
 * Links to external X.com profile
 */
export const TwitterBadge: React.FC<TwitterBadgeProps> = ({
  handle,
  imageUrl,
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

  const displayHandle = handle.startsWith('@') ? handle : `@${handle}`;
  const cleanHandle = handle.replace('@', '');

  const tooltipContent = (
    <div className="space-y-1">
      <p className="font-semibold">{displayHandle}</p>
      <p className="text-xs text-slate-300 mt-2">View on X</p>
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      <a
        href={`https://x.com/${cleanHandle}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-sky-50/60 to-sky-50/60 dark:from-sky-950/30 dark:to-sky-950/30 text-sky-600/80 dark:text-sky-400/80 rounded-lg border border-sky-200/60 dark:border-sky-800/60 hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md cursor-pointer transition-all ${sizeClasses[size]} ${className}`}
      >
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={displayHandle}
            className={`${iconSizes[size]} rounded-full object-cover`}
            onError={() => setImageError(true)}
          />
        ) : (
          <AtSymbolIcon className={iconSizes[size]} />
        )}
        <span className="font-semibold truncate max-w-[120px]">
          {variant === 'minimal' && size === 'xs'
            ? displayHandle.substring(0, 10) + (displayHandle.length > 10 ? '...' : '')
            : displayHandle
          }
        </span>
      </a>
    </Tooltip>
  );
};
