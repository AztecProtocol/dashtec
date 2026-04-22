'use client';

import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact';
  showIndicator?: boolean;
  indicatorActive?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  size = 'md',
  variant = 'default',
  showIndicator = false,
  indicatorActive = false
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'pl-3 pr-8 py-2 text-sm min-w-[60px]';
      case 'lg':
        return 'pl-4 pr-12 py-4 text-base min-w-[160px]';
      default:
        return 'pl-4 pr-12 py-3 text-sm min-w-[140px]';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'bg-white/90 dark:bg-slate-700/90 border-white/30 dark:border-slate-600/50 rounded-lg';
      default:
        return 'bg-white/90 dark:bg-slate-800/90 border-white/30 dark:border-slate-700/50 rounded-xl';
    }
  };

  const baseClasses = `
    appearance-none backdrop-blur-sm border text-slate-700 dark:text-slate-300 
    focus:ring-2 focus:ring-brand-violet focus:border-brand-violet 
    transition-all duration-300 shadow-lg hover:shadow-xl font-medium 
    hover:bg-white dark:hover:bg-slate-800 
    disabled:opacity-50 disabled:cursor-not-allowed
    ${getSizeClasses()}
    ${getVariantClasses()}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className="relative group">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-violet/20 to-amber-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseClasses}
          disabled={disabled}
          style={{
            backgroundImage: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none'
          }}
        >
          {placeholder && (
            <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 px-4 hover:bg-brand-violet/10 focus:bg-brand-violet/10"
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Chevron icon */}
        <div className={`absolute ${size === 'sm' ? 'right-2' : 'right-3'} top-1/2 transform -translate-y-1/2 pointer-events-none`}>
          <ChevronDownIcon className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-slate-400 dark:text-slate-500 group-focus-within:text-brand-violet group-focus-within:rotate-180 transition-all duration-300`} />
        </div>
        
        {/* Status indicator dot */}
        {showIndicator && indicatorActive && (
          <div className={`absolute ${size === 'sm' ? 'left-2' : 'left-3'} top-1/2 transform -translate-y-1/2 w-2 h-2 bg-brand-violet rounded-full`}></div>
        )}
      </div>
    </div>
  );
};