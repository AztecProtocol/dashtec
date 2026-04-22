import { useState, useMemo, useCallback } from 'react';
import { useRollup } from '@/context/RollupContext';

/** Per-page rollup filter hook that can override the global selection */
export function useRollupFilter() {
  const { globalRollup, versions, activeRollup } = useRollup();
  const [pageOverride, setPageOverride] = useState<string[] | null>(null);

  /** Resolved list of rollup addresses based on override or global state */
  const effectiveRollups = useMemo(() => {
    if (pageOverride) return pageOverride;
    if (globalRollup === 'all') return versions.map(v => v.address);
    return [globalRollup];
  }, [pageOverride, globalRollup, versions]);

  /** Serialized rollup param string for API calls */
  const rollupParam = useMemo(() => {
    if (pageOverride) return pageOverride.join(',');
    if (globalRollup === 'all') return 'all';
    return globalRollup;
  }, [pageOverride, globalRollup]);

  /** Toggle a single version address in the page override */
  const toggleVersion = useCallback((address: string) => {
    setPageOverride(prev => {
      if (!prev) return [address];
      if (prev.includes(address)) {
        const next = prev.filter(a => a !== address);
        return next.length === 0 ? null : next;
      }
      return [...prev, address];
    });
  }, []);

  /** Select all versions (clear page override) */
  const selectAll = useCallback(() => setPageOverride(null), []);

  /** Reset page override back to global selection */
  const resetOverride = useCallback(() => setPageOverride(null), []);

  const hasOverride = pageOverride !== null;

  return { effectiveRollups, rollupParam, toggleVersion, selectAll, resetOverride, hasOverride, versions, activeRollup };
}
