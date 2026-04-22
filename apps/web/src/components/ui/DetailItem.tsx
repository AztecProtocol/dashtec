import { DetailItemProps } from '@/types';
import React from 'react';
import { CopyButton } from './CopyButton';
import { Tooltip } from './Tooltip';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

export const DetailItem: React.FC<DetailItemProps> = ({ label, value, isMono, highlight, Icon, textToCopy, tooltip }) => (
  <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
    <dt className="text-sm font-medium gap-2 text-slate-500 dark:text-slate-50 flex items-center">
      {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
      {label}
      {tooltip && (
        <Tooltip content={tooltip}>
          <InformationCircleIcon className="h-4 w-4 flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
        </Tooltip>
      )}
    </dt>
    <dd className={`mt-1 text-sm text-slate-900 dark:text-slate-50 sm:mt-0 sm:col-span-2 ${isMono ? 'font-mono' : ''} ${highlight ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
      <div className="flex items-center justify-start w-full">
        {React.isValidElement(value) ? (
          value
        ) : (
          <span className={`${textToCopy ? "break-all" : ""} flex-grow min-w-0`}>
            {value !== null && value !== undefined && String(value).trim() !== "" ? String(value) : 'N/A'}
          </span>
        )}
        {textToCopy && String(value).trim() !== "" && value !== 'N/A' && (
          <CopyButton textToCopy={textToCopy} size="xs" className="ml-2" />
        )}
      </div>
    </dd>
  </div>
);