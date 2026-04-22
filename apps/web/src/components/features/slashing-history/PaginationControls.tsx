'use client';

import React from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleRightIcon,
  ChevronDoubleLeftIcon,
} from '@heroicons/react/24/outline';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}) => {
  if (totalPages <= 1) return null;

  return (
    <>
      {/* Desktop Pagination */}
      <div className="hidden sm:flex items-center justify-between px-4 sm:px-6 py-4 border-t border-white/20 dark:border-slate-600/50">
        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
          Page {currentPage} of {totalPages}
        </div>
        <nav className="relative z-0 inline-flex rounded-xl shadow-lg backdrop-blur-sm" aria-label="Pagination">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="group relative inline-flex items-center px-3 py-2 rounded-l-xl border border-white/20 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-brand-violet dark:hover:text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            <ChevronDoubleLeftIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="group relative inline-flex items-center px-3 py-2 border-t border-b border-white/20 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-brand-violet dark:hover:text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            <ChevronLeftIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
          </button>
          <span className="relative inline-flex items-center px-4 py-2 border-t border-b border-white/20 dark:border-slate-600/50 bg-white/90 dark:bg-slate-800/90 text-sm font-bold text-slate-700 dark:text-slate-200">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="group relative inline-flex items-center px-3 py-2 border-t border-b border-white/20 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-brand-violet dark:hover:text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            <ChevronRightIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="group relative inline-flex items-center px-3 py-2 rounded-r-xl border border-white/20 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-brand-violet dark:hover:text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            <ChevronDoubleRightIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
          </button>
        </nav>
      </div>

      {/* Mobile Pagination */}
      <div className="sm:hidden flex flex-col gap-3 px-4 py-4 border-t border-white/20 dark:border-slate-600/50">
        {/* Page Info */}
        <div className="text-center text-sm font-medium text-slate-600 dark:text-slate-300">
          Page {currentPage} of {totalPages}
        </div>
        
        {/* Navigation Controls */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="group relative inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/20 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-brand-violet dark:hover:text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
          >
            <ChevronLeftIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
          </button>
          
          <div className="flex items-center px-4 py-2 rounded-full border border-white/20 dark:border-slate-600/50 bg-white/90 dark:bg-slate-800/90 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-lg">
            {currentPage} / {totalPages}
          </div>
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="group relative inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/20 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-brand-violet dark:hover:text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
          >
            <ChevronRightIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
          </button>
        </div>
        
        {/* Quick Jump Buttons - Only show if more than 3 pages */}
        {totalPages > 3 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-full text-xs font-medium border border-white/20 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-brand-violet dark:hover:text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              First
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-full text-xs font-medium border border-white/20 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-brand-violet dark:hover:text-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              Last
            </button>
          </div>
        )}
      </div>
    </>
  );
};