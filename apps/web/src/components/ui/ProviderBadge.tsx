import React from 'react';
import Link from 'next/link';
import { ProviderMetadata } from '@/types';
import { Tooltip } from './Tooltip';
import { ProviderAvatar } from './ProviderAvatar';

interface ProviderBadgeProps {
  provider: ProviderMetadata;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'minimal' | 'detailed' | 'full';
  className?: string;
}

const avatarSizeMap: Record<string, '2xs' | 'xs' | 'sm'> = {
  xs: '2xs',
  sm: '2xs',
  md: 'xs',
  lg: 'sm',
};

/**
 * Reusable component to display provider/staking service metadata
 * Supports different sizes and display variants
 * Links to internal provider page: /providers/{providerId}
 */
export const ProviderBadge: React.FC<ProviderBadgeProps> = ({
  provider,
  size = 'sm',
  variant = 'minimal',
  className = '',
}) => {
  const sizeClasses = {
    xs: 'text-xs px-2 py-1',
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2.5',
  };

  const providerName = provider.name || provider.providerIdentifier;

  const tooltipContent = (
    <div className="space-y-1">
      <p className="font-semibold">Managed by {providerName}</p>
      {provider.description && (
        <p className="text-xs text-slate-300 mt-2">{provider.description}</p>
      )}
      {provider.website && (
        <p className="text-xs text-blue-300 mt-2">Website: {provider.website}</p>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      <Link
        href={`/providers/${provider.providerIdentifier}`}
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-50/60 to-indigo-50/60 dark:from-purple-950/30 dark:to-indigo-950/30 text-purple-600/80 dark:text-purple-400/80 rounded-lg border border-purple-200/60 dark:border-purple-800/60 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md cursor-pointer transition-all ${sizeClasses[size]} ${className}`}
      >
        <ProviderAvatar
          logoUrl={provider.logoUrl}
          name={providerName}
          size={avatarSizeMap[size]}
          shape="square"
        />
        <span className="font-semibold truncate max-w-[120px]">
          {variant === 'minimal' && size === 'xs'
            ? providerName.substring(0, 10) + (providerName.length > 10 ? '...' : '')
            : providerName
          }
        </span>
      </Link>
    </Tooltip>
  );
};
