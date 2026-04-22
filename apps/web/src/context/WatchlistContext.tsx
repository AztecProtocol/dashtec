'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const WATCHLIST_KEY = 'validator-watchlist';

interface WatchlistContextType {
  watchlist: string[];
  addToWatchlist: (address: string) => void;
  removeFromWatchlist: (address: string) => void;
  toggleWatchlist: (address: string) => void;
  isWatchlisted: (address: string) => boolean;
  clearWatchlist: () => void;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

/**
 * Watchlist provider component
 * Manages watchlist state globally across the application
 */
export const WatchlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    // Initialize from localStorage
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(WATCHLIST_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error('Failed to parse watchlist:', error);
        return [];
      }
    }
    return [];
  });

  // Sync watchlist changes to localStorage
  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === WATCHLIST_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setWatchlist(Array.isArray(parsed) ? parsed : []);
        } catch (error) {
          console.error('Failed to parse watchlist from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addToWatchlist = (address: string) => {
    const normalized = address.toLowerCase();
    setWatchlist(prev => [...new Set([...prev, normalized])]);
  };

  const removeFromWatchlist = (address: string) => {
    const normalized = address.toLowerCase();
    setWatchlist(prev => prev.filter(addr => addr !== normalized));
  };

  const toggleWatchlist = (address: string) => {
    if (isWatchlisted(address)) {
      removeFromWatchlist(address);
    } else {
      addToWatchlist(address);
    }
  };

  const isWatchlisted = (address: string) => {
    const normalized = address.toLowerCase();
    return watchlist.includes(normalized);
  };

  const clearWatchlist = () => {
    setWatchlist([]);
  };

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        toggleWatchlist,
        isWatchlisted,
        clearWatchlist,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
};

/**
 * Hook to use watchlist context
 */
export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};
