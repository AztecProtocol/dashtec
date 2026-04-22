'use client';

import { useState } from 'react';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

type ProviderAvatarSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface ProviderAvatarProps {
  logoUrl?: string | null;
  name?: string | null;
  size?: ProviderAvatarSize;
  shape?: 'circle' | 'square';
  className?: string;
}

const sizeConfig: Record<ProviderAvatarSize, { container: string; text: string; icon: string }> = {
  '2xs': { container: 'w-3 h-3', text: 'text-[6px]', icon: 'h-1.5 w-1.5' },
  'xs': { container: 'w-4 h-4', text: 'text-[8px]', icon: 'h-2 w-2' },
  'sm': { container: 'w-5 h-5', text: 'text-[9px]', icon: 'h-2.5 w-2.5' },
  'md': { container: 'w-6 h-6', text: 'text-[10px]', icon: 'h-3 w-3' },
  'lg': { container: 'w-8 h-8', text: 'text-xs', icon: 'h-4 w-4' },
  'xl': { container: 'w-10 h-10', text: 'text-sm', icon: 'h-5 w-5' },
  '2xl': { container: 'w-12 h-12', text: 'text-lg', icon: 'h-6 w-6' },
};

/** Shared provider avatar with image loading, skeleton, and fallback */
export const ProviderAvatar: React.FC<ProviderAvatarProps> = ({
  logoUrl,
  name,
  size = 'lg',
  shape = 'circle',
  className = '',
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const { container, text, icon } = sizeConfig[size];
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-sm';
  const hasImage = !!logoUrl && !error;
  const initial = name?.charAt(0).toUpperCase();

  return (
    <div
      className={`relative ${container} ${shapeClass} overflow-hidden flex-shrink-0 flex items-center justify-center ${
        hasImage ? 'bg-slate-100 dark:bg-slate-700' : 'bg-brand-violet'
      } ${className}`}
    >
      {hasImage ? (
        <>
          {!loaded && (
            <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-600" />
          )}
          <img
            src={logoUrl!}
            alt={name || 'Provider'}
            className={`w-full h-full object-cover transition-opacity duration-150 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        </>
      ) : initial ? (
        <span className={`text-white font-semibold leading-none ${text}`}>
          {initial}
        </span>
      ) : (
        <BuildingOfficeIcon className={`${icon} text-white`} />
      )}
    </div>
  );
};
