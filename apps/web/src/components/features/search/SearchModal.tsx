'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Z_INDEX } from '@/utils/constants';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex justify-center pt-20 sm:pt-32" style={{ zIndex: Z_INDEX.SEARCH_MODAL }} aria-modal="true" role="dialog">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1, ease: 'easeInOut' }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: -25, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -25, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 50, duration: 0.05 }}
            className="relative w-full max-w-xl mx-4"
          >
            <form onSubmit={handleSearchSubmit} className="relative">
              <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Search sequencers by Address, Name or X Handle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-16 pr-6 py-4 text-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-violet focus:outline-none"
              />
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};