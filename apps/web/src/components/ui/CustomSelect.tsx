'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(children, document.body);
};

interface SelectOption {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
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

export const CustomSelect: React.FC<CustomSelectProps> = ({
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
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const selectRef = useRef<HTMLDivElement>(null);

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

  const selectedOption = options.find(option => option.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const baseClasses = `
    cursor-pointer backdrop-blur-sm border text-slate-700 dark:text-slate-300 
    focus:ring-2 focus:ring-brand-violet focus:border-brand-violet 
    transition-all duration-300 shadow-lg hover:shadow-xl font-medium 
    hover:bg-white dark:hover:bg-slate-800 
    disabled:opacity-50 disabled:cursor-not-allowed
    ${getSizeClasses()}
    ${getVariantClasses()}
    ${className}
  `.trim().replace(/\s+/g, ' ');


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    const handleResize = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const updateDropdownPosition = () => {
    if (selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [isOpen]);

  const handleOptionClick = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const dropdownVariantClasses = variant === 'compact'
    ? 'rounded-lg border-slate-200/50 dark:border-slate-600/50'
    : 'rounded-xl border-slate-200/50 dark:border-slate-700/50';


  return (
    <div className="relative" ref={selectRef}>
      {/* Background glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-r from-brand-violet/20 to-amber-500/20 ${variant === 'compact' ? 'rounded-lg' : 'rounded-xl'} blur opacity-0 ${isOpen ? 'opacity-100' : 'group-focus-within:opacity-100'} transition-opacity duration-300`}></div>

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={baseClasses}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={`block truncate ${!selectedOption ? 'text-slate-500 dark:text-slate-400' : ''}`}>
            {displayText}
          </span>
        </button>

        {/* Chevron icon */}
        <div className={`absolute ${size === 'sm' ? 'right-2' : 'right-3'} top-1/2 transform -translate-y-1/2 pointer-events-none`}>
          <ChevronDownIcon className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-slate-400 dark:text-slate-500 ${isOpen ? 'text-brand-violet rotate-180' : ''} transition-all duration-300`} />
        </div>
      </div>

      {/* Dropdown Menu rendered via Portal */}
      <AnimatePresence>
        {isOpen && (
          <Portal>
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={`fixed z-[9999] bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border shadow-2xl ${dropdownVariantClasses} max-h-60 overflow-auto`}
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width
              }}
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleOptionClick(option.value)}
                  className={`
                    w-full text-left px-4 py-3 hover:bg-brand-violet/10 dark:hover:bg-brand-violet/20 
                    focus:bg-brand-violet/10 dark:focus:bg-brand-violet/20 focus:outline-none
                    transition-colors duration-200 flex items-center justify-between
                    ${option.value === value
                      ? 'bg-brand-violet/5 dark:bg-brand-violet/10 text-brand-violet dark:text-accent-purple-light font-semibold'
                      : 'text-slate-700 dark:text-slate-300'
                    }
                    ${size === 'sm' ? 'text-sm py-2' : 'text-sm py-3'}
                    first:${variant === 'compact' ? 'rounded-t-lg' : 'rounded-t-xl'}
                    last:${variant === 'compact' ? 'rounded-b-lg' : 'rounded-b-xl'}
                  `}
                >
                  <span>{option.label}</span>
                  {option.value === value && (
                    <CheckIcon className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-brand-violet dark:text-accent-purple-light`} />
                  )}
                </button>
              ))}
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
};