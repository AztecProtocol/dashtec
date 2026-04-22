'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useRollupVersions } from '@/hooks/queries/useRollupVersions';
import type { RollupVersion } from '@/types/rollup';

interface RollupContextValue {
  versions: (RollupVersion & { validatorCount: number; epochCount: number; frozenAtBlock: string | null })[];
  globalRollup: string;
  setGlobalRollup: (address: string) => void;
  activeRollup: string;
  isAggregate: boolean;
  isLoading: boolean;
}

const RollupContext = createContext<RollupContextValue | undefined>(undefined);

/** Provider that manages global rollup version selection and URL sync */
export const RollupProvider = ({ children }: { children: ReactNode }) => {
  const { data, isLoading } = useRollupVersions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeRollup = data?.active ?? '';
  const versions = data?.versions ?? [];

  const rollupFromUrl = searchParams.get('rollup');
  const [globalRollup, setGlobalRollupState] = useState<string>(
    rollupFromUrl ?? 'active'
  );

  /** Update global rollup selection and sync to URL search params */
  const setGlobalRollup = useCallback((address: string) => {
    setGlobalRollupState(address);
    const params = new URLSearchParams(searchParams.toString());
    if (address === 'active' || address === activeRollup) {
      params.delete('rollup');
    } else {
      params.set('rollup', address);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  }, [searchParams, router, pathname, activeRollup]);

  // Keep 'active' as stable key when using the active rollup to prevent double-fetches.
  // The API's parseRollupParam treats 'active' the same as the explicit address.
  // Only resolve to actual address when a non-active rollup is explicitly selected.
  const effectiveRollup = globalRollup === 'active' ? 'active' : globalRollup;
  const isAggregate = effectiveRollup === 'all';

  const value = useMemo(() => ({
    versions,
    globalRollup: effectiveRollup,
    setGlobalRollup,
    activeRollup,
    isAggregate,
    isLoading,
  }), [versions, effectiveRollup, setGlobalRollup, activeRollup, isAggregate, isLoading]);

  return <RollupContext.Provider value={value}>{children}</RollupContext.Provider>;
};

/** Hook to access rollup context — must be used within RollupProvider */
export const useRollup = (): RollupContextValue => {
  const context = useContext(RollupContext);
  if (!context) throw new Error('useRollup must be used within RollupProvider');
  return context;
};

/** Safe version that returns null when outside RollupProvider */
export const useRollupOptional = (): RollupContextValue | null => {
  return useContext(RollupContext) ?? null;
};
