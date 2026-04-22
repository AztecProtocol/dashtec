'use client';

import React from 'react';
import Link from 'next/link';
import { CopyButton } from '@/components/ui/CopyButton';
import { ProviderAvatar } from '@/components/ui/ProviderAvatar';
import { ValidatorAvatar } from '@/components/ui/ValidatorAvatar';
import { getValidatorLink } from '@/utils/validatorLinks';
import { ValidatorInfo } from './types';
import { AtSymbolIcon } from '@heroicons/react/24/outline';
import { DiscordIcon } from '../dashboard/Links';
import { formatAddress } from '@/utils/formatters';
import { Tooltip } from '@/components/ui/Tooltip';

interface ValidatorCellProps {
  address: string;
  validator?: ValidatorInfo | null;
  compact?: boolean;
  showLink?: boolean;
}

export const ValidatorCell: React.FC<ValidatorCellProps> = ({ 
  address, 
  validator, 
  compact = false,
  showLink = true
}) => {
  return (
    <div className="flex items-start sm:items-center gap-1.5 sm:gap-2">
      <ValidatorAvatar
        address={address}
        xImageUrl={validator?.x_image_url}
        xHandle={validator?.x_handle}
        discordAvatar={validator?.discordAvatar}
        discordUsername={validator?.discordUsername}
        name={validator?.name}
        size={compact ? 'sm' : 'md'}
        variant="table"
        enableSwitching={true}
        showMotion={true}
        providerLogoUrl={validator?.provider?.logoUrl}
        providerName={validator?.provider?.name}
      />
      
      {/* Name and Social */}
      <div className="flex flex-col min-w-0">
        {validator?.name && (
          showLink ? (
            <Link
              href={getValidatorLink(address)}
              className={`${compact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'} font-semibold text-slate-900 dark:text-slate-50 hover:text-brand-violet dark:hover:text-accent-purple-light truncate transition-colors`}
            >
              {validator.name}
            </Link>
          ) : (
            <p className={`${compact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'} font-semibold text-slate-900 dark:text-slate-50 truncate`}>
              {validator.name}
            </p>
          )
        )}
        <div className="flex items-center gap-1">
          {showLink ? (
            <Link
              href={getValidatorLink(address)}
              className={`${compact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'} font-mono text-slate-700 dark:text-slate-300 hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors`}
            >
              {formatAddress(address)}
            </Link>
          ) : (
            <p className={`${compact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'} font-mono text-slate-700 dark:text-slate-300`}>
              {formatAddress(address)}
            </p>
          )}
          <CopyButton textToCopy={address} size="xs" />
          {validator?.x_handle && (
            <a
              href={`https://x.com/${validator.x_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1"
              title={`@${validator.x_handle} on X`}
            >
              <AtSymbolIcon className="h-3 w-3 text-blue-500 hover:text-blue-600" />
            </a>
          )}
          {validator?.discordUsername && (
            <div title={`${validator.discordUsername} on Discord`} className="ml-1">
              <DiscordIcon className="h-3 w-3 text-indigo-500" />
            </div>
          )}
          {validator?.provider && (
            <Tooltip content={
              <div className="space-y-1">
                <p className="font-semibold">{validator.provider.name || validator.provider.providerIdentifier}</p>
                {validator.provider.description && <p className="text-xs text-slate-300 mt-2">{validator.provider.description}</p>}
                {validator.provider.website && <p className="text-xs text-blue-300 mt-2">Website: {validator.provider.website}</p>}
                <p className="text-xs text-slate-400 mt-2 italic">Click to view provider details</p>
              </div>
            }>
              <Link
                href={`/providers/${validator.provider.providerIdentifier}`}
                className="ml-1 inline-flex"
                title={validator.provider.name || validator.provider.providerIdentifier}
              >
                <ProviderAvatar
                  logoUrl={validator.provider.logoUrl}
                  name={validator.provider.name || validator.provider.providerIdentifier}
                  size="2xs"
                  shape="square"
                />
              </Link>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
};