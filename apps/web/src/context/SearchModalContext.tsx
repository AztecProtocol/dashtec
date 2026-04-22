'use client';

import React, { createContext, useState, useContext, useMemo, ReactNode } from 'react';

interface SearchModalContextType {
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
}

const SearchModalContext = createContext<SearchModalContextType | undefined>(undefined);

/** Lightweight provider for search modal state — sits above RollupProvider */
export const SearchModalProvider = ({ children }: { children: ReactNode }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const value = useMemo(() => ({ isSearchOpen, setIsSearchOpen }), [isSearchOpen]);
  return <SearchModalContext.Provider value={value}>{children}</SearchModalContext.Provider>;
};

export const useSearchModal = (): SearchModalContextType => {
  const context = useContext(SearchModalContext);
  if (!context) throw new Error('useSearchModal must be used within SearchModalProvider');
  return context;
};
