import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
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

export interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

interface ColumnFilterDropdownProps {
  options: FilterOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  label?: string;
  multiple?: boolean;
  showIndicator?: boolean;
  showCustomInput?: boolean;
  customInputType?: 'range' | 'single';
  customInputPlaceholder?: {
    min?: string;
    max?: string;
    single?: string;
  };
  customInputUnit?: string;
}

export const ColumnFilterDropdown: React.FC<ColumnFilterDropdownProps> = ({
  options,
  value,
  onChange,
  label,
  multiple = false,
  showIndicator = true,
  showCustomInput = false,
  customInputType = 'range',
  customInputPlaceholder = {},
  customInputUnit = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 320 });
  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');
  const [customValue, setCustomValue] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        dropdownRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const dropdownWidth = Math.min(320, viewportWidth - 16);
      const dropdownHeight = 400; // estimated height

      let left = rect.right - dropdownWidth;
      let top = rect.bottom + 8;

      // Adjust for mobile and small screens
      if (viewportWidth < 768) { // mobile breakpoint
        // Center horizontally on mobile
        left = (viewportWidth - dropdownWidth) / 2;
      } else {
        // Desktop: prevent going off left edge
        if (left < 8) {
          left = rect.left;
        }
        // Prevent going off right edge
        if (left + dropdownWidth > viewportWidth - 8) {
          left = viewportWidth - dropdownWidth - 8;
        }
      }

      // Prevent going off bottom edge
      if (top + dropdownHeight > viewportHeight - 8) {
        top = rect.top - dropdownHeight - 8;
      }

      // Ensure minimum top position
      top = Math.max(8, top);

      setDropdownPosition({ top, left, width: dropdownWidth });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  const isFiltered = multiple
    ? Array.isArray(value) && value.length > 0 && value.length < options.length
    : value !== 'all' && value !== '';

  const clearFilter = () => {
    onChange(multiple ? [] : 'all');
    setCustomMin('');
    setCustomMax('');
    setCustomValue('');
  };

  const handleCustomRangeApply = () => {
    if (customInputType === 'range') {
      const rangeValue = `${customMin || ''}-${customMax || ''}`;
      onChange(rangeValue);
    } else {
      onChange(customValue);
    }
  };

  const isCustomRangeValid = () => {
    if (customInputType === 'range') {
      return customMin || customMax;
    }
    return customValue.trim() !== '';
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-1 rounded-lg transition-all duration-200 ${isFiltered
            ? 'bg-brand-violet/10 text-brand-violet hover:bg-brand-violet/20'
            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
          }`}
        title={label || 'Filter'}
      >
        <FunnelIcon className="h-4 w-4" />
        {showIndicator && isFiltered && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-violet rounded-full animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <Portal>
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="fixed z-[9999] backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 shadow-2xl border border-white/20 dark:border-slate-700/50 rounded-2xl overflow-hidden"
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width
              }}
            >
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/5 via-transparent to-amber-500/5"></div>
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-brand-violet/10 to-transparent rounded-full blur-2xl animate-pulse"></div>

              <div className="relative z-10">
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/10 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-brand-violet rounded-full animate-pulse"></div>
                      <span className="text-sm font-bold bg-gradient-to-r from-slate-700 to-brand-violet dark:from-slate-200 dark:to-accent-purple-light bg-clip-text text-transparent">
                        {label || 'Filter Options'}
                      </span>
                    </div>
                    {isFiltered && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearFilter();
                        }}
                        className="group relative px-2 py-1 text-xs font-medium text-slate-500 hover:text-brand-violet dark:text-slate-400 dark:hover:text-accent-purple-light transition-all duration-200 rounded-md hover:bg-white/50 dark:hover:bg-slate-800/50"
                      >
                        <span className="relative z-10">Clear All</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Options with elegant styling */}
                <div className="max-h-56 overflow-y-auto custom-scrollbar px-2 py-2">
                  {options.map((option, index) => {
                    const isSelected = multiple
                      ? Array.isArray(value) && value.includes(option.value)
                      : value === option.value;

                    return (
                      <button
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        className={`group relative w-full text-left px-3 py-2.5 mb-1 text-sm transition-all duration-300 flex items-center gap-3 rounded-xl overflow-hidden ${isSelected
                            ? 'bg-gradient-to-r from-brand-violet/90 to-amber-600/90 text-white shadow-lg transform scale-[1.02]'
                            : 'hover:bg-white/60 dark:hover:bg-slate-800/60 hover:shadow-md hover:transform hover:scale-[1.01]'
                          }`}
                        style={{
                          animationDelay: `${index * 50}ms`
                        }}
                      >
                        {/* Background effects */}
                        {!isSelected && (
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 dark:from-slate-700/0 dark:via-slate-700/10 dark:to-slate-700/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        )}

                        {/* Selection indicator */}
                        <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isSelected
                            ? 'bg-white border-white'
                            : 'border-slate-300 dark:border-slate-600 group-hover:border-brand-violet dark:group-hover:border-accent-purple-light'
                          }`}>
                          {isSelected && (
                            <div className="w-2 h-2 bg-brand-violet rounded-full animate-pulse"></div>
                          )}
                        </div>

                        {/* Option icon */}
                        {option.icon && (
                          <span className={`flex-shrink-0 transition-colors duration-200 ${isSelected ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-brand-violet dark:group-hover:text-accent-purple-light'
                            }`}>
                            {option.icon}
                          </span>
                        )}

                        {/* Option label */}
                        <span className={`flex-1 font-medium transition-colors duration-200 ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-200'
                          }`}>
                          {option.label}
                        </span>

                        {/* Color indicator */}
                        {option.color && !isSelected && (
                          <div
                            className="flex-shrink-0 w-3 h-3 rounded-full border border-white/50 dark:border-slate-600/50"
                            style={{ backgroundColor: option.color }}
                          ></div>
                        )}

                        {/* Remove indicator for multiple selection */}
                        {multiple && isSelected && (
                          <XMarkIcon className="h-4 w-4 flex-shrink-0 text-white/80 hover:text-white transition-colors" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Input Section */}
                {showCustomInput && (
                  <div className="border-t border-white/10 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/50 to-white/30 dark:from-slate-800/50 dark:to-slate-900/30 backdrop-blur-sm">
                    <div className="px-5 py-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          Custom {customInputType === 'range' ? 'Range' : 'Value'}
                        </span>
                      </div>

                      {customInputType === 'range' ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                              <input
                                type="number"
                                placeholder={customInputPlaceholder.min || 'Min'}
                                value={customMin}
                                onChange={(e) => setCustomMin(e.target.value)}
                                className="w-full px-3 py-2.5 text-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-brand-violet/50 focus:border-brand-violet/50 transition-all duration-200 shadow-sm hover:shadow-md"
                              />
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder={customInputPlaceholder.max || 'Max'}
                                value={customMax}
                                onChange={(e) => setCustomMax(e.target.value)}
                                className="w-full px-3 py-2.5 text-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-brand-violet/50 focus:border-brand-violet/50 transition-all duration-200 shadow-sm hover:shadow-md"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type="number"
                            placeholder={customInputPlaceholder.single || 'Enter value'}
                            value={customValue}
                            onChange={(e) => setCustomValue(e.target.value)}
                            className="w-full px-3 py-2.5 text-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-brand-violet/50 focus:border-brand-violet/50 transition-all duration-200 shadow-sm hover:shadow-md"
                          />
                          {customInputUnit && (
                            <span className="absolute -bottom-5 left-0 text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {customInputUnit}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-6">
                        <button
                          onClick={handleCustomRangeApply}
                          disabled={!isCustomRangeValid()}
                          className="group relative flex-1 px-4 py-2.5 bg-gradient-to-r from-brand-violet to-amber-600 hover:from-amber-600 hover:to-brand-violet text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-brand-violet disabled:hover:to-amber-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                        >
                          <span className="relative z-10">Apply Filter</span>
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </button>
                        <button
                          onClick={() => {
                            setCustomMin('');
                            setCustomMax('');
                            setCustomValue('');
                          }}
                          className="group relative px-4 py-2.5 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-600 dark:hover:to-slate-500 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer with count */}
                {multiple && (
                  <div className="px-5 py-3 border-t border-white/10 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/30 to-white/20 dark:from-slate-800/30 dark:to-slate-900/20">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {Array.isArray(value) ? value.length : 0} filters selected
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </>
  );
};