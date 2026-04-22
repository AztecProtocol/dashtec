import { DetailItemProps } from '@/types';
import React from 'react';
import { CopyButton } from './CopyButton';
import { Tooltip } from './Tooltip';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface ResponsiveDetailItemProps extends DetailItemProps {
  responsive?: boolean; // Enable responsive behavior
}

export const ResponsiveDetailItem: React.FC<ResponsiveDetailItemProps> = ({ 
  label, 
  value, 
  isMono, 
  highlight, 
  Icon, 
  textToCopy, 
  tooltip,
  responsive = true 
}) => (
  <div className={`py-3 ${responsive ? 'flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4' : 'sm:grid sm:grid-cols-3 sm:gap-4'}`}>
    <dt className="text-sm font-medium gap-2 text-slate-500 dark:text-slate-50 flex items-center">
      {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
      {label}
      {tooltip && (
        <Tooltip content={tooltip}>
          <InformationCircleIcon className="h-4 w-4 flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
        </Tooltip>
      )}
    </dt>
    <dd className={`text-sm text-slate-900 dark:text-slate-50 ${responsive ? 'sm:text-right' : 'mt-1 sm:mt-0 sm:col-span-2'} ${isMono ? 'font-mono' : ''} ${highlight ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
      <div className={`flex items-center ${responsive ? 'justify-start sm:justify-end' : 'justify-start'} w-full`}>
        {React.isValidElement(value) ? (
          value
        ) : (
          <span className={`${textToCopy ? "break-all" : ""} ${responsive ? '' : 'flex-grow min-w-0'}`}>
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