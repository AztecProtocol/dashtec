'use client';

import React, { createContext, useState, useContext, ReactNode, useMemo } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  setLoadingWindow: (isLoading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);

  const value = useMemo(() => ({
    isLoading,
    setLoadingWindow: setIsLoading,
  }), [isLoading]);

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};